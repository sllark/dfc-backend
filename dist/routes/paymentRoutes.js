"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentController_1 = require("../controllers/paymentController");
const authMiddleware_1 = __importDefault(require("../middlewares/authMiddleware"));
const router = (0, express_1.Router)();
// CREATE payment
router.post("/", authMiddleware_1.default.authenticate, paymentController_1.paymentController.create);
// GET all payments
router.get("/", authMiddleware_1.default.authenticate, paymentController_1.paymentController.getAll);
// GET payment by ID
router.get("/:id", authMiddleware_1.default.authenticate, paymentController_1.paymentController.getById);
// UPDATE payment status
router.put("/:id/status", authMiddleware_1.default.authenticate, paymentController_1.paymentController.updateStatus);
// SOFT DELETE payment
router.delete("/:id", authMiddleware_1.default.authenticate, paymentController_1.paymentController.softDelete);
exports.default = router;
//# sourceMappingURL=paymentRoutes.js.map