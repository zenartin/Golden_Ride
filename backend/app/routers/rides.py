from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.driver import Driver
from app.models.ride import Ride
from app.schemas.ride import RideResponse, RideUpdateStatus, LocationUpdate, VerifyPinRequest
from app.utils.security import get_current_driver
from app.utils.helpers import is_ride_eligible_for_destination_mode, is_vehicle_class_compatible
from app.services.ride_service import RideService
from app.repositories.ride_assignment_repository import RideAssignmentRepository

router = APIRouter(prefix="/rides", tags=["rides"])

@router.get("/requests", response_model=List[RideResponse])
def get_incoming_requests(
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    # Driver must be online to receive requests
    if not current_driver.is_online:
        return []

    # Get driver's vehicle type to filter rides
    from app.models.driver import DriverDocument
    
    driver_doc = db.query(DriverDocument).filter(DriverDocument.driver_id == current_driver.id).first()
    driver_vehicle_type = driver_doc.vehicle_type if (driver_doc and driver_doc.vehicle_type) else "sedan"

    rides = db.query(Ride).filter(Ride.status == "pending").all()
    
    filtered_rides = []
    for ride in rides:
        if not is_vehicle_class_compatible(driver_vehicle_type, ride.ride_class):
            continue

        assignment = RideAssignmentRepository.get_by_ride_and_driver(db, ride.id, current_driver.id)
        if assignment and assignment.status == "rejected":
            continue

        if current_driver.destination_mode_active and current_driver.destination_lat and current_driver.destination_lng:
            if not is_ride_eligible_for_destination_mode(
                driver_lat=current_driver.latitude,
                driver_lng=current_driver.longitude,
                dest_lat=current_driver.destination_lat,
                dest_lng=current_driver.destination_lng,
                pickup_lat=ride.pickup_latitude,
                pickup_lng=ride.pickup_longitude,
                dropoff_lat=ride.dropoff_latitude,
                dropoff_lng=ride.dropoff_longitude,
                max_detour_km=15.0
            ):
                continue

        filtered_rides.append(ride)
            
    return filtered_rides


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
async def accept_ride(
    ride_id: int,
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    try:
        ride = await RideService.accept_ride(db, ride_id, current_driver.id)
        return ride
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{ride_id}/decline")
async def decline_ride(
    ride_id: int,
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    try:
        await RideService.reject_ride(db, ride_id, current_driver.id)
        return {"status": "success", "message": "Ride request declined"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{ride_id}/verify-pin", response_model=RideResponse)
async def verify_pin(
    ride_id: int,
    payload: VerifyPinRequest,
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    from app.utils.pin import verify_ride_pin
    from datetime import datetime

    ride = db.query(Ride).filter(Ride.id == ride_id, Ride.driver_id == current_driver.id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found or not assigned to you")
        
    if ride.status != "arrived":
        raise HTTPException(status_code=400, detail="Can only verify PIN when driver has arrived")

    if not ride.verification_pin_hash:
        raise HTTPException(status_code=400, detail="No verification PIN was generated for this ride")

    if ride.verification_attempts >= 5:
        raise HTTPException(status_code=400, detail="Maximum verification attempts exceeded")
        
    if ride.verification_pin_expires_at and datetime.utcnow() > ride.verification_pin_expires_at:
        raise HTTPException(status_code=400, detail="Verification PIN has expired")

    ride.verification_attempts += 1
    db.commit()

    if not verify_ride_pin(str(ride.id), payload.pin, ride.verification_pin_hash):
        raise HTTPException(status_code=400, detail="Incorrect PIN")

    ride.verification_verified_at = datetime.utcnow()
    db.commit()
    return ride

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
async def update_status(
    ride_id: int,
    payload: RideUpdateStatus,
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    try:
        if payload.status == "arrived":
            ride = await RideService.arrive_at_pickup(db, ride_id, current_driver.id)
        elif payload.status == "started":
            ride = await RideService.start_ride(db, ride_id, current_driver.id)
        elif payload.status == "completed":
            ride = await RideService.complete_ride(db, ride_id, current_driver.id)
        else:
            raise HTTPException(status_code=400, detail="Invalid status change")
        return ride
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/history", response_model=List[RideResponse])
def get_ride_history(
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    rides = db.query(Ride).filter(
        Ride.driver_id == current_driver.id,
        Ride.status.in_(["completed", "cancelled", "declined", "arrived", "started", "accepted"])
    ).order_by(Ride.created_at.desc()).all()
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
