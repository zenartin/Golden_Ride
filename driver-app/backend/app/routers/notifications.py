from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.driver import Driver
from app.models.message import Notification
from app.schemas.message import NotificationResponse
from app.utils.security import get_current_driver

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("", response_model=List[NotificationResponse])
def get_notifications(
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    notifications = db.query(Notification).filter(
        Notification.driver_id == current_driver.id
    ).order_by(Notification.created_at.desc()).all()

    # Prepopulate default notifications if empty for debugging
    if not notifications:
        mock_notifs = [
            Notification(driver_id=current_driver.id, title="Documents Verified! 🔓", message="Your registration documents are approved. You're ready to start driving!", type="info"),
            Notification(driver_id=current_driver.id, title="Weekly Incentive Bonus 💰", message="Complete 30 trips this week to get an extra ₹1,500 bonus.", type="earning"),
            Notification(driver_id=current_driver.id, title="Update Available 📱", message="App version v1.2.0 is out with improved GPS tracker accuracy.", type="announcement"),
        ]
        db.add_all(mock_notifs)
        db.commit()
        
        notifications = db.query(Notification).filter(
            Notification.driver_id == current_driver.id
        ).order_by(Notification.created_at.desc()).all()

    return notifications

@router.post("/{notification_id}/read")
def mark_read(
    notification_id: int,
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.driver_id == current_driver.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notif.is_read = True
    db.commit()
    return {"status": "success", "message": "Notification marked as read"}

@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.driver_id == current_driver.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    db.delete(notif)
    db.commit()
    return {"status": "success", "message": "Notification deleted successfully"}
