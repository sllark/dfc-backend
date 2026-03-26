import { Router, Request, Response } from "express";
import express from "express";
import axios from "axios";
import xml2js from "xml2js";
import { PrismaClient } from "../generated/prisma";

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
          transformResponse: (r) => r,
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

