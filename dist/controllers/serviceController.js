"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceController = void 0;
const serviceService_1 = require("../services/serviceService");
exports.serviceController = {
    // ✅ Create new service
    async create(req, res) {
        try {
            const { name, slug, accountNo, panelID, createdBy, status, serviceFee } = req.body;
            // Validate required fields
            if (!name || !slug || !createdBy) {
                return res.status(400).json({
                    success: false,
                    message: "Name, slug, and createdBy are required"
                });
            }
            // Handle banner image: either from file upload or URL from body
            let bannerImage = null;
            if (req.file) {
                // File uploaded via form-data
                bannerImage = `/uploads/${req.file.filename}`;
            }
            else if (req.body.bannerImage) {
                // Image URL provided in JSON body
                bannerImage = req.body.bannerImage;
            }
            const data = {
                name,
                slug,
                accountNo: accountNo ? accountNo : null,
                panelID: panelID ? panelID : null, // ✅ added encryption
                serviceFee: serviceFee !== undefined ? Number(serviceFee) : null, // ✅ added serviceFee
                status: status !== undefined ? status === "true" || status === true : true,
                bannerImage,
                createdBy: Number(createdBy),
            };
            const service = await serviceService_1.serviceService.create(data);
            res.status(201).json({ success: true, data: service });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    // ✅ Get all services
    async getAll(req, res) {
        try {
            const page = Number(req.query.page) || 1;
            const perPage = 10;
            const search = typeof req.query.search === "string" ? req.query.search : null;
            const status = typeof req.query.status === "string" ? req.query.status : null;
            const minFee = req.query.minFee ? Number(req.query.minFee) : null;
            const maxFee = req.query.maxFee ? Number(req.query.maxFee) : null;
            const sortBy = req.query.sortBy || "createdAt";
            const sortOrder = req.query.sortOrder || "desc";
            const { data, total } = await serviceService_1.serviceService.getAll({
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
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    // ✅ Get service by ID
    async getById(req, res) {
        try {
            const id = Number(req.params.id);
            const service = await serviceService_1.serviceService.getById(id);
            if (!service)
                return res.status(404).json({ success: false, message: "Service not found" });
            res.json({ success: true, data: service });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    // ✅ Update service
    async update(req, res) {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ success: false, message: "Invalid service ID" });
            }
            const { name, slug, accountNo, panelID, updatedBy, status, serviceFee } = req.body;
            // Handle banner image: either from file upload or URL from body
            let bannerImageUpdate = {};
            if (req.file) {
                // File uploaded via form-data
                bannerImageUpdate = { bannerImage: `/uploads/${req.file.filename}` };
            }
            else if (req.body.bannerImage !== undefined) {
                // Image URL provided in JSON body (can be null to remove image)
                bannerImageUpdate = { bannerImage: req.body.bannerImage || null };
            }
            const data = {
                ...(name !== undefined && { name }),
                ...(slug !== undefined && { slug }),
                ...(accountNo !== undefined && { accountNo: accountNo }),
                ...(panelID !== undefined && { panelID: panelID }), // ✅ added encryption
                ...(serviceFee !== undefined && { serviceFee: Number(serviceFee) }), // ✅ added serviceFee
                ...(status !== undefined && { status: status === "true" || status === true }),
                ...(updatedBy !== undefined && { updatedBy: Number(updatedBy) }),
                ...bannerImageUpdate,
            };
            const updated = await serviceService_1.serviceService.update(id, data);
            res.json({ success: true, data: updated });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    // ✅ Soft delete
    async delete(req, res) {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ success: false, message: "Invalid service ID" });
            }
            const { updatedBy } = req.body;
            if (!updatedBy) {
                return res.status(400).json({ success: false, message: "updatedBy is required" });
            }
            const deleted = await serviceService_1.serviceService.softDelete(id, Number(updatedBy));
            res.json({ success: true, data: deleted });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
};
//# sourceMappingURL=serviceController.js.map