import { Router, Response } from "express";
import { AuthenticatedRequest } from "../utils/types";
import { sendUpcomingTestReminders } from "../services/reminderEmailService";

const router = Router();

router.post("/email/reminders/run", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const role = req.user?.role;
    if (role !== "ADMIN" && role !== "SUPERVISOR" && role !== "MODERATOR") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    const hoursAheadRaw = Number((req.body?.hoursAhead ?? process.env.TEST_REMINDER_HOURS_AHEAD ?? 24));
    const hoursAhead = Number.isFinite(hoursAheadRaw) ? Math.max(1, Math.min(168, hoursAheadRaw)) : 24;
    const result = await sendUpcomingTestReminders(hoursAhead);
    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to run reminder job",
    });
  }
});

export default router;

