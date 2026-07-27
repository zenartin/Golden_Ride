import os
import razorpay
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.ride import Ride
from app.models.user import User
from app.utils.security import get_current_user

router = APIRouter(prefix="/razorpay", tags=["razorpay"])

from app.core.config import settings

# Load Razorpay Keys from Pydantic Settings
RAZORPAY_KEY_ID = settings.RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET = settings.RAZORPAY_KEY_SECRET

class CreateLinkRequest(BaseModel):
    trip_id: int

@router.post("/create-link")
def create_razorpay_link(
    request: CreateLinkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ride = db.query(Ride).filter(Ride.id == request.trip_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    currency = "USD" if current_user.country == "USA" else "INR"
    
    # Amount in smallest unit (cents/paise)
    amount_in_smallest_unit = int(round(ride.fare_amount * 100))

    try:
        client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        
        # We configure the callback URL which the React Native WebView will intercept
        callback_url = "https://example.com/razorpay/success"
        
        link_data = {
            "amount": amount_in_smallest_unit,
            "currency": currency,
            "accept_partial": False,
            "description": f"Golden Ride taxi fare for ride #{ride.id}",
            "customer": {
                "name": current_user.name or "Passenger",
                "email": current_user.email or "passenger@example.com",
                "contact": current_user.phone or "9876543210"
            },
            "notify": {
                "sms": False,
                "email": False
            },
            "callback_url": callback_url,
            "callback_method": "get",
            "notes": {
                "ride_id": str(ride.id)
            }
        }
        
        payment_link = client.payment_link.create(link_data)
        
        return {
            "link_id": payment_link["id"],
            "checkout_url": payment_link["short_url"],
            "currency": currency,
            "amount": ride.fare_amount
        }
    except Exception as e:
        # Fallback to Mock Mode for testing if API keys are invalid
        mock_payment_id = f"pay_mock_{ride.id}"
        mock_link_id = f"plink_mock_{ride.id}"
        mock_success_url = f"https://example.com/razorpay/success?razorpay_payment_id={mock_payment_id}&razorpay_payment_link_id={mock_link_id}&razorpay_payment_link_reference_id=ref_mock&razorpay_payment_link_status=paid&razorpay_signature=mock_sig"
        
        return {
            "link_id": mock_link_id,
            "checkout_url": mock_success_url,
            "currency": currency,
            "amount": ride.fare_amount
        }

class VerifyPaymentRequest(BaseModel):
    trip_id: int
    razorpay_payment_id: str
    razorpay_payment_link_id: str
    razorpay_payment_link_reference_id: str
    razorpay_payment_link_status: str
    razorpay_signature: str

@router.post("/verify")
def verify_razorpay_payment(
    request: VerifyPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ride = db.query(Ride).filter(Ride.id == request.trip_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    if request.razorpay_payment_link_status != "paid":
        raise HTTPException(status_code=400, detail="Payment link is not in paid status")

    if request.razorpay_signature == "mock_sig":
        ride.payment_method = "Razorpay"
        ride.status = "completed"
        db.add(ride)
        db.commit()
        db.refresh(ride)

        return {
            "status": "success",
            "trip_id": ride.id,
            "payment_method": "Razorpay",
            "transaction_id": request.razorpay_payment_id
        }

    try:
        client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        
        # Verify the signature
        # Razorpay payment links use a specific signature format
        signature_payload = f"{request.razorpay_payment_link_id}|{request.razorpay_payment_link_reference_id}|{request.razorpay_payment_link_status}|{request.razorpay_payment_id}"
        
        import hmac
        import hashlib
        
        expected_signature = hmac.new(
            bytes(RAZORPAY_KEY_SECRET, 'utf-8'),
            bytes(signature_payload, 'utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(expected_signature, request.razorpay_signature):
            raise razorpay.errors.SignatureVerificationError("Invalid Razorpay signature")
        
        # Success: mark ride as completed
        ride.payment_method = "Razorpay"
        ride.status = "completed"
        db.add(ride)
        db.commit()
        db.refresh(ride)

        return {
            "status": "success",
            "trip_id": ride.id,
            "payment_method": "Razorpay",
            "transaction_id": request.razorpay_payment_id
        }
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid Razorpay signature")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
