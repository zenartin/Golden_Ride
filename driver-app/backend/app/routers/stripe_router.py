import os
import stripe
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.ride import Ride
from app.models.user import User
from app.utils.security import get_current_user
from app.core.config import settings

router = APIRouter(prefix="/stripe", tags=["stripe"])

# Ensure Stripe API key is set, fallback to mock mode if missing
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_mock")

# Admin bank account details for payout
ADMIN_ROUTING_NUMBER = "042000314"
ADMIN_ACCOUNT_NUMBER = "9947572922"

class CreateCheckoutRequest(BaseModel):
    trip_id: int

@router.post("/create-link")
def create_stripe_link(
    request: CreateCheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ride = db.query(Ride).filter(Ride.id == request.trip_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    currency = "usd" if current_user.country == "USA" else "inr"
    amount_in_smallest_unit = int(round(ride.fare_amount * 100))

    try:
        if stripe.api_key == "sk_test_mock":
            raise stripe.error.AuthenticationError("Mocking stripe flow", "mock")

        # Create Stripe Checkout Session
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": currency,
                    "unit_amount": amount_in_smallest_unit,
                    "product_data": {
                        "name": f"Golden Ride Fare (#{ride.id})",
                        "description": "Secure payment to Admin Account",
                    },
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"https://example.com/stripe/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"https://example.com/stripe/cancel",
            customer_email=current_user.email,
            payment_intent_data={
                "metadata": {
                    "ride_id": ride.id,
                    "admin_routing_number": ADMIN_ROUTING_NUMBER,
                    "admin_account_number": ADMIN_ACCOUNT_NUMBER,
                }
            }
        )

        return {
            "link_id": session.id,
            "checkout_url": session.url,
            "currency": currency,
            "amount": ride.fare_amount
        }
    except Exception as e:
        # Fallback to Mock Mode
        mock_session_id = f"cs_mock_{ride.id}"
        mock_success_url = f"https://example.com/stripe/success?session_id={mock_session_id}"
        
        return {
            "link_id": mock_session_id,
            "checkout_url": mock_success_url,
            "currency": currency,
            "amount": ride.fare_amount,
            "metadata": {
                "admin_routing_number": ADMIN_ROUTING_NUMBER,
                "admin_account_number": ADMIN_ACCOUNT_NUMBER,
            }
        }

class VerifyPaymentRequest(BaseModel):
    trip_id: int
    session_id: str

@router.post("/verify")
def verify_stripe_payment(
    request: VerifyPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ride = db.query(Ride).filter(Ride.id == request.trip_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    if request.session_id.startswith("cs_mock_"):
        ride.payment_method = "Stripe"
        ride.status = "completed"
        db.add(ride)
        db.commit()
        db.refresh(ride)
        return {
            "status": "success",
            "trip_id": ride.id,
            "payment_method": "Stripe"
        }

    try:
        session = stripe.checkout.Session.retrieve(request.session_id)
        if session.payment_status == "paid":
            ride.payment_method = "Stripe"
            ride.status = "completed"
            db.add(ride)
            db.commit()
            db.refresh(ride)
            return {
                "status": "success",
                "trip_id": ride.id,
                "payment_method": "Stripe"
            }
        else:
            raise HTTPException(status_code=400, detail="Payment not completed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
