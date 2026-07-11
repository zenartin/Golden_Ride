from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class RideResponse(BaseModel):
    id: int
    driver_id: Optional[int] = None
    user_id: Optional[int] = None
    rider_name: str
    rider_rating: float
    rider_trips: int
    driver_upi_id: Optional[str] = None
    ride_class: str = "comfort"
    from_location: str
    to_location: str
    pickup_latitude: Optional[float] = None
    pickup_longitude: Optional[float] = None
    dropoff_latitude: Optional[float] = None
    dropoff_longitude: Optional[float] = None
    distance: str
    duration: str
    fare: str
    fare_amount: float
    payment_method: str
    pickup_eta: str
    status: str  # pending, accepted, arrived, started, completed, declined, cancelled
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RideUpdateStatus(BaseModel):
    status: str  # "arrived", "started", "completed"


class LocationUpdate(BaseModel):
    latitude: float
    longitude: float


class RideEstimateRequest(BaseModel):
    pickup: str
    dropoff: str
    pickup_latitude: Optional[float] = None
    pickup_longitude: Optional[float] = None
    dropoff_latitude: Optional[float] = None
    dropoff_longitude: Optional[float] = None


class RideOption(BaseModel):
    id: str
    title: str
    subtitle: str
    eta: str
    seats: int
    price: float
    distance: str
    duration: str


class RideEstimateResponse(BaseModel):
    options: List[RideOption]


class RideBookingRequest(BaseModel):
    pickup: str
    dropoff: str
    ride_class: str = "comfort"
    payment_method: str = "Wallet"
    pickup_latitude: Optional[float] = None
    pickup_longitude: Optional[float] = None
    dropoff_latitude: Optional[float] = None
    dropoff_longitude: Optional[float] = None


class WalletTopUpRequest(BaseModel):
    amount: float
