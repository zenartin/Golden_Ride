from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.ride import Ride
from app.models.rider_features import RiderNotification, SafetyAlert, SavedAddress, SupportTicket
from app.utils.security import get_current_actor, get_current_user

router = APIRouter(prefix="/rider", tags=["rider"])

# ── Payment helpers (used by both driver & passenger apps) ──────────────────

@router.get("/rides/unpaid")
def get_unpaid_ride(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return the passenger's most-recent ride that still awaits payment, or null."""
    ride = db.query(Ride).filter(
        Ride.user_id == current_user.id,
        Ride.status == "awaiting_payment"
    ).order_by(Ride.updated_at.desc()).first()
    if not ride:
        return None
    return {
        "id": ride.id,
        "status": ride.status,
        "payment_status": ride.payment_status or "pending",
        "payment_method": ride.payment_method,
        "fare_amount": ride.actual_fare or ride.fare_amount,
        "from_location": ride.from_location,
        "to_location": ride.to_location,
    }

@router.get("/rides/{ride_id}/payment-status")
def get_ride_payment_status(
    ride_id: int,
    db: Session = Depends(get_db)
):
    """Return current status + payment_status for any ride (accessible by driver or passenger)."""
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    return {
        "ride_id": ride.id,
        "status": ride.status,
        "payment_status": ride.payment_status or "pending",
        "payment_method": ride.payment_method,
        "amount": ride.actual_fare or ride.fare_amount,
    }

# 1. Ride Rating
class RateRideRequest(BaseModel):
    rating: float
    comment: Optional[str] = None

@router.post("/rides/{ride_id}/rate")
def rate_ride(
    ride_id: int,
    payload: RateRideRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ride = db.query(Ride).filter(Ride.id == ride_id, Ride.user_id == current_user.id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
        
    ride.rider_rating = payload.rating
    db.commit()
    return {"status": "success", "message": "Rating submitted successfully"}

# 2. Safety Hub & SOS
def _alert_out(alert: SafetyAlert) -> dict:
    return {"id": alert.id, "kind": alert.kind, "status": alert.status, "created_at": alert.created_at.isoformat()}


class SOSRequest(BaseModel):
    ride_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    message: Optional[str] = None
    kind: str = "silent"  # sos, silent, incident


@router.post("/safety/alert")
def create_safety_alert(
    payload: SOSRequest,
    actor: dict = Depends(get_current_actor),
    db: Session = Depends(get_db),
):
    """Silent distress alert or incident report, for rider or driver. Appears in the admin Safety page."""
    if payload.kind not in ("sos", "silent", "incident"):
        raise HTTPException(status_code=400, detail="Unknown alert type")
    alert = SafetyAlert(
        actor_role=actor["role"], actor_id=actor["id"], ride_id=payload.ride_id, kind=payload.kind,
        message=payload.message, latitude=payload.latitude, longitude=payload.longitude,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return _alert_out(alert)


# Saved addresses
class AddressRequest(BaseModel):
    label: str
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


def _address_out(a: SavedAddress) -> dict:
    return {"id": a.id, "label": a.label, "address": a.address, "latitude": a.latitude, "longitude": a.longitude}


@router.get("/addresses")
def get_addresses(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(SavedAddress).filter(SavedAddress.user_id == current_user.id).order_by(SavedAddress.created_at).all()
    return [_address_out(a) for a in rows]


@router.post("/addresses")
def add_address(payload: AddressRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = SavedAddress(user_id=current_user.id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return _address_out(row)


@router.put("/addresses/{address_id}")
def edit_address(address_id: int, payload: AddressRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.query(SavedAddress).filter(SavedAddress.id == address_id, SavedAddress.user_id == current_user.id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Address not found")
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return _address_out(row)


@router.delete("/addresses/{address_id}")
def delete_address(address_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.query(SavedAddress).filter(SavedAddress.id == address_id, SavedAddress.user_id == current_user.id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Address not found")
    db.delete(row)
    db.commit()
    return {"status": "success"}


# Notifications
def _notification_out(n: RiderNotification) -> dict:
    return {"id": n.id, "category": n.category, "title": n.title, "body": n.body, "ride_id": n.ride_id,
            "is_read": n.is_read, "created_at": n.created_at.isoformat()}


@router.get("/notifications")
def get_notifications(category: Optional[str] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(RiderNotification).filter(RiderNotification.user_id == current_user.id)
    if category:
        query = query.filter(RiderNotification.category == category)
    return [_notification_out(n) for n in query.order_by(RiderNotification.created_at.desc()).limit(100).all()]


@router.post("/notifications/read-all")
def read_all_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(RiderNotification).filter(RiderNotification.user_id == current_user.id).update({"is_read": True})
    db.commit()
    return {"status": "success"}


@router.post("/notifications/{notification_id}/read")
def read_notification(notification_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.query(RiderNotification).filter(RiderNotification.id == notification_id, RiderNotification.user_id == current_user.id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Notification not found")
    row.is_read = True
    db.commit()
    return {"status": "success"}


# Support
_faqs = [
    {"question": "How do I request a ride?", "answer": "Choose your pickup and drop-off, pick a ride type, then confirm. Your card is checked when you book."},
    {"question": "When is my card charged?", "answer": "We place a hold on your card when you book and charge it when the trip ends. If the trip is cancelled the hold is released."},
    {"question": "Which payment methods are supported?", "answer": "Credit and debit cards through Stripe, plus your Golden Ride wallet, which you can top up with gift cards."},
    {"question": "What is the ride PIN?", "answer": "A 4-digit code shown when your driver is assigned. Share it with the driver only when you are in the right car."},
    {"question": "How do I report a safety issue?", "answer": "Open the Safety Hub from your profile or during a trip. In an emergency, call 911."},
]


@router.get("/support/faqs")
def get_faqs():
    return _faqs


class TicketCreateRequest(BaseModel):
    subject: str
    message: str


def _ticket_out(t: SupportTicket) -> dict:
    return {"id": t.id, "subject": t.subject, "message": t.message, "status": t.status, "created_at": t.created_at.isoformat()}


@router.get("/support/tickets")
def get_support_tickets(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(SupportTicket).filter(SupportTicket.user_id == current_user.id).order_by(SupportTicket.created_at.desc()).all()
    return [_ticket_out(t) for t in rows]


@router.post("/support/ticket")
def create_support_ticket(payload: TicketCreateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not payload.subject.strip() or not payload.message.strip():
        raise HTTPException(status_code=400, detail="Please enter a subject and a message")
    row = SupportTicket(user_id=current_user.id, subject=payload.subject.strip(), message=payload.message.strip())
    db.add(row)
    db.commit()
    db.refresh(row)
    return _ticket_out(row)
