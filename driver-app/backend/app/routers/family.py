from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List
import uuid

from app.database import get_db
from app.models.user import User
from app.models.family import FamilyGroup, FamilyMember, FamilyInvitation, FamilyMemberRole, FamilyMemberStatus, FamilyInvitationStatus
from app.schemas.family import FamilyGroupCreate, FamilyGroupOut, FamilyGroupWithMembersOut, FamilyMemberOut, FamilyInvitationCreate, FamilyInvitationOut
from app.utils.security import get_current_user

router = APIRouter(prefix="/family", tags=["Family"])

@router.get("/coupons")
def list_family_coupons(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.services import family_coupons
    done = family_coupons.completed_rides(db, current_user.id)
    out = []
    for c in family_coupons.FAMILY_COUPONS:
        ok, reason = family_coupons.check_eligibility(db, current_user.id, c)
        out.append({
            "code": c["code"],
            "title": c["title"],
            "description": c["description"],
            "discount_percent": c["value"],
            "rides_required": c["rides_required"],
            "rides_completed": done,
            "unlocked": ok,
            "locked_reason": reason,
        })
    return out

@router.post("", response_model=FamilyGroupOut, status_code=status.HTTP_201_CREATED)
def create_family_group(
    family_in: FamilyGroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if user already has a family
    existing = db.query(FamilyGroup).filter(FamilyGroup.organizer_user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already an organizer of a family group")
        
    group = FamilyGroup(
        organizer_user_id=current_user.id,
        family_name=family_in.family_name
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    
    # Add organizer as a member
    member = FamilyMember(
        family_group_id=group.id,
        user_id=current_user.id,
        role=FamilyMemberRole.ORGANIZER.value,
        status=FamilyMemberStatus.ACTIVE.value
    )
    db.add(member)
    db.commit()
    
    return group

@router.get("/me", response_model=FamilyGroupWithMembersOut)
def get_my_family(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    member = db.query(FamilyMember).filter(
        FamilyMember.user_id == current_user.id,
        FamilyMember.status == FamilyMemberStatus.ACTIVE.value
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="You are not part of any family group")
        
    group = db.query(FamilyGroup).filter(FamilyGroup.id == member.family_group_id).first()
    return group

@router.post("/invitations", response_model=FamilyInvitationOut)
def invite_member(
    invite_in: FamilyInvitationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    group = db.query(FamilyGroup).filter(FamilyGroup.organizer_user_id == current_user.id).first()
    if not group:
        raise HTTPException(status_code=403, detail="Only family organizers can invite members")
        
    token = str(uuid.uuid4())
    invitation = FamilyInvitation(
        family_group_id=group.id,
        invitee_contact=invite_in.invitee_contact,
        invitation_token_hash=token,
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    
    # In a real app, we would send an SMS/Email here.
    return invitation

@router.post("/invitations/{token}/accept", response_model=FamilyMemberOut)
def accept_invitation(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invitation = db.query(FamilyInvitation).filter(
        FamilyInvitation.invitation_token_hash == token,
        FamilyInvitation.status == FamilyInvitationStatus.PENDING.value
    ).first()
    
    if not invitation or invitation.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired invitation")
        
    # Check if user is already in a family
    existing_member = db.query(FamilyMember).filter(
        FamilyMember.user_id == current_user.id,
        FamilyMember.status == FamilyMemberStatus.ACTIVE.value
    ).first()
    
    if existing_member:
        raise HTTPException(status_code=400, detail="User is already in a family group")
        
    member = FamilyMember(
        family_group_id=invitation.family_group_id,
        user_id=current_user.id,
        role=FamilyMemberRole.MEMBER.value,
        status=FamilyMemberStatus.ACTIVE.value
    )
    invitation.status = FamilyInvitationStatus.ACCEPTED.value
    db.add(member)
    db.commit()
    db.refresh(member)
    return member

@router.delete("/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    member_to_remove = db.query(FamilyMember).filter(FamilyMember.id == member_id).first()
    if not member_to_remove:
        raise HTTPException(status_code=404, detail="Member not found")
        
    # Check if current user is the organizer of this group
    group = db.query(FamilyGroup).filter(FamilyGroup.id == member_to_remove.family_group_id).first()
    if group.organizer_user_id != current_user.id and current_user.id != member_to_remove.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to remove this member")
        
    if group.organizer_user_id == member_to_remove.user_id:
        raise HTTPException(status_code=400, detail="Organizer cannot be removed. Must delete family group.")
        
    db.delete(member_to_remove)
    db.commit()
    return None


@router.get("/trips")
def family_trips(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Recent trips of the family, visible to the group organizer only."""
    from app.models.ride import Ride

    group = db.query(FamilyGroup).filter(FamilyGroup.organizer_user_id == current_user.id).first()
    if not group:
        return []
    members = db.query(FamilyMember).filter(FamilyMember.family_group_id == group.id, FamilyMember.status == "active").all()
    names = {u.id: u.name for u in db.query(User).filter(User.id.in_([m.user_id for m in members])).all()}
    rides = db.query(Ride).filter(Ride.user_id.in_(list(names))).order_by(Ride.created_at.desc()).limit(50).all()
    return [{
        "id": r.id, "member": names.get(r.user_id), "from_location": r.from_location, "to_location": r.to_location,
        "status": r.status, "fare": r.fare, "created_at": r.created_at.isoformat(),
    } for r in rides]
