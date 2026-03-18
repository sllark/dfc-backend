#include <openssl/bio.h>
#include <openssl/buffer.h>
#include <openssl/conf.h>
#include <openssl/err.h>
#include <openssl/evp.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int base64Encode(const unsigned char *buffer, size_t length, char **b64text)
{
    *b64text = calloc((4 * length / 3 + 3) & ~3, sizeof(**b64text));
    if (!*b64text) {
        fprintf(stderr, "No memory for base64 encoding.");
        return 1;
    }
    EVP_EncodeBlock((unsigned char *)*b64text, buffer, length);
    return 0;
}

void encrypt(unsigned char **out, int *out_len, unsigned char *key, int key_len,
             unsigned char *iv, int iv_len, unsigned char *in, int in_len)
{
    int tmp;
    int buf_len;
    unsigned char *buf;
    EVP_CIPHER_CTX *ctx;

    buf = calloc(iv_len + in_len + 16, sizeof(*buf));
    if (!buf) {
        fprintf(stderr, "Failed to allocate memory");
        exit(1);
    }

    if(!(ctx = EVP_CIPHER_CTX_new())) {
        fprintf(stderr, "Failed ot init Cipher context");
        exit(1);
    }

    if(!EVP_EncryptInit_ex(ctx, EVP_aes_256_gcm(), NULL, NULL, NULL)) {
        fprintf(stderr, "Failed to init aes-256-gcm cipher");
        exit(1);
    }

    if (!EVP_EncryptInit_ex(ctx, NULL, NULL, key, iv)) {
        fprintf(stderr, "Failed to init aes-256-gcm cipher");
        exit(1);
    }

    memcpy(buf, iv, iv_len);
    buf_len = iv_len;

    if(!EVP_EncryptUpdate(ctx, buf + iv_len, &tmp, in, in_len)) {
        fprintf(stderr, "Failed to encrypt message");
        exit(1);
    }
    buf_len += tmp;

    if (!EVP_EncryptFinal_ex(ctx, buf + buf_len, &tmp)) {
        fprintf(stderr, "Failed to finalize message");
        exit(1);
    }
    buf_len += tmp;

    if (!EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_GET_TAG, 16, buf + buf_len)) {
        fprintf(stderr, "Failed to tag message");
        exit(1);
    }
    buf_len += 16;

    EVP_CIPHER_CTX_free(ctx);

    base64Encode(buf, buf_len, (char **)out);
    *out_len = strlen((const char *)*out);
}

int main (void)
{
    unsigned char key[32] = {0};
    unsigned char iv[12] = {0};
    unsigned char *plaintext = (unsigned char *)"\"The quick brown fox jumps over the lazy dog\"";
    unsigned char *payload;
    char *b64out;
    int i;
    int payload_len;

    base64Encode(key, 32, &b64out);
    printf("Key: %s\n", b64out);
    free(b64out);

    encrypt(&payload, &payload_len, key, sizeof(key),
            iv, sizeof(iv), plaintext, strlen((char *)plaintext));
    printf("%s\n", payload);
    free(payload);

    return 0;
}
