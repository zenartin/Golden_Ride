from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum

from app.database import Base

class FamilyGroupStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"

class FamilyMemberRole(str, enum.Enum):
    ORGANIZER = "organizer"
    MEMBER = "member"

class FamilyMemberStatus(str, enum.Enum):
    ACTIVE = "active"
    PENDING = "pending"
    REMOVED = "removed"

class FamilyInvitationStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"

class FamilyGroup(Base):
    __tablename__ = "family_groups"

    id = Column(Integer, primary_key=True, index=True)
    organizer_user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    family_name = Column(String, nullable=False)
    status = Column(String, default=FamilyGroupStatus.ACTIVE.value)
    created_at = Column(DateTime, default=datetime.utcnow)

    organizer = relationship("User", foreign_keys=[organizer_user_id])
    members = relationship("FamilyMember", back_populates="family_group", cascade="all, delete-orphan")
    invitations = relationship("FamilyInvitation", back_populates="family_group", cascade="all, delete-orphan")


class FamilyMember(Base):
    __tablename__ = "family_members"

    id = Column(Integer, primary_key=True, index=True)
    family_group_id = Column(Integer, ForeignKey("family_groups.id"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    role = Column(String, default=FamilyMemberRole.MEMBER.value)
    status = Column(String, default=FamilyMemberStatus.ACTIVE.value)
    joined_at = Column(DateTime, default=datetime.utcnow)

    family_group = relationship("FamilyGroup", back_populates="members")
    user = relationship("User", foreign_keys=[user_id])


class FamilyInvitation(Base):
    __tablename__ = "family_invitations"

    id = Column(Integer, primary_key=True, index=True)
    family_group_id = Column(Integer, ForeignKey("family_groups.id"), index=True, nullable=False)
    invitee_contact = Column(String, nullable=False) # Phone or email
    invitation_token_hash = Column(String, unique=True, index=True, nullable=False)
    status = Column(String, default=FamilyInvitationStatus.PENDING.value)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)

    family_group = relationship("FamilyGroup", back_populates="invitations")
