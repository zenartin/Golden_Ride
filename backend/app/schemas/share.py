from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class TripShareCreate(BaseModel):
    pass # No body required, just ride_id in path

class TripShareResponse(BaseModel):
    id: int
    ride_id: int
    token: str
    created_at: datetime
    expires_at: Optional[datetime]
    revoked_at: Optional[datetime]

    class Config:
        from_attributes = True

class TripLocationPoint(BaseModel):
    latitude: float
    longitude: float
    recorded_at: datetime

    class Config:
        from_attributes = True

class PublicRideResponse(BaseModel):
    status: str
    pickup: str
    dropoff: str
    pickup_latitude: Optional[float]
    pickup_longitude: Optional[float]
    dropoff_latitude: Optional[float]
    dropoff_longitude: Optional[float]
    driver_name: Optional[str]
    driver_phone: Optional[str] = None
    driver_rating: Optional[float]
    vehicle_model: Optional[str]
    vehicle_plate: Optional[str]
    current_latitude: Optional[float]
    current_longitude: Optional[float]
    route_history: List[TripLocationPoint] = []
