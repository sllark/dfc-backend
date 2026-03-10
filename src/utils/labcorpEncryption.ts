import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 12 bytes for GCM
const TAG_LENGTH = 16; // 16 bytes auth tag

function getLabcorpKey(): Buffer {
  const base64Key = process.env.LABCORP_PAYLOAD_PASSWORD;
  if (!base64Key) {
    throw new Error("LABCORP_PAYLOAD_PASSWORD is not set in environment.");
  }

  const key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) {
    throw new Error(
      "LABCORP_PAYLOAD_PASSWORD must be a base64-encoded 32-byte key for AES-256-GCM."
    );
  }

  return key;
}

/**
 * Encrypts a plain JSON-serializable object into Labcorp's expected
 * { value: base64(iv + ciphertext + tag) } format.
 */
export function encryptLabcorpPayload(plaintextObject: unknown): { value: string } {
  const key = getLabcorpKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const plaintext = Buffer.from(JSON.stringify(plaintextObject), "utf8");

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag(); // 16-byte auth tag

  const payload = Buffer.concat([iv, ciphertext, tag]);
  return { value: payload.toString("base64") };
}

/**
 * Decrypts Labcorp's { value: base64(iv + ciphertext + tag) } response
 * back into a plain object.
 */
export function decryptLabcorpPayload<T = any>(encryptedResponse: { value: string }): T {
  const key = getLabcorpKey();
  const payload = Buffer.from(encryptedResponse.value, "base64");

  const iv = payload.slice(0, IV_LENGTH);
  const tag = payload.slice(payload.length - TAG_LENGTH);
  const ciphertext = payload.slice(IV_LENGTH, payload.length - TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return JSON.parse(plaintext.toString("utf8"));
}

