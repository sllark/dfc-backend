"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const donorRegistrationController_1 = require("../controllers/donorRegistrationController");
const authMiddleware_1 = __importDefault(require("../middlewares/authMiddleware"));
const router = (0, express_1.Router)();
// CREATE a new donor registration (authenticated user only)
router.post("/donor-registration", authMiddleware_1.default.authenticate, donorRegistrationController_1.donorRegistrationController.create);
// GET all donor registrations (ADMIN only or filtered for current user)
router.get("/donor-registrations", authMiddleware_1.default.authenticate, donorRegistrationController_1.donorRegistrationController.getAll);
// GET a single donor registration by ID (authenticated user or ADMIN)
router.get("/donor-registration/:id", authMiddleware_1.default.authenticate, donorRegistrationController_1.donorRegistrationController.getById);
// UPDATE a donor registration (resubmit/edit)
router.put("/donor-registration/:id", authMiddleware_1.default.authenticate, donorRegistrationController_1.donorRegistrationController.update);
// SOFT DELETE a donor registration (ADMIN only)
router.delete("/donor-registration/:id", authMiddleware_1.default.authenticate, donorRegistrationController_1.donorRegistrationController.softDelete);
// CONFIRM a donor registration (ADMIN only)
// In your routes file
router.post('/donor-registration/confirm-direct', authMiddleware_1.default.authenticate, donorRegistrationController_1.donorRegistrationController.confirmDirect);
// REJECT a donor registration (ADMIN only)
router.post("/donor-registration/:id/reject", authMiddleware_1.default.authenticate, donorRegistrationController_1.donorRegistrationController.reject);
exports.default = router;
//# sourceMappingURL=donorRegistrationRoutes.js.map