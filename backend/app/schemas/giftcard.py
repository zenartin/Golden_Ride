from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class GiftCardPurchaseRequest(BaseModel):
    amount: float

class GiftCardRedeemRequest(BaseModel):
    code: str

class GiftCardResponse(BaseModel):
    id: int
    code: str
    amount: float
    is_redeemed: bool
    created_at: datetime
    redeemed_at: Optional[datetime] = None

    class Config:
        orm_mode = True
        from_attributes = True
