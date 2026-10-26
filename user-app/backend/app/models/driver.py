from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    is_online = Column(Boolean, default=False)
    rating = Column(Float, default=4.9)
    avatar = Column(String, nullable=True)
    is_approved = Column(Boolean, default=False)
    latitude = Column(Float, nullable=True, default=12.9716)  # Default Bangalore lat
    longitude = Column(Float, nullable=True, default=77.5946) # Default Bangalore lng
    balance = Column(Float, default=2450.0) # Mock starting balance matching UI stats
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    documents = relationship("DriverDocument", back_populates="driver", uselist=False)
    rides = relationship("Ride", back_populates="driver")
    notifications = relationship("Notification", back_populates="driver")
    withdrawals = relationship("Withdrawal", back_populates="driver")

class DriverDocument(Base):
    __tablename__ = "driver_documents"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("drivers.id"), unique=True)
    
    # Personal & LICENSE info
    license_number = Column(String, nullable=True)
    license_expiry = Column(String, nullable=True)
    
    # Vehicle info
    vehicle_number = Column(String, nullable=True)
    vehicle_model = Column(String, nullable=True)
    vehicle_year = Column(Integer, nullable=True)
    vehicle_type = Column(String, nullable=True) # e.g. Sedan, SUV, Auto
    
    # Insurance info
    insurance_policy = Column(String, nullable=True)
    insurance_expiry = Column(String, nullable=True)
    
    # Document storage file paths/urls
    license_image = Column(String, nullable=True)
    vehicle_image = Column(String, nullable=True)
    insurance_image = Column(String, nullable=True)
    avatar_image = Column(String, nullable=True)

    # Banking
    upi_id = Column(String, nullable=True)
    card_number = Column(String, nullable=True)
    card_expiry = Column(String, nullable=True)
    card_cvv = Column(String, nullable=True)

    driver = relationship("Driver", back_populates="documents")
