#!/usr/bin/python3

import sys
import base64
import json
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes


key = base64.standard_b64decode(sys.argv[1].encode('latin1'))
msg = json.loads(sys.argv[2])
payload = base64.standard_b64decode(msg["value"].encode('latin1'))
iv = payload[0:12]
ciphertext = payload[12:-16]
tag = payload[-16:]

print("iv = {}".format(iv))
print("ciphertext = {}".format(ciphertext))
print("tag = {}".format(tag))

plaintxt = b''
try:
    decryptor = Cipher( algorithms.AES(key), modes.GCM(iv, tag)).decryptor()
    plaintxt = (decryptor.update(ciphertext) + decryptor.finalize()).decode('utf-8')
except Exception as e:
    raise e
finally:
    print(plaintxt)
