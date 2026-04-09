import dotenv from 'dotenv';
import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';

import AuthRoutes from './routes/authRoute';
import serviceRoutes from './routes/serviceRoute';
import donorRegistrationRoutes from './routes/donorRegistrationRoutes';
import AuthMiddleware from './middlewares/authMiddleware';
import paymentRoutes from "./routes/paymentRoutes";
import labcorpRoute from "./routes/labcorpRoute";
import labcorpRestRoutes from "./routes/labcorpRestRoutes";
import labcorpWebhookRoutes from "./routes/labcorpWebhookRoutes";
import stripeCheckoutRouter from "./routes/stripeCheckout";
import stripeWebhookRouter from "./routes/stripeWebhook";
import stripeSessionRouter from "./routes/stripeSession";
import veriportSnsRoutes from "./routes/veriportSnsRoutes";
import veriportRoutes from "./routes/veriportRoutes";
import panelMatrixRoutes from "./routes/panelMatrixRoutes";
import emailAutomationRoutes from "./routes/emailAutomationRoutes";
import { sendUpcomingTestReminders } from "./services/reminderEmailService";

dotenv.config();

// ===== Validate Required Environment Variables =====
const requiredEnvVars = [
    'JWT_SECRET',
    'ENC_KEY',
    'ENC_IV',
    'OKTA_CLIENT_ID',
    'OKTA_CLIENT_SECRET',
    'OKTA_URL_PREFIX',
    'LABCORP_SCHED_URL',
    'LABCORP_PAYLOAD_PASSWORD',
    'WEBHOOK_SECRET',
];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
    console.error('Please set these in your .env file');
    process.exit(1);
}

// Validate ENC_KEY and ENC_IV format
if (process.env.ENC_KEY && process.env.ENC_KEY.length !== 64) {
    console.error('❌ ENC_KEY must be 32 bytes (64 hex characters)');
    process.exit(1);
}

if (process.env.ENC_IV && process.env.ENC_IV.length !== 32) {
    console.error('❌ ENC_IV must be 16 bytes (32 hex characters)');
    process.exit(1);
}

const app = express();

// ===== Middlewares =====
app.use(cors({
    origin: function(origin, callback) {
        const allowedOrigins = [
            "https://drugfreecomplience.vercel.app",
            "https://frontend.dfctest.com",
            "https://admin.dfctest.com",
            "https://dfctest.com",
            "https://dfc-odir.vercel.app",
            "https://dfc-admin-panel.vercel.app",
            "https://test-4.slarklabs.com",
            "http://localhost:4000",
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:3002"
        ];
        // Allow all Vercel preview deployments and slarklabs subdomains
        if (!origin || allowedOrigins.includes(origin) ||
            origin.endsWith('.vercel.app') ||
            origin.endsWith('.slarklabs.com')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS HEADERS'));
        }
    },
    credentials: true,
}));

// ⚠️ Stripe webhooks require the raw request body.
// This MUST be registered before express.json()/urlencoded() or signature verification will fail.
app.use("/api/stripe/webhook", stripeWebhookRouter);

// Veriport/AWS SNS receiver (SNS often uses text/plain)
// Keep this before express.json() so route-level body parsing works reliably.
app.use("/", veriportSnsRoutes);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== Ensure JSON Content-Type for all responses =====
app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Content-Type', 'application/json');
    next();
});

// ===== Static Files =====
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ===== API Routes =====
app.use('/api', AuthRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api', panelMatrixRoutes);
app.use('/api', AuthMiddleware.authenticate, emailAutomationRoutes);

app.use('/api/donors', donorRegistrationRoutes);

// Payment routes (authenticated users)
app.use('/api/payments', AuthMiddleware.authenticate, paymentRoutes);

// Labcorp SOAP routes (existing)
app.use('/api/labcorp', labcorpRoute);

// Labcorp REST routes (new)
app.use('/api', labcorpRestRoutes);
app.use('/api', AuthMiddleware.authenticate, veriportRoutes);

// Labcorp webhook callback route (REST subscription callbacks)
app.use('/', labcorpWebhookRoutes);

app.use("/api/stripe", stripeSessionRouter);
app.use("/api/checkout", stripeCheckoutRouter);

// ===== Health Check (must be before 404 handler) =====
app.get('/', (req: Request, res: Response) => {
    res.json({ success: true, message: 'SD Coders API is running!' });
});

app.get('/health', (req: Request, res: Response) => {
    res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString() });
});

// ===== 404 Handler =====
app.use((req: Request, res: Response, next: NextFunction) => {
    res.status(404).json({ success: false, message: 'Endpoint not found', path: req.path });
});

// ===== Global Error Handler =====
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    
    // Ensure we always return JSON, never HTML
    if (!res.headersSent) {
        res.status(err.status || 500).json({ 
            success: false, 
            message: err.message || 'Internal server error',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    }
});

// ===== Handle Unhandled Promise Rejections =====
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// ===== Start Server =====
const port = process.env.PORT || 3000;
const host = process.env.HOST || 'localhost';

app.listen(port, () => {
    console.log(`✅ Server is running at http://${host}:${port}`);
    console.log('Press Ctrl+C to stop the server.');

    const enableReminderCron = String(process.env.ENABLE_TEST_REMINDER_CRON || "").toLowerCase() === "true";
    if (enableReminderCron) {
        const intervalMinutesRaw = Number(process.env.TEST_REMINDER_CRON_MINUTES || 60);
        const intervalMs = Math.max(5, Number.isFinite(intervalMinutesRaw) ? intervalMinutesRaw : 60) * 60 * 1000;
        const hoursAheadRaw = Number(process.env.TEST_REMINDER_HOURS_AHEAD || 24);
        const hoursAhead = Number.isFinite(hoursAheadRaw) ? Math.max(1, Math.min(168, hoursAheadRaw)) : 24;
        console.log(`⏰ Test reminder cron enabled: every ${intervalMs / 60000}m, horizon=${hoursAhead}h`);
        setInterval(async () => {
            try {
                const result = await sendUpcomingTestReminders(hoursAhead);
                console.log(`📧 Reminder job: scanned=${result.scanned}, sent=${result.sent}, failed=${result.failed}`);
            } catch (err: any) {
                console.error("Reminder job failed:", err?.message ?? String(err));
            }
        }, intervalMs);
    }
});
