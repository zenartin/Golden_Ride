from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    avatar = Column(String, nullable=True)
    wallet_balance = Column(Float, default=1780.0)
    rating = Column(Float, default=4.8)
    is_active = Column(Boolean, default=True)
    stripe_customer_id = Column(String, nullable=True)
    country = Column(String, default="India", nullable=True)
    card_number = Column(String, nullable=True)
    card_expiry = Column(String, nullable=True)
    card_cvv = Column(String, nullable=True)
    card_holder = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    rides = relationship("Ride", back_populates="user")
