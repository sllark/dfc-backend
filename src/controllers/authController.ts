import AuthService from '../services/authService';
import type { Request, Response } from 'express';
import { AuthenticatedRequest } from '../utils/types';

class AuthController {
    // ====================== User Registration ======================
    static signup = async (req: Request, res: Response) => {
        try {
            const { username, email, password, phone } = req.body;

            // Validate input
            if (!username || !email || !password) {
                return res.status(400).json({ 
                    success: false,
                    message: "Username, email, and password are required" 
                });
            }

            // Check if user already exists
            const existingUser = await AuthService.findUserByEmail(email);
            if (existingUser) {
                return res.status(400).json({ 
                    success: false,
                    message: "User already exists" 
                });
            }

            // Register new user
            const user = await AuthService.registerUser(username, email, password, phone);

            // ✅ Generate token immediately for this new user
            const token = AuthService.generateToken({ id: user.id, role: user.role });

            return res.status(201).json({
                success: true,
                message: "User registered successfully",
                user: {
                    ...user,
                    token, // include token here
                },
            });
        } catch (error: any) {
            console.error("Signup Error:", error);
            return res.status(400).json({
                success: false,
                message: "Registration failed",
                error: error.message,
            });
        }
    };

    // ====================== User Login ======================
    static login = async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body;
            
            // Validate input
            if (!email || !password) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Email and password are required' 
                });
            }
            
            const loginResult = await AuthService.loginUser(email, password);
            return res.status(200).json({
                success: true,
                ...loginResult
            });
        } catch (error: any) {
            console.error('Login Error:', error);
            return res.status(400).json({ 
                success: false,
                message: 'Login failed', 
                error: error.message 
            });
        }
    };

    // ====================== Get User By ID ======================
    static getUserById = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });

            const userId = parseInt(req.params.id ?? "", 10);
            if (isNaN(userId)) return res.status(400).json({ success: false, message: "Invalid user ID" });

            // Admins or the user themselves can access
            if (req.user.role !== "ADMIN" && req.user.userId !== userId) {
                return res.status(403).json({ success: false, message: "Forbidden: Access denied" });
            }

            const foundUser = await AuthService.findUserById(userId);
            if (!foundUser) return res.status(404).json({ success: false, message: "User not found" });

            return res.status(200).json({ success: true, data: foundUser });
        } catch (error: any) {
            console.error("GetUserById Error:", error);
            return res.status(500).json({ success: false, message: "Error retrieving user", error: error.message });
        }
    };

    // ====================== Get All Users (Admin Only) ======================
    static getAllUsers = async (req: AuthenticatedRequest, res: Response) => {
        try {
            if (!req.user || req.user.role !== "ADMIN") {
                return res.status(403).json({ success: false, message: "Forbidden: Admins only" });
            }

            const { role } = req.query;

            const users = await AuthService.getAllUsers({ role: role as string });
            return res.status(200).json({ success: true, data: users });
        } catch (error: any) {
            console.error("GetAllUsers Error:", error);
            return res.status(500).json({ success: false, message: "Error retrieving users", error: error.message });
        }
    };

    // ====================== Update User ======================
    static updateUser = async (req: Request, res: Response) => {
        const authReq = req as AuthenticatedRequest;

        try {
            if (!authReq.user) return res.status(401).json({ success: false, message: "Unauthorized" });

            const userIdStr = authReq.params.id;
            if (!userIdStr) return res.status(400).json({ success: false, message: "User ID is required" });

            const userId = parseInt(userIdStr, 10);
            if (isNaN(userId)) return res.status(400).json({ success: false, message: "Invalid user ID" });

            if (authReq.user.role !== "ADMIN" && authReq.user.userId !== userId) {
                return res.status(403).json({ success: false, message: "Forbidden: Access denied" });
            }

            const { username, phone, password } = authReq.body;

            const updateData: {
                username?: string;
                phone?: string;
                password?: string;
                profileImage?: string;
            } = {};

            if (username) updateData.username = username;
            if (phone) updateData.phone = phone;
            if (password) updateData.password = password;
            if (authReq.file) updateData.profileImage = `/uploads/${authReq.file.filename}`;

            const updatedUser = await AuthService.updateUser(userId, updateData);
            return res.status(200).json({ success: true, message: "User updated successfully", user: updatedUser });
        } catch (error: any) {
            console.error("UpdateUser Error:", error);
            return res.status(500).json({ success: false, message: "Error updating user", error: error.message });
        }
    };

    // ====================== Logout ======================
    static logout = async (req: AuthenticatedRequest, res: Response) => {
        try {
            // Client-side should remove token
            return res.status(200).json({ message: "Logged out successfully" });
        } catch (err: any) {
            return res.status(500).json({ message: "Logout failed", error: err.message });
        }
    };

    // ====================== Forgot Password ======================
    static forgotPassword = async (req: Request, res: Response) => {
        try {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({ success: false, message: "Email is required" });
            }
            const result = await AuthService.sendPasswordResetOTP(email);
            return res.status(200).json({ success: true, ...result });
        } catch (err: any) {
            return res.status(400).json({ success: false, message: err.message || "Failed to send OTP" });
        }
    };

    // ====================== Verify OTP ======================
    static verifyOTP = async (req: Request, res: Response) => {
        try {
            const { email, otp } = req.body;
            if (!email || !otp) {
                return res.status(400).json({ success: false, message: "Email and OTP are required" });
            }
            const result = await AuthService.verifyOTP(email, otp);
            return res.status(200).json({ success: true, ...result });
        } catch (err: any) {
            return res.status(400).json({ success: false, message: err.message });
        }
    };

    // ====================== Reset Password ======================
    static resetPassword = async (req: Request, res: Response) => {
        try {
            const { email, otp, newPassword } = req.body;
            if (!email || !otp || !newPassword) {
                return res.status(400).json({ success: false, message: "Email, OTP, and new password are required" });
            }
            const result = await AuthService.resetPassword(email, otp, newPassword);
            return res.status(200).json({ success: true, ...result });
        } catch (err: any) {
            return res.status(400).json({ success: false, message: err.message });
        }
    };
}

export default AuthController;
