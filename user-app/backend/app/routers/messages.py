from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.driver import Driver
from app.models.message import Message
from app.schemas.message import MessageResponse, MessageSend
from app.utils.security import get_current_driver

router = APIRouter(prefix="/messages", tags=["messages"])

@router.get("/ride/{ride_id}", response_model=List[MessageResponse])
def get_ride_messages(
    ride_id: int,
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    # Fetch messages linked to a specific ride
    messages = db.query(Message).filter(
        Message.ride_id == ride_id,
        Message.is_support == False
    ).order_by(Message.created_at.asc()).all()

    # If empty, populate a typical ride pickup chat history
    if not messages:
        mock_messages = [
            Message(ride_id=ride_id, is_support=False, sender="rider", content="Hello, are you on the way?"),
            Message(ride_id=ride_id, is_support=False, sender="driver", content="Yes, I am 3 minutes away. I've accepted your request."),
            Message(ride_id=ride_id, is_support=False, sender="rider", content="Okay, please come near gate 2.")
        ]
        db.add_all(mock_messages)
        db.commit()
        messages = mock_messages

    return messages

@router.post("", response_model=MessageResponse)
def send_message(
    payload: MessageSend,
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    new_message = Message(
        ride_id=payload.ride_id,
        is_support=payload.is_support,
        sender="driver",
        content=payload.content
    )
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    return new_message

@router.get("/support", response_model=List[MessageResponse])
def get_support_messages(
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    # Fetch messages linked to driver support logs
    messages = db.query(Message).filter(
        Message.is_support == True
    ).order_by(Message.created_at.asc()).all()

    # If empty, inject initial system ticket messages
    if not messages:
        mock_messages = [
            Message(is_support=True, sender="system", content="Welcome to Golden Ride Support. How can we help you today?"),
            Message(is_support=True, sender="support", content="Hi Rajesh, we saw you submitted a document verification ticket. Our typical verification time is 2 hours. Is there anything else?")
        ]
        db.add_all(mock_messages)
        db.commit()
        messages = mock_messages

    return messages
