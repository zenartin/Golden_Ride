from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.database import Base

class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, default="admin") # "super_admin" or "admin"
    created_at = Column(DateTime, default=datetime.utcnow)
