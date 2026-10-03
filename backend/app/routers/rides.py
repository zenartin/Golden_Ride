from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.driver import Driver
from app.models.ride import Ride
from app.schemas.ride import RideResponse, RideUpdateStatus, LocationUpdate, VerifyPinRequest
from app.utils.security import get_current_driver
from app.utils.pin import generate_ride_pin, hash_ride_pin, verify_ride_pin

router = APIRouter(prefix="/rides", tags=["rides"])

@router.get("/requests", response_model=List[RideResponse])
def get_incoming_requests(
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    # Driver must be online to receive requests
    if not current_driver.is_online:
        return []

    # Get pending rides
    rides = db.query(Ride).filter(Ride.status == "pending").all()
    
    # If database has no requests, inject a standard mock ride request matching the UI mockup
    if not rides:
        mock_ride = Ride(
            rider_name="Aarav Sharma",
            rider_rating=4.8,
            rider_trips=42,
            from_location="Koramangala 6th Block",
            to_location="Indiranagar 100ft Road",
            distance="5.2 km",
            duration="18 min",
            fare="₹245",
            fare_amount=245.0,
            payment_method="Online",
            pickup_eta="3 min away",
            ride_class="sedan",
            status="pending"
        )
        db.add(mock_ride)
        db.commit()
        db.refresh(mock_ride)
        rides = [mock_ride]

    return rides

@router.get("/active", response_model=Optional[RideResponse])
def get_active_ride(
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    # Find ride assigned to this driver that is not completed or declined
    ride = db.query(Ride).filter(
        Ride.driver_id == current_driver.id,
        Ride.status.in_(["accepted", "arrived", "started"])
    ).first()
    return ride

@router.post("/{ride_id}/accept", response_model=RideResponse)
def accept_ride(
    ride_id: int,
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride request not found")
    if ride.status != "pending":
        raise HTTPException(status_code=400, detail="Ride request is already occupied or cancelled")

    # Assign ride to driver and transition status
    ride.driver_id = current_driver.id
    ride.status = "accepted"
    
    # Generate and set PIN
    from datetime import timedelta
    pin = generate_ride_pin(str(ride.id))
    ride.verification_pin_hash = hash_ride_pin(str(ride.id), pin)
    ride.verification_pin_expires_at = datetime.utcnow() + timedelta(minutes=15)
    ride.verification_attempts = 0
    ride.verification_verified_at = None

    db.commit()
    db.refresh(ride)
    return ride

@router.post("/{ride_id}/decline")
def decline_ride(
    ride_id: int,
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride request not found")

    # In a real app we would assign to another driver, here we just change status to declined
    ride.status = "declined"
    db.commit()
    return {"status": "success", "message": "Ride request declined"}

@router.post("/update-location")
def update_coordinates(
    payload: LocationUpdate,
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    current_driver.latitude = payload.latitude
    current_driver.longitude = payload.longitude
    db.add(current_driver)
    db.commit()
    return {"status": "success", "message": "Location updated"}

@router.post("/{ride_id}/status", response_model=RideResponse)
def update_status(
    ride_id: int,
    payload: RideUpdateStatus,
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    ride = db.query(Ride).filter(Ride.id == ride_id, Ride.driver_id == current_driver.id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Active ride not found for this driver")

    if payload.status not in ["arrived", "started", "completed"]:
        raise HTTPException(status_code=400, detail="Invalid status change direction")

    ride.status = payload.status
    ride.updated_at = datetime.utcnow()

    if payload.status == "completed":
        driver_earnings = round(ride.fare_amount * 0.80, 2)
        current_driver.balance += driver_earnings
        db.add(current_driver)

    db.commit()
    db.refresh(ride)
    return ride

@router.post("/{ride_id}/verify-pin", response_model=RideResponse)
def verify_pin(
    ride_id: int,
    payload: VerifyPinRequest,
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
        
    if ride.driver_id != current_driver.id:
        raise HTTPException(status_code=403, detail="You are not assigned to this ride")
        
    if ride.status not in ["accepted", "arrived"]:
        raise HTTPException(status_code=409, detail="Ride is not ready to start")
        
    if ride.verification_verified_at is not None:
        raise HTTPException(status_code=409, detail="Ride has already been verified")
        
    if ride.verification_pin_expires_at is None:
        raise HTTPException(status_code=400, detail="PIN is unavailable")
        
    now = datetime.utcnow()
    
    if ride.verification_pin_expires_at <= now:
        raise HTTPException(status_code=400, detail="PIN has expired. Please ask passenger to refresh their app.")
        
    if ride.verification_attempts >= 5:
        raise HTTPException(status_code=429, detail="Maximum PIN attempts exceeded")
        
    if not verify_ride_pin(str(ride.id), payload.pin, ride.verification_pin_hash or ""):
        ride.verification_attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Incorrect PIN")
        
    ride.verification_verified_at = now
    ride.verification_pin_hash = None
    ride.verification_pin_expires_at = None
    ride.status = "started"
    ride.updated_at = now
    
    db.commit()
    db.refresh(ride)
    return ride

@router.get("/history", response_model=List[RideResponse])
def get_ride_history(
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    # Fetch historical completed rides
    rides = db.query(Ride).filter(
        Ride.driver_id == current_driver.id,
        Ride.status == "completed"
    ).order_by(Ride.created_at.desc()).all()
    
    # Return sample history for empty DB without persisting (avoids ID collisions)
    if not rides:
        now = datetime.utcnow()
        return [
            RideResponse(
                id=1001,
                driver_id=current_driver.id,
                rider_name="Rohan Mehra",
                rider_rating=4.8,
                rider_trips=12,
                from_location="Koramangala 4th Block",
                to_location="Indiranagar 80ft Road",
                distance="6.0 km",
                duration="22 min",
                fare="₹285",
                fare_amount=285.0,
                payment_method="Online",
                pickup_eta="3 min away",
                status="completed",
                created_at=now,
                updated_at=now,
            ),
            RideResponse(
                id=1002,
                driver_id=current_driver.id,
                rider_name="Sneha Rao",
                rider_rating=4.9,
                rider_trips=28,
                from_location="Jayanagar metro",
                to_location="JP Nagar 2nd Phase",
                distance="4.2 km",
                duration="15 min",
                fare="₹190",
                fare_amount=190.0,
                payment_method="Cash",
                pickup_eta="3 min away",
                status="completed",
                created_at=now,
                updated_at=now,
            ),
        ]

    return rides

@router.get("/{ride_id}", response_model=RideResponse)
def get_ride_details(
    ride_id: int,
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    return ride
