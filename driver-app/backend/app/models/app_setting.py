from sqlalchemy import Column, String, DateTime
from datetime import datetime
from app.database import Base


class AppSetting(Base):
    """Simple key/value store for admin-editable platform settings."""
    __tablename__ = "app_settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(String, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow)
