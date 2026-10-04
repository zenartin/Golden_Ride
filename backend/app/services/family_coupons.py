"""Family / loyalty coupons from database."""
from sqlalchemy.orm import Session
from app.models.ride import Ride
from app.models.coupon import Coupon

def get_coupon(db: Session, code: str) -> Coupon:
    code = (code or "").strip().upper()
    return db.query(Coupon).filter(Coupon.code == code, Coupon.is_active == True).first()

def completed_rides(db: Session, user_id: int) -> int:
    return db.query(Ride).filter(Ride.user_id == user_id, Ride.status == "completed").count()

def already_used(db: Session, user_id: int, code: str) -> bool:
    return db.query(Ride).filter(
        Ride.user_id == user_id,
        Ride.coupon_code == code,
        Ride.status != "cancelled",
    ).count() > 0

def check_eligibility(db: Session, user_id: int, coupon: Coupon):
    """Returns (eligible: bool, reason: str|None)."""
    done = completed_rides(db, user_id)
    if done < coupon.rides_required:
        left = coupon.rides_required - done
        return False, f"Complete {left} more ride{'s' if left != 1 else ''} to unlock."
    if coupon.one_time and already_used(db, user_id, coupon.code):
        return False, "Already used."
    return True, None

def compute_discount(coupon: Coupon, fare_amount: float) -> float:
    if fare_amount < coupon.min_fare_usd:
        return 0.0
    if coupon.type == "percentage":
        discount = fare_amount * (coupon.value / 100.0)
        if coupon.max_discount_usd:
            discount = min(discount, coupon.max_discount_usd)
        return round(discount, 2)
    elif coupon.type == "flat":
        return round(coupon.value, 2)
    return 0.0
