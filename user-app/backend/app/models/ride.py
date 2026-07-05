from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
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

    status = Column(String, default="pending")  # pending, accepted, arrived, started, completed, declined, cancelled

    created_at = Column(DateTime, default=datetime.utcnow)
    # SQLite doesn't support onupdate natively — we update manually in routers
    updated_at = Column(DateTime, default=datetime.utcnow)

    driver = relationship("Driver", back_populates="rides")
    user = relationship("User", back_populates="rides")


class Withdrawal(Base):
    __tablename__ = "withdrawals"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String, default="pending")  # pending, completed
    created_at = Column(DateTime, default=datetime.utcnow)

    driver = relationship("Driver", back_populates="withdrawals")
