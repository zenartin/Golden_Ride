from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MessageResponse(BaseModel):
    id: int
    ride_id: Optional[int] = None
    is_support: bool
    sender: str  # "driver" or "rider" or "support"
    content: str
    created_at: datetime
    is_read: bool

    class Config:
        from_attributes = True

class MessageSend(BaseModel):
    content: str
    ride_id: Optional[int] = None
    is_support: bool = False

class NotificationResponse(BaseModel):
    id: int
    driver_id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
