from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float
from app.database.session import Base
import datetime

class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, index=True, nullable=False)
    owner_role = Column(String, index=True, nullable=False) # 'user' or 'driver'
    name = Column(String, nullable=False)
    phone_number = Column(String, nullable=False)
    relationship = Column(String, nullable=True)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class TripShare(Base):
    __tablename__ = "trip_shares"

    id = Column(Integer, primary_key=True, index=True)
    ride_id = Column(Integer, index=True, nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)

class TripLocation(Base):
    __tablename__ = "trip_locations"

    id = Column(Integer, primary_key=True, index=True)
    ride_id = Column(Integer, index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    recorded_at = Column(DateTime, default=datetime.datetime.utcnow)
