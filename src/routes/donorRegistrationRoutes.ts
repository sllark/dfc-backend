import { Router } from "express";
import { donorRegistrationController } from "../controllers/donorRegistrationController";
import AuthMiddleware from "../middlewares/authMiddleware";
import { upload } from "../middlewares/uploadMiddleware"; // if you plan to upload documents/images

const router = Router();

// CREATE a new donor registration (authenticated user only)
router.post(
    "/donor-registration",
    AuthMiddleware.authenticate,
    donorRegistrationController.create
);

// GET all donor registrations (ADMIN only or filtered for current user)
router.get(
    "/donor-registrations",
    AuthMiddleware.authenticate,
    donorRegistrationController.getAll
);

// GET a single donor registration by ID (authenticated user or ADMIN)
router.get(
    "/donor-registration/:id",
    AuthMiddleware.authenticate,
    donorRegistrationController.getById
);

// UPDATE a donor registration (resubmit/edit)
router.put(
    "/donor-registration/:id",
    AuthMiddleware.authenticate,
    donorRegistrationController.update
);

// SOFT DELETE a donor registration (ADMIN only)
router.delete(
    "/donor-registration/:id",
    AuthMiddleware.authenticate,
    donorRegistrationController.softDelete
);

// CONFIRM a donor registration (ADMIN only)
// In your routes file
router.post('/donor-registration/confirm-direct', AuthMiddleware.authenticate, donorRegistrationController.confirmDirect);

// REJECT a donor registration (ADMIN only)
router.post(
    "/donor-registration/:id/reject",
    AuthMiddleware.authenticate,
    donorRegistrationController.reject
);

export default router;
