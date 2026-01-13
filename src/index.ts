import dotenv from 'dotenv';
import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';

import AuthRoutes from './routes/authRoute';
import serviceRoutes from './routes/serviceRoute';
import donorRegistrationRoutes from './routes/donorRegistrationRoutes'; // ✅ new import

import AuthMiddleware from './middlewares/authMiddleware';
import paymentRoutes from "./routes/paymentRoutes";
import labcorpRoute from "./routes/labcorpRoute";
import stripeCheckoutRouter from "./routes/stripeCheckout";
import stripeWebhookRouter from "./routes/stripeWebhook";
import stripeSessionRouter from "./routes/stripeSession";

dotenv.config();

const app = express();

// ===== Middlewares =====
app.use(cors({
    // origin: ["http://localhost:3001", "http://localhost:3002"],
    origin: ["https://drugfreecomplience.vercel.app", "https://frontend.dfctest.com", "https://admin.dfctest.com", "https://dfctest.com"],
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== Static Files =====
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ===== API Routes =====
app.use('/api', AuthRoutes);
app.use('/api/services', serviceRoutes);

// ✅ Donor registration routes (requires auth)
app.use('/api/donors', donorRegistrationRoutes);

// Payment routes (authenticated users)
app.use('/api/payments', AuthMiddleware.authenticate, paymentRoutes);

// Labcorp
app.use('/api/labcorp', labcorpRoute);

// ⚠️ Webhook must use raw body
app.use("/api/stripe/webhook", stripeWebhookRouter);

// ✅ New GET endpoint to fetch completed session/payment info
app.use("/api/stripe", stripeSessionRouter);

// For other routes, use normal JSON parser
app.use(express.json());
app.use("/api/checkout", stripeCheckoutRouter);

// ===== Health Check =====
app.get('/', (req: Request, res: Response) => {
    res.send('SD Coders API is running!');
});

// ===== 404 Handler =====
app.use((req: Request, res: Response, next: NextFunction) => {
    res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// ===== Global Error Handler =====
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

// ===== Start Server =====
const port = process.env.PORT || 3000;
const host = process.env.HOST || 'localhost';

app.listen(port, () => {
    console.log(`✅ Server is running at http://${host}:${port}`);
    console.log('Press Ctrl+C to stop the server.');
});
