from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import secrets

from app.database.session import get_db
from app.models.safety import TripShare, TripLocation
from app.models.ride import Ride
from app.models.driver import Driver
from app.schemas.share import TripShareResponse, PublicRideResponse, TripLocationPoint
from app.utils.security import get_current_actor

router = APIRouter(
    prefix="/share",
    tags=["share"]
)

@router.post("/rides/{ride_id}", response_model=TripShareResponse)
async def start_sharing(
    ride_id: int,
    current_user: dict = Depends(get_current_actor),
    db: Session = Depends(get_db)
):
    # Verify the ride belongs to the rider or driver asking to share it
    owner_column = Ride.driver_id if current_user["role"] == "driver" else Ride.user_id
    ride = db.query(Ride).filter(Ride.id == ride_id, owner_column == current_user["id"]).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found or not yours to share")

    # Check for existing active token
    existing_share = db.query(TripShare).filter(
        TripShare.ride_id == ride_id,
        TripShare.revoked_at == None
    ).first()
    
    if existing_share:
        return existing_share

    # Generate a secure 16 character hex token
    token = secrets.token_hex(8)
    
    new_share = TripShare(
        ride_id=ride_id,
        token=token,
        # Default expiration of 24 hours just in case
        expires_at=datetime.utcnow() + timedelta(hours=24) 
    )
    
    db.add(new_share)
    db.commit()
    db.refresh(new_share)
    
    return new_share

@router.post("/rides/{ride_id}/stop")
async def stop_sharing(
    ride_id: int,
    current_user: dict = Depends(get_current_actor),
    db: Session = Depends(get_db)
):
    ride = db.query(Ride).filter(Ride.id == ride_id, Ride.user_id == current_user["id"]).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
        
    active_shares = db.query(TripShare).filter(
        TripShare.ride_id == ride_id,
        TripShare.revoked_at == None
    ).all()
    
    for share in active_shares:
        share.revoked_at = datetime.utcnow()
        
    db.commit()
    return {"status": "success", "message": "Sharing stopped"}

@router.get("/track/{token}", response_model=PublicRideResponse)
async def get_public_trip(
    token: str,
    db: Session = Depends(get_db)
):
    share = db.query(TripShare).filter(TripShare.token == token).first()
    if not share:
        raise HTTPException(status_code=404, detail="Invalid sharing link")
        
    if share.revoked_at is not None:
        raise HTTPException(status_code=403, detail="Sharing has been revoked")
        
    if share.expires_at and datetime.utcnow() > share.expires_at:
        raise HTTPException(status_code=403, detail="Sharing link has expired")
        
    ride = db.query(Ride).filter(Ride.id == share.ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride no longer exists")

    if ride.status in ("completed", "cancelled", "expired", "declined"):
        raise HTTPException(status_code=403, detail="This trip has ended")
        
    # Get latest driver details if assigned
    driver_name = None
    driver_rating = None
    vehicle_model = None
    vehicle_plate = None
    current_lat = None
    current_lng = None
    
    driver_phone = None
    
    if ride.driver_id:
        driver = db.query(Driver).filter(Driver.id == ride.driver_id).first()
        if driver:
            driver_name = driver.name
            driver_rating = driver.rating
            driver_phone = driver.phone
            
            if driver.documents:
                vehicle_model = driver.documents.vehicle_model or "Golden Ride Vehicle"
                vehicle_plate = driver.documents.vehicle_plate_number or ""
            else:
                vehicle_model = "Golden Ride Vehicle"
                vehicle_plate = ""
            
            current_lat = driver.latitude
            current_lng = driver.longitude

    # Get route history
    locations = db.query(TripLocation).filter(
        TripLocation.ride_id == ride.id
    ).order_by(TripLocation.recorded_at.asc()).all()
    
    route_history = [
        TripLocationPoint(latitude=loc.latitude, longitude=loc.longitude, recorded_at=loc.recorded_at)
        for loc in locations
    ]

    return PublicRideResponse(
        status=ride.status,
        pickup=ride.from_location,
        dropoff=ride.to_location,
        pickup_latitude=ride.pickup_latitude,
        pickup_longitude=ride.pickup_longitude,
        dropoff_latitude=ride.dropoff_latitude,
        dropoff_longitude=ride.dropoff_longitude,
        driver_name=driver_name,
        driver_phone=driver_phone,
        driver_rating=driver_rating,
        vehicle_model=vehicle_model,
        vehicle_plate=vehicle_plate,
        current_latitude=current_lat,
        current_longitude=current_lng,
        route_history=route_history
    )
