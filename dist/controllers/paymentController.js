"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentController = void 0;
const paymentService_1 = require("../services/paymentService");
const ipUtils_1 = require("../utils/ipUtils");
exports.paymentController = {
    // CREATE PAYMENT
    async create(req, res) {
        try {
            const ip = (0, ipUtils_1.getClientIp)(req);
            const userId = req.user.userId;
            const body = req.body;
            const payment = await paymentService_1.paymentService.create({ ...body, userId, createdBy: userId }, ip);
            res.status(201).json({ success: true, data: payment });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    // GET ALL PAYMENTS
    async getAll(req, res) {
        try {
            const page = Number(req.query.page) || 1;
            const perPage = Number(req.query.perPage) || 10;
            const status = typeof req.query.status === "string" ? req.query.status : undefined;
            const userId = req.user.userId;
            const role = req.user.role;
            const { data, total } = await paymentService_1.paymentService.getAll({
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
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    // GET PAYMENT BY ID
    async getById(req, res) {
        try {
            const id = Number(req.params.id);
            const userId = req.user.userId;
            const role = req.user.role;
            const payment = await paymentService_1.paymentService.getById(id, userId, role);
            if (!payment)
                return res.status(404).json({ success: false, message: "Payment not found or unauthorized" });
            res.json({ success: true, data: payment });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    // UPDATE PAYMENT STATUS (ADMIN ONLY)
    async updateStatus(req, res) {
        try {
            const id = Number(req.params.id);
            const { status } = req.body;
            const updatedBy = req.user.userId;
            const role = req.user.role;
            const ip = (0, ipUtils_1.getClientIp)(req);
            const payment = await paymentService_1.paymentService.updateStatus(id, status, updatedBy, ip, role);
            res.json({ success: true, data: payment });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    // SOFT DELETE PAYMENT (ADMIN ONLY)
    async softDelete(req, res) {
        try {
            const id = Number(req.params.id);
            const updatedBy = req.user.userId;
            const role = req.user.role;
            const payment = await paymentService_1.paymentService.softDelete(id, updatedBy, (0, ipUtils_1.getClientIp)(req), role);
            res.json({ success: true, data: payment });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
};
//# sourceMappingURL=paymentController.js.map