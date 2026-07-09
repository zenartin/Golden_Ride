from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class DriverNotification(Base):
    __tablename__ = "driver_notifications"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("drivers.id", ondelete="CASCADE"), nullable=False)
    ride_id = Column(Integer, ForeignKey("rides.id", ondelete="CASCADE"), nullable=True)
    type = Column(String, nullable=False)  # "new_ride", "ride_cancelled", "ride_expired", "ride_accepted"
    status = Column(String, default="pending")  # "pending", "delivered", "read", "dismissed"
    delivered_via = Column(String, nullable=True)  # "websocket", "fcm", "pull"
    created_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime, nullable=True)

    driver = relationship("Driver", back_populates="driver_notifications")
    ride = relationship("Ride", back_populates="driver_notifications")
