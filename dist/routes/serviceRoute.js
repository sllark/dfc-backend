"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const serviceController_1 = require("../controllers/serviceController");
const authMiddleware_1 = __importDefault(require("../middlewares/authMiddleware"));
const uploadMiddleware_1 = require("../middlewares/uploadMiddleware");
const router = (0, express_1.Router)();
// Middleware to sanitize query params for GET /services
router.get("/", (req, res, next) => {
    req.query.page = String(Math.max(parseInt(req.query.page) || 1, 1));
    req.query.perPage = String(Math.max(parseInt(req.query.perPage) || 10, 1));
    req.query.search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    req.query.status =
        req.query.status === "true" || req.query.status === "false" ? req.query.status : "";
    next();
}, serviceController_1.serviceController.getAll);
// Create service - supports both JSON (with image URL) and form-data (with file upload)
router.post("/", authMiddleware_1.default.authenticate, (req, res, next) => {
    // Only use multer if content-type is multipart/form-data
    if (req.headers['content-type']?.includes('multipart/form-data')) {
        uploadMiddleware_1.upload.single("bannerImage")(req, res, next);
    }
    else {
        next();
    }
}, serviceController_1.serviceController.create);
router.get("/:id", serviceController_1.serviceController.getById);
// Update service - supports both JSON (with image URL) and form-data (with file upload)
router.put("/:id", authMiddleware_1.default.authenticate, (req, res, next) => {
    // Only use multer if content-type is multipart/form-data
    if (req.headers['content-type']?.includes('multipart/form-data')) {
        uploadMiddleware_1.upload.single("bannerImage")(req, res, next);
    }
    else {
        next();
    }
}, serviceController_1.serviceController.update);
router.delete("/:id", authMiddleware_1.default.authenticate, serviceController_1.serviceController.delete);
exports.default = router;
//# sourceMappingURL=serviceRoute.js.map