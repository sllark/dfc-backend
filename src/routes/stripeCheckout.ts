import {Router} from "express";
import Stripe from "stripe";
import AuthService from "../services/authService";
import crypto from "crypto";

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {apiVersion: "2025-09-30.clover"});

router.post("/", async (req, res) => {
    try {
        const {selectedServices, donorInfo} = req.body;

        // 1️⃣ Check if user exists
        let donorUser = await AuthService.findUserByEmail(donorInfo.donorEmail);

        if (!donorUser) {
            // 2️⃣ Register new user
            const randomPassword = crypto.randomBytes(6).toString("hex");
            donorUser = await AuthService.registerUser(
                `${donorInfo.donorNameFirst} ${donorInfo.donorNameLast}`,
                donorInfo.donorEmail,
                randomPassword
            );
        }

        // 3️⃣ Generate token
        const token = AuthService.generateToken({
            id: donorUser.id,
            role: donorUser.role,
        });

        // 4️⃣ Prepare user data (always include token)
        const userData = {
            id: donorUser.id,
            token,                  // ✅ token is here
            role: donorUser.role,
            username: donorUser.username,
            email: donorUser.email,
            phone: donorUser.phone || null,
        };

        // 5️⃣ Create Stripe session
        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            line_items: selectedServices.map((svc: any) => ({
                price_data: {
                    currency: "usd",
                    product_data: {name: svc.name},
                    unit_amount: svc.serviceFee * 100,
                },
                quantity: 1,
            })),
            customer_email: donorInfo.donorEmail,
            success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/b2c/appointment/confirmation?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/b2c/appointment/checkout?canceled=true`,
            metadata: {
                userId: String(donorUser.id),
                donorEmail: donorInfo.donorEmail,
                serviceCount: String(selectedServices.length),
                panelId: donorInfo.panelID,
            }
        });

        // 6️⃣ Respond with session URL AND user data
        res.json({sessionUrl: session.url, user: userData});
    } catch (err: any) {
        console.error("Checkout error:", err);
        res.status(500).json({error: err.message});
    }
});

export default router;
