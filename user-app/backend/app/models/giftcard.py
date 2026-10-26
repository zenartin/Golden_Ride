from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from datetime import datetime

from app.database import Base

class GiftCard(Base):
    __tablename__ = "giftcards"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, index=True)
    amount = Column(Float)
    purchaser_id = Column(Integer, ForeignKey("users.id"))
    is_redeemed = Column(Boolean, default=False)
    redeemer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    redeemed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
