"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../generated/prisma");
const router = (0, express_1.Router)();
const prisma = new prisma_1.PrismaClient();
router.get("/veriport/reports", async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page || "1", 10), 1);
        const perPage = Math.min(Math.max(parseInt(req.query.perPage || "10", 10), 1), 100);
        const skip = (page - 1) * perPage;
        const where = {};
        const reportIdQuery = req.query.veriportReportId;
        if (reportIdQuery) {
            where.veriportReportId = BigInt(reportIdQuery);
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
                },
            }),
            prisma.veriportMroReport.count({ where }),
        ]);
        return res.status(200).json({
            success: true,
            data: rows.map((r) => ({
                ...r,
                veriportReportId: r.veriportReportId.toString(),
            })),
            total,
            page,
            perPage,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error?.message || "Failed to list Veriport reports",
        });
    }
});
router.get("/veriport/reports/:veriportReportId", async (req, res) => {
    try {
        const reportIdParam = req.params.veriportReportId;
        if (!reportIdParam) {
            return res.status(400).json({ success: false, message: "veriportReportId is required" });
        }
        const veriportReportId = BigInt(reportIdParam);
        const revision = req.query.revision ?? null;
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
        let parsedJson = null;
        try {
            parsedJson = report.parsedJson ? JSON.parse(report.parsedJson) : null;
        }
        catch {
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
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error?.message || "Failed to get Veriport report",
        });
    }
});
exports.default = router;
//# sourceMappingURL=veriportRoutes.js.map