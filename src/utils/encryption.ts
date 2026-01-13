import crypto from "crypto";

// ================= Environment Variables =================
const ENC_KEY_HEX = process.env.ENC_KEY;
const ENC_IV_HEX = process.env.ENC_IV;

if (!ENC_KEY_HEX || ENC_KEY_HEX.length !== 64) {
    throw new Error("ENC_KEY must be set in .env and be 32 bytes (64 hex chars)");
}

if (!ENC_IV_HEX || ENC_IV_HEX.length !== 32) {
    throw new Error("ENC_IV must be set in .env and be 16 bytes (32 hex chars)");
}

// Convert keys to Buffer
const ENC_KEY = Buffer.from(ENC_KEY_HEX, "hex"); // 32 bytes for AES-256
const ENC_IV = Buffer.from(ENC_IV_HEX, "hex");   // 16 bytes IV
const FIXED_IV = Buffer.alloc(16, 0);           // deterministic IV

// ================== Non-Deterministic Encryption ==================
export function encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", ENC_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(ciphertext: string): string {
    const parts = ciphertext.split(":");
    if (parts.length !== 2) {
        throw new Error("Invalid ciphertext format");
    }

    const [ivHex, encHex] = parts as [string, string];

    const iv = Buffer.from(ivHex, "hex");
    const encryptedText = Buffer.from(encHex, "hex");

    const decipher = crypto.createDecipheriv("aes-256-cbc", ENC_KEY, iv);
    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return decrypted.toString("utf8");
}

// ================== Deterministic Encryption ==================
export function encryptDeterministic(text: string): string {
    const cipher = crypto.createCipheriv("aes-256-cbc", ENC_KEY, FIXED_IV);
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    return encrypted.toString("hex");
}

export function decryptDeterministic(ciphertext: string): string {
    const encryptedText = Buffer.from(ciphertext, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", ENC_KEY, FIXED_IV);
    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return decrypted.toString("utf8");
}
