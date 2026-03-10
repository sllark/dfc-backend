import { Request, Response } from "express";
import { AuthenticatedRequest } from "../utils/types";
import {
  getAppointmentTimes,
  bookAppointment,
  getAppointmentByConfirmationNumber,
  updateAppointment,
  cancelAppointment,
  getAppointmentTracking,
} from "../services/labcorp/appointmentsService";
import {
  getAllLocations,
  searchLocations,
  getLocationById,
  getInactiveLocations,
} from "../services/labcorp/locationsService";
import {
  createSubscription,
  deleteSubscription,
} from "../services/labcorp/subscriptionsService";
import { labcorpRequest } from "../utils/labcorpRestClient";

export const labcorpRestController = {
  // ===== Health =====
  async health(req: Request, res: Response) {
    try {
      const response = await labcorpRequest("GET", "/health", {
        labcorpEndpoint: "/health",
      });

      res.json({
        success: true,
        data: response.data,
      });
    } catch (error: any) {
      console.error("Error calling Labcorp health endpoint:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to reach Labcorp health endpoint",
      });
    }
  },

  // ===== Locations =====
  async getLocations(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await getAllLocations();
      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Error fetching Labcorp locations:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch locations",
      });
    }
  },

  async searchLocations(req: AuthenticatedRequest, res: Response) {
    try {
      const { radius, serviceId, address, weekday, timeframe } = req.query;

      const data = await searchLocations({
        radius: radius ? String(radius) : undefined,
        serviceId: serviceId ? String(serviceId) : undefined,
        address: address ? String(address) : undefined,
        weekday: weekday ? String(weekday) : undefined,
        timeframe: timeframe ? String(timeframe) : undefined,
      });

      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Error searching Labcorp locations:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to search locations",
      });
    }
  },

  async getLocationById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { _elements } = req.query as { _elements?: string };

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Location id is required",
        });
      }

      const data = await getLocationById(
        String(id),
        _elements ? String(_elements) : undefined
      );

      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Error fetching Labcorp location by id:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch location",
      });
    }
  },

  async getInactiveLocations(req: AuthenticatedRequest, res: Response) {
    try {
      const { startDate, endDate, noOfDays } = req.query;

      const data = await getInactiveLocations({
        startDate: startDate ? String(startDate) : undefined,
        endDate: endDate ? String(endDate) : undefined,
        noOfDays: noOfDays ? String(noOfDays) : undefined,
      });

      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Error fetching Labcorp inactive locations:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch inactive locations",
      });
    }
  },

  // ===== Appointments =====
  async getAppointmentTimes(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        locationId,
        serviceId,
        startDate,
        numberOfDays,
        weekday,
        timeframe,
      } = req.query;

      if (!locationId || !serviceId || !startDate) {
        return res.status(400).json({
          success: false,
          message: "locationId, serviceId, and startDate are required",
        });
      }

      const data = await getAppointmentTimes({
        locationId: String(locationId),
        serviceId: String(serviceId),
        startDate: String(startDate),
        numberOfDays: numberOfDays ? String(numberOfDays) : undefined,
        weekday: weekday ? String(weekday) : undefined,
        timeframe: timeframe ? String(timeframe) : undefined,
      });

      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Error fetching Labcorp appointment times:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch appointment times",
      });
    }
  },

  async bookAppointment(req: AuthenticatedRequest, res: Response) {
    try {
      const body = req.body;

      // Labcorp requires patient email; basic presence check here
      const email = body?.patient?.email || body?.email;
      if (!email || typeof email !== "string" || email.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Patient email is required for Labcorp appointment booking",
        });
      }

      const appointment = await bookAppointment(body);

      res.status(201).json({
        success: true,
        data: appointment,
      });
    } catch (error: any) {
      console.error("Error booking Labcorp appointment:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to book appointment",
      });
    }
  },

  async getAppointmentByConfirmationNumber(req: AuthenticatedRequest, res: Response) {
    try {
      const { confirmationNumber } = req.params;

      if (!confirmationNumber) {
        return res.status(400).json({
          success: false,
          message: "confirmationNumber is required",
        });
      }

      const appointment = await getAppointmentByConfirmationNumber(confirmationNumber);

      res.json({
        success: true,
        data: appointment,
      });
    } catch (error: any) {
      console.error("Error fetching Labcorp appointment by confirmation number:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch appointment",
      });
    }
  },

  async updateAppointment(req: AuthenticatedRequest, res: Response) {
    try {
      const { confirmationNumber } = req.params;
      const body = req.body;

      if (!confirmationNumber) {
        return res.status(400).json({
          success: false,
          message: "confirmationNumber is required",
        });
      }

      const appointment = await updateAppointment(confirmationNumber, body);

      res.json({
        success: true,
        data: appointment,
      });
    } catch (error: any) {
      console.error("Error updating Labcorp appointment:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update appointment",
      });
    }
  },

  async cancelAppointment(req: AuthenticatedRequest, res: Response) {
    try {
      const { confirmationNumber } = req.params;
      const body = req.body;

      if (!confirmationNumber) {
        return res.status(400).json({
          success: false,
          message: "confirmationNumber is required",
        });
      }

      const result = await cancelAppointment(confirmationNumber, body);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("Error cancelling Labcorp appointment:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to cancel appointment",
      });
    }
  },

  async getAppointmentTracking(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Tracking id is required",
        });
      }

      const tracking = await getAppointmentTracking(id);

      res.json({
        success: true,
        data: tracking,
      });
    } catch (error: any) {
      console.error("Error fetching Labcorp appointment tracking:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch appointment tracking",
      });
    }
  },

  // ===== Subscriptions =====
  async createSubscription(req: AuthenticatedRequest, res: Response) {
    try {
      const body = req.body;

      const subscription = await createSubscription(body);

      res.status(201).json({
        success: true,
        data: subscription,
      });
    } catch (error: any) {
      console.error("Error creating Labcorp subscription:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create subscription",
      });
    }
  },

  async deleteSubscription(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Subscription id is required",
        });
      }

      const result = await deleteSubscription(id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("Error deleting Labcorp subscription:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete subscription",
      });
    }
  },
};

