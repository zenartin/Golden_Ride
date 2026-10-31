from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from app.database import Base


class SavedAddress(Base):
    __tablename__ = "saved_addresses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    label = Column(String, nullable=False)  # Home, Work, ...
    address = Column(String, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class SavedCard(Base):
    __tablename__ = "saved_cards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    stripe_payment_method_id = Column(String, nullable=False)
    brand = Column(String, nullable=True)
    last4 = Column(String, nullable=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class RiderNotification(Base):
    __tablename__ = "rider_notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    category = Column(String, default="trip")  # trip, promo, system
    title = Column(String, nullable=False)
    body = Column(String, nullable=False)
    ride_id = Column(Integer, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class GiftCard(Base):
    __tablename__ = "gift_cards"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    amount = Column(Float, nullable=False)
    purchaser_user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    redeemed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    redeemed_at = Column(DateTime, nullable=True)
    stripe_payment_intent_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    subject = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String, default="open")  # open, resolved
    created_at = Column(DateTime, default=datetime.utcnow)


class SafetyAlert(Base):
    __tablename__ = "safety_alerts"

    id = Column(Integer, primary_key=True, index=True)
    actor_role = Column(String, nullable=False)  # user, driver
    actor_id = Column(Integer, nullable=False)
    ride_id = Column(Integer, nullable=True)
    kind = Column(String, default="silent")  # sos, silent, incident
    message = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    status = Column(String, default="open")  # open, resolved
    created_at = Column(DateTime, default=datetime.utcnow)
