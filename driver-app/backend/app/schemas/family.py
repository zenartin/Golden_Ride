from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime


class FamilyUserOut(BaseModel):
    id: int
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class FamilyGroupBase(BaseModel):
    family_name: str

class FamilyGroupCreate(FamilyGroupBase):
    pass

class FamilyGroupOut(FamilyGroupBase):
    id: int
    organizer_user_id: int
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class FamilyMemberOut(BaseModel):
    id: int
    family_group_id: int
    user_id: int
    role: str
    status: str
    joined_at: datetime
    user: Optional[FamilyUserOut] = None

    model_config = ConfigDict(from_attributes=True)

class FamilyInvitationCreate(BaseModel):
    invitee_contact: str

class FamilyInvitationOut(BaseModel):
    id: int
    family_group_id: int
    invitee_contact: str
    status: str
    created_at: datetime
    expires_at: datetime

    model_config = ConfigDict(from_attributes=True)

class FamilyGroupWithMembersOut(FamilyGroupOut):
    members: List[FamilyMemberOut] = []
    invitations: List[FamilyInvitationOut] = []
