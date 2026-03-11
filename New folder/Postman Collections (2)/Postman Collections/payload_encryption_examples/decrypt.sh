#!/bin/sh

decrypt() {
    key=$(echo -n "$1" | base64 -d | xxd -ps -c 1000000000 );
    iv=$(echo -n "$2" | base64 -d | xxd -ps -c 1000000000 -l12 );
    ciphertext=$(echo -n "$2" | base64 -d | xxd -ps -c 1000000000 -s 12 | rev | cut -c 33- | rev | xxd -r -ps -c 1000000000);

    [[ x$key == "x" ]] && { echo "Key missing or invalid..." >&2; return 1; }
    [[ x$iv == "x" ]] && { echo "iv missing or invalid..." >&2; return 1; }
    [[ x$ciphertext == "x" ]] && { echo "ciphertext missing or invalid..." >&2; return 1; }

    echo -n $ciphertext | openssl aes-256-gcm -d -K $key -iv $iv #| jq -M .
}
