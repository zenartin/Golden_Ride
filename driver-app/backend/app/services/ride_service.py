import asyncio
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models.ride import Ride
from app.models.driver import Driver
from app.models.user import User, WalletTransaction
from app.repositories.ride_repository import RideRepository
from app.repositories.driver_repository import DriverRepository
from app.repositories.user_repository import UserRepository
from app.repositories.ride_assignment_repository import RideAssignmentRepository
from app.services.dispatch_service import DispatchService
from app.exceptions import RideNotFoundError, RideExpiredError, RideAlreadyAcceptedError

logger = logging.getLogger("app")

class RideService:
    # Fare rates: base + per-km for each ride class
    # India rates (INR) — city-tier pricing
    INR_RATES = {
        "auto":      {"base": 30.0,  "per_km": 9.0},
        "hatchback": {"base": 35.0,  "per_km": 10.0},
        "sedan":     {"base": 50.0,  "per_km": 14.0},
        "xuv":       {"base": 80.0,  "per_km": 20.0},
    }
    # USA rates (USD) — typical ride-share pricing
    USD_RATES = {
        "auto":      {"base": 1.50, "per_km": 0.70},
        "hatchback": {"base": 1.80, "per_km": 0.85},
        "sedan":     {"base": 2.50, "per_km": 1.10},
        "xuv":       {"base": 4.50, "per_km": 1.65},
    }

    @staticmethod
    def detect_currency(lat: float = None, lon: float = None) -> str:
        """
        Detect currency based on coordinates.
        India bounding box: lat 6–37, lon 68–97
        Anything outside that defaults to USD.
        """
        if lat is not None and lon is not None:
            if 6.0 <= lat <= 37.5 and 68.0 <= lon <= 97.5:
                return "INR"
        return "USD"

    @classmethod
    def calculate_fare(cls, distance_km: float, ride_class: str, currency: str = "INR") -> tuple:
        """Returns (fare_amount: float, fare_str: str)"""
        if currency == "INR":
            rates = cls.INR_RATES.get(ride_class, cls.INR_RATES["sedan"])
            amount = round(rates["base"] + distance_km * rates["per_km"], 2)
            return amount, f"₹{int(amount)}"
        else:
            rates = cls.USD_RATES.get(ride_class, cls.USD_RATES["sedan"])
            amount = round(rates["base"] + distance_km * rates["per_km"], 2)
            return amount, f"${amount:.2f}"

    @classmethod
    async def create_ride(
        cls,
        db: Session,
        user_id: int,
        pickup: str,
        dropoff: str,
        ride_class: str,
        payment_method: str = "Cash",
        pickup_latitude: float = None,
        pickup_longitude: float = None,
        dropoff_latitude: float = None,
        dropoff_longitude: float = None,
        coupon_code: str = None
    ) -> Ride:
        user = UserRepository.get_by_id(db, user_id)
        if not user:
            raise Exception("User not found")

        # Detect region/currency from pickup coordinates
        currency = cls.detect_currency(pickup_latitude, pickup_longitude)

        # Get real road distance & duration via OSRM (free, no API key)
        if pickup_latitude and pickup_longitude and dropoff_latitude and dropoff_longitude:
            from app.utils.helpers import get_osrm_route
            route = get_osrm_route(pickup_latitude, pickup_longitude, dropoff_latitude, dropoff_longitude)
            distance_val = route["distance_km"]
            duration_min = route["duration_min"]
        else:
            # Fallback: rough estimate from string length
            seed = len(pickup.strip()) + len(dropoff.strip())
            distance_val = max(2.1, min(30.0, (seed % 25) + 3.0))
            duration_min = max(5, round(distance_val * 3))

        distance_str = f"{distance_val:.1f} km"
        duration_str = f"{duration_min} min"

        fare_amount, fare_str = cls.calculate_fare(distance_val, ride_class, currency)

        discount_amount = 0.0
        if coupon_code:
            code = coupon_code.strip().upper()
            if code == "GOLDEN50":
                limit = 150.0 if currency == "INR" else 2.0
                discount_amount = round(min(fare_amount * 0.5, limit), 2)
            elif code == "RIDE100":
                min_f = 200.0 if currency == "INR" else 3.0
                flat_val = 100.0 if currency == "INR" else 1.5
                if fare_amount >= min_f:
                    discount_amount = flat_val
            elif code == "WELCOME10":
                limit = 500.0 if currency == "INR" else 6.0
                discount_amount = round(min(fare_amount * 0.1, limit), 2)

            fare_amount = max(0.0, fare_amount - discount_amount)
            if currency == "INR":
                fare_str = f"₹{int(fare_amount)} (Saved ₹{int(discount_amount)} via {code})"
            else:
                fare_str = f"${fare_amount:.2f} (Saved ${discount_amount:.2f} via {code})"

        # If payment is wallet, verify user has enough balance and deduct
        if payment_method.lower() == "wallet":
            if user.wallet_balance < fare_amount:
                raise Exception("Insufficient wallet balance")
            user.wallet_balance -= fare_amount
            tx = WalletTransaction(
                user_id=user_id,
                title=f"{ride_class.title()} Ride Booking" + (f" ({coupon_code.upper()})" if coupon_code else ""),
                amount=fare_amount,
                type="debit"
            )
            db.add(tx)
            db.add(user)
            db.commit()

        ride = RideRepository.create_ride(
            db=db,
            user_id=user_id,
            rider_name=user.name,
            from_location=pickup,
            to_location=dropoff,
            distance=distance_str,
            duration=duration_str,
            fare=fare_str,
            fare_amount=fare_amount,
            ride_class=ride_class,
            payment_method=payment_method,
            pickup_latitude=pickup_latitude,
            pickup_longitude=pickup_longitude,
            dropoff_latitude=dropoff_latitude,
            dropoff_longitude=dropoff_longitude,
            coupon_code=coupon_code,
            discount_amount=discount_amount
        )

        # Trigger dispatch process asynchronously
        asyncio.create_task(DispatchService.dispatch_ride(db, ride))

        # Schedule the 60-second expiry task
        asyncio.create_task(cls._schedule_ride_expiry(ride.id))

        return ride

    @classmethod
    async def _schedule_ride_expiry(cls, ride_id: int):
        await asyncio.sleep(60)
        logger.info(f"Checking expiry for ride {ride_id}")
        
        db = SessionLocal()
        try:
            # Row-level lock the ride inside its own transaction
            ride = db.query(Ride).filter(Ride.id == ride_id).with_for_update().first()
            if ride and ride.status == "pending":
                ride.status = "expired"
                ride.updated_at = datetime.utcnow()
                db.commit()
                
                # Notify driver WebSocket/FCM and user WebSocket
                await DispatchService.notify_ride_expired(db, ride)
                logger.info(f"Ride {ride_id} has expired (no driver accepted)")
        except Exception as e:
            logger.error(f"Error in schedule_ride_expiry task: {e}")
        finally:
            db.close()

    @classmethod
    async def accept_ride(cls, db: Session, ride_id: int, driver_id: int) -> Ride:
        # Row-level locking accept operation
        ride = RideRepository.accept_ride(db, ride_id, driver_id)
        
        # Update RideAssignment
        assignment = RideAssignmentRepository.get_by_ride_and_driver(db, ride_id, driver_id)
        if assignment:
            RideAssignmentRepository.update_assignment_status(db, assignment, "accepted", "accept")

        # Increment driver statistics
        driver = DriverRepository.get_by_id(db, driver_id)
        if driver:
            DriverRepository.increment_total_rides(db, driver)

        # Send WebSockets / Push notifies
        await DispatchService.notify_ride_accepted(db, ride, driver_id)
        return ride

    @classmethod
    async def reject_ride(cls, db: Session, ride_id: int, driver_id: int) -> None:
        # Update assignment record to rejected
        assignment = RideAssignmentRepository.get_by_ride_and_driver(db, ride_id, driver_id)
        if assignment:
            RideAssignmentRepository.update_assignment_status(db, assignment, "rejected", "reject")
        else:
            # If no assignment records (e.g. driver offline/pull sync rejected it), create one
            RideAssignmentRepository.create_assignment(db, ride_id, driver_id, "rejected")

    @classmethod
    async def arrive_at_pickup(cls, db: Session, ride_id: int, driver_id: int) -> Ride:
        ride = RideRepository.get_by_id(db, ride_id)
        if not ride:
            raise RideNotFoundError()
        if ride.driver_id != driver_id:
            raise Exception("Unauthorized driver for this ride")
        if ride.status != "accepted":
            raise Exception(f"Cannot arrive for ride from status: {ride.status}")

        updated_ride = RideRepository.update_status(db, ride, "arrived")
        await DispatchService.notify_ride_status_update(db, updated_ride)
        return updated_ride

    @classmethod
    async def start_ride(cls, db: Session, ride_id: int, driver_id: int) -> Ride:
        ride = RideRepository.get_by_id(db, ride_id)
        if not ride:
            raise RideNotFoundError()
        if ride.driver_id != driver_id:
            raise Exception("Unauthorized driver for this ride")
        if ride.status != "arrived":
            raise Exception(f"Cannot start ride from status: {ride.status}")

        updated_ride = RideRepository.update_status(db, ride, "started")
        await DispatchService.notify_ride_status_update(db, updated_ride)
        return updated_ride

    @classmethod
    async def complete_ride(cls, db: Session, ride_id: int, driver_id: int) -> Ride:
        ride = RideRepository.get_by_id(db, ride_id)
        if not ride:
            raise RideNotFoundError()
        if ride.driver_id != driver_id:
            raise Exception("Unauthorized driver for this ride")
        if ride.status != "started":
            raise Exception(f"Cannot complete ride from status: {ride.status}")

        # Credit driver balance
        driver = DriverRepository.get_by_id(db, driver_id)
        if driver:
            driver.balance = (driver.balance or 0.0) + ride.fare_amount
            db.add(driver)
            db.commit()

        updated_ride = RideRepository.update_status(db, ride, "completed", actual_fare=ride.fare_amount)
        await DispatchService.notify_ride_status_update(db, updated_ride)
        return updated_ride

    @classmethod
    async def cancel_ride(cls, db: Session, ride_id: int, user_id: int, cancellation_reason: str = None) -> Ride:
        ride = RideRepository.get_by_id(db, ride_id)
        if not ride:
            raise RideNotFoundError()
        if ride.user_id != user_id:
            raise Exception("Unauthorized user for this ride")
        if ride.status in ["completed", "cancelled"]:
            raise Exception("Ride is already finalized")

        # Refund user wallet if booked via Wallet
        if ride.payment_method.lower() == "wallet":
            user = UserRepository.get_by_id(db, user_id)
            if user:
                user.wallet_balance += ride.fare_amount
                tx = WalletTransaction(
                    user_id=user_id,
                    title=f"Ride Refund (#{ride.id})",
                    amount=ride.fare_amount,
                    type="credit"
                )
                db.add(tx)
                db.add(user)
                db.commit()

        updated_ride = RideRepository.update_status(db, ride, "cancelled", cancellation_reason=cancellation_reason)
        await DispatchService.notify_ride_cancelled(db, updated_ride)
        return updated_ride
