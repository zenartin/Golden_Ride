from pydantic import BaseModel, EmailStr
from typing import Optional, List

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str
    license_number: Optional[str] = None
    license_expiry: Optional[str] = None
    vehicle_number: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_type: Optional[str] = None
    insurance_policy: Optional[str] = None
    insurance_expiry: Optional[str] = None

class OtpRequest(BaseModel):
    phone: Optional[str] = None

class OtpVerifyRequest(BaseModel):
    otp: str  # Can be "1234"
    phone: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    is_approved: bool
    name: str
    phone: str
    email: str
    role: Optional[str] = None

class TokenData(BaseModel):
    driver_id: Optional[int] = None
    user_id: Optional[int] = None
    role: Optional[str] = None

class UserRegisterRequest(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str

class UserToken(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str
    phone: str
    email: str
    wallet_balance: float
