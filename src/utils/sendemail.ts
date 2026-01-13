import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

export const mailer = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export async function sendMail(to: string, subject: string, text: string) {
    try {
        return await mailer.sendMail({
            from: `"Drag Free Complience" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
        });
    } catch (err: any) {
        console.error("Email send failed:", err);
        throw new Error("Failed to send email");
    }
}