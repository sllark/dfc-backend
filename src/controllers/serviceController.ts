import { Request, Response } from "express";
import { Prisma } from "../generated/prisma";
import { serviceService } from "../services/serviceService";
import { encryptDeterministic } from "../utils/encryption";

export const serviceController = {
    // ✅ Create new service
    async create(req: Request, res: Response) {
        try {
            const { name, slug, accountNo, panelID, createdBy, status, serviceFee } = req.body;

            const bannerImage: string | null = req.file ? `/uploads/${req.file.filename}` : null;

            const data: Prisma.ServiceUncheckedCreateInput = {
                name,
                slug,
                accountNo: accountNo ? accountNo : null,
                panelID: panelID ? panelID : null, // ✅ added encryption
                serviceFee: serviceFee !== undefined ? Number(serviceFee) : null, // ✅ added serviceFee
                status: status !== undefined ? status === "true" || status === true : true,
                bannerImage,
                createdBy: Number(createdBy),
            };

            const service = await serviceService.create(data);
            res.status(201).json({ success: true, data: service });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // ✅ Get all services
    async getAll(req: Request, res: Response) {
        try {
            const page = Number(req.query.page) || 1;
            const perPage = 10;
            const search = typeof req.query.search === "string" ? req.query.search : null;
            const status = typeof req.query.status === "string" ? req.query.status : null;

            const minFee = req.query.minFee ? Number(req.query.minFee) : null;
            const maxFee = req.query.maxFee ? Number(req.query.maxFee) : null;
            const sortBy = (req.query.sortBy as "createdAt" | "serviceFee") || "createdAt";
            const sortOrder = (req.query.sortOrder as "asc" | "desc") || "desc";

            const { data, total } = await serviceService.getAll({
                page,
                perPage,
                search,
                status,
                minFee,
                maxFee,
                sortBy,
                sortOrder,
            });

            res.json({
                success: true,
                data,
                meta: {
                    total,
                    current_page: page,
                    last_page: Math.ceil(total / perPage),
                },
            });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // ✅ Get service by ID
    async getById(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            const service = await serviceService.getById(id);

            if (!service) return res.status(404).json({ success: false, message: "Service not found" });

            res.json({ success: true, data: service });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // ✅ Update service
    async update(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            const { name, slug, accountNo, panelID, updatedBy, status, serviceFee } = req.body;

            const data: Prisma.ServiceUncheckedUpdateInput = {
                ...(name !== undefined && { name }),
                ...(slug !== undefined && { slug }),
                ...(accountNo !== undefined && { accountNo: accountNo }),
                ...(panelID !== undefined && { panelID: panelID }), // ✅ added encryption
                ...(serviceFee !== undefined && { serviceFee: Number(serviceFee) }), // ✅ added serviceFee
                ...(status !== undefined && { status: status === "true" || status === true }),
                ...(updatedBy !== undefined && { updatedBy: Number(updatedBy) }),
                ...(req.file && { bannerImage: `/uploads/${req.file.filename}` }),
            };

            const updated = await serviceService.update(id, data);
            res.json({ success: true, data: updated });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // ✅ Soft delete
    async delete(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            const { updatedBy } = req.body;

            const deleted = await serviceService.softDelete(id, Number(updatedBy));
            res.json({ success: true, data: deleted });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
};
