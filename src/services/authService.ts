import { PrismaClient } from "../generated/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendMail } from "../utils/sendemail";
import { encrypt, decrypt, encryptDeterministic, decryptDeterministic } from "../utils/encryption";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET!;

class AuthService {
    // ====================== Register User ======================
    static registerUser = async (username: string, email: string, password: string, phone?: string) => {
        const hashPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                username,
                email: encryptDeterministic(email),
                password: hashPassword,
                phone: phone ? encrypt(phone) : null,
            },
        });

        return {
            ...user,
            email,
            phone: phone || null,
        };
    };

    // ====================== Find User By Email ======================
    static findUserByEmail = async (email: string) => {
        const encryptedEmail = encryptDeterministic(email);
        const user = await prisma.user.findUnique({ where: { email: encryptedEmail } });
        if (!user) return null;

        return {
            ...user,
            email,
            phone: user.phone ? decrypt(user.phone) : null,
        };
    };

    // ====================== Login User ======================
    static loginUser = async (email: string, password: string) => {
        const encryptedEmail = encryptDeterministic(email);
        const user = await prisma.user.findUnique({ where: { email: encryptedEmail } });
        if (!user) throw new Error("User not found");

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) throw new Error("Invalid password");

        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
        });
        const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });

        return {
            id: user.id,
            token,
            role: user.role,
            username: user.username,
            email,
            phone: user.phone ? decrypt(user.phone) : null,
        };
    };

    // ====================== Find User By ID ======================
    static findUserById = async (id: number) => {
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return null;

        return {
            ...user,
            email: user.email ? decryptDeterministic(user.email) : null,
            phone: user.phone ? decrypt(user.phone) : null,
        };
    };

    // ====================== Get All Users ======================
    static getAllUsers = async (filter?: { role?: string }) => {
        const where: any = {};
        if (filter?.role) where.role = filter.role;

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
            email: u.email ? decryptDeterministic(u.email) : null,
            phone: u.phone ? decrypt(u.phone) : null,
        }));
    };

    // ====================== Update User ======================
    static updateUser = async (id: number, data: { username?: string; phone?: string; profileImage?: string; password?: string }) => {
        const updateData: any = { ...data };

        if (data.password) updateData.password = await bcrypt.hash(data.password, 10);
        if (data.phone) updateData.phone = encrypt(data.phone);

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
            phone: user.phone ? decrypt(user.phone) : null,
        };
    };

    // ====================== Password Reset ======================
    static sendPasswordResetOTP = async (email: string) => {
        const encryptedEmail = encryptDeterministic(email);
        const user = await prisma.user.findUnique({ where: { email: encryptedEmail } });
        if (!user) throw new Error("User not found");

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await prisma.passwordReset.create({ data: { userId: user.id, otp, expiresAt } });

        await sendMail(email, "Password Reset OTP", `Your OTP is ${otp}. It will expire in 10 minutes.`);

        return { message: "OTP sent to email" };
    };

    static verifyOTP = async (email: string, otp: string) => {
        const encryptedEmail = encryptDeterministic(email);
        const user = await prisma.user.findUnique({ where: { email: encryptedEmail } });
        if (!user) throw new Error("User not found");

        const record = await prisma.passwordReset.findFirst({
            where: { userId: user.id, otp, used: false, expiresAt: { gt: new Date() } },
        });
        if (!record) throw new Error("Invalid or expired OTP");

        return { message: "OTP verified", userId: user.id };
    };

    static resetPassword = async (email: string, otp: string, newPassword: string) => {
        const encryptedEmail = encryptDeterministic(email);
        const user = await prisma.user.findUnique({ where: { email: encryptedEmail } });
        if (!user) throw new Error("User not found");

        const record = await prisma.passwordReset.findFirst({
            where: { userId: user.id, otp, used: false, expiresAt: { gt: new Date() } },
        });
        if (!record) throw new Error("Invalid or expired OTP");

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });
        await prisma.passwordReset.update({ where: { id: record.id }, data: { used: true } });

        return { message: "Password updated successfully" };
    };

    static generateToken(user: { id: number; role?: string }) {
        return jwt.sign({ userId: user.id, role: user.role || "USER" }, process.env.JWT_SECRET!, {
            expiresIn: "1h",
        });
    }

}

export default AuthService;
