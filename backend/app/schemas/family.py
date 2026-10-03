from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.schemas.user import User

class FamilyGroupBase(BaseModel):
    family_name: str

class FamilyGroupCreate(FamilyGroupBase):
    pass

class FamilyGroupOut(FamilyGroupBase):
    id: int
    organizer_user_id: int
    status: str
    created_at: datetime
    
    class Config:
        orm_mode = True

class FamilyMemberOut(BaseModel):
    id: int
    family_group_id: int
    user_id: int
    role: str
    status: str
    joined_at: datetime
    user: Optional[User] = None
    
    class Config:
        orm_mode = True

class FamilyInvitationCreate(BaseModel):
    invitee_contact: str

class FamilyInvitationOut(BaseModel):
    id: int
    family_group_id: int
    invitee_contact: str
    status: str
    created_at: datetime
    expires_at: datetime
    
    class Config:
        orm_mode = True

class FamilyGroupWithMembersOut(FamilyGroupOut):
    members: List[FamilyMemberOut] = []
    invitations: List[FamilyInvitationOut] = []
