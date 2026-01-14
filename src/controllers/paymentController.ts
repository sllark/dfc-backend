import { Request, Response } from "express";
import { paymentService } from "../services/paymentService";
import { getClientIp } from "../utils/ipUtils";
import { AuthenticatedRequest } from "../utils/types";

interface CreatePaymentBody {
    donorRegistrationId: number;
    amount: number;
    currency: string;
    paymentMethod: string;
    transactionId: string;
}

export const paymentController = {
    // CREATE PAYMENT
    async create(req: AuthenticatedRequest, res: Response) {
        try {
            const ip = getClientIp(req);
            const userId = req.user!.userId;
            const body: CreatePaymentBody = req.body;

            // Validate required fields
            if (!body.donorRegistrationId || !body.amount || !body.currency || !body.paymentMethod || !body.transactionId) {
                return res.status(400).json({ 
                    success: false,
                    message: "donorRegistrationId, amount, currency, paymentMethod, and transactionId are required" 
                });
            }

            const payment = await paymentService.create(
                { ...body, userId, createdBy: userId },
                ip
            );

            res.status(201).json({ success: true, data: payment });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // GET ALL PAYMENTS
    async getAll(req: AuthenticatedRequest, res: Response) {
        try {
            const page = Number(req.query.page) || 1;
            const perPage = Number(req.query.perPage) || 10;
            const status = typeof req.query.status === "string" ? req.query.status : undefined;

            const userId = req.user!.userId;
            const role = req.user!.role as "ADMIN" | "USER";

            const { data, total } = await paymentService.getAll({
                page,
                perPage,
                status,
                requestingUserId: userId,
                role,
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

    // GET PAYMENT BY ID
    async getById(req: AuthenticatedRequest, res: Response) {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ success: false, message: "Invalid payment ID" });
            }

            const userId = req.user!.userId;
            const role = req.user!.role as "ADMIN" | "USER";

            const payment = await paymentService.getById(id, userId, role);
            if (!payment) return res.status(404).json({ success: false, message: "Payment not found or unauthorized" });

            res.json({ success: true, data: payment });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // UPDATE PAYMENT STATUS (ADMIN ONLY)
    async updateStatus(req: AuthenticatedRequest, res: Response) {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ success: false, message: "Invalid payment ID" });
            }

            const { status } = req.body;
            if (!status) {
                return res.status(400).json({ success: false, message: "Status is required" });
            }

            const updatedBy = req.user!.userId;
            const role = req.user!.role as "ADMIN" | "USER";
            const ip = getClientIp(req);

            const payment = await paymentService.updateStatus(id, status, updatedBy, ip, role);
            res.json({ success: true, data: payment });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // SOFT DELETE PAYMENT (ADMIN ONLY)
    async softDelete(req: AuthenticatedRequest, res: Response) {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ success: false, message: "Invalid payment ID" });
            }

            const updatedBy = req.user!.userId;
            const role = req.user!.role as "ADMIN" | "USER";

            const payment = await paymentService.softDelete(id, updatedBy, getClientIp(req), role);
            res.json({ success: true, data: payment });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
};
