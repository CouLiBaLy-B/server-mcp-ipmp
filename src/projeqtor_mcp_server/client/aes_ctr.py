from __future__ import annotations

import base64
import hashlib
import os
from typing import Literal

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

AesBits = Literal[128, 192, 256]


def _derive_key(api_key: str, bits: AesBits) -> bytes:
    """Derive deterministic AES key material of the required length from a ProjeQtOr API key."""
    return hashlib.sha256(api_key.encode("utf-8")).digest()[: bits // 8]


def encrypt_aes_ctr(plain_text: str, api_key: str, bits: AesBits = 128) -> str:
    """Encrypt UTF-8 text using AES-CTR and return `base64(iv):base64(ciphertext)`."""
    iv = os.urandom(16)
    key = _derive_key(api_key, bits)
    encryptor = Cipher(algorithms.AES(key), modes.CTR(iv)).encryptor()
    ciphertext = encryptor.update(plain_text.encode("utf-8")) + encryptor.finalize()
    return f"{base64.b64encode(iv).decode()}:{base64.b64encode(ciphertext).decode()}"
