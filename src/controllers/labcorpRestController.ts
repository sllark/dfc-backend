import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
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
import { decryptDeterministic } from "../utils/encryption";

const prisma = new PrismaClient();

function readAny(obj: any, paths: string[]): any {
  for (const path of paths) {
    const value = path.split(".").reduce((acc: any, key: string) => (acc == null ? undefined : acc[key]), obj);
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return undefined;
}

function toDateOnly(value: any): string | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function normalizeTimeSlot(value: any): string | null {
  if (!value) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

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
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      // Labcorp requires patient email; basic presence check here
      const email = body?.patient?.email || body?.email;
      if (!email || typeof email !== "string" || email.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Patient email is required for Labcorp appointment booking",
        });
      }

      const donorRegistrationIdRaw = readAny(body, [
        "donorRegistrationId",
        "metadata.donorRegistrationId",
      ]);
      const donorRegistrationId = Number(donorRegistrationIdRaw);
      if (!Number.isFinite(donorRegistrationId) || donorRegistrationId <= 0) {
        return res.status(400).json({
          success: false,
          message: "donorRegistrationId is required to reserve an appointment slot",
        });
      }

      const donor = await prisma.donorRegistration.findUnique({
        where: { id: donorRegistrationId },
        select: {
          id: true,
          userId: true,
          panelId: true,
          accountNo: true,
          accountNoSnapshot: true,
        },
      });
      if (!donor) {
        return res.status(404).json({
          success: false,
          message: "Linked donor registration not found",
        });
      }
      if (donor.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized donor registration access",
        });
      }

      const appointmentDate = toDateOnly(
        readAny(body, ["appointmentDate", "date", "slot.date", "appointment.date"])
      );
      const timeSlot = normalizeTimeSlot(
        readAny(body, ["timeSlot", "slot", "slot.time", "appointment.time"])
      );
      const locationId = String(
        readAny(body, ["locationId", "location.id", "appointment.locationId"]) ?? ""
      ).trim();
      const serviceId = String(
        readAny(body, ["serviceId", "service.id", "appointment.serviceId"]) ?? ""
      ).trim();
      if (!appointmentDate || !timeSlot || !locationId || !serviceId) {
        return res.status(400).json({
          success: false,
          message: "appointmentDate, timeSlot, locationId, and serviceId are required",
        });
      }

      const existing = await prisma.appointment.findUnique({
        where: {
          userId_appointmentDate_timeSlot_locationId_serviceId: {
            userId,
            appointmentDate: new Date(`${appointmentDate}T00:00:00.000Z`),
            timeSlot,
            locationId,
            serviceId,
          },
        },
        select: { id: true, status: true },
      });
      if (existing && existing.status !== "CANCELLED") {
        return res.status(409).json({
          success: false,
          message: "Slot already reserved for this user/date/time/location/service",
        });
      }

      const appointment = await bookAppointment(body);

      const confirmationNumber = String(
        readAny(appointment, [
          "confirmationNumber",
          "appointment.confirmationNumber",
          "data.confirmationNumber",
        ]) ?? ""
      ).trim() || null;
      const trackingId = String(
        readAny(appointment, ["trackingId", "id", "appointment.trackingId"]) ?? ""
      ).trim() || null;

      const accountNoEncrypted = donor.accountNoSnapshot || donor.accountNo || null;
      const accountNo = accountNoEncrypted ? decryptDeterministic(accountNoEncrypted) : "";

      const appointmentData = {
        userId,
        donorRegistrationId: donor.id,
        confirmationNumber,
        trackingId,
        appointmentDate: new Date(`${appointmentDate}T00:00:00.000Z`),
        timeSlot,
        locationId,
        serviceId,
        panelId: donor.panelId,
        accountNo,
        status: "BOOKED",
        lastLabcorpRequest: JSON.stringify(body),
        lastLabcorpResponse: JSON.stringify(appointment),
      };

      if (existing?.id) {
        await prisma.appointment.update({
          where: { id: existing.id },
          data: appointmentData,
        });
      } else {
        await prisma.appointment.create({ data: appointmentData });
      }

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

      await prisma.appointment.updateMany({
        where: { confirmationNumber },
        data: {
          status: "UPDATED",
          lastLabcorpRequest: JSON.stringify(body),
          lastLabcorpResponse: JSON.stringify(appointment),
        },
      });

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

      await prisma.appointment.updateMany({
        where: { confirmationNumber },
        data: {
          status: "CANCELLED",
          lastLabcorpRequest: JSON.stringify(body),
          lastLabcorpResponse: JSON.stringify(result),
        },
      });

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

  async getMyAppointments(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const { status, fromDate, toDate, locationId } = req.query;
      const where: any = { userId };
      if (status) where.status = String(status);
      if (locationId) where.locationId = String(locationId);
      if (fromDate || toDate) {
        where.appointmentDate = {};
        if (fromDate) where.appointmentDate.gte = new Date(`${String(fromDate)}T00:00:00.000Z`);
        if (toDate) where.appointmentDate.lte = new Date(`${String(toDate)}T23:59:59.999Z`);
      }

      const data = await prisma.appointment.findMany({
        where,
        orderBy: [{ appointmentDate: "desc" }, { createdAt: "desc" }],
      });

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error("Error fetching tracked appointments:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch tracked appointments",
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

