"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const authRoute_1 = __importDefault(require("./routes/authRoute"));
const serviceRoute_1 = __importDefault(require("./routes/serviceRoute"));
const donorRegistrationRoutes_1 = __importDefault(require("./routes/donorRegistrationRoutes")); // ✅ new import
const authMiddleware_1 = __importDefault(require("./middlewares/authMiddleware"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const labcorpRoute_1 = __importDefault(require("./routes/labcorpRoute"));
const stripeCheckout_1 = __importDefault(require("./routes/stripeCheckout"));
const stripeWebhook_1 = __importDefault(require("./routes/stripeWebhook"));
const stripeSession_1 = __importDefault(require("./routes/stripeSession"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// ===== Middlewares =====
app.use((0, cors_1.default)({
    origin: ["http://localhost:3001", "http://localhost:3002"],
    // origin: ["https://drugfreecomplience.vercel.app", "https://frontend.dfctest.com", "https://admin.dfctest.com", "https://dfctest.com"],
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// ===== Static Files =====
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// ===== API Routes =====
app.use('/api', authRoute_1.default);
app.use('/api/services', serviceRoute_1.default);
// ✅ Donor registration routes (requires auth)
app.use('/api/donors', donorRegistrationRoutes_1.default);
// Payment routes (authenticated users)
app.use('/api/payments', authMiddleware_1.default.authenticate, paymentRoutes_1.default);
// Labcorp
app.use('/api/labcorp', labcorpRoute_1.default);
// ⚠️ Webhook must use raw body
app.use("/api/stripe/webhook", stripeWebhook_1.default);
// ✅ New GET endpoint to fetch completed session/payment info
app.use("/api/stripe", stripeSession_1.default);
// For other routes, use normal JSON parser
app.use(express_1.default.json());
app.use("/api/checkout", stripeCheckout_1.default);
// ===== Health Check =====
app.get('/', (req, res) => {
    res.send('SD Coders API is running!');
});
// ===== 404 Handler =====
app.use((req, res, next) => {
    res.status(404).json({ success: false, message: 'Endpoint not found' });
});
// ===== Global Error Handler =====
app.use((err, req, res, next) => {
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
//# sourceMappingURL=index.js.map