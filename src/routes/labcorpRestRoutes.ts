import { Router } from "express";
import AuthMiddleware from "../middlewares/authMiddleware";
import { labcorpRestController } from "../controllers/labcorpRestController";

const router = Router();

// ===== Health =====
router.get(
  "/health",
  labcorpRestController.health
);

// ===== Locations =====
router.get(
  "/locations",
  AuthMiddleware.authenticate,
  labcorpRestController.getLocations
);

router.get(
  "/locations/search",
  AuthMiddleware.authenticate,
  labcorpRestController.searchLocations
);

router.get(
  "/locations/:id",
  AuthMiddleware.authenticate,
  labcorpRestController.getLocationById
);

router.get(
  "/locations/inactive",
  AuthMiddleware.authenticate,
  labcorpRestController.getInactiveLocations
);

// ===== Appointments =====
// GET available appointment times (Labcorp REST)
router.get(
  "/appointments/times",
  AuthMiddleware.authenticate,
  labcorpRestController.getAppointmentTimes
);

// POST book an appointment (Labcorp REST, encrypted)
router.post(
  "/appointments",
  AuthMiddleware.authenticate,
  labcorpRestController.bookAppointment
);

// GET appointment by confirmation number (Labcorp REST, encrypted response)
router.get(
  "/appointments/:confirmationNumber",
  AuthMiddleware.authenticate,
  labcorpRestController.getAppointmentByConfirmationNumber
);

// PUT update appointment (Labcorp REST, encrypted)
router.put(
  "/appointments/:confirmationNumber",
  AuthMiddleware.authenticate,
  labcorpRestController.updateAppointment
);

// PUT cancel appointment (Labcorp REST, encrypted)
router.put(
  "/appointments/:confirmationNumber/cancel",
  AuthMiddleware.authenticate,
  labcorpRestController.cancelAppointment
);

// GET appointment tracking by id (no encryption)
router.get(
  "/appointments/tracking/:id",
  AuthMiddleware.authenticate,
  labcorpRestController.getAppointmentTracking
);

// ===== Subscriptions =====
router.post(
  "/subscription",
  AuthMiddleware.authenticate,
  labcorpRestController.createSubscription
);

router.delete(
  "/subscription/:id",
  AuthMiddleware.authenticate,
  labcorpRestController.deleteSubscription
);

export default router;

