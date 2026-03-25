"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = __importDefault(require("../middlewares/authMiddleware"));
const labcorpRestController_1 = require("../controllers/labcorpRestController");
const router = (0, express_1.Router)();
// ===== Health =====
router.get("/health", labcorpRestController_1.labcorpRestController.health);
// ===== Locations =====
router.get("/locations", authMiddleware_1.default.authenticate, labcorpRestController_1.labcorpRestController.getLocations);
router.get("/locations/search", authMiddleware_1.default.authenticate, labcorpRestController_1.labcorpRestController.searchLocations);
router.get("/locations/:id", authMiddleware_1.default.authenticate, labcorpRestController_1.labcorpRestController.getLocationById);
router.get("/locations/inactive", authMiddleware_1.default.authenticate, labcorpRestController_1.labcorpRestController.getInactiveLocations);
// ===== Appointments =====
// GET available appointment times (Labcorp REST)
router.get("/appointments/times", authMiddleware_1.default.authenticate, labcorpRestController_1.labcorpRestController.getAppointmentTimes);
// POST book an appointment (Labcorp REST, encrypted)
router.post("/appointments", authMiddleware_1.default.authenticate, labcorpRestController_1.labcorpRestController.bookAppointment);
// GET appointment by confirmation number (Labcorp REST, encrypted response)
router.get("/appointments/:confirmationNumber", authMiddleware_1.default.authenticate, labcorpRestController_1.labcorpRestController.getAppointmentByConfirmationNumber);
// PUT update appointment (Labcorp REST, encrypted)
router.put("/appointments/:confirmationNumber", authMiddleware_1.default.authenticate, labcorpRestController_1.labcorpRestController.updateAppointment);
// PUT cancel appointment (Labcorp REST, encrypted)
router.put("/appointments/:confirmationNumber/cancel", authMiddleware_1.default.authenticate, labcorpRestController_1.labcorpRestController.cancelAppointment);
// GET appointment tracking by id (no encryption)
router.get("/appointments/tracking/:id", authMiddleware_1.default.authenticate, labcorpRestController_1.labcorpRestController.getAppointmentTracking);
// ===== Subscriptions =====
router.post("/subscription", authMiddleware_1.default.authenticate, labcorpRestController_1.labcorpRestController.createSubscription);
router.delete("/subscription/:id", authMiddleware_1.default.authenticate, labcorpRestController_1.labcorpRestController.deleteSubscription);
exports.default = router;
//# sourceMappingURL=labcorpRestRoutes.js.map