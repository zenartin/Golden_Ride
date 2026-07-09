from sqlalchemy.orm import Session
from typing import List
from app.models.driver import Driver, DriverDocument

class DriverRepository:
    @staticmethod
    def get_by_id(db: Session, driver_id: int) -> Driver:
        return db.query(Driver).filter(Driver.id == driver_id).first()

    @staticmethod
    def get_by_email(db: Session, email: str) -> Driver:
        return db.query(Driver).filter(Driver.email == email).first()

    @staticmethod
    def get_by_phone(db: Session, phone: str) -> Driver:
        return db.query(Driver).filter(Driver.phone == phone).first()

    @staticmethod
    def create(db: Session, name: str, email: str, phone: str, password_hash: str) -> Driver:
        driver = Driver(
            name=name,
            email=email,
            phone=phone,
            password_hash=password_hash,
            is_online=False,
            is_approved=True  # Auto-approve for ease of sandbox/demo
        )
        db.add(driver)
        db.commit()
        db.refresh(driver)
        
        # Create default documents record
        docs = DriverDocument(driver_id=driver.id)
        db.add(docs)
        db.commit()
        
        return driver

    @staticmethod
    def get_online_drivers(db: Session) -> List[Driver]:
        return db.query(Driver).filter(Driver.is_online == True).all()

    @staticmethod
    def update_status(db: Session, driver: Driver, is_online: bool) -> Driver:
        driver.is_online = is_online
        db.add(driver)
        db.commit()
        db.refresh(driver)
        return driver

    @staticmethod
    def update_location(db: Session, driver: Driver, latitude: float, longitude: float) -> Driver:
        driver.latitude = latitude
        driver.longitude = longitude
        db.add(driver)
        db.commit()
        db.refresh(driver)
        return driver

    @staticmethod
    def increment_total_rides(db: Session, driver: Driver) -> Driver:
        driver.total_rides = (driver.total_rides or 0) + 1
        db.add(driver)
        db.commit()
        db.refresh(driver)
        return driver
