import { Router } from "express";
import AuthController from "../controllers/authController";
import AuthMiddleware from "../middlewares/authMiddleware";
import { upload } from "../middlewares/uploadMiddleware";
import AuthService from "../services/authService";

const router = Router();

// Route for user signup
router.post("/auth/register", AuthController.signup);
// Route for user login
router.post("/auth/login", AuthController.login);

// ✅ Check if user exists by email
router.get("/auth/check-user", async (req, res) => {
    try {
        const email = req.query.email as string;
        if (!email) return res.status(400).json({ success: false, exists: false, message: "Email is required" });

        const user = await AuthService.findUserByEmail(email);
        res.json({ success: true, exists: !!user });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ success: false, exists: false, message: err.message });
    }
});

// Route to get user by ID (requires authentication)
router.get("/user/:id", AuthMiddleware.authenticate, AuthController.getUserById);

// Route to get all users (ADMIN only)
router.get("/users", AuthMiddleware.authenticate, AuthController.getAllUsers);

router.post("/forgot-password", AuthController.forgotPassword);
router.post("/verify-otp", AuthController.verifyOTP);
router.post("/reset-password", AuthController.resetPassword);

router.put(
    "/user/:id",
    AuthMiddleware.authenticate,
    upload.single("profileImage"),
    AuthController.updateUser
);

// Route to logout (optional, can be implemented as needed)
router.post("/auth/logout", AuthMiddleware.authenticate, AuthController.logout);


export default router;