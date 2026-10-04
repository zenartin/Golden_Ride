from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CouponBase(BaseModel):
    code: str
    title: str
    description: Optional[str] = None
    type: str = "percentage"
    value: float
    max_discount_usd: Optional[float] = None
    min_fare_usd: float = 0.0
    rides_required: int = 0
    one_time: bool = False
    is_active: bool = True

class CouponCreate(CouponBase):
    pass

class CouponUpdate(BaseModel):
    code: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    value: Optional[float] = None
    max_discount_usd: Optional[float] = None
    min_fare_usd: Optional[float] = None
    rides_required: Optional[int] = None
    one_time: Optional[bool] = None
    is_active: Optional[bool] = None

class CouponOut(CouponBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True
