#!/usr/bin/python3

import os
import sys
import base64
import json
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes


key = base64.standard_b64decode(sys.argv[1].encode('latin1'))
iv = os.urandom(12)
plaintext = sys.argv[2].encode('utf-8')

print("iv = {}".format(iv))
print("plaintext = {}".format(plaintext))

payload = b''
try:
    encryptor = Cipher( algorithms.AES(key), modes.GCM(iv)).encryptor()
    ciphertext = encryptor.update(plaintext) + encryptor.finalize()
    payload = iv + ciphertext + encryptor.tag
except Exception as e:
    raise e
finally:
    print(json.dumps({ 'value': base64.standard_b64encode(payload).decode('latin1')}))
