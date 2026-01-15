"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/stripeWebhook.ts
const express_1 = __importDefault(require("express"));
const stripe_1 = __importDefault(require("stripe"));
const donorRegistrationService_1 = require("../services/donorRegistrationService");
const paymentService_1 = require("../services/paymentService");
const ipUtils_1 = require("../utils/ipUtils");
const router = express_1.default.Router();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {});
// Stripe requires raw body for webhooks
router.post("/", express_1.default.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({ success: false, error: "Missing STRIPE_SECRET_KEY in environment" });
        }
        if (!process.env.STRIPE_WEBHOOK_SECRET) {
            return res.status(500).json({ success: false, error: "Missing STRIPE_WEBHOOK_SECRET in environment" });
        }
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).json({
            success: false,
            error: "Webhook signature verification failed",
            message: err.message
        });
    }
    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        try {
            // Parse metadata safely
            const userId = Number(session.metadata?.userId);
            const donorInfo = session.metadata?.donorInfo
                ? JSON.parse(session.metadata.donorInfo)
                : {};
            const services = session.metadata?.services
                ? JSON.parse(session.metadata.services)
                : [];
            // 1️⃣ Create donor registration
            const donorRecord = await donorRegistrationService_1.donorRegistrationService.create({
                userId,
                createdBy: userId,
                updatedBy: userId,
                createdByIP: (0, ipUtils_1.getClientIp)(req),
                updatedByIP: (0, ipUtils_1.getClientIp)(req),
                donorNameFirst: donorInfo.donorNameFirst,
                donorNameLast: donorInfo.donorNameLast,
                donorEmail: donorInfo.donorEmail,
                donorSSN: donorInfo.donorSSN,
                donorStateOfResidence: donorInfo.donorStateOfResidence,
                reasonForTest: donorInfo.reasonForTest,
                serviceId: services[0]?._id || "",
                accountNo: donorInfo.accountNo,
                panelId: donorInfo.panelID,
                registrationExpirationDate: donorInfo.registrationExpirationDate
                    ? new Date(donorInfo.registrationExpirationDate)
                    : new Date(),
            }, (0, ipUtils_1.getClientIp)(req));
            // 2️⃣ Create payment record
            await paymentService_1.paymentService.create({
                donorRegistrationId: donorRecord.id,
                userId: donorRecord.userId,
                amount: Number(session.amount_total ?? 0) / 100,
                currency: session.currency ?? "USD",
                status: "COMPLETED",
                paymentMethod: "CARD",
                transactionId: session.payment_intent,
                createdBy: donorRecord.userId,
                updatedBy: donorRecord.userId,
            }, (0, ipUtils_1.getClientIp)(req));
            console.log("✅ Donor & Payment saved:", donorRecord.id);
        }
        catch (err) {
            console.error("❌ Failed to save donor/payment:", err);
        }
    }
    res.json({ received: true });
});
exports.default = router;
//# sourceMappingURL=stripeWebhook.js.map