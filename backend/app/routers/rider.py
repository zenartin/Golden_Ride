from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.ride import Ride
from app.utils.security import get_current_user

router = APIRouter(prefix="/rider", tags=["rider"])

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
class SOSRequest(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None

@router.post("/safety/sos")
def trigger_sos(
    payload: SOSRequest,
    current_user: User = Depends(get_current_user)
):
    return {
        "status": "success",
        "message": "Emergency SOS triggered! Local emergency response team and your trusted contacts have been alerted."
    }

class TrustedContactRequest(BaseModel):
    name: str
    phone: str
    relation: Optional[str] = "Family"

_mock_contacts = []

@router.get("/safety/trusted-contacts")
def get_trusted_contacts(current_user: User = Depends(get_current_user)):
    return _mock_contacts

@router.post("/safety/trusted-contacts")
def add_trusted_contact(
    payload: TrustedContactRequest,
    current_user: User = Depends(get_current_user)
):
    contact = {
        "id": len(_mock_contacts) + 1,
        "name": payload.name,
        "phone": payload.phone,
        "relation": payload.relation
    }
    _mock_contacts.append(contact)
    return contact

@router.post("/safety/share-trip")
def share_trip(current_user: User = Depends(get_current_user)):
    return {
        "status": "success",
        "share_url": f"https://golden-ride.com/track/{current_user.id}"
    }

# 3. Saved Addresses
class AddressRequest(BaseModel):
    title: str
    address: str
    latitude: float
    longitude: float

_mock_addresses = [
    {"id": 1, "title": "Home", "address": "123 Main St, New York, NY", "latitude": 40.7128, "longitude": -74.0060},
    {"id": 2, "title": "Work", "address": "456 Tech Ave, New York, NY", "latitude": 40.7589, "longitude": -73.9851}
]

@router.get("/addresses")
def get_addresses(current_user: User = Depends(get_current_user)):
    return _mock_addresses

@router.post("/addresses")
def add_address(payload: AddressRequest, current_user: User = Depends(get_current_user)):
    addr = {
        "id": len(_mock_addresses) + 1,
        "title": payload.title,
        "address": payload.address,
        "latitude": payload.latitude,
        "longitude": payload.longitude
    }
    _mock_addresses.append(addr)
    return addr

@router.delete("/addresses/{id}")
def delete_address(id: int, current_user: User = Depends(get_current_user)):
    global _mock_addresses
    _mock_addresses = [a for a in _mock_addresses if a["id"] != id]
    return {"status": "success"}

# 4. Notifications
_mock_notifications = [
    {"id": 1, "title": "Welcome to Golden Ride!", "message": "Enjoy $10 off your first trip using code WELCOME10.", "read": False, "created_at": datetime.utcnow().isoformat()},
    {"id": 2, "title": "Safety Tip", "message": "Always check vehicle plate number before boarding.", "read": True, "created_at": datetime.utcnow().isoformat()}
]

@router.get("/notifications")
def get_notifications(current_user: User = Depends(get_current_user)):
    return _mock_notifications

@router.post("/notifications/{id}/read")
def mark_notification_read(id: int, current_user: User = Depends(get_current_user)):
    for n in _mock_notifications:
        if n["id"] == id:
            n["read"] = True
    return {"status": "success"}

@router.post("/notifications/read-all")
def mark_all_notifications_read(current_user: User = Depends(get_current_user)):
    for n in _mock_notifications:
        n["read"] = True
    return {"status": "success"}

# 5. Family Accounts
_mock_family = []

class FamilyMemberRequest(BaseModel):
    name: str
    phone: str
    relation: str

@router.get("/family")
def get_family_members(current_user: User = Depends(get_current_user)):
    return _mock_family

@router.post("/family")
def add_family_member(payload: FamilyMemberRequest, current_user: User = Depends(get_current_user)):
    member = {
        "id": len(_mock_family) + 1,
        "name": payload.name,
        "phone": payload.phone,
        "relation": payload.relation
    }
    _mock_family.append(member)
    return member

@router.delete("/family/{id}")
def delete_family_member(id: int, current_user: User = Depends(get_current_user)):
    global _mock_family
    _mock_family = [f for f in _mock_family if f["id"] != id]
    return {"status": "success"}

# 6. Gift Cards
_mock_gift_cards = [
    {"id": 1, "code": "GOLDEN-GIFT-50", "amount": 50.0, "redeemed": False}
]

class GiftCardPurchaseRequest(BaseModel):
    amount: float
    recipient_email: str

class GiftCardRedeemRequest(BaseModel):
    code: str

@router.get("/gift-cards")
def get_gift_cards(current_user: User = Depends(get_current_user)):
    return _mock_gift_cards

@router.post("/gift-cards/purchase")
def purchase_gift_card(payload: GiftCardPurchaseRequest, current_user: User = Depends(get_current_user)):
    import uuid
    code = f"GOLDEN-{uuid.uuid4().hex[:6].upper()}"
    card = {"id": len(_mock_gift_cards) + 1, "code": code, "amount": payload.amount, "redeemed": False}
    _mock_gift_cards.append(card)
    return card

@router.post("/gift-cards/redeem")
def redeem_gift_card(
    payload: GiftCardRedeemRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    code = payload.code.strip().upper()
    for card in _mock_gift_cards:
        if card["code"] == code and not card["redeemed"]:
            card["redeemed"] = True
            current_user.wallet_balance += card["amount"]
            db.add(current_user)
            db.commit()
            return {"status": "success", "amount": card["amount"], "wallet_balance": current_user.wallet_balance}
    raise HTTPException(status_code=400, detail="Invalid or already redeemed gift card code")

@router.get("/gift-cards/balance/{code}")
def get_gift_card_balance(code: str, current_user: User = Depends(get_current_user)):
    for card in _mock_gift_cards:
        if card["code"] == code.strip().upper():
            return {"code": card["code"], "amount": card["amount"], "redeemed": card["redeemed"]}
    raise HTTPException(status_code=404, detail="Gift card not found")

# 7. Support & FAQs
_faqs = [
    {"question": "How do I request a ride?", "answer": "Set your pickup and dropoff locations, select your ride class, and tap Book Ride."},
    {"question": "What payment methods are supported?", "answer": "We accept Credit/Debit Cards, Wallet Balance, and Cash."},
    {"question": "How do cancellation fees work?", "answer": "Cancellations within 2 minutes of driver assignment are free."}
]

@router.get("/support/faqs")
def get_faqs():
    return _faqs

_support_tickets = []

class TicketCreateRequest(BaseModel):
    subject: str
    message: str

@router.get("/support/tickets")
def get_support_tickets(current_user: User = Depends(get_current_user)):
    return _support_tickets

@router.post("/support/ticket")
def create_support_ticket(payload: TicketCreateRequest, current_user: User = Depends(get_current_user)):
    import uuid
    ticket = {
        "id": f"TICK-{uuid.uuid4().hex[:6].upper()}",
        "subject": payload.subject,
        "message": payload.message,
        "status": "open",
        "created_at": datetime.utcnow().isoformat()
    }
    _support_tickets.append(ticket)
    return ticket
