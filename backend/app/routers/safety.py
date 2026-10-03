from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.models.safety import EmergencyContact
from app.schemas.safety import EmergencyContactCreate, EmergencyContactUpdate, EmergencyContactResponse
from app.utils.security import get_current_actor

router = APIRouter(
    prefix="/safety",
    tags=["safety"]
)

@router.get("/contacts", response_model=List[EmergencyContactResponse])
async def get_emergency_contacts(
    current_entity: dict = Depends(get_current_actor),
    db: Session = Depends(get_db)
):
    contacts = db.query(EmergencyContact).filter(
        EmergencyContact.owner_id == current_entity["id"],
        EmergencyContact.owner_role == current_entity["role"]
    ).all()
    return contacts

@router.post("/contacts", response_model=EmergencyContactResponse)
async def add_emergency_contact(
    payload: EmergencyContactCreate,
    current_entity: dict = Depends(get_current_actor),
    db: Session = Depends(get_db)
):
    # Enforce limit of 3 contacts
    count = db.query(EmergencyContact).filter(
        EmergencyContact.owner_id == current_entity["id"],
        EmergencyContact.owner_role == current_entity["role"]
    ).count()
    
    if count >= 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum of 3 emergency contacts allowed."
        )

    # If new contact is primary, unset existing primary
    if payload.is_primary:
        db.query(EmergencyContact).filter(
            EmergencyContact.owner_id == current_entity["id"],
            EmergencyContact.owner_role == current_entity["role"],
            EmergencyContact.is_primary == True
        ).update({"is_primary": False})
        
    new_contact = EmergencyContact(
        owner_id=current_entity["id"],
        owner_role=current_entity["role"],
        name=payload.name,
        phone_number=payload.phone_number,
        relationship=payload.relationship,
        is_primary=payload.is_primary
    )
    db.add(new_contact)
    db.commit()
    db.refresh(new_contact)
    return new_contact

@router.patch("/contacts/{contact_id}", response_model=EmergencyContactResponse)
async def update_emergency_contact(
    contact_id: int,
    payload: EmergencyContactUpdate,
    current_entity: dict = Depends(get_current_actor),
    db: Session = Depends(get_db)
):
    contact = db.query(EmergencyContact).filter(
        EmergencyContact.id == contact_id,
        EmergencyContact.owner_id == current_entity["id"],
        EmergencyContact.owner_role == current_entity["role"]
    ).first()
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
        
    if payload.is_primary:
        db.query(EmergencyContact).filter(
            EmergencyContact.owner_id == current_entity["id"],
            EmergencyContact.owner_role == current_entity["role"],
            EmergencyContact.is_primary == True,
            EmergencyContact.id != contact_id
        ).update({"is_primary": False})
        
    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(contact, key, value)
        
    db.commit()
    db.refresh(contact)
    return contact

@router.delete("/contacts/{contact_id}")
async def delete_emergency_contact(
    contact_id: int,
    current_entity: dict = Depends(get_current_actor),
    db: Session = Depends(get_db)
):
    contact = db.query(EmergencyContact).filter(
        EmergencyContact.id == contact_id,
        EmergencyContact.owner_id == current_entity["id"],
        EmergencyContact.owner_role == current_entity["role"]
    ).first()
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
        
    db.delete(contact)
    db.commit()
    return {"message": "Contact deleted successfully"}
