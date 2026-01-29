import { Router } from "express";
import { paymentController } from "../controllers/paymentController";
import AuthMiddleware from "../middlewares/authMiddleware";

const router = Router();

// CREATE payment
router.post("/", AuthMiddleware.authenticate, paymentController.create);

// GET all payments (paginated)
router.get("/", AuthMiddleware.authenticate, paymentController.getAll);

// GET all payments (no pagination)
router.get("/all", AuthMiddleware.authenticate, paymentController.getAllWithoutPagination);

// GET payment by ID
router.get("/:id", AuthMiddleware.authenticate, paymentController.getById);

// UPDATE payment status
router.put("/:id/status", AuthMiddleware.authenticate, paymentController.updateStatus);

// SOFT DELETE payment
router.delete("/:id", AuthMiddleware.authenticate, paymentController.softDelete);

export default router;
