import {Router} from "express";
import Stripe from "stripe";
import AuthService from "../services/authService";
import crypto from "crypto";

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});

router.post("/", async (req, res) => {
    try {
        const {selectedServices, donorInfo} = req.body;
        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY in environment" });
        }
        if (!process.env.NEXT_PUBLIC_BASE_URL) {
            return res.status(500).json({ error: "Missing NEXT_PUBLIC_BASE_URL in environment" });
        }
        if (!donorInfo?.donorEmail) {
            return res.status(400).json({ error: "donorInfo.donorEmail is required" });
        }
        if (!Array.isArray(selectedServices) || selectedServices.length === 0) {
            return res.status(400).json({ error: "selectedServices must be a non-empty array" });
        }

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

        // 5️⃣ Validate and prepare services
        console.log("📦 Received selectedServices:", JSON.stringify(selectedServices, null, 2));
        
        const validatedServices = selectedServices.map((svc: any, index: number) => {
            // Try multiple possible field names for the price
            const serviceFee = Number(svc.serviceFee ?? svc.price ?? svc.amount ?? svc.fee ?? 0);
            
            console.log(`🔍 Validating service ${index}:`, {
                original: svc,
                serviceFee: serviceFee,
                isNaN: isNaN(serviceFee),
                isValid: !isNaN(serviceFee) && serviceFee > 0
            });
            
            if (isNaN(serviceFee) || serviceFee <= 0) {
                throw new Error(
                    `Invalid serviceFee for service at index ${index}. ` +
                    `Received: ${JSON.stringify(svc)}, ` +
                    `Parsed serviceFee: ${serviceFee}, ` +
                    `Expected: a positive number. ` +
                    `Please ensure the service object has a valid 'serviceFee', 'price', 'amount', or 'fee' field.`
                );
            }

            return {
                _id: String(svc._id ?? svc.id ?? ""),
                name: String(svc.name ?? "Unnamed Service"),
                serviceFee: serviceFee,
            };
        });

        console.log("✅ Validated services:", JSON.stringify(validatedServices, null, 2));

        // 6️⃣ Create Stripe session
        const lineItems = validatedServices.map((svc) => {
            // Convert dollars to cents (Stripe requires amount in cents)
            const unitAmount = Math.round(svc.serviceFee * 100);
            
            if (isNaN(unitAmount) || unitAmount <= 0) {
                throw new Error(`Invalid unit_amount calculated for service: ${svc.name}`);
            }

            return {
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: svc.name,
                    },
                    unit_amount: unitAmount,
                },
                quantity: 1,
            };
        });

        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            line_items: lineItems,
            customer_email: donorInfo.donorEmail,
            success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/b2c/appointment/confirmation?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/b2c/appointment/checkout?canceled=true`,
            metadata: {
                userId: String(donorUser.id),
                donorEmail: String(donorInfo.donorEmail),
                donorInfo: JSON.stringify(donorInfo ?? {}),
                services: JSON.stringify(validatedServices),
            }
        });

        // 6️⃣ Respond with session URL AND user data
        res.json({sessionUrl: session.url, user: userData});
    } catch (err: any) {
        console.error("Checkout error:", err);
        
        // Provide more detailed error messages
        let errorMessage = err.message || "An error occurred during checkout";
        
        if (err.type === 'StripeInvalidRequestError') {
            errorMessage = `Stripe error: ${err.message}`;
            if (err.param) {
                errorMessage += ` (Parameter: ${err.param})`;
            }
        }
        
        res.status(500).json({
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

export default router;
