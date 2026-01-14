import express, { Router } from "express";
import { serviceController } from "../controllers/serviceController";
import AuthMiddleware from "../middlewares/authMiddleware";
import { upload } from "../middlewares/uploadMiddleware";

const router = Router();

// Middleware to sanitize query params for GET /services
router.get("/", (req, res, next) => {
    req.query.page = String(Math.max(parseInt(req.query.page as string) || 1, 1));
    req.query.perPage = String(Math.max(parseInt(req.query.perPage as string) || 10, 1));
    req.query.search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    req.query.status =
        req.query.status === "true" || req.query.status === "false" ? req.query.status : "";

    next();
}, serviceController.getAll);

// Create service - supports both JSON (with image URL) and form-data (with file upload)
router.post("/", AuthMiddleware.authenticate, (req, res, next) => {
    // Only use multer if content-type is multipart/form-data
    if (req.headers['content-type']?.includes('multipart/form-data')) {
        upload.single("bannerImage")(req, res, next);
    } else {
        next();
    }
}, serviceController.create);
router.get("/:id", serviceController.getById);
// Update service - supports both JSON (with image URL) and form-data (with file upload)
router.put("/:id", AuthMiddleware.authenticate, (req, res, next) => {
    // Only use multer if content-type is multipart/form-data
    if (req.headers['content-type']?.includes('multipart/form-data')) {
        upload.single("bannerImage")(req, res, next);
    } else {
        next();
    }
}, serviceController.update);
router.delete("/:id", AuthMiddleware.authenticate, serviceController.delete);

export default router;