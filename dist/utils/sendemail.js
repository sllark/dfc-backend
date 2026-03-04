"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = sendMail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const resend_1 = require("resend");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Determine email provider based on environment
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const SMTP_HOST = process.env.SMTP_HOST || 'localhost';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '1025', 10);
// Initialize Resend if API key is provided (production)
let resend = null;
if (RESEND_API_KEY) {
    resend = new resend_1.Resend(RESEND_API_KEY);
}
// Initialize Nodemailer for local development (Mailpit) or fallback
let mailer = null;
if (!RESEND_API_KEY) {
    // Local development: Use Mailpit SMTP
    mailer = nodemailer_1.default.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: false,
        // No auth needed for Mailpit
    });
}
/**
 * Send email using Resend (production) or Mailpit/Nodemailer (local)
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param text - Email body (plain text)
 */
async function sendMail(to, subject, text) {
    try {
        // Production: Use Resend API
        if (resend) {
            const { data, error } = await resend.emails.send({
                from: EMAIL_FROM,
                to,
                subject,
                text,
            });
            if (error) {
                console.error("Resend API error:", error);
                throw new Error(`Failed to send email: ${error.message}`);
            }
            console.log("Email sent via Resend:", data?.id);
            return data;
        }
        // Local: Use Mailpit/Nodemailer
        if (mailer) {
            const result = await mailer.sendMail({
                from: `"Drug Free Compliance" <${EMAIL_FROM}>`,
                to,
                subject,
                text,
            });
            console.log("Email sent via Mailpit/Nodemailer:", result.messageId);
            return result;
        }
        throw new Error("No email provider configured. Set RESEND_API_KEY for production or SMTP settings for local.");
    }
    catch (err) {
        console.error("Email send failed:", err);
        throw new Error(`Failed to send email: ${err.message}`);
    }
}
//# sourceMappingURL=sendemail.js.map