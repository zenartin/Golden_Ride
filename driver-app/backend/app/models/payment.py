from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from app.database import Base

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(String, unique=True, index=True, nullable=False)
    payment_intent_id = Column(String, unique=True, index=True, nullable=False)
    stripe_customer_id = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ride_id = Column(Integer, ForeignKey("rides.id"), nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="usd")
    payment_method = Column(String, nullable=True)
    payment_status = Column(String, default="pending")  # pending, succeeded, failed, refunded, processing
    receipt_url = Column(String, nullable=True)
    transaction_date = Column(DateTime, default=datetime.utcnow)
    refund_status = Column(String, default="none")  # none, partial, full
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
