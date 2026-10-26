import asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.services.ride_service import RideService
from app.models.user import User
from app.models.driver import Driver
from app.utils.pin import verify_ride_pin

engine = create_engine("sqlite:///:memory:")
Base.metadata.create_all(bind=engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Mock DispatchService to prevent FCM errors
import app.services.dispatch_service
class MockDispatchService:
    @classmethod
    async def _safe_dispatch(cls, ride_id): pass
    @classmethod
    async def _schedule_ride_expiry(cls, ride_id): pass
    @classmethod
    async def notify_ride_cancelled(cls, db, ride): pass

app.services.dispatch_service.DispatchService = MockDispatchService
app.services.ride_service.DispatchService = MockDispatchService

async def run_tests():
    db = SessionLocal()
    # 1. Create User
    user = User(name="Test Passenger", email="user@test.com", phone_number="111", auth_id="auth_user")
    driver = Driver(name="Test Driver", email="driver@test.com", phone_number="222", auth_id="auth_driver")
    db.add(user)
    db.add(driver)
    db.commit()
    db.refresh(user)
    db.refresh(driver)
    
    # 2. Book Ride
    print("Testing ride booking...")
    ride = await RideService.create_ride(
        db=db, user_id=user.id, pickup="P", dropoff="D", ride_class="standard",
        payment_method="cash", pickup_latitude=0.0, pickup_longitude=0.0,
        dropoff_latitude=1.0, dropoff_longitude=1.0, coupon_code=None, scheduled_time=None
    )
    db.commit()
    db.refresh(ride)
    
    if ride.verification_pin_hash:
        print("PASS: verification_pin_hash is generated.")
    else:
        print("FAIL: verification_pin_hash is missing.")
        
    # 3. Cancel Ride as Driver
    print("Testing driver cancel ride...")
    try:
        # Mocking assignment first
        ride.driver_id = driver.id
        ride.status = "accepted"
        db.commit()
        cancelled_ride = await RideService.driver_cancel_ride(db, ride.id, driver.id)
        if cancelled_ride.status == "cancelled":
            print("PASS: Driver cancellation works.")
        else:
            print("FAIL: Ride not cancelled properly.")
    except Exception as e:
        print(f"FAIL: Driver cancellation raised error: {e}")

if __name__ == "__main__":
    asyncio.run(run_tests())
