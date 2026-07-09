from app.core.config import settings
import os

# Create uploads dir just in case
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
