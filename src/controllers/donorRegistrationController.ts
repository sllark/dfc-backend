import { Request, Response } from "express";
import { AuthenticatedRequest } from "../utils/types";
import { donorRegistrationService } from "../services/donorRegistrationService";
import { getClientIp } from "../utils/ipUtils";
import { Prisma } from "../generated/prisma";

type RoleType = "ADMIN" | "USER" | "SUPERVISOR" | "MODERATOR" | undefined;

export const donorRegistrationController = {
    // ================= CREATE =================
    async create(req: AuthenticatedRequest, res: Response) {
        try {
            const ip = getClientIp(req);
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

            const data: Prisma.DonorRegistrationUncheckedCreateInput = {
                ...req.body,
                userId,
                createdBy: userId,
                updatedBy: userId,
                panelId: req.body.panelId,
                registrationExpirationDate: req.body.registrationExpirationDate,
            };

            const registration = await donorRegistrationService.create(data, ip);
            res.status(201).json({ success: true, data: registration });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // ================= GET ALL =================
    async getAll(req: AuthenticatedRequest, res: Response) {
        try {
            const page = Number(req.query.page) || 1;
            const perPage = Number(req.query.perPage) || 10;
            const search = typeof req.query.search === "string" ? req.query.search : undefined;
            const status = typeof req.query.status === "string" ? req.query.status : undefined;
            const currentUser = req.user;
            const role = currentUser?.role as RoleType;

            const { data, total } = await donorRegistrationService.getAll({
                page,
                perPage,
                search,
                status,
                currentUserId: currentUser?.userId,
                role,
            });

            res.json({
                success: true,
                data,
                meta: { total, current_page: page, last_page: Math.ceil(total / perPage) },
            });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // ================= GET BY ID =================
    async getById(req: AuthenticatedRequest, res: Response) {
        try {
            const id = Number(req.params.id);
            const currentUser = req.user;
            const role = currentUser?.role as RoleType;

            const registration = await donorRegistrationService.getById(id, currentUser?.userId, role);
            if (!registration) return res.status(404).json({ success: false, message: "Not found" });

            res.json({ success: true, data: registration });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // ================= UPDATE =================
    async update(req: AuthenticatedRequest, res: Response) {
        try {
            const id = Number(req.params.id);
            const ip = getClientIp(req);
            const updatedBy = req.user?.userId;
            const role = req.user?.role as RoleType;
            if (!updatedBy) return res.status(401).json({ success: false, message: "Unauthorized" });

            const data: Prisma.DonorRegistrationUncheckedUpdateInput = { ...req.body };
            const updated = await donorRegistrationService.update(id, data, ip, updatedBy, role);

            res.json({ success: true, data: updated });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // ================= SOFT DELETE =================
    async softDelete(req: AuthenticatedRequest, res: Response) {
        try {
            const id = Number(req.params.id);
            const ip = getClientIp(req);
            const updatedBy = req.user?.userId;
            const role = req.user?.role as RoleType;
            if (!updatedBy) return res.status(401).json({ success: false, message: "Unauthorized" });

            const deleted = await donorRegistrationService.softDelete(id, updatedBy, ip, role);
            res.json({ success: true, data: deleted });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // ================= CONFIRM =================
    async confirmDirect(req: AuthenticatedRequest, res: Response) {
        try {
            const ip = getClientIp(req);
            const updatedBy = req.user?.userId;
            const role = req.user?.role as "ADMIN" | "USER" | undefined;

            if (!updatedBy) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            const {
                donorNameFirst,
                donorNameLast,
                donorSex,
                donorDateOfBirth,
                donorSSN,
                donorStateOfResidence,
                panelId, // Encrypted from service
                accountNumber, // Encrypted from service
                testingAuthority,
                registrationExpirationDate,
                donorReasonForTest,
            } = req.body;

            // Validate required fields
            if (!donorNameFirst || !donorNameLast || !donorSex || !donorDateOfBirth || !panelId || !accountNumber) {
                return res.status(400).json({
                    success: false,
                    message: "Missing required fields"
                });
            }
            const result = await donorRegistrationService.confirmDirect({
                donorNameFirst,
                donorNameLast,
                donorSex,
                donorDateOfBirth,
                donorSSN,
                donorStateOfResidence,
                panelId,
                accountNumber,
                testingAuthority,
                registrationExpirationDate,
                donorReasonForTest,
            });

            // Either return the result directly (if it already has success: true)
            res.json(result);

            // OR if you want to be explicit:
            // res.json({
            //     success: true,
            //     labcorpRegistrationNumber: result.labcorpRegistrationNumber
            // });

        } catch (err: any) {
            console.error('Confirm direct error:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // ================= REJECT =================
    async reject(req: AuthenticatedRequest, res: Response) {
        try {
            const id = Number(req.params.id);
            const { rejectReason } = req.body;
            const ip = getClientIp(req);
            const updatedBy = req.user?.userId;
            const role = req.user?.role as "ADMIN" | "USER" | undefined;
            if (!updatedBy) return res.status(401).json({ success: false, message: "Unauthorized" });

            const rejected = await donorRegistrationService.reject(id, rejectReason, updatedBy, ip, role);

            res.json({ success: true, data: rejected });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    },
};
