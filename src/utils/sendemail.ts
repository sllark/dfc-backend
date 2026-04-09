import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

// Determine email provider based on environment
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const SMTP_HOST = process.env.SMTP_HOST || 'localhost';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '1025', 10);

// Initialize Resend if API key is provided (production)
let resend: Resend | null = null;
if (RESEND_API_KEY) {
    resend = new Resend(RESEND_API_KEY);
}

// Initialize Nodemailer for local development (Mailpit) or fallback
let mailer: nodemailer.Transporter | null = null;
if (!RESEND_API_KEY) {
    // Local development: Use Mailpit SMTP
    mailer = nodemailer.createTransport({
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
export async function sendMail(to: string, subject: string, text: string) {
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
            return {
                provider: "resend",
                messageId: data?.id ?? null,
                raw: data ?? null,
            };
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
            return {
                provider: "smtp",
                messageId: result.messageId ?? null,
                raw: result ?? null,
            };
        }

        throw new Error("No email provider configured. Set RESEND_API_KEY for production or SMTP settings for local.");
    } catch (err: any) {
        console.error("Email send failed:", err);
        throw new Error(`Failed to send email: ${err.message}`);
    }
}

export type EmailAttachment = {
    filename: string;
    contentType: string;
    /** Raw PDF bytes (preferred — Resend accepts Buffer). */
    content?: Buffer;
    /** Base64-encoded file body (if `content` is not set). */
    contentBase64?: string;
};

export async function sendMailWithAttachments(
    to: string,
    subject: string,
    text: string,
    attachments: EmailAttachment[]
) {
    try {
        if (resend) {
            const { data, error } = await resend.emails.send({
                from: EMAIL_FROM,
                to,
                subject,
                text,
                attachments: attachments.map((a) => ({
                    filename: a.filename,
                    content: a.content ?? a.contentBase64,
                    content_type: a.contentType,
                })) as any,
            });

            if (error) {
                console.error("Resend API error:", error);
                throw new Error(`Failed to send email: ${error.message}`);
            }

            console.log("Email sent via Resend:", data?.id);
            return {
                provider: "resend",
                messageId: data?.id ?? null,
                raw: data ?? null,
            };
        }

        if (mailer) {
            const result = await mailer.sendMail({
                from: `"Drug Free Compliance" <${EMAIL_FROM}>`,
                to,
                subject,
                text,
                attachments: attachments.map((a) => ({
                    filename: a.filename,
                    content: a.content ?? Buffer.from(a.contentBase64 ?? "", "base64"),
                    contentType: a.contentType,
                })),
            });

            console.log("Email sent via Mailpit/Nodemailer:", result.messageId);
            return {
                provider: "smtp",
                messageId: result.messageId ?? null,
                raw: result ?? null,
            };
        }

        throw new Error("No email provider configured. Set RESEND_API_KEY for production or SMTP settings for local.");
    } catch (err: any) {
        console.error("Email send failed:", err);
        throw new Error(`Failed to send email: ${err.message}`);
    }
}