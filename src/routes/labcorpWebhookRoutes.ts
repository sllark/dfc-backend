import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { decryptLabcorpPayload } from "../utils/labcorpEncryption";

const router = Router();
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

router.post(
  "/webhooks/labcorp/appointment",
  async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers["authorization"];
      const expected = `Bearer ${process.env.WEBHOOK_SECRET}`;

      if (!authHeader || authHeader !== expected) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      // Labcorp sends encrypted payload { value: "..." }
      const decryptedAppointment = decryptLabcorpPayload<any>(req.body);
      console.log(
        "[Labcorp Webhook] Decrypted appointment callback:",
        decryptedAppointment
      );

      const confirmationNumber = String(
        readAny(decryptedAppointment, [
          "confirmationNumber",
          "appointment.confirmationNumber",
          "data.confirmationNumber",
        ]) ?? ""
      ).trim();
      const trackingId = String(
        readAny(decryptedAppointment, ["trackingId", "id", "appointment.trackingId", "data.id"]) ?? ""
      ).trim();
      const status = String(
        readAny(decryptedAppointment, ["status", "appointment.status", "data.status"]) ?? "UPDATED"
      ).trim().toUpperCase();

      const where = confirmationNumber
        ? { confirmationNumber }
        : trackingId
          ? { trackingId }
          : null;

      if (where) {
        await prisma.appointment.updateMany({
          where,
          data: {
            status,
            lastLabcorpResponse: JSON.stringify(decryptedAppointment),
          },
        });
      }

      return res.status(200).json({ success: true, received: true });
    } catch (error: any) {
      console.error("Error handling Labcorp webhook:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to process webhook",
      });
    }
  }
);

export default router;

