from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.message import Message
from app.models.ride import Ride
from app.schemas.message import MessageResponse, MessageSend
from app.utils.security import get_current_actor
from app.websocket.manager import manager

router = APIRouter(prefix="/messages", tags=["messages"])

@router.get("/ride/{ride_id}", response_model=List[MessageResponse])
def get_ride_messages(
    ride_id: int,
    actor: dict = Depends(get_current_actor),
    db: Session = Depends(get_db)
):
    # Fetch ride
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    # Check permissions (must be the rider or the assigned driver)
    if actor["role"] == "driver" and ride.driver_id != actor["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to access this ride's chat")
    elif actor["role"] == "user" and ride.user_id != actor["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to access this ride's chat")

    # Fetch messages linked to a specific ride
    messages = db.query(Message).filter(
        Message.ride_id == ride_id,
        Message.is_support == False
    ).order_by(Message.created_at.asc()).all()

    return messages

@router.post("", response_model=MessageResponse)
async def send_message(
    payload: MessageSend,
    actor: dict = Depends(get_current_actor),
    db: Session = Depends(get_db)
):
    # Verify content
    if not payload.content.strip():
        raise HTTPException(status_code=400, detail="Message content cannot be empty")

    # If support chat, bypass ride checks
    if payload.is_support:
        sender_label = "driver" if actor["role"] == "driver" else "rider"
        new_message = Message(
            is_support=True,
            sender=sender_label,
            content=payload.content.strip()
        )
        db.add(new_message)
        db.commit()
        db.refresh(new_message)
        return new_message

    if not payload.ride_id:
        raise HTTPException(status_code=400, detail="ride_id is required for ride messages")

    # Fetch ride
    ride = db.query(Ride).filter(Ride.id == payload.ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    # Check permissions
    if actor["role"] == "driver" and ride.driver_id != actor["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to send messages to this ride")
    elif actor["role"] == "user" and ride.user_id != actor["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to send messages to this ride")

    # Enforce disabled chat on ended rides (completed or cancelled)
    if ride.status in ["completed", "cancelled", "declined", "expired"]:
        raise HTTPException(
            status_code=400,
            detail="Chat is disabled because this ride has ended"
        )

    # Determine sender label
    sender_label = "driver" if actor["role"] == "driver" else "rider"

    new_message = Message(
        ride_id=payload.ride_id,
        is_support=False,
        sender=sender_label,
        content=payload.content.strip()
    )
    db.add(new_message)
    db.commit()
    db.refresh(new_message)

    # Deliver via WebSocket to the counter-party in real-time
    ws_message = {
        "type": "new_chat_message",
        "message": {
            "id": new_message.id,
            "ride_id": new_message.ride_id,
            "is_support": new_message.is_support,
            "sender": new_message.sender,
            "content": new_message.content,
            "created_at": new_message.created_at.isoformat()
        }
    }

    if sender_label == "driver" and ride.user_id:
        await manager.send_to_user(ride.user_id, ws_message)
    elif sender_label == "rider" and ride.driver_id:
        await manager.send_to_driver(ride.driver_id, ws_message)

    return new_message

@router.get("/support", response_model=List[MessageResponse])
def get_support_messages(
    actor: dict = Depends(get_current_actor),
    db: Session = Depends(get_db)
):
    # Fetch messages linked to actor support logs
    messages = db.query(Message).filter(
        Message.is_support == True
    ).order_by(Message.created_at.asc()).all()

    return messages
