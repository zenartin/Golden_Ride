import stripe
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.ride import Ride
from app.models.user import User
from app.utils.security import get_current_user

router = APIRouter()

stripe.api_key = "sk_test_replace_me"
PUBLISHABLE_KEY = "pk_test_replace_me"

# Currencies that use smallest unit = 1 (no multiply by 100 needed — "zero-decimal" currencies)
ZERO_DECIMAL_CURRENCIES = {"bif", "clp", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"}

def country_to_currency(country: str) -> str:
    """Map user's registered country to a Stripe-supported currency code."""
    mapping = {
        "India": "inr",
        "USA": "usd",
        "United States": "usd",
        "UK": "gbp",
        "United Kingdom": "gbp",
        "Canada": "cad",
        "Australia": "aud",
        "Singapore": "sgd",
        "UAE": "aed",
        "Germany": "eur",
        "France": "eur",
    }
    return mapping.get(country, "usd")

def to_stripe_amount(amount: float, currency: str) -> int:
    """Convert fare amount to Stripe's smallest currency unit."""
    if currency in ZERO_DECIMAL_CURRENCIES:
        return int(round(amount))
    return int(round(amount * 100))

class PaymentSheetRequest(BaseModel):
    trip_id: int

@router.post("/stripe/payment-sheet")
def create_payment_sheet(
    request: PaymentSheetRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ride = db.query(Ride).filter(Ride.id == request.trip_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    # Determine currency from the user's registered country
    currency = country_to_currency(current_user.country or "India")
    amount = to_stripe_amount(ride.fare_amount, currency)

    try:
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            automatic_payment_methods={"enabled": True},
            metadata={
                "user_id": str(current_user.id),
                "ride_id": str(ride.id),
                "country": current_user.country or "India",
            },
        )
        return {
            "paymentIntent": intent.client_secret,
            "ephemeralKey": "",
            "customer": "",
            "publishableKey": PUBLISHABLE_KEY,
            "currency": currency,
            "amount": amount,
        }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
