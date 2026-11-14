import base64
from cryptography.fernet import Fernet
from backend.config import SECRET_KEY

# Ensure key is valid 32-byte Fernet key
try:
    _cipher = Fernet(SECRET_KEY.encode())
except Exception:
    import hashlib
    # Derive 32-byte url-safe key
    derived = base64.urlsafe_b64encode(hashlib.sha256(SECRET_KEY.encode()).digest())
    _cipher = Fernet(derived)

def encrypt_value(value: str) -> str:
    """Encrypt a sensitive string (token, client secret)."""
    if not value:
        return ""
    return _cipher.encrypt(value.encode()).decode()

def decrypt_value(encrypted_value: str) -> str:
    """Decrypt an encrypted string."""
    if not encrypted_value:
        return ""
    try:
        return _cipher.decrypt(encrypted_value.encode()).decode()
    except Exception:
        return ""
