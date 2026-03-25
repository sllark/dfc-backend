/**
 * Encrypts a plain JSON-serializable object into Labcorp's expected
 * { value: base64(iv + ciphertext + tag) } format.
 */
export declare function encryptLabcorpPayload(plaintextObject: unknown): {
    value: string;
};
/**
 * Decrypts Labcorp's { value: base64(iv + ciphertext + tag) } response
 * back into a plain object.
 */
export declare function decryptLabcorpPayload<T = any>(encryptedResponse: {
    value: string;
}): T;
//# sourceMappingURL=labcorpEncryption.d.ts.map