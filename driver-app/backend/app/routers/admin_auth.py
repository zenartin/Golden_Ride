from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.admin import Admin
from app.schemas.auth import LoginRequest, Token
from app.utils.security import verify_password, create_access_token

router = APIRouter(prefix="/admin/auth", tags=["admin-auth"])

@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    admin = db.query(Admin).filter(Admin.email == payload.email).first()
    if not admin or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate token
    access_token = create_access_token(data={"sub": str(admin.id), "role": admin.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "is_approved": True,
        "name": admin.name,
        "phone": "",
        "email": admin.email,
        "country": "",
        "role": admin.role,
    }
