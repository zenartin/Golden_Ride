from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.ride import Ride
from app.models.user import User, WalletTransaction
from app.schemas.auth import LoginRequest, OtpRequest, OtpVerifyRequest, UserRegisterRequest, UserToken, ProfileUpdateRequest
from app.schemas.ride import (
    RideBookingRequest,
    RideEstimateRequest,
    RideEstimateResponse,
    RideOption,
    RideResponse,
    WalletTopUpRequest,
)
from app.utils.security import create_access_token, get_current_user, get_password_hash, verify_password
from app.services.ride_service import RideService
from app.utils.storage import save_upload_file

router = APIRouter(prefix="/user", tags=["user"])

RIDE_META = {
    "hatchback": {"title": "Hatchback", "subtitle": "Budget compact AC hatchback", "seats": 4, "multiplier": 1.0},
    "sedan":     {"title": "Sedan",     "subtitle": "Comfortable AC car for daily rides", "seats": 4, "multiplier": 1.4},
    "xuv":       {"title": "XUV",       "subtitle": "Spacious SUV for groups & luggage",  "seats": 6, "multiplier": 1.85},
}


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
        "country": user.country,
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
                price=int(round(fare_amount)),
                distance=f"{distance_km:.1f} km",
                duration=f"{duration_min} min",
            )
        )
    return options


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
        country=payload.country,
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
    }


@router.get("/wallet")
def get_wallet(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    txs = (
        db.query(WalletTransaction)
        .filter(WalletTransaction.user_id == current_user.id)
        .order_by(WalletTransaction.created_at.desc())
        .limit(15)
        .all()
    )
    if not txs:
        # Seed initial wallet transactions from the rides table so they have history
        rides = (
            db.query(Ride)
            .filter(Ride.user_id == current_user.id, Ride.status.in_(["completed", "cancelled"]))
            .order_by(Ride.updated_at.desc())
            .limit(10)
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
        
    # Use the authenticated user's country to determine currency explicitly
    currency = "USD" if current_user.country == "USA" else "INR"

    options = _build_options_from_route(distance_km, duration_min, currency)
    return RideEstimateResponse(options=options)


@router.post("/rides/book", response_model=RideResponse, status_code=status.HTTP_201_CREATED)
async def book_ride(
    payload: RideBookingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
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
            coupon_code=payload.coupon_code
        )
        return ride
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/rides/active", response_model=Optional[RideResponse])
def get_active_ride(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(Ride)
        .filter(
            Ride.user_id == current_user.id,
            Ride.status.in_(["pending", "accepted", "arrived", "started"]),
        )
        .order_by(Ride.created_at.desc())
        .first()
    )


@router.get("/rides/history", response_model=List[RideResponse])
def get_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(Ride)
        .filter(Ride.user_id == current_user.id, Ride.status.in_(["completed", "cancelled", "declined"]))
        .order_by(Ride.created_at.desc())
        .all()
    )


@router.get("/rides/{ride_id}", response_model=RideResponse)
def get_ride(ride_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ride = db.query(Ride).filter(Ride.id == ride_id, Ride.user_id == current_user.id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    return ride


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

@router.post("/profile/upload-avatar")
def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        web_path = save_upload_file(file, sub_folder=f"user_{current_user.id}")
        current_user.avatar = web_path
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
        "wallet_balance": current_user.wallet_balance
    }
