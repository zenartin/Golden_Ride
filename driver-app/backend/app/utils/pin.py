import hmac
import hashlib
import os

# For development, providing a default secret if not set
PIN_SECRET = os.environ.get("RIDE_PIN_SECRET", "super_secret_ride_pin_key")

def generate_ride_pin(ride_id: str) -> str:
    """Generate a deterministic 4-digit PIN based on the ride_id and a secret key."""
    # HMAC gives us a deterministic pseudo-random hash
    mac = hmac.new(
        PIN_SECRET.encode("utf-8"),
        str(ride_id).encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    
    # Take the first 6 hex chars, convert to integer, and grab first 4 digits
    pin = str(int(mac[:6], 16))[:4].zfill(4)
    return pin

def hash_ride_pin(ride_id: str, pin: str) -> str:
    message = f"{ride_id}:{pin}".encode("utf-8")
    return hmac.new(
        PIN_SECRET.encode("utf-8"),
        message,
        hashlib.sha256
    ).hexdigest()

def verify_ride_pin(ride_id: str, submitted_pin: str, stored_hash: str) -> bool:
    if not stored_hash:
        return False
    calculated_hash = hash_ride_pin(ride_id, submitted_pin)
    return hmac.compare_digest(calculated_hash, stored_hash)
