import base64
import json
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from app.core.config import settings

def get_fernet_key() -> bytes:
    # Derive a 32-byte Fernet key from SECRET_KEY
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"product_intel_salt_2026",
        iterations=100_000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(settings.SECRET_KEY.encode()))
    return key

fernet = Fernet(get_fernet_key())

def encrypt_dict(data: dict) -> str:
    json_bytes = json.dumps(data).encode('utf-8')
    return fernet.encrypt(json_bytes).decode('utf-8')

def decrypt_dict(encrypted_str: str) -> dict:
    decrypted_bytes = fernet.decrypt(encrypted_str.encode('utf-8'))
    return json.loads(decrypted_bytes.decode('utf-8'))

def mask_credential_data(data: dict) -> dict:
    masked = {}
    for k, v in data.items():
        if isinstance(v, str):
            if len(v) <= 4:
                masked[k] = "****"
            else:
                masked[k] = v[:2] + "*" * (len(v) - 4) + v[-2:]
        else:
            masked[k] = "********"
    return masked
