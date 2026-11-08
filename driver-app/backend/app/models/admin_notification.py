from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from datetime import datetime
from app.database import Base


class AdminNotification(Base):
    """Things the admin team should see: new withdrawal requests, and similar."""
    __tablename__ = "admin_notifications"

    id = Column(Integer, primary_key=True, index=True)
    kind = Column(String, default="info")          # withdrawal_request, ...
    title = Column(String, nullable=False)
    body = Column(String, nullable=True)
    ref_id = Column(Integer, nullable=True)         # e.g. the withdrawal id
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
