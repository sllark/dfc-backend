"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stripe_1 = __importDefault(require("stripe"));
const router = (0, express_1.Router)();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-09-30.clover" });
router.get("/session/:sessionId", async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ["payment_intent"]
        });
        if (!session.payment_intent) {
            return res.status(400).json({ message: "Payment not completed yet" });
        }
        const paymentIntent = session.payment_intent;
        const donorInfo = JSON.parse(session.metadata?.donorInfo || "{}");
        const paymentInfo = {
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency.toUpperCase(),
            paymentMethod: paymentIntent.payment_method_types[0].toUpperCase(),
            transactionId: paymentIntent.id,
        };
        res.json({ donorInfo, paymentInfo });
    }
    catch (err) {
        console.error("Error fetching session:", err);
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=stripeSession.js.map