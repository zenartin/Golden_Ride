from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CreateCustomerRequest(BaseModel):
    name: str
    email: str

class CustomerResponse(BaseModel):
    stripe_customer_id: str
    message: str

class PaymentIntentRequest(BaseModel):
    ride_id: int
    amount: float
    currency: Optional[str] = "usd"
    idempotency_key: Optional[str] = None

class PaymentIntentResponse(BaseModel):
    payment_intent_id: str
    client_secret: str
    ephemeral_key: str
    customer_id: str
    publishable_key: str

class ConfirmPaymentRequest(BaseModel):
    payment_intent_id: str
    payment_method: Optional[str] = None

class ConfirmPaymentResponse(BaseModel):
    payment_id: str
    payment_intent_id: str
    status: str
    message: str

class RefundRequest(BaseModel):
    payment_intent_id: str
    amount: Optional[float] = None  # Full refund if None

class RefundResponse(BaseModel):
    refund_id: str
    payment_intent_id: str
    status: str
    amount: float
    message: str

class PaymentDetailsResponse(BaseModel):
    payment_id: str
    payment_intent_id: str
    stripe_customer_id: Optional[str] = None
    user_id: int
    ride_id: Optional[int] = None
    amount: float
    currency: str
    payment_method: Optional[str] = None
    payment_status: str
    receipt_url: Optional[str] = None
    refund_status: str
    transaction_date: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
