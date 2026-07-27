from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class RideAssignment(Base):
    __tablename__ = "ride_assignments"

    id = Column(Integer, primary_key=True, index=True)
    ride_id = Column(Integer, ForeignKey("rides.id", ondelete="CASCADE"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="offered")  # "offered", "accepted", "rejected", "expired"
    offered_at = Column(DateTime, default=datetime.utcnow)
    responded_at = Column(DateTime, nullable=True)
    response_type = Column(String, nullable=True)  # "accept", "reject", "timeout"

    ride = relationship("Ride", back_populates="assignments")
    driver = relationship("Driver", back_populates="assignments")
