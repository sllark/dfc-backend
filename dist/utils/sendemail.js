"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mailer = void 0;
exports.sendMail = sendMail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.mailer = nodemailer_1.default.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
async function sendMail(to, subject, text) {
    try {
        return await exports.mailer.sendMail({
            from: `"Drag Free Complience" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
        });
    }
    catch (err) {
        console.error("Email send failed:", err);
        throw new Error("Failed to send email");
    }
}
//# sourceMappingURL=sendemail.js.map