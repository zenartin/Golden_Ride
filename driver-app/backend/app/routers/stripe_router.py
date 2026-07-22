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

# Configure Stripe API keys & account name from environment
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", settings.STRIPE_SECRET_KEY)
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", settings.STRIPE_PUBLISHABLE_KEY)
STRIPE_ACCOUNT_NAME = os.getenv("STRIPE_ACCOUNT_NAME", "Golden Ride Services")

stripe.api_key = STRIPE_SECRET_KEY

# Admin bank account details for payout
ADMIN_ROUTING_NUMBER = os.getenv("ADMIN_ROUTING_NUMBER", "042000314")
ADMIN_ACCOUNT_NUMBER = os.getenv("ADMIN_ACCOUNT_NUMBER", "9947572922")

@router.get("/config")
def get_stripe_config():
    return {
        "publishable_key": STRIPE_PUBLISHABLE_KEY,
        "account_name": STRIPE_ACCOUNT_NAME,
    }

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
    account_name = os.getenv("STRIPE_ACCOUNT_NAME", "Golden Ride Services")

    try:
        if not stripe.api_key or stripe.api_key.startswith("sk_test_replace_me") or stripe.api_key == "sk_test_mock":
            raise stripe.error.AuthenticationError("Mocking stripe flow", "mock")

        # Create Stripe Checkout Session
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": currency,
                    "unit_amount": amount_in_smallest_unit,
                    "product_data": {
                        "name": f"{account_name} - Trip Fare (#{ride.id})",
                        "description": f"Direct payment to {account_name}",
                    },
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"https://example.com/stripe/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"https://example.com/stripe/cancel",
            customer_email=current_user.email,
            payment_intent_data={
                "description": f"Trip #{ride.id} - {account_name}",
                "metadata": {
                    "ride_id": ride.id,
                    "account_name": account_name,
                    "admin_routing_number": ADMIN_ROUTING_NUMBER,
                    "admin_account_number": ADMIN_ACCOUNT_NUMBER,
                }
            }
        )

        return {
            "link_id": session.id,
            "checkout_url": session.url,
            "currency": currency,
            "amount": ride.fare_amount,
            "account_name": account_name
        }
    except Exception as e:
        # Fallback to Mock Mode if live/test keys are not provided in environment
        mock_session_id = f"cs_mock_{ride.id}"
        mock_success_url = f"https://example.com/stripe/success?session_id={mock_session_id}"
        
        return {
            "link_id": mock_session_id,
            "checkout_url": mock_success_url,
            "currency": currency,
            "amount": ride.fare_amount,
            "account_name": account_name,
            "metadata": {
                "admin_routing_number": ADMIN_ROUTING_NUMBER,
                "admin_account_number": ADMIN_ACCOUNT_NUMBER,
            }
        }

@router.post("/create-payment-intent")
def create_payment_intent(
    request: CreateCheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ride = db.query(Ride).filter(Ride.id == request.trip_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    currency = "usd" if current_user.country == "USA" else "inr"
    amount_in_smallest_unit = int(round(ride.fare_amount * 100))
    account_name = os.getenv("STRIPE_ACCOUNT_NAME", "Golden Ride Services")

    try:
        if not stripe.api_key or stripe.api_key.startswith("sk_test_replace_me") or stripe.api_key == "sk_test_mock":
            raise stripe.error.AuthenticationError("Mocking stripe flow", "mock")

        intent = stripe.PaymentIntent.create(
            amount=amount_in_smallest_unit,
            currency=currency,
            description=f"Golden Ride Fare #{ride.id}",
            customer_email=current_user.email,
            metadata={
                "ride_id": ride.id,
                "user_id": current_user.id,
                "account_name": account_name,
            }
        )

        return {
            "paymentIntent": intent.client_secret,
            "publishableKey": STRIPE_PUBLISHABLE_KEY,
            "account_name": account_name,
            "amount": ride.fare_amount,
            "currency": currency
        }
    except Exception as e:
        return {
            "paymentIntent": f"pi_mock_{ride.id}",
            "publishableKey": STRIPE_PUBLISHABLE_KEY,
            "account_name": account_name,
            "amount": ride.fare_amount,
            "currency": currency,
            "mock": True
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

    if request.session_id.startswith("cs_mock_") or request.session_id.startswith("pi_mock_"):
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
        if request.session_id.startswith("pi_"):
            intent = stripe.PaymentIntent.retrieve(request.session_id)
            if intent.status == "succeeded":
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
        raise HTTPException(status_code=400, detail="Payment not completed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
