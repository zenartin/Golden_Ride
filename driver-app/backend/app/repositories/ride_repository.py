from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from app.models.ride import Ride
from app.exceptions import RideNotFoundError, RideAlreadyAcceptedError, RideExpiredError

class RideRepository:
    @staticmethod
    def get_by_id(db: Session, ride_id: int) -> Optional[Ride]:
        return db.query(Ride).filter(Ride.id == ride_id).first()

    @staticmethod
    def create_ride(
        db: Session,
        user_id: int,
        rider_name: str,
        from_location: str,
        to_location: str,
        distance: str,
        duration: str,
        fare: str,
        fare_amount: float,
        ride_class: str,
        payment_method: str = "Wallet",
        pickup_latitude: float = None,
        pickup_longitude: float = None,
        dropoff_latitude: float = None,
        dropoff_longitude: float = None,
        pickup_eta: str = "3 min away",
        coupon_code: str = None,
        discount_amount: float = None
    ) -> Ride:
        ride = Ride(
            user_id=user_id,
            rider_name=rider_name,
            from_location=from_location,
            to_location=to_location,
            distance=distance,
            duration=duration,
            fare=fare,
            fare_amount=fare_amount,
            ride_class=ride_class,
            payment_method=payment_method,
            pickup_latitude=pickup_latitude,
            pickup_longitude=pickup_longitude,
            dropoff_latitude=dropoff_latitude,
            dropoff_longitude=dropoff_longitude,
            pickup_eta=pickup_eta,
            coupon_code=coupon_code,
            discount_amount=discount_amount,
            status="pending",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(ride)
        db.commit()
        db.refresh(ride)
        return ride

    @staticmethod
    def get_pending_rides(db: Session) -> List[Ride]:
        return db.query(Ride).filter(Ride.status == "pending").all()

    @staticmethod
    def get_active_ride_for_driver(db: Session, driver_id: int) -> Optional[Ride]:
        return db.query(Ride).filter(
            Ride.driver_id == driver_id,
            Ride.status.in_(["accepted", "arrived", "started"])
        ).first()

    @staticmethod
    def get_active_ride_for_user(db: Session, user_id: int) -> Optional[Ride]:
        return db.query(Ride).filter(
            Ride.user_id == user_id,
            Ride.status.in_(["pending", "accepted", "arrived", "started"])
        ).order_by(Ride.created_at.desc()).first()

    @staticmethod
    def get_ride_history_for_driver(db: Session, driver_id: int, limit: int = 20, offset: int = 0) -> List[Ride]:
        return db.query(Ride).filter(
            Ride.driver_id == driver_id,
            Ride.status.in_(["completed", "cancelled", "declined"])
        ).order_by(Ride.created_at.desc()).limit(limit).offset(offset).all()

    @staticmethod
    def get_ride_history_for_user(db: Session, user_id: int, limit: int = 20, offset: int = 0) -> List[Ride]:
        return db.query(Ride).filter(
            Ride.user_id == user_id,
            Ride.status.in_(["completed", "cancelled", "declined"])
        ).order_by(Ride.created_at.desc()).limit(limit).offset(offset).all()

    @staticmethod
    def accept_ride(db: Session, ride_id: int, driver_id: int) -> Ride:
        # PostgreSQL SELECT ... FOR UPDATE row-level locking
        # Wait, if we use SQLite in tests, with_for_update is ignored or acts as normal transaction.
        # But in Postgres it locks the row!
        ride = db.query(Ride).filter(Ride.id == ride_id).with_for_update().first()
        if not ride:
            raise RideNotFoundError()
        if ride.status == "cancelled":
            raise RideExpiredError("Ride request was cancelled by the user")
        if ride.status == "declined" or ride.status == "expired":
            raise RideExpiredError()
        if ride.status != "pending":
            raise RideAlreadyAcceptedError()

        ride.driver_id = driver_id
        ride.status = "accepted"
        ride.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(ride)
        return ride

    @staticmethod
    def update_status(db: Session, ride: Ride, status: str, actual_fare: float = None, cancellation_reason: str = None) -> Ride:
        ride.status = status
        ride.updated_at = datetime.utcnow()
        
        if status == "started":
            ride.started_at = datetime.utcnow()
        elif status == "completed":
            ride.completed_at = datetime.utcnow()
            if actual_fare is not None:
                ride.actual_fare = actual_fare
        elif status == "cancelled":
            if cancellation_reason:
                ride.cancellation_reason = cancellation_reason

        db.add(ride)
        db.commit()
        db.refresh(ride)
        return ride
