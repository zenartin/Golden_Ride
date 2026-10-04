import asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.services.ride_service import RideService
from app.models.user import User
from app.utils.pin import verify_ride_pin

engine = create_engine("sqlite:///:memory:")
Base.metadata.create_all(bind=engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

async def test_ride_booking():
    db = SessionLocal()
    # Create test user
    user = User(
        name="Test User",
        email="test@example.com",
        phone_number="+1234567890",
        auth_id="auth_123"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    print("Booking a ride...")
    ride = await RideService.create_ride(
        db=db,
        user_id=user.id,
        pickup="A",
        dropoff="B",
        ride_class="standard",
        payment_method="cash",
        pickup_latitude=0.0,
        pickup_longitude=0.0,
        dropoff_latitude=1.0,
        dropoff_longitude=1.0,
        coupon_code=None,
        scheduled_time=None
    )
    db.commit()
    db.refresh(ride)
    
    print(f"Ride ID: {ride.id}")
    print(f"Stored PIN hash: {ride.verification_pin_hash}")
    
    # We need to know the generated PIN. We can call generate_ride_pin to get it since it's deterministic.
    from app.utils.pin import generate_ride_pin
    plain_pin = generate_ride_pin(str(ride.id))
    print(f"Deterministic PIN: {plain_pin}")
    
    # Verify
    is_valid = verify_ride_pin(str(ride.id), plain_pin, ride.verification_pin_hash)
    print(f"PIN Validation Result: {is_valid}")
    
    if is_valid:
        print("SUCCESS! PIN verification is working.")
    else:
        print("FAILURE! PIN verification failed.")

if __name__ == "__main__":
    asyncio.run(test_ride_booking())
