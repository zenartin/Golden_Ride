from sqlalchemy import Column, Integer, String, DateTime
from app.database import Base
from datetime import datetime

class TripRecording(Base):
    __tablename__ = "trip_recordings"

    id = Column(Integer, primary_key=True, index=True)
    ride_id = Column(Integer, index=True, nullable=False)
    uploader_id = Column(Integer, index=True, nullable=False)
    uploader_role = Column(String, nullable=False)  # 'user' or 'driver'
    file_path = Column(String, nullable=True)       # path to file in private storage
    status = Column(String, default="uploading")    # uploading, stored, expired, disputed
    
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)    # populated on upload complete
