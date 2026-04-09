import { Router, Request, Response } from "express";
import express from "express";
import axios from "axios";
import xml2js from "xml2js";
import { PrismaClient } from "@prisma/client";
import { sendMailWithAttachments } from "../utils/sendemail";
import { encryptDeterministic } from "../utils/encryption";
import { isPdfBuffer } from "../utils/pdfBytes";
import { buildVeriportReportEmail } from "../utils/veriportEmailTemplates";

const router = Router();
const prisma = new PrismaClient();

type SnsEnvelope = {
  Type?: "SubscriptionConfirmation" | "Notification" | "UnsubscribeConfirmation" | string;
  MessageId?: string;
  TopicArn?: string;
  Subject?: string;
  Message?: string;
  SubscribeURL?: string;
  Timestamp?: string;
};

function safeJsonParse<T>(input: string): T | null {
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
}

async function parseVeriportXmlToJson(rawXml: string): Promise<any> {
  const parser = new xml2js.Parser({
    explicitArray: false,
    ignoreAttrs: false,
    tagNameProcessors: [xml2js.processors.stripPrefix],
    attrNameProcessors: [xml2js.processors.stripPrefix],
    mergeAttrs: true,
    trim: true,
  });
  return parser.parseStringPromise(rawXml);
}

function extract(obj: any, path: string): any {
  return path.split(".").reduce((acc: any, key: string) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

function sanitizeEmail(input: any): string | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;
  // very light validation
  if (!s.includes("@") || s.includes(" ")) return null;
  return s;
}

function decodeMaybeBase64Pdf(raw: string): Buffer | null {
  const trimmed = String(raw).trim();
  if (!trimmed || trimmed.length < 100) return null;
  try {
    const buf = Buffer.from(trimmed, "base64");
    if (!buf.length || !isPdfBuffer(buf)) return null;
    return buf;
  } catch {
    return null;
  }
}

/** XML JSON may include Documents.MroLetter (base64 PDF). Used for email attachment only — not Cloudinary. */
function extractEmbeddedMroLetterPdf(veriportMroData: any): Buffer | null {
  const raw =
    extract(veriportMroData, "Documents.MroLetter") ??
    extract(veriportMroData, "documents.mroLetter") ??
    extract(veriportMroData, "Documents.mroLetter");
  if (!raw || typeof raw !== "string") return null;
  return decodeMaybeBase64Pdf(raw);
}

// AWS SNS often posts JSON with Content-Type: text/plain; charset=UTF-8
// We accept raw text and parse JSON ourselves.
router.post(
  "/webhooks/veriport/sns",
  express.text({ type: "*/*", limit: "5mb" }),
  async (req: Request, res: Response) => {
    const rawBody = typeof req.body === "string" ? req.body : "";
    const envelope = safeJsonParse<SnsEnvelope>(rawBody);

    // Always persist what we received for debugging/audit (even if parsing fails).
    // SNS can retry and resend the same MessageId, so treat duplicates as idempotent.
    try {
      await prisma.veriportSnsEvent.create({
        data: {
          snsMessageId: envelope?.MessageId ?? null,
          snsType: envelope?.Type ?? "Unknown",
          topicArn: envelope?.TopicArn ?? null,
          subject: envelope?.Subject ?? null,
          rawBody,
        },
      });
    } catch (err: any) {
      const isUniqueViolation = err?.code === "P2002";
      if (!isUniqueViolation) {
        throw err;
      }
    }

    if (!envelope?.Type) {
      return res.status(400).json({ success: false, message: "Invalid SNS message: missing Type" });
    }

    if (envelope.Type === "SubscriptionConfirmation") {
      if (!envelope.SubscribeURL) {
        return res.status(400).json({ success: false, message: "Missing SubscribeURL" });
      }

      try {
        // Confirm the subscription
        await axios.get(envelope.SubscribeURL, { timeout: 15000 });
        return res.status(200).json({ success: true, confirmed: true });
      } catch (err: any) {
        return res.status(500).json({
          success: false,
          message: "Failed to confirm SNS subscription",
          error: err?.message ?? String(err),
        });
      }
    }

    if (envelope.Type === "Notification") {
      // Veriport SNS Message contains JSON like { download_url: "https://..." }
      const msgObj = envelope.Message ? safeJsonParse<any>(envelope.Message) : null;
      const downloadUrl: string | undefined =
        msgObj?.download_url || msgObj?.downloadUrl || msgObj?.url || msgObj?.short_url;

      if (!downloadUrl) {
        return res.status(400).json({
          success: false,
          message: "SNS Notification missing download_url in Message",
        });
      }

      try {
        const xmlResp = await axios.get(downloadUrl, {
          timeout: 30000,
          responseType: "text",
          transformResponse: (r: string) => r,
        });

        const rawXml = typeof xmlResp.data === "string" ? xmlResp.data : String(xmlResp.data);
        const parsed = await parseVeriportXmlToJson(rawXml);

        // In the sample XML, root is <VeriportMroData> with <VeriportReportId>
        const veriportMroData = parsed?.VeriportMroData ?? parsed;
        const reportIdStr =
          veriportMroData?.VeriportReportId ??
          veriportMroData?.veriportReportId ??
          veriportMroData?.ReportId;

        if (!reportIdStr) {
          // still store the raw XML so we don't lose data
          await prisma.veriportMroReport.create({
            data: {
              veriportReportId: BigInt(0),
              reportRevisionNumber: null,
              reportUpdate: null,
              snsMessageId: envelope.MessageId ?? null,
              downloadUrl,
              rawXml,
              parsedJson: JSON.stringify(parsed),
            },
          });

          return res.status(200).json({
            success: true,
            received: true,
            warning: "Stored report but could not extract VeriportReportId",
          });
        }

        const reportId = BigInt(String(reportIdStr));
        const revision = veriportMroData?.TestInformation?.ReportRevisionNumber ?? null;
        const reportUpdateRaw = veriportMroData?.TestInformation?.ReportUpdate;
        const reportUpdate =
          typeof reportUpdateRaw === "boolean"
            ? reportUpdateRaw
            : reportUpdateRaw === "true"
              ? true
              : reportUpdateRaw === "false"
                ? false
                : null;

        // Detect whether this is a new record vs an update so we can send "READY" vs "UPDATED".
        // Note: if Veriport re-sends identical payload for same (reportId, revision), we avoid re-emailing.
        const existing = await prisma.veriportMroReport.findUnique({
          where: {
            veriportReportId_reportRevisionNumber: {
              veriportReportId: reportId,
              reportRevisionNumber: revision,
            },
          },
          select: { id: true, rawXml: true, pdfPublicId: true, pdfVersion: true, pdfStatus: true },
        });

        // Upsert-like behavior using the natural key (reportId + revision)
        const saved = await prisma.veriportMroReport.upsert({
          where: {
            veriportReportId_reportRevisionNumber: {
              veriportReportId: reportId,
              reportRevisionNumber: revision,
            },
          },
          create: {
            veriportReportId: reportId,
            reportRevisionNumber: revision,
            reportUpdate,
            snsMessageId: envelope.MessageId ?? null,
            downloadUrl,
            rawXml,
            parsedJson: JSON.stringify(parsed),
          },
          update: {
            reportUpdate,
            snsMessageId: envelope.MessageId ?? null,
            downloadUrl,
            rawXml,
            parsedJson: JSON.stringify(parsed),
          },
        });

        // ========= Link donor to user + automatic PDF upload + email notification =========
        // Non-blocking for SNS delivery: never fail the SNS request if email fails.
        try {
          const donorEmail =
            sanitizeEmail(extract(veriportMroData, "Donor.DonorEmail")) ??
            sanitizeEmail(extract(veriportMroData, "donor.donorEmail"));

          const reportIdStrForUrl = reportId.toString();
          const reportWhere = {
            veriportReportId_reportRevisionNumber: {
              veriportReportId: reportId,
              reportRevisionNumber: revision,
            },
          };

          let recipientUserId: number | null = null;
          let donorEmailEnc: string | null = null;
          if (donorEmail) {
            donorEmailEnc = encryptDeterministic(donorEmail.toLowerCase());
            try {
              const user = await prisma.user.findUnique({
                where: { email: donorEmailEnc },
                select: { id: true },
              });
              recipientUserId = user?.id ?? null;
            } catch {
              recipientUserId = null;
            }
            await prisma.veriportMroReport.update({
              where: reportWhere,
              data: { donorEmailEnc, recipientUserId },
            });
          }

          const embeddedPdf = extractEmbeddedMroLetterPdf(veriportMroData);
          const overallResult =
            extract(veriportMroData, "Results.MroVerification.MroOverallResult") ??
            extract(veriportMroData, "Results.MroVerification.MroMisOverallResult") ??
            null;

          const payloadUnchanged = Boolean(existing?.rawXml && existing.rawXml === rawXml);

          // UI-owned PDF lifecycle:
          // Do NOT auto-upload PDF from SNS payload.
          // PDF availability is controlled by explicit UI upload endpoint:
          // POST /api/veriport/reports/:veriportReportId/pdf
          void embeddedPdf;

          if (!donorEmail) {
            await prisma.veriportMroReport.update({
              where: reportWhere,
              data: { emailStatus: "FAILED", emailError: "Missing DonorEmail in report payload" },
            });
          } else {
            // Avoid spamming users if SNS re-delivers identical payload for same revision.
            if (!payloadUnchanged) {
              const kind = existing ? "UPDATED" : "READY";
              const portalBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || null;
              const { subject, text } = buildVeriportReportEmail({
                kind,
                reportId: reportIdStrForUrl,
                revision,
                overallResult,
                portalBaseUrl,
              });

              try {
                // Email policy: do not attach by default. Users authenticate to access the official PDF via portal.
                // If you want attachments again, we can make it configurable via env flag.
                await sendMailWithAttachments(donorEmail, subject, text, []);
                await prisma.veriportMroReport.update({
                  where: reportWhere,
                  data: { emailedTo: donorEmail, emailedAt: new Date(), emailStatus: "SENT", emailError: null },
                });
              } catch (mailErr: any) {
                await prisma.veriportMroReport.update({
                  where: reportWhere,
                  data: { emailStatus: "FAILED", emailError: mailErr?.message ?? String(mailErr) },
                });
              }
            }
          }
        } catch (emailErr: any) {
          await prisma.veriportMroReport.update({
            where: {
              veriportReportId_reportRevisionNumber: {
                veriportReportId: reportId,
                reportRevisionNumber: revision,
              },
            },
            data: { emailStatus: "FAILED", emailError: emailErr?.message ?? String(emailErr) },
          });
        }

        return res.status(200).json({
          success: true,
          received: true,
          veriportReportId: saved.veriportReportId.toString(),
          reportRevisionNumber: saved.reportRevisionNumber,
        });
      } catch (err: any) {
        return res.status(500).json({
          success: false,
          message: "Failed to download/parse/store Veriport XML",
          error: err?.message ?? String(err),
        });
      }
    }

    // Unknown SNS message types should still return 200 to stop retries
    return res.status(200).json({ success: true, ignored: true, type: envelope.Type });
  }
);

export default router;

