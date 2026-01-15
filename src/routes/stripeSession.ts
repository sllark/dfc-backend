import { Router } from "express";
import Stripe from "stripe";

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});

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

        const paymentIntent: any = session.payment_intent;

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
    } catch (err: any) {
        console.error("Error fetching session:", err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
