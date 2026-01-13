"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.encryptDeterministic = encryptDeterministic;
exports.decryptDeterministic = decryptDeterministic;
const crypto_1 = __importDefault(require("crypto"));
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
const ENC_IV = Buffer.from(ENC_IV_HEX, "hex"); // 16 bytes IV
const FIXED_IV = Buffer.alloc(16, 0); // deterministic IV
// ================== Non-Deterministic Encryption ==================
function encrypt(text) {
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv("aes-256-cbc", ENC_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}
function decrypt(ciphertext) {
    const parts = ciphertext.split(":");
    if (parts.length !== 2) {
        throw new Error("Invalid ciphertext format");
    }
    const [ivHex, encHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const encryptedText = Buffer.from(encHex, "hex");
    const decipher = crypto_1.default.createDecipheriv("aes-256-cbc", ENC_KEY, iv);
    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return decrypted.toString("utf8");
}
// ================== Deterministic Encryption ==================
function encryptDeterministic(text) {
    const cipher = crypto_1.default.createCipheriv("aes-256-cbc", ENC_KEY, FIXED_IV);
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    return encrypted.toString("hex");
}
function decryptDeterministic(ciphertext) {
    const encryptedText = Buffer.from(ciphertext, "hex");
    const decipher = crypto_1.default.createDecipheriv("aes-256-cbc", ENC_KEY, FIXED_IV);
    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return decrypted.toString("utf8");
}
//# sourceMappingURL=encryption.js.map