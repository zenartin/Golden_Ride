import math
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session


from app.database import get_db
from app.models.driver import Driver
from app.models.message import Notification
from app.models.ride import Ride
from app.models.user import User
from app.schemas.auth import LoginRequest, OtpRequest, OtpVerifyRequest, UserRegisterRequest, UserToken
from app.schemas.ride import (
    RideBookingRequest,
    RideEstimateRequest,
    RideEstimateResponse,
    RideOption,
    RideResponse,
    WalletTopUpRequest,
)
from app.utils.security import create_access_token, get_current_user, get_password_hash, verify_password

router = APIRouter(prefix="/user", tags=["user"])

RIDE_META = {
    "auto":  {"title": "Auto",  "subtitle": "Quick & budget-friendly 3-wheeler", "seats": 3, "multiplier": 1.0},
    "sedan": {"title": "Sedan", "subtitle": "Comfortable AC car for daily rides",  "seats": 4, "multiplier": 1.4},
    "xuv":   {"title": "XUV",   "subtitle": "Spacious SUV for groups & luggage",   "seats": 6, "multiplier": 1.85},
}


def _token_response(user: User) -> dict:
    token = create_access_token(data={"sub": str(user.id), "role": "user"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": "user",
        "name": user.name,
        "phone": user.phone,
        "email": user.email,
        "wallet_balance": user.wallet_balance,
        "country": user.country or "India",
    }


def _estimate_distance(pickup: str, dropoff: str, lat1: Optional[float] = None, lon1: Optional[float] = None, lat2: Optional[float] = None, lon2: Optional[float] = None) -> float:
    if lat1 is not None and lon1 is not None and lat2 is not None and lon2 is not None:
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        distance = R * c
        return max(1.0, distance * 1.3) # 1.3 multiplier for road distance

    seed = len(pickup.strip()) + len(dropoff.strip())
    return max(2.1, min(24.0, (seed % 21) + 2.3))


def _build_options(pickup: str, dropoff: str, lat1: Optional[float] = None, lon1: Optional[float] = None, lat2: Optional[float] = None, lon2: Optional[float] = None) -> List[RideOption]:
    distance_km = _estimate_distance(pickup, dropoff, lat1, lon1, lat2, lon2)
    distance_miles = distance_km * 0.621371
    duration_min = max(10, round(distance_km * 4))
    eta_base = max(4, round(distance_km / 2))

    base_fare = 2.00
    booking_fee = 2.00
    per_mile = 0.80
    per_minute = 0.15
    
    calc_price = base_fare + booking_fee + (distance_miles * per_mile) + (duration_min * per_minute)
    final_price = max(6.00, calc_price)

    options = []
    for index, (ride_class, meta) in enumerate(RIDE_META.items()):
        options.append(
            RideOption(
                id=ride_class,
                title=meta["title"],
                subtitle=meta["subtitle"],
                seats=meta["seats"],
                eta=f"{eta_base + index * 3} min",
                price=round(final_price * meta["multiplier"], 2),
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
        country=payload.country or "India",
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
        "country": current_user.country or "India",
        "card_number": current_user.card_number,
        "card_expiry": current_user.card_expiry,
        "card_cvv": current_user.card_cvv,
        "card_holder": current_user.card_holder,
    }


@router.post("/profile/upload-avatar")
def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.utils.storage import save_upload_file
    web_path = save_upload_file(file, sub_folder=f"user_{current_user.id}")
    current_user.avatar = web_path
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return {"status": "success", "url": web_path, "avatar_url": web_path}


@router.post("/profile/remove-avatar")
def remove_avatar(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user.avatar = None
    db.add(current_user)
    db.commit()
    return {"status": "success"}


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None


@router.put("/profile")
def update_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.name is not None:
        current_user.name = payload.name
    if payload.email is not None:
        current_user.email = payload.email
    if payload.phone is not None:
        current_user.phone = payload.phone
    if payload.country is not None:
        current_user.country = payload.country
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "phone": current_user.phone,
        "country": current_user.country or "India",
        "avatar": current_user.avatar,
        "card_number": current_user.card_number,
        "card_expiry": current_user.card_expiry,
        "card_cvv": current_user.card_cvv,
        "card_holder": current_user.card_holder,
    }


class UpdateCardRequest(BaseModel):
    card_number: str
    card_expiry: str
    card_cvv: str
    card_holder: str


@router.put("/profile/card")
def update_card(
    payload: UpdateCardRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.card_number = payload.card_number
    current_user.card_expiry = payload.card_expiry
    current_user.card_cvv = payload.card_cvv
    current_user.card_holder = payload.card_holder
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "phone": current_user.phone,
        "country": current_user.country or "India",
        "card_number": current_user.card_number,
        "card_expiry": current_user.card_expiry,
        "card_cvv": current_user.card_cvv,
        "card_holder": current_user.card_holder,
    }




@router.get("/wallet")
def get_wallet(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rides = (
        db.query(Ride)
        .filter(Ride.user_id == current_user.id, Ride.status.in_(["completed", "cancelled"]))
        .order_by(Ride.updated_at.desc())
        .limit(10)
        .all()
    )
    transactions = [
        {
            "id": f"ride-{ride.id}",
            "title": f"{ride.ride_class.title()} ride",
            "amount": ride.fare_amount,
            "type": "debit" if ride.status == "completed" else "credit",
            "date": ride.updated_at,
        }
        for ride in rides
    ]
    return {"wallet_balance": current_user.wallet_balance, "transactions": transactions}


@router.post("/wallet/top-up")
def top_up_wallet(
    payload: WalletTopUpRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Top-up amount must be greater than zero")
    current_user.wallet_balance += payload.amount
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return {"status": "success", "wallet_balance": current_user.wallet_balance}


@router.post("/rides/options", response_model=RideEstimateResponse)
def get_ride_options(payload: RideEstimateRequest, current_user: User = Depends(get_current_user)):
    if not payload.pickup.strip() or not payload.dropoff.strip():
        raise HTTPException(status_code=400, detail="Pickup and dropoff are required")
    return RideEstimateResponse(options=_build_options(
        payload.pickup, payload.dropoff,
        payload.pickup_latitude, payload.pickup_longitude,
        payload.dropoff_latitude, payload.dropoff_longitude
    ))


@router.post("/rides/book", response_model=RideResponse, status_code=status.HTTP_201_CREATED)
def book_ride(
    payload: RideBookingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    options = _build_options(
        payload.pickup, payload.dropoff,
        payload.pickup_latitude, payload.pickup_longitude,
        payload.dropoff_latitude, payload.dropoff_longitude
    )
    chosen = next((option for option in options if option.id == payload.ride_class), options[1])

    if payload.payment_method.lower() == "wallet" and current_user.wallet_balance < chosen.price:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance")

    if payload.payment_method.lower() == "wallet":
        current_user.wallet_balance -= chosen.price
        db.add(current_user)

    ride = Ride(
        user_id=current_user.id,
        rider_name=current_user.name,
        rider_rating=current_user.rating,
        rider_trips=db.query(Ride).filter(Ride.user_id == current_user.id).count(),
        ride_class=chosen.id,
        from_location=payload.pickup,
        to_location=payload.dropoff,
        pickup_latitude=payload.pickup_latitude,
        pickup_longitude=payload.pickup_longitude,
        dropoff_latitude=payload.dropoff_latitude,
        dropoff_longitude=payload.dropoff_longitude,
        distance=chosen.distance,
        duration=chosen.duration,
        fare=f"Rs. {chosen.price}",
        fare_amount=chosen.price,
        payment_method=payload.payment_method,
        pickup_eta=chosen.eta,
        status="pending",
    )
    db.add(ride)
    db.commit()
    db.refresh(ride)

    # Notify all online drivers about the new booking request
    active_drivers = db.query(Driver).filter(Driver.is_online == True).all()
    for driver in active_drivers:
        notification = Notification(
            driver_id=driver.id,
            title="New ride request",
            message=f"A new ride is available from {payload.pickup} to {payload.dropoff}.",
            type="ride",
        )
        db.add(notification)
    db.commit()

    return ride


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
def cancel_ride(ride_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ride = db.query(Ride).filter(Ride.id == ride_id, Ride.user_id == current_user.id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if ride.status in ["completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Ride cannot be cancelled")

    if ride.payment_method.lower() == "wallet" and ride.status in ["pending", "accepted"]:
        current_user.wallet_balance += ride.fare_amount
        db.add(current_user)

    ride.status = "cancelled"
    ride.updated_at = datetime.utcnow()
    db.add(ride)
    db.commit()
    db.refresh(ride)
    return ride
