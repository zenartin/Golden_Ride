from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class DriverDocumentOut(BaseModel):
    driver_id: int
    license_number: Optional[str] = None
    license_expiry: Optional[str] = None
    vehicle_number: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_year: Optional[int] = None
    vehicle_type: Optional[str] = None
    insurance_policy: Optional[str] = None
    insurance_expiry: Optional[str] = None
    license_image: Optional[str] = None
    vehicle_image: Optional[str] = None
    insurance_image: Optional[str] = None
    avatar_image: Optional[str] = None

    class Config:
        from_attributes = True


class DriverOut(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    is_online: bool
    rating: float
    balance: float
    is_approved: bool
    avatar: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    documents: Optional[DriverDocumentOut] = None

    class Config:
        from_attributes = True


class QuickStat(BaseModel):
    label: str
    value: str
    icon: str
    color: str


class RecentTrip(BaseModel):
    id: str
    from_location: str
    to_location: str
    fare: str
    time: str
    status: str


class DashboardResponse(BaseModel):
    is_online: bool
    stats: List[QuickStat]
    recent_trips: List[RecentTrip]


class EarningBreakdownItem(BaseModel):
    label: str
    amount: str
    icon: str
    color: str


class WeeklyBar(BaseModel):
    day: str
    amount: float
    trips: int


class PaymentSummaryRow(BaseModel):
    label: str
    value: str
    bold: bool = False
    color: Optional[str] = None


class EarningsResponse(BaseModel):
    weekly_total: str
    statistics: List[WeeklyBar]
    daily_breakdown: List[EarningBreakdownItem]
    payment_summary: List[PaymentSummaryRow]
    available_balance: float


class SettingsResponse(BaseModel):
    push_notifications: bool
    dark_mode: bool
    navigation_provider: str  # e.g. "Google Maps", "Waze", "Apple Maps"


class SettingsUpdate(BaseModel):
    push_notifications: Optional[bool] = None
    dark_mode: Optional[bool] = None
    navigation_provider: Optional[str] = None


class SupportRequest(BaseModel):
    topic: Optional[str] = None
    subject: Optional[str] = None
    description: str
    category: Optional[str] = None  # optional extra field sent by frontend


class WithdrawalCreate(BaseModel):
    amount: float


class WithdrawalOut(BaseModel):
    id: int
    amount: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
