from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.models.driver_notification import DriverNotification

class NotificationRepository:
    @staticmethod
    def create_notification(
        db: Session, 
        driver_id: int, 
        ride_id: int, 
        notification_type: str, 
        delivered_via: str = None, 
        status: str = "pending"
    ) -> DriverNotification:
        notification = DriverNotification(
            driver_id=driver_id,
            ride_id=ride_id,
            type=notification_type,
            delivered_via=delivered_via,
            status=status
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification

    @staticmethod
    def get_pending_notifications(db: Session, driver_id: int) -> List[DriverNotification]:
        return db.query(DriverNotification).filter(
            DriverNotification.driver_id == driver_id,
            DriverNotification.status.in_(["pending", "delivered"])
        ).all()

    @staticmethod
    def mark_as_read(db: Session, notification_id: int, driver_id: int) -> DriverNotification:
        notification = db.query(DriverNotification).filter(
            DriverNotification.id == notification_id,
            DriverNotification.driver_id == driver_id
        ).first()
        if notification:
            notification.status = "read"
            notification.read_at = datetime.utcnow()
            db.commit()
            db.refresh(notification)
        return notification

    @staticmethod
    def dismiss_by_ride(db: Session, ride_id: int) -> None:
        db.query(DriverNotification).filter(
            DriverNotification.ride_id == ride_id
        ).update({"status": "dismissed"})
        db.commit()
