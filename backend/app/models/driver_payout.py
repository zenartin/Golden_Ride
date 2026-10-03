from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from datetime import datetime
from app.database import Base


class DriverPayout(Base):
    """A payment the admin has made to a driver out of the platform balance."""
    __tablename__ = "driver_payouts"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    method = Column(String, default="bank_transfer")
    reference = Column(String, nullable=True)
    note = Column(String, nullable=True)
    paid_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
