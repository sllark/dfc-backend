import org.bouncycastle.crypto.engines.AESEngine;
import org.bouncycastle.crypto.modes.GCMBlockCipher;
import org.bouncycastle.crypto.params.AEADParameters;
import org.bouncycastle.crypto.params.KeyParameter;

import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

public class bc_example {
    public static final int GCM_NONCE_LENGTH = 12;
    public static final int GCM_TAG_LENGTH = 16;

    public static void main(String argv[]) throws Exception {
        byte[] keyBytes = Base64.getDecoder().decode(argv[0]);
        byte[] plaintext = argv[1].getBytes();

        if (keyBytes.length != 32) {
            System.err.println("Key must be 256 bits");
            return;
        }

        decrypt(keyBytes, encrypt(keyBytes, plaintext));
    }

    public static byte[] encrypt(byte key[], byte plaintext[]) throws Exception {
        GCMBlockCipher cipher = new GCMBlockCipher(new AESEngine());
        byte[] nonce = new byte[GCM_NONCE_LENGTH];
        byte[] ciphertext = new byte[plaintext.length + GCM_TAG_LENGTH];
        byte[] payload = new byte[ciphertext.length + nonce.length];
        SecureRandom random = new SecureRandom();
        int len;

        random.nextBytes(nonce);
        cipher.init(true, new AEADParameters(new KeyParameter(key), GCM_TAG_LENGTH * 8, nonce));
        len = cipher.processBytes(plaintext, 0, plaintext.length, ciphertext, 0);
        cipher.doFinal(ciphertext, len);

        System.arraycopy(nonce, 0, payload, 0, nonce.length);
        System.arraycopy(ciphertext, 0, payload, nonce.length, ciphertext.length);

        System.out.println("Original Text: " + new String(plaintext, "UTF-8"));
        System.out.println("KEY: " + Arrays.toString(key));
        System.out.println("NONCE: " + Arrays.toString(nonce));
        System.out.println("Encrypted Text: " + Base64.getEncoder().encodeToString(ciphertext));
        System.out.println("Nonce + Encrypted Text: " + Base64.getEncoder().encodeToString(payload));
        System.out.println(String.format("JSON Payload: { \"value\": \"%s\" }",
                                         Base64.getEncoder().encodeToString(payload)));
        return payload;
    }

    public static void decrypt(byte key[], byte payload[]) throws Exception {
        GCMBlockCipher cipher = new GCMBlockCipher(new AESEngine());
        byte[] nonce = new byte[GCM_NONCE_LENGTH];
        byte[] ciphertext = new byte[payload.length - GCM_NONCE_LENGTH];
        byte[] plaintext = new byte[ciphertext.length - GCM_TAG_LENGTH];
        int len;

        System.arraycopy(payload, 0, nonce, 0, nonce.length);
        System.arraycopy(payload, nonce.length, ciphertext, 0, ciphertext.length);

        cipher.init(false, new AEADParameters(new KeyParameter(key), GCM_TAG_LENGTH * 8, nonce));
        len = cipher.processBytes(ciphertext, 0, ciphertext.length, plaintext, 0);
        cipher.doFinal(plaintext, len);

        System.out.println("Decrypted Text: " + new String(plaintext, "UTF-8"));
    }
}
