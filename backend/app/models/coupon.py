from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    type = Column(String, default="percentage") # "percentage" or "flat"
    value = Column(Float, nullable=False)
    max_discount_usd = Column(Float, nullable=True)
    min_fare_usd = Column(Float, default=0.0)
    rides_required = Column(Integer, default=0)
    one_time = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
