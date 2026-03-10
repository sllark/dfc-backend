import { Router, Request, Response } from "express";
import { decryptLabcorpPayload } from "../utils/labcorpEncryption";

const router = Router();

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

      // TODO: integrate with your appointments persistence as needed
      console.log(
        "[Labcorp Webhook] Decrypted appointment callback:",
        decryptedAppointment
      );

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

