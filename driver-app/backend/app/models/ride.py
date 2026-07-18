from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from typing import Optional
from app.database import Base


class Ride(Base):
    __tablename__ = "rides"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    rider_name = Column(String, nullable=False)
    rider_rating = Column(Float, default=4.8)
    rider_trips = Column(Integer, default=10)
    ride_class = Column(String, default="comfort")

    from_location = Column(String, nullable=False)
    to_location = Column(String, nullable=False)
    pickup_latitude = Column(Float, nullable=True)
    pickup_longitude = Column(Float, nullable=True)
    dropoff_latitude = Column(Float, nullable=True)
    dropoff_longitude = Column(Float, nullable=True)

    distance = Column(String, nullable=False)    # e.g., "5.2 km"
    duration = Column(String, nullable=False)    # e.g., "18 min"
    fare = Column(String, nullable=False)        # e.g., "₹245"
    fare_amount = Column(Float, nullable=False)  # e.g., 245.0
    payment_method = Column(String, default="Online")  # "Online", "Cash"
    pickup_eta = Column(String, default="3 min away")

    status = Column(String, default="pending")  # pending, accepted, arrived, started, completed, declined, cancelled, scheduled
    scheduled_time = Column(DateTime, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    actual_fare = Column(Float, nullable=True)
    cancellation_reason = Column(String, nullable=True)
    coupon_code = Column(String, nullable=True)
    discount_amount = Column(Float, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    # SQLite doesn't support onupdate natively — we update manually in routers
    updated_at = Column(DateTime, default=datetime.utcnow)

    driver = relationship("Driver", back_populates="rides")
    user = relationship("User", back_populates="rides")
    driver_notifications = relationship("DriverNotification", back_populates="ride", cascade="all, delete-orphan")
    assignments = relationship("RideAssignment", back_populates="ride", cascade="all, delete-orphan")

    @property
    def driver_name(self) -> Optional[str]:
        return self.driver.name if self.driver else None

    @property
    def rider_phone(self) -> Optional[str]:
        return self.user.phone if self.user else None

    @property
    def driver_phone(self) -> Optional[str]:
        return self.driver.phone if self.driver else None

    @property
    def driver_vehicle_number(self) -> Optional[str]:
        if not self.driver or not self.driver.documents: return None
        return self.driver.documents.vehicle_plate_number or self.driver.documents.vehicle_number

    @property
    def driver_vehicle_model(self) -> Optional[str]:
        return self.driver.documents.vehicle_model if self.driver and self.driver.documents else None

    @property
    def driver_vehicle_type(self) -> Optional[str]:
        return self.driver.documents.vehicle_type if self.driver and self.driver.documents else None

    @property
    def driver_latitude(self) -> Optional[float]:
        return self.driver.latitude if self.driver else None

    @property
    def driver_longitude(self) -> Optional[float]:
        return self.driver.longitude if self.driver else None




class Withdrawal(Base):
    __tablename__ = "withdrawals"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String, default="pending")  # pending, completed
    created_at = Column(DateTime, default=datetime.utcnow)

    driver = relationship("Driver", back_populates="withdrawals")
