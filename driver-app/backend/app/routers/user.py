import json
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.ride import Ride
from app.models.user import User, WalletTransaction
from app.models.driver import Driver
from app.schemas.auth import LoginRequest, OtpRequest, OtpVerifyRequest, UserRegisterRequest, UserToken, ProfileUpdateRequest, ForgotPasswordRequest, ResetPasswordRequest
from app.schemas.ride import (
    RideBookingRequest,
    RideEstimateRequest,
    RideEstimateResponse,
    RideOption,
    RideResponse,
    WalletTopUpRequest,
    DestinationUpdate,
)
from app.utils.security import create_access_token, get_current_user, get_password_hash, verify_password
from app.services.ride_service import RideService
from app.services.dispatch_service import DispatchService
from app.utils.storage import save_upload_file
from app.utils.helpers import format_duration
from app.models.rider_features import SavedCard, GiftCard

router = APIRouter(prefix="/user", tags=["user"])

RIDE_META = {
    "Golden Ride Sedan": {"title": "Golden Ride Sedan", "subtitle": "Comfortable AC sedan", "seats": 4, "multiplier": 1.0},
    "Golden Ride SUV": {"title": "Golden Ride SUV", "subtitle": "Spacious AC SUV", "seats": 6, "multiplier": 1.5},
    "Golden Ride Van": {"title": "Golden Ride Van", "subtitle": "Large group & luggage", "seats": 8, "multiplier": 2.0},
    "Golden RideX": {"title": "Golden RideX", "subtitle": "Everyday rides", "seats": 4, "multiplier": 1.2},
    "Golden RideXL": {"title": "Golden RideXL", "subtitle": "Premium luxury SUV", "seats": 6, "multiplier": 2.5},
    "Golden Ride Pet": {"title": "Golden Ride Pet", "subtitle": "Ride with your pet", "seats": 4, "multiplier": 1.3},
}


def _remember_card(db: Session, user: User) -> None:
    """Keep the user's current Stripe card in their saved-card list and make it the default."""
    db.query(SavedCard).filter(SavedCard.user_id == user.id).update({"is_default": False})
    card = db.query(SavedCard).filter(
        SavedCard.user_id == user.id,
        SavedCard.stripe_payment_method_id == user.stripe_payment_method_id,
    ).first()
    if not card:
        card = SavedCard(user_id=user.id, stripe_payment_method_id=user.stripe_payment_method_id)
    card.brand, card.last4, card.is_default = user.card_brand, user.card_last4, True
    db.add(card)
    db.commit()


def _token_response(user: User) -> dict:
    token = create_access_token(data={"sub": str(user.id), "role": "user"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": "user",
        "id": user.id,
        "name": user.name,
        "phone": user.phone,
        "email": user.email,
        "wallet_balance": user.wallet_balance,
    }


def _build_options_from_route(distance_km: float, duration_min: float, currency: str) -> List[RideOption]:
    """Build ride options from real route data with correct currency."""
    eta_base = max(3, round(distance_km / 6))  # rough driver ETA in minutes
    options = []
    for index, (ride_class, meta) in enumerate(RIDE_META.items()):
        fare_amount, _ = RideService.calculate_fare(distance_km, duration_min, ride_class, currency)
        # Format price as integer (INR) or 2-decimal (USD)
        price_display = int(fare_amount) if currency == "INR" else fare_amount
        options.append(
            RideOption(
                id=ride_class,
                title=meta["title"],
                subtitle=meta["subtitle"],
                seats=meta["seats"],
                eta=f"{eta_base + index * 2} min",
                price=int(round(fare_amount)) if currency == "INR" else round(fare_amount, 2),
                distance=f"{distance_km:.1f} km",
                duration=format_duration(duration_min),
            )
        )
    return options


def _serialize_ride(ride) -> dict:
    """Safely serialize a Ride ORM object to a dict for RideResponse.
    Uses getattr with defaults so missing DB columns don't crash serialization.
    All @property fields (driver_name, rider_phone, etc.) are accessed here
    while the session is still open and relationships are loaded.
    """
    verification_pin = None
    pin_hash = getattr(ride, "verification_pin_hash", None)
    if pin_hash:
        try:
            from app.utils.pin import generate_ride_pin
            verification_pin = generate_ride_pin(str(ride.id))
        except Exception:
            pass

    return {
        "id": ride.id,
        "driver_id": getattr(ride, "driver_id", None),
        "user_id": getattr(ride, "user_id", None),
        "rider_name": getattr(ride, "rider_name", ""),
        "rider_phone": getattr(ride, "rider_phone", None),
        "rider_rating": getattr(ride, "rider_rating", 4.8),
        "rider_trips": getattr(ride, "rider_trips", 0),
        "ride_class": getattr(ride, "ride_class", "sedan"),
        "from_location": getattr(ride, "from_location", ""),
        "to_location": getattr(ride, "to_location", ""),
        "pickup_latitude": getattr(ride, "pickup_latitude", None),
        "pickup_longitude": getattr(ride, "pickup_longitude", None),
        "dropoff_latitude": getattr(ride, "dropoff_latitude", None),
        "dropoff_longitude": getattr(ride, "dropoff_longitude", None),
        "distance": getattr(ride, "distance", "0 km"),
        "duration": format_duration(getattr(ride, "duration", "0 min")),
        "fare": getattr(ride, "fare", "0"),
        "fare_amount": getattr(ride, "fare_amount", 0.0),
        "payment_method": getattr(ride, "payment_method", "Cash"),
        "payment_status": getattr(ride, "payment_status", None),
        "pending_dropoff": getattr(ride, "pending_dropoff", None),
        "pickup_eta": getattr(ride, "pickup_eta", "N/A"),
        "status": getattr(ride, "status", "pending"),
        "coupon_code": getattr(ride, "coupon_code", None),
        "discount_amount": getattr(ride, "discount_amount", None),
        "scheduled_time": getattr(ride, "scheduled_time", None),
        "verification_pin": verification_pin,
        "created_at": getattr(ride, "created_at", None),
        "updated_at": getattr(ride, "updated_at", None),
        "driver_name": getattr(ride, "driver_name", None),
        "driver_phone": getattr(ride, "driver_phone", None),
        "driver_vehicle_number": getattr(ride, "driver_vehicle_number", None),
        "driver_vehicle_model": getattr(ride, "driver_vehicle_model", None),
        "driver_vehicle_type": getattr(ride, "driver_vehicle_type", None),
        "driver_latitude": getattr(ride, "driver_latitude", None),
        "driver_longitude": getattr(ride, "driver_longitude", None),
        "driver_avatar": getattr(ride, "driver_avatar", None),
    }



@router.post("/auth/register", response_model=UserToken, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.phone == payload.phone).first():
        raise HTTPException(status_code=400, detail="Phone number already registered")

    user = User(
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        password_hash=get_password_hash(payload.password),
        home_address=payload.home_address,
        date_of_birth=payload.date_of_birth,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _token_response(user)


@router.post("/auth/login", response_model=UserToken)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _token_response(user)


@router.post("/auth/otp-request")
def otp_request(payload: OtpRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone == payload.phone).first()
    return {
        "status": "success",
        "message": f"OTP successfully sent to {payload.phone}",
        "otp": "1234",
        "user_exists": user is not None,
    }


@router.post("/auth/otp-verify", response_model=UserToken)
def otp_verify(payload: OtpVerifyRequest, db: Session = Depends(get_db)):
    if payload.otp != "1234":
        raise HTTPException(status_code=400, detail="Invalid OTP code. Use sandbox OTP: 1234")

    user = db.query(User).filter(User.phone == payload.phone).first()
    if not user:
        clean_phone = (payload.phone or "0000000000").replace(" ", "").replace("+", "")
        user = User(
            name="Golden Ride User",
            email=f"user_{clean_phone}@goldenride.com",
            phone=payload.phone or clean_phone,
            password_hash=get_password_hash("DefaultMockPassword123"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return _token_response(user)


@router.post("/auth/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        return {
            "status": "success",
            "message": "If an account exists, a reset code was sent.",
            "otp": "1234"
        }
    
    return {
        "status": "success",
        "message": f"Password reset OTP sent to {payload.email}",
        "otp": "1234"
    }

@router.post("/auth/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    if payload.otp != "1234":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset OTP code. Use sandbox OTP: 1234"
        )
        
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    user.password_hash = get_password_hash(payload.new_password)
    db.commit()
    
    return {
        "status": "success",
        "message": "Password successfully reset. You can now log in."
    }


@router.get("/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "phone": current_user.phone,
        "avatar": current_user.avatar,
        "rating": current_user.rating,
        "wallet_balance": current_user.wallet_balance,
        "card_number": (f"•••• •••• •••• {current_user.card_last4}" if current_user.stripe_payment_method_id and current_user.card_last4 else None),
        "card_expiry": None,
        "card_holder": None,
        "has_payment_method": bool(current_user.stripe_payment_method_id),
        "card_brand": current_user.card_brand,
        "card_last4": current_user.card_last4,
        "home_address": current_user.home_address,
        "date_of_birth": current_user.date_of_birth,
    }


@router.get("/wallet")
def get_wallet(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    txs = (
        db.query(WalletTransaction)
        .filter(WalletTransaction.user_id == current_user.id)
        .order_by(WalletTransaction.created_at.desc())
        .all()
    )
    if not txs:
        # Seed initial wallet transactions from the rides table so they have history
        rides = (
            db.query(Ride)
            .filter(Ride.user_id == current_user.id, Ride.status.in_(["completed", "cancelled"]))
            .order_by(Ride.updated_at.desc())
            .all()
        )
        for ride in rides:
            is_debit = (ride.status == "completed")
            tx = WalletTransaction(
                user_id=current_user.id,
                title=f"{ride.ride_class.title()} Ride",
                amount=ride.fare_amount,
                type="debit" if is_debit else "credit",
                created_at=ride.updated_at
            )
            db.add(tx)
        db.commit()
        # Re-query
        txs = (
            db.query(WalletTransaction)
            .filter(WalletTransaction.user_id == current_user.id)
            .order_by(WalletTransaction.created_at.desc())
            .all()
        )

    transactions = [
        {
            "id": f"tx-{t.id}",
            "title": t.title,
            "amount": t.amount,
            "type": t.type,
            "date": t.created_at.isoformat(),
        }
        for t in txs
    ]
    return {"wallet_balance": current_user.wallet_balance, "transactions": transactions}


@router.post("/wallet/top-up")
def top_up_wallet(
    payload: WalletTopUpRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.wallet_balance += payload.amount
    
    # Save top-up transaction
    tx = WalletTransaction(
        user_id=current_user.id,
        title="Wallet Top-Up",
        amount=payload.amount,
        type="credit"
    )
    db.add(tx)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return {"status": "success", "wallet_balance": current_user.wallet_balance}


@router.post("/rides/options", response_model=RideEstimateResponse)
async def get_ride_options(payload: RideEstimateRequest, current_user: User = Depends(get_current_user)):
    if not payload.pickup.strip() or not payload.dropoff.strip():
        raise HTTPException(status_code=400, detail="Pickup and dropoff are required")

    # Use real OSRM routing if coordinates provided, else seed fallback
    if (
        payload.pickup_latitude and payload.pickup_longitude
        and payload.dropoff_latitude and payload.dropoff_longitude
    ):
        from app.utils.helpers import get_osrm_route
        route = get_osrm_route(
            payload.pickup_latitude, payload.pickup_longitude,
            payload.dropoff_latitude, payload.dropoff_longitude
        )
        distance_km = route["distance_km"]
        duration_min = route["duration_min"]
    else:
        seed = len(payload.pickup.strip()) + len(payload.dropoff.strip())
        distance_km = max(2.1, min(30.0, (seed % 25) + 3.0))
        duration_min = max(5, round(distance_km * 3))
        
    # Same currency rule as booking, so the quote matches the fare charged
    currency = RideService.detect_currency(payload.pickup_latitude, payload.pickup_longitude)

    options = _build_options_from_route(distance_km, duration_min, currency)
    return RideEstimateResponse(options=options)


@router.post("/rides/book", response_model=RideResponse, status_code=status.HTTP_201_CREATED)
async def book_ride(
    payload: RideBookingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    unpaid = (
        db.query(Ride)
        .filter(Ride.user_id == current_user.id, Ride.status == "awaiting_payment")
        .first()
    )
    if unpaid:
        raise HTTPException(
            status_code=400,
            detail="Please complete payment for your previous ride before booking a new one.",
        )
    try:
        ride = await RideService.create_ride(
            db=db,
            user_id=current_user.id,
            pickup=payload.pickup,
            dropoff=payload.dropoff,
            ride_class=payload.ride_class,
            payment_method=payload.payment_method,
            pickup_latitude=payload.pickup_latitude,
            pickup_longitude=payload.pickup_longitude,
            dropoff_latitude=payload.dropoff_latitude,
            dropoff_longitude=payload.dropoff_longitude,
            coupon_code=payload.coupon_code,
            scheduled_time=payload.scheduled_time
        )
        return ride
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/rides/active", response_model=Optional[RideResponse])
def get_active_ride(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ride = (
        db.query(Ride)
        .options(
            joinedload(Ride.driver).joinedload(Driver.documents),
            joinedload(Ride.user),
        )
        .filter(
            Ride.user_id == current_user.id,
            Ride.status.in_(["pending", "accepted", "arrived", "started", "awaiting_payment"]),
        )
        .order_by(Ride.created_at.desc())
        .first()
    )
    if not ride:
        return None
    return _serialize_ride(ride)



@router.get("/rides/history", response_model=List[RideResponse])
def get_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rides = (
        db.query(Ride)
        .options(
            joinedload(Ride.driver).joinedload(Driver.documents),
            joinedload(Ride.user),
        )
        .filter(Ride.user_id == current_user.id, Ride.status.in_(["completed", "cancelled", "declined"]))
        .order_by(Ride.created_at.desc())
        .all()
    )
    return [_serialize_ride(r) for r in rides]


@router.get("/rides/{ride_id}", response_model=RideResponse)
def get_ride(ride_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ride = (
        db.query(Ride)
        .options(
            joinedload(Ride.driver).joinedload(Driver.documents),
            joinedload(Ride.user),
        )
        .filter(Ride.id == ride_id, Ride.user_id == current_user.id)
        .first()
    )
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    return _serialize_ride(ride)


@router.post("/rides/{ride_id}/cancel", response_model=RideResponse)
async def cancel_ride(
    ride_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        ride = await RideService.cancel_ride(
            db=db,
            ride_id=ride_id,
            user_id=current_user.id
        )
        return ride
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

async def _apply_destination(db: Session, ride: Ride, user: User, dropoff: str, latitude: Optional[float], longitude: Optional[float]) -> None:
    """Set a new drop-off, re-price it, adjust the card hold and tell the driver."""
    from app.services import stripe_service

    ride.to_location = dropoff
    if latitude and longitude:
        ride.dropoff_latitude = latitude
        ride.dropoff_longitude = longitude

        # Recalculate fare using OSRM
        from app.utils.helpers import get_osrm_route
        if ride.pickup_latitude and ride.pickup_longitude:
            try:
                route = get_osrm_route(ride.pickup_latitude, ride.pickup_longitude, latitude, longitude)
                distance_val = route["distance_km"]
                duration_min = route["duration_min"]
                ride.distance = f"{distance_val:.1f} km"
                ride.duration = format_duration(duration_min)

                currency = RideService.detect_currency(ride.pickup_latitude, ride.pickup_longitude)
                fare_amount, fare_str = RideService.calculate_fare(distance_val, duration_min, ride.ride_class, currency)

                # Deduct original discount if any
                if ride.discount_amount:
                    fare_amount = max(0.0, fare_amount - ride.discount_amount)
                    fare_str = f"${fare_amount:.2f}"
                RideService.change_card_fare(db, ride, user, fare_amount)
                ride.fare_amount = fare_amount
                ride.fare = fare_str
            except stripe_service.PaymentError as e:
                db.rollback()
                raise HTTPException(status_code=400, detail=str(e))
            except Exception:
                pass # Silent fallback if OSRM fails

    ride.pending_dropoff = None
    ride.pending_dropoff_latitude = None
    ride.pending_dropoff_longitude = None
    db.commit()
    db.refresh(ride)

    # Notify Driver if assigned
    if ride.driver_id:
        # The change and any card adjustment are already saved; a failed notify must not report an error
        try:
            await DispatchService.notify_destination_changed(db, ride)
        except Exception as e:
            print(f"Destination notify failed for ride {ride.id}: {e}")


@router.put("/rides/{ride_id}/destination", response_model=RideResponse)
async def update_destination(
    ride_id: int,
    payload: DestinationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ride = db.query(Ride).options(joinedload(Ride.user), joinedload(Ride.driver)).filter(Ride.id == ride_id, Ride.user_id == current_user.id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
        
    if ride.status not in ["pending", "accepted", "arrived", "started"]:
        raise HTTPException(status_code=400, detail="Cannot change destination for this ride status")
        
    from app.services import stripe_service

    await _apply_destination(db, ride, current_user, payload.dropoff, payload.dropoff_latitude, payload.dropoff_longitude)
    return _serialize_ride(ride)


class DestinationResponse(BaseModel):
    accept: bool


@router.post("/rides/{ride_id}/destination-response", response_model=RideResponse)
async def respond_to_destination_change(
    ride_id: int,
    payload: DestinationResponse,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Rider accepts or declines a drop-off change proposed by the driver."""
    from app.websocket.manager import manager

    ride = db.query(Ride).options(joinedload(Ride.user), joinedload(Ride.driver)).filter(Ride.id == ride_id, Ride.user_id == current_user.id).first()
    if not ride or not ride.pending_dropoff:
        raise HTTPException(status_code=404, detail="No pending destination change")
    if payload.accept:
        await _apply_destination(db, ride, current_user, ride.pending_dropoff, ride.pending_dropoff_latitude, ride.pending_dropoff_longitude)
    else:
        ride.pending_dropoff = None
        ride.pending_dropoff_latitude = None
        ride.pending_dropoff_longitude = None
        db.commit()
        db.refresh(ride)
        if ride.driver_id:
            await manager.send_to_driver(ride.driver_id, {"type": "destination_change_declined", "ride_id": ride.id})
    return _serialize_ride(ride)

@router.post("/profile/upload-avatar")
def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        web_path = save_upload_file(file, sub_folder=f"user_{current_user.id}")
        import time
        timestamped_path = f"{web_path}?t={int(time.time())}"
        current_user.avatar = timestamped_path
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        return {"status": "success", "avatar_url": web_path}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/profile/remove-avatar")
def remove_avatar(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        current_user.avatar = None
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class CouponValidateRequest(BaseModel):
    code: str
    fare_amount: float
    latitude: Optional[float] = None
    longitude: Optional[float] = None

@router.post("/coupons/validate")
def validate_coupon(
    payload: CouponValidateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    code = payload.code.strip().upper()
    currency = "INR"
    if payload.latitude is not None and payload.longitude is not None:
        currency = RideService.detect_currency(payload.latitude, payload.longitude)
    
    COUPONS = {
        "GOLDEN50": {"type": "percentage", "value": 50, "max_discount": 150.0 if currency == "INR" else 2.0, "min_fare": 100.0 if currency == "INR" else 1.0, "desc": "50% off up to ₹150"},
        "RIDE100": {"type": "flat", "value": 100.0 if currency == "INR" else 1.5, "max_discount": 100.0 if currency == "INR" else 1.5, "min_fare": 200.0 if currency == "INR" else 3.0, "desc": "Flat ₹100 off on rides above ₹200"},
        "WELCOME10": {"type": "percentage", "value": 10, "max_discount": 500.0 if currency == "INR" else 6.0, "min_fare": 50.0 if currency == "INR" else 0.5, "desc": "10% off up to ₹500"},
    }
    
    from app.services import family_coupons
    fam = family_coupons.get_coupon(db, code)
    if fam:
        ok, reason = family_coupons.check_eligibility(db, current_user.id, fam)
        if not ok:
            raise HTTPException(status_code=400, detail=reason)
        discount = family_coupons.compute_discount(fam, payload.fare_amount)
        if discount <= 0:
            raise HTTPException(status_code=400, detail=f"Coupon requires a minimum fare of ${int(fam.min_fare_usd)}")
        return {
            "valid": True,
            "code": code,
            "discount_amount": discount,
            "discounted_fare": max(0.0, payload.fare_amount - discount),
            "message": f"Coupon {code} applied! Saved ${discount:.2f}.",
        }

    if code not in COUPONS:
        raise HTTPException(status_code=400, detail="Invalid coupon code. Try GOLDEN50, RIDE100, or WELCOME10.")
        
    coupon = COUPONS[code]
    if payload.fare_amount < coupon["min_fare"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Coupon requires a minimum fare of {'₹' if currency == 'INR' else '$'}{int(coupon['min_fare'])}"
        )
        
    discount = 0.0
    if coupon["type"] == "percentage":
        discount = round(min(payload.fare_amount * (coupon["value"] / 100.0), coupon["max_discount"]), 2)
    elif coupon["type"] == "flat":
        discount = coupon["value"]
        
    discounted_fare = max(0.0, payload.fare_amount - discount)
    return {
        "valid": True,
        "code": code,
        "discount_amount": discount,
        "discounted_fare": discounted_fare,
        "message": f"Coupon {code} applied! Saved {'₹' if currency == 'INR' else '$'}{int(discount)}."
    }

from pydantic import BaseModel as PydanticBaseModel
# Helper to avoid local imports if needed, but we already have BaseModel imported.
# Let's write the profile update endpoint:
@router.put("/profile")
def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if payload.email and payload.email != current_user.email:
        if db.query(User).filter(User.email == payload.email).first():
            raise HTTPException(status_code=400, detail="Email already in use")
    
    if payload.phone and payload.phone != current_user.phone:
        if db.query(User).filter(User.phone == payload.phone).first():
            raise HTTPException(status_code=400, detail="Phone number already in use")

    if payload.name is not None:
        current_user.name = payload.name
    if payload.email is not None:
        current_user.email = payload.email
    if payload.phone is not None:
        current_user.phone = payload.phone
    if payload.home_address is not None:
        current_user.home_address = payload.home_address
    if payload.date_of_birth is not None:
        current_user.date_of_birth = payload.date_of_birth

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "phone": current_user.phone,
        "avatar": current_user.avatar,
        "rating": current_user.rating,
        "wallet_balance": current_user.wallet_balance,
        "home_address": current_user.home_address,
        "date_of_birth": current_user.date_of_birth,
    }

class CardUpdateRequest(BaseModel):
    card_number: str
    card_expiry: str
    card_cvv: str
    card_holder: str

@router.put("/profile/card")
def update_card(payload: CardUpdateRequest):
    # Raw card numbers/CVVs must never reach our servers (PCI). Old app builds land here.
    raise HTTPException(status_code=400, detail="Please update the Golden Ride app to add your card securely.")


@router.post("/card/setup-intent")
def create_card_setup_intent(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a Stripe SetupIntent so the app can collect the card with Stripe's secure CardField."""
    import stripe
    from app.services import stripe_service
    if stripe_service.is_mock():
        return {"client_secret": None, "mock": True}
    try:
        customer_id = stripe_service.ensure_customer(db, current_user)
        intent = stripe.SetupIntent.create(
            customer=customer_id,
            payment_method_types=["card"],
            usage="off_session",
        )
        return {"client_secret": intent.client_secret, "mock": False}
    except Exception:
        raise HTTPException(status_code=502, detail="Could not start card setup. Please try again.")


class SaveCardRequest(BaseModel):
    payment_method_id: str

@router.post("/card/save")
def save_card(
    payload: SaveCardRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Attach the Stripe payment method created by the app and remember brand/last4."""
    from app.services import stripe_service
    try:
        stripe_service.save_payment_method(db, current_user, payload.payment_method_id)
        _remember_card(db, current_user)
    except Exception:
        raise HTTPException(status_code=400, detail="Could not save this card.")
    return {
        "status": "success",
        "has_payment_method": True,
        "card_brand": current_user.card_brand,
        "card_last4": current_user.card_last4,
    }


# ── Saved cards ──────────────────────────────────────────────────────────────

def _card_out(card: SavedCard) -> dict:
    return {"id": card.id, "brand": card.brand, "last4": card.last4, "is_default": card.is_default}


@router.get("/cards")
def list_cards(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.stripe_payment_method_id and not db.query(SavedCard).filter(SavedCard.user_id == current_user.id).first():
        _remember_card(db, current_user)
    cards = db.query(SavedCard).filter(SavedCard.user_id == current_user.id).order_by(SavedCard.created_at).all()
    return [_card_out(c) for c in cards]


@router.post("/cards/{card_id}/default")
def set_default_card(card_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    card = db.query(SavedCard).filter(SavedCard.id == card_id, SavedCard.user_id == current_user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    current_user.stripe_payment_method_id = card.stripe_payment_method_id
    current_user.card_brand, current_user.card_last4 = card.brand, card.last4
    db.add(current_user)
    _remember_card(db, current_user)
    return {"status": "success"}


@router.delete("/cards/{card_id}")
def delete_card(card_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    import stripe
    from app.services import stripe_service

    card = db.query(SavedCard).filter(SavedCard.id == card_id, SavedCard.user_id == current_user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    remaining = db.query(SavedCard).filter(SavedCard.user_id == current_user.id, SavedCard.id != card.id).order_by(SavedCard.created_at.desc()).first()
    if card.is_default and not remaining and _has_open_ride(db, current_user):
        raise HTTPException(status_code=400, detail="You can't remove your only card during a trip")
    if not stripe_service.is_mock() and not card.stripe_payment_method_id.startswith("pm_mock"):
        try:
            stripe.PaymentMethod.detach(card.stripe_payment_method_id)
        except Exception:
            raise HTTPException(status_code=502, detail="Could not remove this card. Please try again.")
    was_default = card.is_default
    db.delete(card)
    db.commit()
    if was_default:
        current_user.stripe_payment_method_id = remaining.stripe_payment_method_id if remaining else None
        current_user.card_brand = remaining.brand if remaining else None
        current_user.card_last4 = remaining.last4 if remaining else None
        db.add(current_user)
        db.commit()
        if remaining:
            _remember_card(db, current_user)
    return {"status": "success"}


def _has_open_ride(db: Session, user: User) -> bool:
    return db.query(Ride).filter(
        Ride.user_id == user.id,
        Ride.status.in_(["pending", "accepted", "arrived", "started", "awaiting_payment"]),
    ).first() is not None


# ── Gift cards ───────────────────────────────────────────────────────────────

class GiftCardPurchase(BaseModel):
    amount: float


class GiftCardRedeem(BaseModel):
    code: str


def _gift_out(card: GiftCard) -> dict:
    return {
        "id": card.id,
        "code": card.code,
        "amount": card.amount,
        "balance": 0.0 if card.redeemed_at else card.amount,
        "status": "redeemed" if card.redeemed_at else "active",
        "created_at": card.created_at.isoformat(),
    }


@router.get("/giftcards")
def list_gift_cards(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cards = db.query(GiftCard).filter(GiftCard.purchaser_user_id == current_user.id).order_by(GiftCard.created_at.desc()).all()
    return [_gift_out(c) for c in cards]


@router.post("/giftcards/purchase")
def purchase_gift_card(payload: GiftCardPurchase, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    import secrets
    from app.services import stripe_service

    if payload.amount < 5 or payload.amount > 500:
        raise HTTPException(status_code=400, detail="Gift cards can be from $5 to $500")
    code = f"GOLD-{secrets.token_hex(4).upper()}"
    try:
        intent = stripe_service.charge_amount(db, current_user, payload.amount, "Golden Ride gift card", f"giftcard-{code}")
    except stripe_service.PaymentError as e:
        raise HTTPException(status_code=400, detail=str(e))
    card = GiftCard(code=code, amount=payload.amount, purchaser_user_id=current_user.id, stripe_payment_intent_id=intent)
    db.add(card)
    db.commit()
    db.refresh(card)
    return _gift_out(card)


@router.post("/giftcards/redeem")
def redeem_gift_card(payload: GiftCardRedeem, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from datetime import datetime as _dt

    card = db.query(GiftCard).filter(GiftCard.code == payload.code.strip().upper()).with_for_update().first()
    if not card or card.redeemed_at:
        raise HTTPException(status_code=400, detail="Invalid or already redeemed gift card code")
    card.redeemed_at = _dt.utcnow()
    card.redeemed_by_user_id = current_user.id
    current_user.wallet_balance = (current_user.wallet_balance or 0.0) + card.amount
    db.add(WalletTransaction(user_id=current_user.id, title=f"Gift card {card.code}", amount=card.amount, type="credit"))
    db.add(current_user)
    db.commit()
    return {**_gift_out(card), "wallet_balance": current_user.wallet_balance}


@router.get("/giftcards/balance/{code}")
def gift_card_balance(code: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    card = db.query(GiftCard).filter(GiftCard.code == code.strip().upper()).first()
    if not card:
        raise HTTPException(status_code=404, detail="Gift card not found")
    return {"code": card.code, "balance": 0.0 if card.redeemed_at else card.amount}


# ── Trip receipt ─────────────────────────────────────────────────────────────

@router.get("/rides/{ride_id}/receipt")
def get_receipt(ride_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ride = db.query(Ride).filter(Ride.id == ride_id, Ride.user_id == current_user.id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    total = ride.actual_fare or ride.fare_amount or 0.0
    when = ride.completed_at or ride.created_at
    lines = [
        "Golden Ride receipt",
        f"Trip #{ride.id} on {when.strftime('%b %d, %Y %I:%M %p')} UTC",
        f"From: {ride.from_location}",
        f"To: {ride.to_location}",
        f"Distance: {ride.distance}  Duration: {ride.duration}",
    ]
    if ride.discount_amount:
        lines.append(f"Discount: -${ride.discount_amount:.2f}")
    lines += [f"Total: ${total:.2f} USD", f"Payment: {ride.payment_method} ({ride.payment_status})"]
    return {"text": "\n".join(lines), "total": total, "email": current_user.email}


# ── Settings and account ─────────────────────────────────────────────────────

DEFAULT_RIDER_SETTINGS = {"trip_notifications": True, "promo_notifications": True, "system_notifications": True,
                          "share_data_for_analytics": False, "language": "en"}


@router.get("/settings")
def get_settings(current_user: User = Depends(get_current_user)):
    return {**DEFAULT_RIDER_SETTINGS, **json.loads(current_user.settings_json or "{}")}


@router.put("/settings")
def update_settings(payload: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    merged = {**DEFAULT_RIDER_SETTINGS, **json.loads(current_user.settings_json or "{}")}
    merged.update({k: v for k, v in payload.items() if k in DEFAULT_RIDER_SETTINGS})
    current_user.settings_json = json.dumps(merged)
    db.add(current_user)
    db.commit()
    return merged


@router.delete("/account")
def delete_account(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Close the account and remove personal details. Trip records stay, without the rider's identity."""
    import secrets

    if _has_open_ride(db, current_user):
        raise HTTPException(status_code=400, detail="Please finish or cancel your current trip first")
    db.query(SavedCard).filter(SavedCard.user_id == current_user.id).delete()
    current_user.name = "Deleted User"
    current_user.email = f"deleted-{current_user.id}@deleted.golden-ride.com"
    current_user.phone = f"deleted-{current_user.id}"
    current_user.password_hash = secrets.token_hex(32)
    current_user.home_address = None
    current_user.date_of_birth = None
    current_user.avatar = None
    current_user.stripe_payment_method_id = None
    current_user.card_brand = None
    current_user.card_last4 = None
    current_user.is_active = False
    db.add(current_user)
    db.commit()
    return {"status": "deleted"}
