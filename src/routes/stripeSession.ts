import { Router } from "express";
import Stripe from "stripe";

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-09-30.clover" });

router.get("/session/:sessionId", async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ["payment_intent"]
        });

        if (!session.payment_intent) {
            return res.status(400).json({ message: "Payment not completed yet" });
        }

        const paymentIntent: any = session.payment_intent;

        const donorInfo = JSON.parse(session.metadata?.donorInfo || "{}");
        const paymentInfo = {
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency.toUpperCase(),
            paymentMethod: paymentIntent.payment_method_types[0].toUpperCase(),
            transactionId: paymentIntent.id,
        };

        res.json({ donorInfo, paymentInfo });
    } catch (err: any) {
        console.error("Error fetching session:", err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
