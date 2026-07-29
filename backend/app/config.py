import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Golden Ride - User API"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super_secret_key_change_me_in_production_123456789")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 1 day
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:12345@localhost:5432/golden_ride")
    
    # Storage setting for document/photo uploads
    UPLOAD_DIR: str = "uploads"

    class Config:
        case_sensitive = True
        extra = "ignore"

settings = Settings()

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
