"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.donorRegistrationController = void 0;
const donorRegistrationService_1 = require("../services/donorRegistrationService");
const ipUtils_1 = require("../utils/ipUtils");
exports.donorRegistrationController = {
    // ================= CREATE =================
    async create(req, res) {
        try {
            const ip = (0, ipUtils_1.getClientIp)(req);
            const userId = req.user?.userId;
            if (!userId)
                return res.status(401).json({ success: false, message: "Unauthorized" });
            const data = {
                ...req.body,
                userId,
                createdBy: userId,
                updatedBy: userId,
                panelId: req.body.panelId,
                registrationExpirationDate: req.body.registrationExpirationDate,
            };
            const registration = await donorRegistrationService_1.donorRegistrationService.create(data, ip);
            res.status(201).json({ success: true, data: registration });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },
    // ================= GET ALL =================
    async getAll(req, res) {
        try {
            const page = Number(req.query.page) || 1;
            const perPage = Number(req.query.perPage) || 10;
            const search = typeof req.query.search === "string" ? req.query.search : undefined;
            const status = typeof req.query.status === "string" ? req.query.status : undefined;
            const currentUser = req.user;
            const role = currentUser?.role;
            const { data, total } = await donorRegistrationService_1.donorRegistrationService.getAll({
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
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },
    // ================= GET BY ID =================
    async getById(req, res) {
        try {
            const id = Number(req.params.id);
            const currentUser = req.user;
            const role = currentUser?.role;
            const registration = await donorRegistrationService_1.donorRegistrationService.getById(id, currentUser?.userId, role);
            if (!registration)
                return res.status(404).json({ success: false, message: "Not found" });
            res.json({ success: true, data: registration });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },
    // ================= UPDATE =================
    async update(req, res) {
        try {
            const id = Number(req.params.id);
            const ip = (0, ipUtils_1.getClientIp)(req);
            const updatedBy = req.user?.userId;
            const role = req.user?.role;
            if (!updatedBy)
                return res.status(401).json({ success: false, message: "Unauthorized" });
            const data = { ...req.body };
            const updated = await donorRegistrationService_1.donorRegistrationService.update(id, data, ip, updatedBy, role);
            res.json({ success: true, data: updated });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },
    // ================= SOFT DELETE =================
    async softDelete(req, res) {
        try {
            const id = Number(req.params.id);
            const ip = (0, ipUtils_1.getClientIp)(req);
            const updatedBy = req.user?.userId;
            const role = req.user?.role;
            if (!updatedBy)
                return res.status(401).json({ success: false, message: "Unauthorized" });
            const deleted = await donorRegistrationService_1.donorRegistrationService.softDelete(id, updatedBy, ip, role);
            res.json({ success: true, data: deleted });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },
    // ================= CONFIRM =================
    async confirmDirect(req, res) {
        try {
            const ip = (0, ipUtils_1.getClientIp)(req);
            const updatedBy = req.user?.userId;
            const role = req.user?.role;
            if (!updatedBy) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }
            const { donorNameFirst, donorNameLast, donorSex, donorDateOfBirth, donorSSN, donorStateOfResidence, panelId, // Encrypted from service
            accountNumber, // Encrypted from service
            testingAuthority, registrationExpirationDate, donorReasonForTest, } = req.body;
            // Validate required fields
            if (!donorNameFirst || !donorNameLast || !donorSex || !donorDateOfBirth || !panelId || !accountNumber) {
                return res.status(400).json({
                    success: false,
                    message: "Missing required fields"
                });
            }
            const result = await donorRegistrationService_1.donorRegistrationService.confirmDirect({
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
        }
        catch (err) {
            console.error('Confirm direct error:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },
    // ================= REJECT =================
    async reject(req, res) {
        try {
            const id = Number(req.params.id);
            const { rejectReason } = req.body;
            const ip = (0, ipUtils_1.getClientIp)(req);
            const updatedBy = req.user?.userId;
            const role = req.user?.role;
            if (!updatedBy)
                return res.status(401).json({ success: false, message: "Unauthorized" });
            const rejected = await donorRegistrationService_1.donorRegistrationService.reject(id, rejectReason, updatedBy, ip, role);
            res.json({ success: true, data: rejected });
        }
        catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },
};
//# sourceMappingURL=donorRegistrationController.js.map