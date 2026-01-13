import { Router } from "express";
import { paymentController } from "../controllers/paymentController";
import AuthMiddleware from "../middlewares/authMiddleware";

const router = Router();

// CREATE payment
router.post("/", AuthMiddleware.authenticate, paymentController.create);

// GET all payments
router.get("/", AuthMiddleware.authenticate, paymentController.getAll);

// GET payment by ID
router.get("/:id", AuthMiddleware.authenticate, paymentController.getById);

// UPDATE payment status
router.put("/:id/status", AuthMiddleware.authenticate, paymentController.updateStatus);

// SOFT DELETE payment
router.delete("/:id", AuthMiddleware.authenticate, paymentController.softDelete);

export default router;
