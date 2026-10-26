from pydantic import BaseModel
from typing import Optional
import datetime

class EmergencyContactBase(BaseModel):
    name: str
    phone_number: str
    relationship: Optional[str] = None
    is_primary: bool = False

class EmergencyContactCreate(EmergencyContactBase):
    pass

class EmergencyContactUpdate(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None
    relationship: Optional[str] = None
    is_primary: Optional[bool] = None

class EmergencyContactResponse(EmergencyContactBase):
    id: int
    owner_id: int
    owner_role: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True
