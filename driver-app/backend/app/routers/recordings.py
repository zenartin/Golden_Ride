import os
import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.recording import TripRecording
from app.models.ride import Ride
from app.utils.security import get_current_actor, get_current_admin

router = APIRouter(tags=["Recordings"])

UPLOAD_DIR = "uploads/recordings"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/start")
def start_recording(ride_id: int, db: Session = Depends(get_db), current_actor=Depends(get_current_actor)):
    # Verify active ride
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
        
    role = current_actor["role"]
    actor_id = current_actor["id"]
    if role == "user" and ride.user_id != actor_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    elif role == "driver" and ride.driver_id != actor_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    rec = TripRecording(
        ride_id=ride.id,
        uploader_id=actor_id,
        uploader_role=role,
        status="uploading"
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    
    return {"recording_id": rec.id, "status": "started"}

@router.post("/upload")
async def upload_recording(
    recording_id: int = Form(...),
    video: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_actor=Depends(get_current_actor)
):
    rec = db.query(TripRecording).filter(TripRecording.id == recording_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recording not found")
        
    actor_id = current_actor["id"]
    if rec.uploader_id != actor_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Secure the file (we do not expose uploads/recordings statically)
    ext = video.filename.split('.')[-1] if '.' in video.filename else "mp4"
    filename = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        while True:
            chunk = await video.read(1024 * 1024)
            if not chunk:
                break
            buffer.write(chunk)
            
    rec.file_path = file_path
    rec.status = "stored"
    rec.expires_at = datetime.utcnow() + timedelta(hours=24)
    db.commit()
    
    return {"status": "success", "file": filename}

@router.post("/{recording_id}/dispute")
def dispute_recording(recording_id: int, db: Session = Depends(get_db), current_actor=Depends(get_current_actor)):
    rec = db.query(TripRecording).filter(TripRecording.id == recording_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recording not found")
        
    actor_id = current_actor["id"]
    if rec.uploader_id != actor_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    rec.status = "disputed"
    rec.expires_at = None # indefinite retention
    db.commit()
    
    return {"status": "disputed"}

@router.get("/admin")
def list_recordings_admin(db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    recordings = db.query(TripRecording).all()
    return recordings
