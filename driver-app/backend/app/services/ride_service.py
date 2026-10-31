import asyncio
import logging
import uuid
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
from app.services import stripe_service
from app.utils.pin import generate_ride_pin, hash_ride_pin
from app.exceptions import RideNotFoundError, RideExpiredError, RideAlreadyAcceptedError
from app.utils.helpers import calculate_distance_haversine

# How close to their set destination a driver must be for destination mode to switch off
DESTINATION_ARRIVAL_KM = 0.5


def end_destination_mode_on_arrival(db: Session, driver: Driver) -> bool:
    """Switch destination mode off once the driver reaches their destination. Returns True if it did."""
    if not (driver.destination_mode_active and driver.destination_lat and driver.destination_lng
            and driver.latitude and driver.longitude):
        return False
    if calculate_distance_haversine(driver.latitude, driver.longitude, driver.destination_lat, driver.destination_lng) > DESTINATION_ARRIVAL_KM:
        return False
    driver.destination_mode_active = False
    db.add(driver)
    db.commit()
    return True


logger = logging.getLogger("app")

class RideService:
    # USA rates (USD) — Lyft algorithm (slightly less): Base $1.50, $0.55/km (~$0.88/mi), $0.15/min, $1.50 fee
    USD_BASE_RATES = {"base": 1.50, "per_km": 0.55, "per_min": 0.15, "booking_fee": 1.50, "min_fare": 4.00}
    
    # India rates (INR) — Lyft algorithm adapted for India: Base ₹40, ₹15/km, ₹2/min, ₹10 fee
    INR_BASE_RATES = {"base": 40.0, "per_km": 15.0, "per_min": 2.0, "booking_fee": 10.0, "min_fare": 50.0}

    # Paid some other way, so these never touch the saved card at booking
    NON_CARD_METHODS = ("wallet", "cash", "cod", "razorpay")

    # Class multipliers (matching frontend estimates)
    CLASS_MULTIPLIERS = {
        "golden ride sedan": 1.0,
        "golden ride suv": 1.5,
        "golden ride van": 2.0,
        "golden ridex": 1.2,
        "golden ridexl": 2.5,
        "golden ride pet": 1.3,
    }

    @staticmethod
    def detect_currency(lat: float = None, lon: float = None) -> str:
        """
        Always return USD globally as requested by the user.
        """
        return "USD"

    @classmethod
    def calculate_fare(cls, distance_km: float, duration_min: float, ride_class: str, currency: str = "INR") -> tuple:
        """Returns (fare_amount: float, fare_str: str)"""
        multiplier = cls.CLASS_MULTIPLIERS.get(ride_class.lower(), 1.0)
        
        if currency == "INR":
            rates = cls.INR_BASE_RATES
            calc_price = rates["base"] + (distance_km * rates["per_km"]) + (duration_min * rates["per_min"]) + rates["booking_fee"]
            amount = max(rates["min_fare"], calc_price)
            amount = round(amount * multiplier, 2)
            return amount, f"₹{int(amount)}"
        else:
            rates = cls.USD_BASE_RATES
            calc_price = rates["base"] + (distance_km * rates["per_km"]) + (duration_min * rates["per_min"]) + rates["booking_fee"]
            amount = max(rates["min_fare"], calc_price)
            amount = round(amount * multiplier, 2)
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
        coupon_code: str = None,
        scheduled_time: datetime = None
    ) -> Ride:
        user = UserRepository.get_by_id(db, user_id)
        if not user:
            raise Exception("User not found")

        # Detect region/currency from pickup coordinates
        currency = cls.detect_currency(pickup_latitude, pickup_longitude)

        pays_by_card = (payment_method or "").lower() not in cls.NON_CARD_METHODS
        if pays_by_card and not user.stripe_payment_method_id:
            raise stripe_service.PaymentError("Please add a credit or debit card before booking a ride.")

        from app.utils.helpers import get_osrm_route, format_duration

        # Get real road distance & duration via OSRM (free, no API key)
        if pickup_latitude and pickup_longitude and dropoff_latitude and dropoff_longitude:
            route = get_osrm_route(pickup_latitude, pickup_longitude, dropoff_latitude, dropoff_longitude)
            distance_val = route["distance_km"]
            duration_min = route["duration_min"]
        else:
            # Fallback: rough estimate from string length
            seed = len(pickup.strip()) + len(dropoff.strip())
            distance_val = max(2.1, min(30.0, (seed % 25) + 3.0))
            duration_min = max(5, round(distance_val * 3))

        distance_str = f"{distance_val:.1f} km"
        duration_str = format_duration(duration_min)

        fare_amount, fare_str = cls.calculate_fare(distance_val, duration_min, ride_class, currency)

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
            else:
                from app.services import family_coupons
                fam = family_coupons.get_coupon(code)
                if fam:
                    ok, _ = family_coupons.check_eligibility(db, user_id, fam)
                    if ok:
                        discount_amount = family_coupons.compute_discount(fam, fare_amount)

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
            discount_amount=discount_amount,
            scheduled_time=scheduled_time
        )
        
        db.flush() # Flush to get ride.id for PIN generation
        
        pin = generate_ride_pin(str(ride.id))
        ride.verification_pin_hash = hash_ride_pin(str(ride.id), pin)
        db.commit()

        # Hold the fare now; a declined card must never reach a driver.
        if pays_by_card:
            try:
                ride.stripe_payment_intent_id = stripe_service.charge_for_ride(db, user, ride)
                ride.payment_status = "authorized"
                db.commit()
            except stripe_service.PaymentError:
                RideRepository.update_status(db, ride, "cancelled", cancellation_reason="Payment failed")
                raise

        if scheduled_time:
            # We don't have celery, so we will use asyncio for the POC
            # Dispatch 15 mins before (or immediately if time < 15 mins away)
            delay = (scheduled_time - datetime.utcnow()).total_seconds() - (15 * 60)
            if delay > 0:
                asyncio.create_task(cls._schedule_future_dispatch(ride.id, delay))
            else:
                ride = RideRepository.update_status(db, ride, "pending")
                asyncio.create_task(cls._safe_dispatch(ride.id))
                asyncio.create_task(cls._schedule_ride_expiry(ride.id))
        else:
            # Trigger dispatch process asynchronously immediately using a safe wrapper
            asyncio.create_task(cls._safe_dispatch(ride.id))
            # Schedule the 60-second expiry task (Wait, backend says 300s = 5min, we'll keep 300s)
            asyncio.create_task(cls._schedule_ride_expiry(ride.id))
            # Start simulation task if no drivers are online
            asyncio.create_task(cls._check_and_trigger_simulation(ride.id))

        return ride

    @classmethod
    async def _safe_dispatch(cls, ride_id: int):
        db = SessionLocal()
        try:
            ride = RideRepository.get_by_id(db, ride_id)
            if ride:
                await DispatchService.dispatch_ride(db, ride)
        except Exception as e:
            logger.error(f"Error in safe dispatch for ride {ride_id}: {e}")
        finally:
            db.close()

    @classmethod
    async def _schedule_future_dispatch(cls, ride_id: int, delay_seconds: float):
        await asyncio.sleep(delay_seconds)
        logger.info(f"Time to dispatch scheduled ride {ride_id}")
        db = SessionLocal()
        try:
            ride = db.query(Ride).filter(Ride.id == ride_id).first()
            if ride and ride.status == "scheduled":
                ride.status = "pending"
                db.commit()
                await DispatchService.dispatch_ride(db, ride)
                await cls._schedule_ride_expiry(ride_id)
        except Exception as e:
            logger.error(f"Error in future dispatch task: {e}")
        finally:
            db.close()

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
                cls._refund_card_payment(db, ride)
                
                # Notify driver WebSocket/FCM and user WebSocket
                await DispatchService.notify_ride_expired(db, ride)
                logger.info(f"Ride {ride_id} has expired (no driver accepted)")
        except Exception as e:
            logger.error(f"Error in schedule_ride_expiry task: {e}")
        finally:
            db.close()

    @classmethod
    async def accept_ride(cls, db: Session, ride_id: int, driver_id: int) -> Ride:
        driver = DriverRepository.get_by_id(db, driver_id)
        if not driver or not driver.is_approved:
            raise Exception("Your account has not been approved by an administrator yet.")
        # Row-level locking accept operation
        ride = RideRepository.accept_ride(db, ride_id, driver_id)
        
        # Generate and set PIN
        from app.utils.pin import generate_ride_pin, hash_ride_pin
        from datetime import datetime, timedelta
        pin = generate_ride_pin(str(ride.id))
        ride.verification_pin_hash = hash_ride_pin(str(ride.id), pin)
        ride.verification_pin_expires_at = datetime.utcnow() + timedelta(hours=24)
        db.add(ride)
        db.commit()
        
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
        if ride.verification_pin_hash and not ride.verification_verified_at:
            raise Exception("Please verify the rider's PIN before starting the trip")

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

        # Trip finished -> wait for payment. Wallet rides are prepaid at booking.
        updated_ride = RideRepository.update_status(db, ride, "awaiting_payment", actual_fare=ride.fare_amount)
        if (ride.payment_method or "").lower() == "wallet" or ride.payment_status == "paid":
            updated_ride = cls.mark_ride_paid(db, updated_ride)
        elif ride.payment_status == "authorized":
            # If capture fails the ride stays 'awaiting_payment' so the rider can pay manually.
            if stripe_service.capture_ride(updated_ride):
                updated_ride = cls.mark_ride_paid(db, updated_ride, payment_method="card")
        elif (ride.payment_method or "").lower() not in ("cash", "cod"):
            updated_ride = cls.charge_saved_card(db, updated_ride)
        await DispatchService.notify_ride_status_update(db, updated_ride)
        return updated_ride

    @classmethod
    def charge_saved_card(cls, db: Session, ride: Ride) -> Ride:
        """Charge the rider's saved card off-session. On failure the ride stays
        'awaiting_payment' so the rider can pay manually."""
        import logging
        import stripe
        from app.core.config import settings
        from app.models.user import User
        log = logging.getLogger("payments")
        try:
            user = db.query(User).filter(User.id == ride.user_id).first()
            if not user or not user.stripe_customer_id or not user.stripe_payment_method_id:
                log.warning("Ride %s: no saved card for rider", ride.id)
                return ride
            stripe.api_key = settings.STRIPE_SECRET_KEY
            amount = int(round((ride.actual_fare or ride.fare_amount) * 100))
            intent = stripe.PaymentIntent.create(
                amount=amount,
                currency="usd",
                customer=user.stripe_customer_id,
                payment_method=user.stripe_payment_method_id,
                off_session=True,
                confirm=True,
                metadata={"ride_id": str(ride.id)},
                idempotency_key=f"ride-{ride.id}-charge",
            )
            ride.stripe_payment_intent_id = intent.id
            if intent.status == "succeeded":
                return cls.mark_ride_paid(db, ride, payment_method="card")
            db.add(ride)
            db.commit()
        except Exception as e:
            log.error("Ride %s card charge failed: %s", ride.id, e)
        return ride

    @classmethod
    def _refund_card_payment(cls, db: Session, ride: Ride) -> None:
        """Release the booking hold, or refund a captured fare, when the ride won't happen."""
        if not ride.stripe_payment_intent_id:
            return
        if ride.payment_status == "authorized":
            ride.payment_status = "released" if stripe_service.release_hold(ride) else "release_failed"
        elif ride.payment_status == "paid":
            ride.payment_status = "refunded" if stripe_service.refund_ride(ride) else "refund_failed"
        else:
            return
        db.add(ride)
        db.commit()

    @classmethod
    def change_card_fare(cls, db: Session, ride: Ride, user: User, new_fare: float) -> None:
        """Keep a card ride's hold or payment equal to its new fare. Raises PaymentError
        (fare untouched) if the card won't cover the new fare."""
        old_fare = ride.fare_amount
        if not ride.stripe_payment_intent_id or new_fare == old_fare:
            return
        if ride.payment_status == "authorized":
            old_intent = ride.stripe_payment_intent_id
            ride.fare_amount = new_fare
            try:
                ride.stripe_payment_intent_id = stripe_service.charge_for_ride(
                    db, user, ride, idempotency_key=f"ride-{ride.id}-hold-{uuid.uuid4().hex}"
                )
            except stripe_service.PaymentError:
                ride.fare_amount = old_fare
                raise
            if not stripe_service.release_hold(ride, old_intent):
                logger.error(f"Ride {ride.id}: new hold placed but old hold {old_intent} not released")
            return
        if ride.payment_status != "paid":
            return
        if new_fare < old_fare:
            if not stripe_service.refund_ride(ride, amount=old_fare - new_fare):
                logger.error(f"Ride {ride.id}: could not refund {old_fare - new_fare:.2f} after fare drop")
            return
        ride.fare_amount = new_fare
        try:
            new_intent = stripe_service.charge_for_ride(
                db, user, ride, idempotency_key=f"ride-{ride.id}-fare-{int(round(new_fare * 100))}"
            )
        except stripe_service.PaymentError:
            ride.fare_amount = old_fare
            raise
        if not stripe_service.refund_ride(ride):
            logger.error(f"Ride {ride.id}: charged new fare but could not refund {ride.stripe_payment_intent_id}")
        ride.stripe_payment_intent_id = new_intent

    @classmethod
    def mark_ride_paid(cls, db: Session, ride: Ride, payment_method: str = None) -> Ride:
        """Single source of truth: flag ride as paid; finalize to 'completed' if trip ended.
        Credits driver earnings exactly once (on first transition to paid)."""
        from datetime import datetime as _dt
        if payment_method:
            ride.payment_method = payment_method
        first_time = ride.payment_status != "paid"
        ride.payment_status = "paid"
        if first_time:
            ride.paid_at = _dt.utcnow()
        if ride.status == "awaiting_payment":
            # Credit on trip end, not on payment: card fares are paid long before the trip ends.
            if ride.driver_id:
                driver = DriverRepository.get_by_id(db, ride.driver_id)
                if driver:
                    driver.balance = (driver.balance or 0.0) + round((ride.actual_fare or ride.fare_amount) * 0.80, 2)
                    db.add(driver)
            ride.status = "completed"
            if not ride.completed_at:
                ride.completed_at = _dt.utcnow()
        ride.updated_at = _dt.utcnow()
        db.add(ride)
        db.commit()
        db.refresh(ride)
        return ride

    @classmethod
    async def cancel_ride(cls, db: Session, ride_id: int, user_id: int, cancellation_reason: str = None) -> Ride:
        ride = RideRepository.get_by_id(db, ride_id)
        if not ride:
            raise RideNotFoundError()
        if ride.user_id != user_id:
            raise Exception("Unauthorized user for this ride")
        if ride.status in ["completed", "cancelled", "awaiting_payment"]:
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

        cls._refund_card_payment(db, ride)
        updated_ride = RideRepository.update_status(db, ride, "cancelled", cancellation_reason=cancellation_reason)
        await DispatchService.notify_ride_cancelled(db, updated_ride)
        return updated_ride

    @classmethod
    async def driver_cancel_ride(cls, db: Session, ride_id: int, driver_id: int, cancellation_reason: str = None) -> Ride:
        ride = RideRepository.get_by_id(db, ride_id)
        if not ride:
            raise RideNotFoundError()
        if ride.driver_id != driver_id:
            raise Exception("Unauthorized driver for this ride")
        if ride.status in ["completed", "cancelled", "awaiting_payment"]:
            raise Exception("Ride is already finalized")

        # Refund user wallet if booked via Wallet
        if ride.payment_method.lower() == "wallet":
            user = UserRepository.get_by_id(db, ride.user_id)
            if user:
                user.wallet_balance += ride.fare_amount
                tx = WalletTransaction(
                    user_id=ride.user_id,
                    title=f"Ride Refund (Driver Cancelled #{ride.id})",
                    amount=ride.fare_amount,
                    type="credit"
                )
                db.add(tx)
                db.add(user)
                db.commit()

        cls._refund_card_payment(db, ride)
        updated_ride = RideRepository.update_status(db, ride, "cancelled", cancellation_reason=cancellation_reason)
        await DispatchService.notify_ride_cancelled(db, updated_ride)
        return updated_ride

    @classmethod
    async def _check_and_trigger_simulation(cls, ride_id: int):
        # Simulation disabled for production/testing to prevent security issue
        pass

    @classmethod
    async def _simulate_ride_flow(cls, ride_id: int):
        pass
