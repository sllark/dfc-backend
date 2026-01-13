"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../generated/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const sendemail_1 = require("../utils/sendemail");
const encryption_1 = require("../utils/encryption");
const prisma = new prisma_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
class AuthService {
    // ====================== Register User ======================
    static registerUser = async (username, email, password, phone) => {
        const hashPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                username,
                email: (0, encryption_1.encryptDeterministic)(email),
                password: hashPassword,
                phone: phone ? (0, encryption_1.encrypt)(phone) : null,
            },
        });
        return {
            ...user,
            email,
            phone: phone || null,
        };
    };
    // ====================== Find User By Email ======================
    static findUserByEmail = async (email) => {
        const encryptedEmail = (0, encryption_1.encryptDeterministic)(email);
        const user = await prisma.user.findUnique({ where: { email: encryptedEmail } });
        if (!user)
            return null;
        return {
            ...user,
            email,
            phone: user.phone ? (0, encryption_1.decrypt)(user.phone) : null,
        };
    };
    // ====================== Login User ======================
    static loginUser = async (email, password) => {
        const encryptedEmail = (0, encryption_1.encryptDeterministic)(email);
        const user = await prisma.user.findUnique({ where: { email: encryptedEmail } });
        if (!user)
            throw new Error("User not found");
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid)
            throw new Error("Invalid password");
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
        });
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });
        return {
            id: user.id,
            token,
            role: user.role,
            username: user.username,
            email,
            phone: user.phone ? (0, encryption_1.decrypt)(user.phone) : null,
        };
    };
    // ====================== Find User By ID ======================
    static findUserById = async (id) => {
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user)
            return null;
        return {
            ...user,
            email: user.email ? (0, encryption_1.decryptDeterministic)(user.email) : null,
            phone: user.phone ? (0, encryption_1.decrypt)(user.phone) : null,
        };
    };
    // ====================== Get All Users ======================
    static getAllUsers = async (filter) => {
        const where = {};
        if (filter?.role)
            where.role = filter.role;
        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                isActive: true,
                lastLogin: true,
                phone: true,
                profileImage: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return users.map(u => ({
            ...u,
            email: u.email ? (0, encryption_1.decryptDeterministic)(u.email) : null,
            phone: u.phone ? (0, encryption_1.decrypt)(u.phone) : null,
        }));
    };
    // ====================== Update User ======================
    static updateUser = async (id, data) => {
        const updateData = { ...data };
        if (data.password)
            updateData.password = await bcryptjs_1.default.hash(data.password, 10);
        if (data.phone)
            updateData.phone = (0, encryption_1.encrypt)(data.phone);
        const user = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                username: true,
                email: true,
                phone: true,
                profileImage: true,
                role: true,
                isActive: true,
                lastLogin: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return {
            ...user,
            phone: user.phone ? (0, encryption_1.decrypt)(user.phone) : null,
        };
    };
    // ====================== Password Reset ======================
    static sendPasswordResetOTP = async (email) => {
        const encryptedEmail = (0, encryption_1.encryptDeterministic)(email);
        const user = await prisma.user.findUnique({ where: { email: encryptedEmail } });
        if (!user)
            throw new Error("User not found");
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await prisma.passwordReset.create({ data: { userId: user.id, otp, expiresAt } });
        await (0, sendemail_1.sendMail)(email, "Password Reset OTP", `Your OTP is ${otp}. It will expire in 10 minutes.`);
        return { message: "OTP sent to email" };
    };
    static verifyOTP = async (email, otp) => {
        const encryptedEmail = (0, encryption_1.encryptDeterministic)(email);
        const user = await prisma.user.findUnique({ where: { email: encryptedEmail } });
        if (!user)
            throw new Error("User not found");
        const record = await prisma.passwordReset.findFirst({
            where: { userId: user.id, otp, used: false, expiresAt: { gt: new Date() } },
        });
        if (!record)
            throw new Error("Invalid or expired OTP");
        return { message: "OTP verified", userId: user.id };
    };
    static resetPassword = async (email, otp, newPassword) => {
        const encryptedEmail = (0, encryption_1.encryptDeterministic)(email);
        const user = await prisma.user.findUnique({ where: { email: encryptedEmail } });
        if (!user)
            throw new Error("User not found");
        const record = await prisma.passwordReset.findFirst({
            where: { userId: user.id, otp, used: false, expiresAt: { gt: new Date() } },
        });
        if (!record)
            throw new Error("Invalid or expired OTP");
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });
        await prisma.passwordReset.update({ where: { id: record.id }, data: { used: true } });
        return { message: "Password updated successfully" };
    };
    static generateToken(user) {
        return jsonwebtoken_1.default.sign({ userId: user.id, role: user.role || "USER" }, process.env.JWT_SECRET, {
            expiresIn: "1h",
        });
    }
}
exports.default = AuthService;
//# sourceMappingURL=authService.js.map