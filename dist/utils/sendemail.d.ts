import nodemailer from 'nodemailer';
export declare const mailer: nodemailer.Transporter<import("nodemailer/lib/smtp-transport").SentMessageInfo, import("nodemailer/lib/smtp-transport").Options>;
export declare function sendMail(to: string, subject: string, text: string): Promise<import("nodemailer/lib/smtp-transport").SentMessageInfo>;
//# sourceMappingURL=sendemail.d.ts.map