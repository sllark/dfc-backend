"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const labcorpEncryption_1 = require("../utils/labcorpEncryption");
const router = (0, express_1.Router)();
router.post("/webhooks/labcorp/appointment", async (req, res) => {
    try {
        const authHeader = req.headers["authorization"];
        const expected = `Bearer ${process.env.WEBHOOK_SECRET}`;
        if (!authHeader || authHeader !== expected) {
            return res.status(401).json({ success: false, error: "Unauthorized" });
        }
        // Labcorp sends encrypted payload { value: "..." }
        const decryptedAppointment = (0, labcorpEncryption_1.decryptLabcorpPayload)(req.body);
        // TODO: integrate with your appointments persistence as needed
        console.log("[Labcorp Webhook] Decrypted appointment callback:", decryptedAppointment);
        return res.status(200).json({ success: true, received: true });
    }
    catch (error) {
        console.error("Error handling Labcorp webhook:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to process webhook",
        });
    }
});
exports.default = router;
//# sourceMappingURL=labcorpWebhookRoutes.js.map