import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Golden Ride - API"
    SECRET_KEY: str = "super_secret_key_change_me_in_production_123456789"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 1 day
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./golden_ride.db")
    
    # Storage setting for document/photo uploads
    UPLOAD_DIR: str = "uploads"

    # Stripe Payment Configurations
    STRIPE_SECRET_KEY: str = os.getenv("STRIPE_SECRET_KEY", "sk_test_replace_me")
    STRIPE_PUBLISHABLE_KEY: str = os.getenv("STRIPE_PUBLISHABLE_KEY", "pk_test_replace_me")
    STRIPE_WEBHOOK_SECRET: str = os.getenv("STRIPE_WEBHOOK_SECRET", "")

    # Razorpay Payment Configurations
    RAZORPAY_KEY_ID: str = "rzp_test_YOUR_KEY_HERE"
    RAZORPAY_KEY_SECRET: str = "YOUR_SECRET_HERE"

    # Ride dispatch and fare settings
    RIDE_EXPIRY_SECONDS: int = 60
    FARE_BASE_RATE: float = 42.0
    FARE_PER_KM_ECONOMY: float = 12.0
    FARE_PER_KM_COMFORT: float = 16.2
    FARE_PER_KM_PREMIUM: float = 21.6

    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
