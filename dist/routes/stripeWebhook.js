"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stripe_1 = __importDefault(require("stripe"));
const donorRegistrationService_1 = require("../services/donorRegistrationService");
const paymentService_1 = require("../services/paymentService");
const ipUtils_1 = require("../utils/ipUtils");
const router = express_1.default.Router();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {});
// Stripe requires raw body for webhooks
router.post("/", express_1.default.raw({ type: "application/json" }), async (req, res) => {
    const timestamp = new Date().toISOString();
    console.log("\n" + "=".repeat(80));
    console.log(`🔔 [${timestamp}] WEBHOOK REQUEST RECEIVED`);
    console.log("=".repeat(80));
    console.log("📍 Endpoint: /api/stripe/webhook");
    console.log("🌐 IP Address:", (0, ipUtils_1.getClientIp)(req));
    console.log("📦 Request body size:", req.body?.length || 0, "bytes");
    const sig = req.headers["stripe-signature"];
    console.log("🔐 Stripe signature present:", sig ? "Yes" : "No");
    let event;
    try {
        if (!process.env.STRIPE_SECRET_KEY) {
            console.error("❌ Missing STRIPE_SECRET_KEY in environment");
            return res.status(500).json({ success: false, error: "Missing STRIPE_SECRET_KEY in environment" });
        }
        if (!process.env.STRIPE_WEBHOOK_SECRET) {
            console.error("❌ Missing STRIPE_WEBHOOK_SECRET in environment");
            return res.status(500).json({ success: false, error: "Missing STRIPE_WEBHOOK_SECRET in environment" });
        }
        console.log("🔍 Verifying webhook signature...");
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        console.log("✅ Webhook signature verified successfully");
    }
    catch (err) {
        console.error("❌ Webhook signature verification failed:");
        console.error("   Error:", err.message);
        console.error("   Stack:", err.stack);
        return res.status(400).json({
            success: false,
            error: "Webhook signature verification failed",
            message: err.message
        });
    }
    console.log("📨 Event Type:", event.type);
    console.log("🆔 Event ID:", event.id);
    console.log("📅 Event Created:", new Date(event.created * 1000).toISOString());
    console.log("📦 Full Event Payload:", JSON.stringify(event, null, 2));
    // Log the event data object for easier inspection
    if (event.data && event.data.object) {
        console.log("📊 Event Data Object:", JSON.stringify(event.data.object, null, 2));
    }
    if (event.type === "checkout.session.completed") {
        const processingStartTime = Date.now();
        console.log("\n" + "-".repeat(80));
        console.log("🛒 PROCESSING CHECKOUT.SESSION.COMPLETED EVENT");
        console.log("-".repeat(80));
        const session = event.data.object;
        console.log("🆔 Session ID:", session.id);
        console.log("👤 Customer Email:", session.customer_email || "Not provided");
        console.log("💰 Session Amount:", session.amount_total ? `$${(session.amount_total / 100).toFixed(2)}` : "N/A");
        console.log("💵 Currency:", session.currency || "N/A");
        console.log("💳 Payment Intent:", session.payment_intent || "N/A");
        console.log("📊 Payment Status:", session.payment_status || "N/A");
        console.log("📋 Session Metadata:", JSON.stringify(session.metadata, null, 2));
        try {
            // Parse metadata safely
            console.log("\n📝 STEP 1: Parsing metadata...");
            const userId = Number(session.metadata?.userId);
            console.log("   User ID from metadata:", session.metadata?.userId, "→ Parsed:", userId);
            if (!userId || isNaN(userId)) {
                throw new Error(`Invalid userId: ${session.metadata?.userId}`);
            }
            console.log("   ✅ User ID is valid:", userId);
            const donorInfo = session.metadata?.donorInfo
                ? JSON.parse(session.metadata.donorInfo)
                : {};
            const services = session.metadata?.services
                ? JSON.parse(session.metadata.services)
                : [];
            console.log("👤 Parsed Donor Info:", JSON.stringify(donorInfo, null, 2));
            console.log("🔧 Parsed Services:", JSON.stringify(services, null, 2));
            // Validate required fields
            console.log("\n📝 STEP 2: Validating required fields...");
            console.log("   Checking donorNameFirst:", donorInfo.donorNameFirst ? "✅ Present" : "❌ Missing");
            console.log("   Checking donorNameLast:", donorInfo.donorNameLast ? "✅ Present" : "❌ Missing");
            if (!donorInfo.donorNameFirst || !donorInfo.donorNameLast) {
                throw new Error("Missing donorNameFirst or donorNameLast in metadata");
            }
            // panelId is required - check both panelID and panelId
            const panelId = donorInfo.panelID || donorInfo.panelId;
            console.log("   Checking panelId/panelID:", panelId ? `✅ Present (${panelId})` : "❌ Missing");
            if (!panelId) {
                throw new Error("Missing panelId/panelID in donorInfo metadata");
            }
            console.log("   ✅ All required fields validated");
            // Prepare donor registration data
            const donorData = {
                userId,
                createdBy: userId,
                updatedBy: userId,
                createdByIP: (0, ipUtils_1.getClientIp)(req),
                updatedByIP: (0, ipUtils_1.getClientIp)(req),
                donorNameFirst: donorInfo.donorNameFirst,
                donorNameLast: donorInfo.donorNameLast,
                donorEmail: donorInfo.donorEmail || session.customer_email || "",
                donorSSN: donorInfo.donorSSN,
                donorStateOfResidence: donorInfo.donorStateOfResidence,
                reasonForTest: donorInfo.reasonForTest,
                serviceId: services[0]?._id || services[0]?.id || "",
                accountNo: donorInfo.accountNo,
                panelId: panelId,
                registrationExpirationDate: donorInfo.registrationExpirationDate
                    ? new Date(donorInfo.registrationExpirationDate)
                    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default: 1 year from now
            };
            console.log("\n📝 STEP 3: Preparing donor registration data...");
            console.log("📝 Donor data (SSN redacted):", JSON.stringify({
                ...donorData,
                donorSSN: donorData.donorSSN ? "[REDACTED]" : undefined,
            }, null, 2));
            // 1️⃣ Create donor registration
            console.log("\n💾 STEP 4: Creating donor registration in database...");
            const startTime = Date.now();
            let donorRecord;
            try {
                donorRecord = await donorRegistrationService_1.donorRegistrationService.create(donorData, (0, ipUtils_1.getClientIp)(req));
                const donorTime = Date.now() - startTime;
                console.log(`✅ Donor registration created successfully in ${donorTime}ms`);
                console.log("   Donor Registration ID:", donorRecord.id);
                console.log("   User ID:", donorRecord.userId);
            }
            catch (donorError) {
                console.error("\n❌ Donor registration creation failed:");
                console.error("   Error:", donorError.message);
                console.error("   Stack:", donorError.stack);
                console.error("   Donor Data that failed:", JSON.stringify({
                    ...donorData,
                    donorSSN: donorData.donorSSN ? "[REDACTED]" : undefined,
                }, null, 2));
                throw donorError; // Re-throw to be caught by outer catch
            }
            // 2️⃣ Create payment record
            if (!donorRecord) {
                throw new Error("Donor record was not created, cannot create payment");
            }
            const amount = Number(session.amount_total ?? 0) / 100;
            const transactionId = session.payment_intent || session.id || `session_${session.id}`;
            // Validate payment data
            if (!amount || amount <= 0) {
                throw new Error(`Invalid payment amount: ${amount}. Session amount_total: ${session.amount_total}`);
            }
            if (!transactionId) {
                throw new Error(`Missing transactionId. Payment intent: ${session.payment_intent}, Session ID: ${session.id}`);
            }
            const paymentData = {
                donorRegistrationId: donorRecord.id,
                userId: donorRecord.userId,
                amount: amount,
                currency: session.currency ?? "USD",
                status: "COMPLETED",
                paymentMethod: "CARD",
                transactionId: transactionId,
                createdBy: donorRecord.userId,
                updatedBy: donorRecord.userId,
            };
            console.log("\n💳 STEP 5: Preparing payment data...");
            console.log("💳 Payment data:", JSON.stringify(paymentData, null, 2));
            console.log("   Session amount_total:", session.amount_total);
            console.log("   Session payment_intent:", session.payment_intent);
            console.log("   Session ID:", session.id);
            console.log("   Calculated amount:", amount);
            console.log("   Transaction ID:", transactionId);
            console.log("\n💾 STEP 6: Creating payment record in database...");
            const paymentStartTime = Date.now();
            try {
                const paymentRecord = await paymentService_1.paymentService.create(paymentData, (0, ipUtils_1.getClientIp)(req));
                const paymentTime = Date.now() - paymentStartTime;
                console.log(`✅ Payment created successfully in ${paymentTime}ms`);
                console.log("   Payment ID:", paymentRecord.id);
                console.log("   Amount:", `$${paymentRecord.amount}`);
                console.log("   Status:", paymentRecord.status);
                console.log("\n" + "=".repeat(80));
                console.log("🎉 SUCCESS: Donor & Payment saved successfully!");
                console.log("   Donor Registration ID:", donorRecord.id);
                console.log("   Payment ID:", paymentRecord.id);
                console.log("   Total processing time:", (Date.now() - processingStartTime) + "ms");
                console.log("=".repeat(80) + "\n");
            }
            catch (paymentError) {
                console.error("\n❌ Payment creation failed (but donor was saved):");
                console.error("   Error:", paymentError.message);
                console.error("   Error Code:", paymentError.code);
                console.error("   Error Stack:", paymentError.stack);
                // Re-throw to be caught by outer catch block
                throw new Error(`Payment creation failed: ${paymentError.message}. Donor ID ${donorRecord.id} was created successfully.`);
            }
        }
        catch (err) {
            console.error("\n" + "=".repeat(80));
            console.error("❌ ERROR: Failed to save donor/payment");
            console.error("=".repeat(80));
            console.error("Error Type:", err.constructor.name);
            console.error("Error Message:", err.message);
            console.error("Error Stack:", err.stack);
            if (err.code)
                console.error("Error Code:", err.code);
            if (err.meta)
                console.error("Error Meta:", JSON.stringify(err.meta, null, 2));
            // Log the session data for debugging
            console.error("\n📋 Session Data for Debugging:");
            console.error("   Session ID:", session?.id);
            console.error("   Session Metadata:", JSON.stringify(session?.metadata, null, 2));
            console.error("   Customer Email:", session?.customer_email);
            console.error("\nFull Error Object:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
            console.error("=".repeat(80) + "\n");
            // Still return success to Stripe (webhook received) but log the error
            // This prevents Stripe from retrying the webhook
        }
    }
    else {
        console.log(`ℹ️  Event type '${event.type}' is not handled. Skipping processing.`);
    }
    console.log("📤 Sending response: { received: true }");
    res.json({ received: true });
});
exports.default = router;
//# sourceMappingURL=stripeWebhook.js.map