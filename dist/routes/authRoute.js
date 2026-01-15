"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = __importDefault(require("../controllers/authController"));
const authMiddleware_1 = __importDefault(require("../middlewares/authMiddleware"));
const uploadMiddleware_1 = require("../middlewares/uploadMiddleware");
const authService_1 = __importDefault(require("../services/authService"));
const router = (0, express_1.Router)();
// Route for user signup
router.post("/auth/register", authController_1.default.signup);
// Route for user login
router.post("/auth/login", authController_1.default.login);
// ✅ Check if user exists by email
router.get("/auth/check-user", async (req, res) => {
    try {
        const email = req.query.email;
        if (!email)
            return res.status(400).json({ success: false, exists: false, message: "Email is required" });
        const user = await authService_1.default.findUserByEmail(email);
        res.json({ success: true, exists: !!user });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, exists: false, message: err.message });
    }
});
// Route to get user by ID (requires authentication)
router.get("/user/:id", authMiddleware_1.default.authenticate, authController_1.default.getUserById);
// Route to get all users (ADMIN only)
router.get("/users", authMiddleware_1.default.authenticate, authController_1.default.getAllUsers);
router.post("/forgot-password", authController_1.default.forgotPassword);
router.post("/verify-otp", authController_1.default.verifyOTP);
router.post("/reset-password", authController_1.default.resetPassword);
router.put("/user/:id", authMiddleware_1.default.authenticate, uploadMiddleware_1.upload.single("profileImage"), authController_1.default.updateUser);
// Route to logout (optional, can be implemented as needed)
router.post("/auth/logout", authMiddleware_1.default.authenticate, authController_1.default.logout);
exports.default = router;
//# sourceMappingURL=authRoute.js.map