from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.driver import Driver, DriverDocument
from app.schemas.auth import LoginRequest, RegisterRequest, OtpRequest, OtpVerifyRequest, Token
from app.utils.security import verify_password, get_password_hash, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    # Check if exists by email
    db_by_email = db.query(Driver).filter(Driver.email == payload.email).first()
    if db_by_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if exists by phone
    db_by_phone = db.query(Driver).filter(Driver.phone == payload.phone).first()
    if db_by_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered"
        )
    
    # Create driver
    new_driver = Driver(
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        password_hash=get_password_hash(payload.password),
        country=payload.country,
        is_online=False,
        is_approved=False
    )
    db.add(new_driver)
    db.commit()
    db.refresh(new_driver)

    # Store empty document details for the new driver
    new_docs = DriverDocument(
        driver_id=new_driver.id
    )
    db.add(new_docs)
    db.commit()

    access_token = create_access_token(data={"sub": str(new_driver.id), "role": "driver"})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "is_approved": new_driver.is_approved,
        "name": new_driver.name,
        "phone": new_driver.phone,
        "email": new_driver.email,
        "country": new_driver.country,
        "role": "driver",
    }

@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    driver = db.query(Driver).filter(Driver.email == payload.email).first()
    if not driver or not verify_password(payload.password, driver.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate token
    access_token = create_access_token(data={"sub": str(driver.id), "role": "driver"})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "is_approved": driver.is_approved,
        "name": driver.name,
        "phone": driver.phone,
        "email": driver.email,
        "country": driver.country,
        "role": "driver",
    }

@router.post("/otp-request")
def otp_request(payload: OtpRequest, db: Session = Depends(get_db)):
    # Simply return standard mock success JSON containing a mock OTP to use (e.g. 1234)
    # If driver does not exist with this phone number, we'll let them know it's a new registration
    driver = db.query(Driver).filter(Driver.phone == payload.phone).first()
    exists = driver is not None
    
    return {
        "status": "success",
        "message": f"OTP successfully sent to {payload.phone}",
        "otp": "1234",  # Mock code for sandbox testing ease
        "user_exists": exists
    }

@router.post("/otp-verify", response_model=Token)
def otp_verify(payload: OtpVerifyRequest, db: Session = Depends(get_db)):
    if payload.otp != "1234":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code. Use sandbox OTP: 1234"
        )

    # Find driver by phone
    driver = db.query(Driver).filter(Driver.phone == payload.phone).first()
    
    if not driver:
        # For seamless UX, if the user doesn't exist, we auto-create a mock profile with default phone
        mock_password = "DefaultMockPassword123"
        driver = Driver(
            name="Rajesh Kumar",
            email=f"driver_{payload.phone.replace(' ', '_').replace('+', '')}@goldenride.com",
            phone=payload.phone,
            password_hash=get_password_hash(mock_password),
            country="India",
            is_online=True,
            is_approved=True  # Auto-approve mock phone profiles for quick start
        )
        db.add(driver)
        db.commit()
        db.refresh(driver)
        
        # doc initializer
        docs = DriverDocument(driver_id=driver.id)
        db.add(docs)
        db.commit()
    
    access_token = create_access_token(data={"sub": str(driver.id), "role": "driver"})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "is_approved": driver.is_approved,
        "name": driver.name,
        "phone": driver.phone,
        "email": driver.email,
        "country": driver.country,
        "role": "driver",
    }
