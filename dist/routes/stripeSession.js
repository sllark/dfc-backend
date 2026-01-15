"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stripe_1 = __importDefault(require("stripe"));
const router = (0, express_1.Router)();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {});
router.get("/session/:sessionId", async (req, res) => {
    try {
        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY in environment" });
        }
        const { sessionId } = req.params;
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ["payment_intent"]
        });
        // Helpful debugging info even before payment completes
        if (!session.payment_intent) {
            return res.status(200).json({
                message: "Payment not completed yet",
                session: {
                    id: session.id,
                    status: session.status,
                    payment_status: session.payment_status,
                    amount_total: session.amount_total,
                    currency: session.currency,
                    customer_email: session.customer_email,
                },
            });
        }
        const paymentIntent = session.payment_intent;
        const donorInfo = JSON.parse(session.metadata?.donorInfo || "{}");
        const paymentInfo = {
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency.toUpperCase(),
            paymentMethod: paymentIntent.payment_method_types[0].toUpperCase(),
            transactionId: paymentIntent.id,
        };
        res.json({
            donorInfo,
            paymentInfo,
            session: {
                id: session.id,
                status: session.status,
                payment_status: session.payment_status,
            },
        });
    }
    catch (err) {
        console.error("Error fetching session:", err);
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=stripeSession.js.map