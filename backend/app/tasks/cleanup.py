import os
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.recording import TripRecording
import asyncio

async def delete_expired_recordings_task():
    while True:
        try:
            db: Session = SessionLocal()
            now = datetime.utcnow()
            # Find expired recordings not disputed
            expired = db.query(TripRecording).filter(
                TripRecording.expires_at < now,
                TripRecording.status != "disputed",
                TripRecording.status != "expired"
            ).all()
            
            for rec in expired:
                if rec.file_path and os.path.exists(rec.file_path):
                    try:
                        os.remove(rec.file_path)
                    except Exception as e:
                        print(f"Failed to delete {rec.file_path}: {e}")
                
                rec.status = "expired"
                rec.file_path = None
            
            db.commit()
            db.close()
        except Exception as e:
            print(f"Error in cleanup task: {e}")
        
        # Check every 10 minutes
        await asyncio.sleep(600)
