from datetime import datetime, timedelta
from typing import Optional
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.driver import Driver
from app.models.user import User
from app.models.admin import Admin
from app.schemas.auth import TokenData

# Using pbkdf2_sha256 for portability and avoiding native compile dependencies (e.g. bcrypt issues on Windows)
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# Header extractor for Bearer token auth
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_current_driver(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> Driver:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        driver_id: str = payload.get("sub")
        role: Optional[str] = payload.get("role")
        if driver_id is None:
            raise credentials_exception
        if role is not None and role != "driver":
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    driver = db.query(Driver).filter(Driver.id == int(driver_id)).first()
    if driver is None:
        raise credentials_exception
    return driver


def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate user credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        role: Optional[str] = payload.get("role")
        if user_id is None or role != "user":
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id), User.is_active == True).first()
    if user is None:
        raise credentials_exception
    return user


def get_current_actor(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        import jwt
        from app.config import settings
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        actor_id: str = payload.get("sub")
        role: Optional[str] = payload.get("role")
        if actor_id is None or role not in ["user", "driver"]:
            raise credentials_exception
    except Exception:
        raise credentials_exception

    if role == "driver":
        driver = db.query(Driver).filter(Driver.id == int(actor_id)).first()
        if not driver:
            raise credentials_exception
        return {"role": "driver", "id": driver.id, "obj": driver}
    else:
        user = db.query(User).filter(User.id == int(actor_id), User.is_active == True).first()
        if not user:
            raise credentials_exception
        return {"role": "user", "id": user.id, "obj": user}

def get_current_admin(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        id_str: str = payload.get("sub")
        role: str = payload.get("role")
        if id_str is None or role not in ["admin", "super_admin"]:
            raise credentials_exception
        token_data = TokenData(id=int(id_str), role=role)
    except jwt.PyJWTError:
        raise credentials_exception

    admin = db.query(Admin).filter(Admin.id == token_data.id).first()
    if admin is None:
        raise credentials_exception
    return admin

def get_current_super_admin(current_admin: Admin = Depends(get_current_admin)):
    if current_admin.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin privileges required"
        )
    return current_admin
