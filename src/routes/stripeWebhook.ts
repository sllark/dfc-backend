// routes/stripeWebhook.ts
import express from "express";
import Stripe from "stripe";
import { donorRegistrationService } from "../services/donorRegistrationService";
import { paymentService } from "../services/paymentService";
import { getClientIp } from "../utils/ipUtils";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-09-30.clover",
});

// Stripe requires raw body for webhooks
router.post("/", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err: any) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;

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
            const donorRecord = await donorRegistrationService.create(
                {
                    userId,
                    createdBy: userId,
                    updatedBy: userId,
                    createdByIP: getClientIp(req),
                    updatedByIP: getClientIp(req),
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
                } as any,
                getClientIp(req)
            );


            // 2️⃣ Create payment record
            await paymentService.create(
                {
                    donorRegistrationId: donorRecord.id,
                    userId: donorRecord.userId,
                    amount: Number(session.amount_total ?? 0) / 100,
                    currency: session.currency ?? "USD",
                    status: "COMPLETED",
                    paymentMethod: "CARD",
                    transactionId: session.payment_intent as string,
                    createdBy: donorRecord.userId,
                    updatedBy: donorRecord.userId,
                },
                getClientIp(req)
            );

            console.log("✅ Donor & Payment saved:", donorRecord.id);
        } catch (err) {
            console.error("❌ Failed to save donor/payment:", err);
        }
    }

    res.json({ received: true });
});

export default router;
