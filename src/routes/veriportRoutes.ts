import { Router, Response, NextFunction } from "express";
import express from "express";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import { AuthenticatedRequest } from "../utils/types";
import { getSignedVeriportPdfUrl, uploadVeriportPdf } from "../services/veriportPdfService";
import { canAccessVeriportReport } from "../utils/veriportReportAccess";
import { isPdfBuffer } from "../utils/pdfBytes";
import axios from "axios";
import { decrypt, decryptDeterministic, encryptDeterministic } from "../utils/encryption";
import { sendMailWithAttachments } from "../utils/sendemail";
import { cloudinary } from "../utils/cloudinaryClient";

const router = Router();
const prisma = new PrismaClient();

const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

/** Accept raw `application/pdf` or multipart field `file`. */
function pdfBodyMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const ct = String(req.headers["content-type"] || "");
  if (ct.includes("multipart/form-data")) {
    return uploadPdf.single("file")(req, res, next);
  }
  return express.raw({ type: "application/pdf", limit: "15mb" })(req, res, next);
}

router.get("/veriport/reports", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const role = req.user?.role;
    const userId = req.user?.userId;
    const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
    const perPage = Math.min(
      Math.max(parseInt((req.query.perPage as string) || "10", 10), 1),
      100
    );
    const skip = (page - 1) * perPage;

    const where: any = {};
    const reportIdQuery = req.query.veriportReportId as string | undefined;
    if (reportIdQuery) {
      where.veriportReportId = BigInt(reportIdQuery);
    }

    const donorRegistrationIdQuery = req.query.donorRegistrationId as string | undefined;
    if (donorRegistrationIdQuery) {
      const donorRegistrationId = Number(donorRegistrationIdQuery);
      if (!Number.isFinite(donorRegistrationId) || donorRegistrationId <= 0) {
        return res.status(400).json({ success: false, message: "Invalid donorRegistrationId" });
      }
      const donor = await prisma.donorRegistration.findUnique({
        where: { id: donorRegistrationId },
        select: { userId: true, donorEmail: true },
      });
      if (!donor) {
        return res.status(404).json({ success: false, message: "Donor registration not found" });
      }
      if (role !== "ADMIN" && role !== "SUPERVISOR" && role !== "MODERATOR" && userId !== donor.userId) {
        return res.status(403).json({ success: false, message: "Unauthorized donorRegistrationId access" });
      }
      let donorEmailEnc: string | null = null;
      try {
        donorEmailEnc = donor.donorEmail ? encryptDeterministic(decrypt(donor.donorEmail).toLowerCase()) : null;
      } catch {
        donorEmailEnc = null;
      }
      where.OR = [
        { recipientUserId: donor.userId },
        ...(donorEmailEnc ? [{ donorEmailEnc }] : []),
      ];
    }
    if (role !== "ADMIN" && userId != null) {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      const emailEnc = u?.email;
      if (!where.OR) {
        where.OR = [{ recipientUserId: userId }, ...(emailEnc ? [{ donorEmailEnc: emailEnc }] : [])];
      }
    }

    const [rows, total] = await Promise.all([
      prisma.veriportMroReport.findMany({
        where,
        orderBy: { receivedAt: "desc" },
        skip,
        take: perPage,
        select: {
          id: true,
          veriportReportId: true,
          reportRevisionNumber: true,
          reportUpdate: true,
          receivedAt: true,
          snsMessageId: true,
          downloadUrl: true,
          emailedTo: true,
          emailStatus: true,
          pdfStatus: true,
          pdfPublicId: true,
          recipientUserId: true,
          donorEmailEnc: true,
        },
      }),
      prisma.veriportMroReport.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: rows.map((r) => ({
        ...r,
        veriportReportId: r.veriportReportId.toString(),
        pdfAvailable: Boolean(r.pdfPublicId && r.pdfStatus === "UPLOADED"),
        linkage: {
          recipientUserLinked: Boolean(r.recipientUserId),
          donorEmailLinked: Boolean(r.donorEmailEnc),
        },
      })),
      total,
      page,
      perPage,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to list Veriport reports",
    });
  }
});

router.get("/veriport/reports/:veriportReportId", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reportIdParam = req.params.veriportReportId;
    if (!reportIdParam) {
      return res.status(400).json({ success: false, message: "veriportReportId is required" });
    }
    const veriportReportId = BigInt(reportIdParam);
    const revision = (req.query.revision as string | undefined) ?? null;
    const role = req.user?.role;
    const userId = req.user?.userId;

    const report = revision
      ? await prisma.veriportMroReport.findUnique({
          where: {
            veriportReportId_reportRevisionNumber: {
              veriportReportId,
              reportRevisionNumber: revision,
            },
          },
        })
      : await prisma.veriportMroReport.findFirst({
          where: { veriportReportId },
          orderBy: { receivedAt: "desc" },
        });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Veriport report not found",
      });
    }
    if (userId == null || !(await canAccessVeriportReport(prisma, report, userId, role))) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    let parsedJson: any = null;
    try {
      parsedJson = report.parsedJson ? JSON.parse(report.parsedJson) : null;
    } catch {
      parsedJson = report.parsedJson;
    }

    return res.status(200).json({
      success: true,
      data: {
        ...report,
        veriportReportId: report.veriportReportId.toString(),
        parsedJson,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to get Veriport report",
    });
  }
});

// Secure PDF access: returns short-lived signed Cloudinary URL (ADMIN or owner / donor match)
router.get("/veriport/reports/:veriportReportId/pdf", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reportIdParam = req.params.veriportReportId;
    if (!reportIdParam) {
      return res.status(400).json({ success: false, message: "veriportReportId is required" });
    }
    const veriportReportId = BigInt(reportIdParam);
    const revision = (req.query.revision as string | undefined) ?? null;
    const role = req.user?.role;
    const userId = req.user?.userId;

    const report = revision
      ? await prisma.veriportMroReport.findUnique({
          where: {
            veriportReportId_reportRevisionNumber: { veriportReportId, reportRevisionNumber: revision },
          },
        })
      : await prisma.veriportMroReport.findFirst({
          where: { veriportReportId },
          orderBy: { receivedAt: "desc" },
        });

    if (!report) return res.status(404).json({ success: false, message: "Veriport report not found" });
    if (userId == null || !(await canAccessVeriportReport(prisma, report, userId, role))) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    if (!report.pdfPublicId || report.pdfStatus !== "UPLOADED") {
      return res.status(404).json({
        success: false,
        message: "PDF not available",
        pdfStatus: report.pdfStatus ?? null,
        pdfError: report.pdfError ?? null,
      });
    }

    const { url, expiresAt } = getSignedVeriportPdfUrl({
      publicId: report.pdfPublicId,
      version: report.pdfVersion,
      expiresInSeconds: 300,
    });

    return res.status(200).json({
      success: true,
      data: {
        url,
        expiresAt,
      },
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error?.message || "Failed to get PDF" });
  }
});

/**
 * Upload client-generated PDF (same bytes as browser download) to Cloudinary.
 * Body: raw `application/pdf` or `multipart/form-data` with field `file`.
 */
router.post(
  "/veriport/reports/:veriportReportId/pdf",
  pdfBodyMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const reportIdParam = req.params.veriportReportId;
      if (!reportIdParam) {
        return res.status(400).json({ success: false, message: "veriportReportId is required" });
      }
      const veriportReportId = BigInt(reportIdParam);
      const revision = (req.query.revision as string | undefined) ?? null;
      const role = req.user?.role;
      const userId = req.user?.userId;

      const report = revision
        ? await prisma.veriportMroReport.findUnique({
            where: {
              veriportReportId_reportRevisionNumber: { veriportReportId, reportRevisionNumber: revision },
            },
          })
        : await prisma.veriportMroReport.findFirst({
            where: { veriportReportId },
            orderBy: { receivedAt: "desc" },
          });

      if (!report) {
        return res.status(404).json({ success: false, message: "Veriport report not found" });
      }
      if (userId == null || !(await canAccessVeriportReport(prisma, report, userId, role))) {
        return res.status(403).json({ success: false, message: "Unauthorized" });
      }

      let buffer: Buffer | null = null;
      if (Buffer.isBuffer(req.body) && req.body.length > 0) {
        buffer = req.body;
      } else if (req.file?.buffer?.length) {
        buffer = req.file.buffer;
      }

      if (!buffer || !buffer.length) {
        return res.status(400).json({
          success: false,
          message: "Expected PDF body (Content-Type: application/pdf) or multipart field file",
        });
      }
      if (!isPdfBuffer(buffer)) {
        return res.status(400).json({ success: false, message: "Body is not a valid PDF (missing %PDF header)" });
      }

      const reportIdStr = report.veriportReportId.toString();
      const rev = report.reportRevisionNumber ?? null;

      try {
        const uploaded = await uploadVeriportPdf({
          reportId: reportIdStr,
          revision: rev,
          pdfBuffer: buffer,
        });

        await prisma.veriportMroReport.update({
          where: { id: report.id },
          data: {
            pdfPublicId: uploaded.publicId,
            pdfVersion: uploaded.version,
            pdfFormat: uploaded.format,
            pdfResourceType: uploaded.resourceType,
            pdfType: uploaded.type,
            pdfUploadedAt: new Date(),
            pdfStatus: "UPLOADED",
            pdfError: null,
          },
        });

        return res.status(200).json({
          success: true,
          message: "PDF stored",
          data: {
            pdfPublicId: uploaded.publicId,
            pdfVersion: uploaded.version,
            bytes: uploaded.bytes,
          },
        });
      } catch (pdfErr: any) {
        await prisma.veriportMroReport.update({
          where: { id: report.id },
          data: {
            pdfStatus: "FAILED",
            pdfError: pdfErr?.message ?? String(pdfErr),
          },
        });
        return res.status(400).json({
          success: false,
          message: pdfErr?.message ?? "Cloudinary upload failed",
        });
      }
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error?.message || "Failed to upload PDF" });
    }
  }
);

/**
 * Email the stored (Cloudinary) PDF to the report's donor email.
 * Visible to ADMIN + report owner (same access rules as GET /pdf).
 */
router.post("/veriport/reports/:veriportReportId/email-pdf", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reportIdParam = req.params.veriportReportId;
    if (!reportIdParam) {
      return res.status(400).json({ success: false, message: "veriportReportId is required" });
    }
    const veriportReportId = BigInt(reportIdParam);
    const revision = (req.query.revision as string | undefined) ?? null;
    const role = req.user?.role;
    const userId = req.user?.userId;

    const report = revision
      ? await prisma.veriportMroReport.findUnique({
          where: {
            veriportReportId_reportRevisionNumber: { veriportReportId, reportRevisionNumber: revision },
          },
        })
      : await prisma.veriportMroReport.findFirst({
          where: { veriportReportId },
          orderBy: { receivedAt: "desc" },
        });

    if (!report) {
      return res.status(404).json({ success: false, message: "Veriport report not found" });
    }
    if (userId == null || !(await canAccessVeriportReport(prisma, report, userId, role))) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    if (!report.pdfPublicId || report.pdfStatus !== "UPLOADED") {
      return res.status(404).json({
        success: false,
        message: "PDF not available",
        pdfStatus: report.pdfStatus ?? null,
        pdfError: report.pdfError ?? null,
      });
    }

    // Determine recipient email: prefer report donor email; fallback to current user email.
    let toEmail: string | null = null;
    if (report.donorEmailEnc) {
      try {
        toEmail = decryptDeterministic(report.donorEmailEnc);
      } catch {
        toEmail = null;
      }
    }
    if (!toEmail && userId != null) {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      if (u?.email) {
        try {
          toEmail = decryptDeterministic(u.email);
        } catch {
          toEmail = null;
        }
      }
    }
    if (!toEmail) {
      return res.status(400).json({ success: false, message: "No recipient email available for this report" });
    }

    // Use Cloudinary private download URL (more reliable than delivery URL for authenticated raw).
    const downloadUrl = cloudinary.utils.private_download_url(report.pdfPublicId, "pdf", {
      resource_type: "raw",
      type: "authenticated",
      ...(report.pdfVersion ? { version: report.pdfVersion } : {}),
      expires_at: Math.floor(Date.now() / 1000) + 300,
    });

    const pdfResp = await axios.get(downloadUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
      validateStatus: (s) => s >= 200 && s < 300,
    });
    const pdfBuffer = Buffer.from(pdfResp.data as ArrayBuffer);
    if (!isPdfBuffer(pdfBuffer)) {
      return res.status(400).json({ success: false, message: "Cloudinary download did not return a valid PDF" });
    }

    const reportIdStr = report.veriportReportId.toString();
    const rev = report.reportRevisionNumber ?? null;
    const subject = `Your drug test results PDF (Report ${reportIdStr})`;
    const body = `Hello,\n\nYour PDF report is attached.\n\nReport ID: ${reportIdStr}\nRevision: ${rev ?? "N/A"}\n`;

    await sendMailWithAttachments(toEmail, subject, body, [
      {
        filename: `veriport-report-${reportIdStr}${rev ? `-${rev}` : ""}.pdf`,
        contentType: "application/pdf",
        content: pdfBuffer,
      },
    ]);

    await prisma.veriportMroReport.update({
      where: { id: report.id },
      data: {
        emailedTo: toEmail,
        emailedAt: new Date(),
        emailStatus: "SENT",
        emailError: null,
      },
    });

    return res.status(200).json({ success: true, message: "Email sent" });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error?.message || "Failed to email PDF" });
  }
});

export default router;
