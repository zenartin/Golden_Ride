from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.models.driver import Driver, DriverDocument
from app.models.ride import Ride, Withdrawal
from app.schemas.driver import (
    DriverOut,
    DriverDocumentOut,
    DashboardResponse,
    QuickStat,
    RecentTrip,
    WeeklyBar,
    EarningBreakdownItem,
    PaymentSummaryRow,
    EarningsResponse,
    SettingsResponse,
    SettingsUpdate,
    SupportRequest,
    WithdrawalOut
)
from app.utils.security import get_current_driver
from app.utils.storage import save_upload_file

router = APIRouter(prefix="/driver", tags=["driver"])

@router.get("/profile", response_model=DriverOut)
def get_profile(current_driver: Driver = Depends(get_current_driver)):
    return current_driver

@router.get("/documents", response_model=DriverDocumentOut)
def get_documents(
    current_driver: Driver = Depends(get_current_driver), 
    db: Session = Depends(get_db)
):
    docs = db.query(DriverDocument).filter(DriverDocument.driver_id == current_driver.id).first()
    if not docs:
        docs = DriverDocument(driver_id=current_driver.id)
        db.add(docs)
        db.commit()
        db.refresh(docs)
    return docs

@router.put("/documents", response_model=DriverDocumentOut)
def update_documents(
    license_number: Optional[str] = Form(None),
    license_expiry: Optional[str] = Form(None),
    vehicle_number: Optional[str] = Form(None),
    vehicle_model: Optional[str] = Form(None),
    vehicle_year: Optional[int] = Form(None),
    vehicle_type: Optional[str] = Form(None),
    insurance_policy: Optional[str] = Form(None),
    insurance_expiry: Optional[str] = Form(None),
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    docs = db.query(DriverDocument).filter(DriverDocument.driver_id == current_driver.id).first()
    if not docs:
        docs = DriverDocument(driver_id=current_driver.id)
        db.add(docs)

    if license_number is not None: docs.license_number = license_number
    if license_expiry is not None: docs.license_expiry = license_expiry
    if vehicle_number is not None: docs.vehicle_number = vehicle_number
    if vehicle_model is not None: docs.vehicle_model = vehicle_model
    if vehicle_year is not None: docs.vehicle_year = vehicle_year
    if vehicle_type is not None: docs.vehicle_type = vehicle_type
    if insurance_policy is not None: docs.insurance_policy = insurance_policy
    if insurance_expiry is not None: docs.insurance_expiry = insurance_expiry

    db.commit()
    db.refresh(docs)
    return docs

@router.post("/upload-document")
def upload_document(
    document_type: str = Form(...), # "license", "vehicle", "insurance", "avatar"
    file: UploadFile = File(...),
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    if document_type not in ["license", "vehicle", "insurance", "avatar"]:
        raise HTTPException(status_code=400, detail="Invalid document_type. Must be license, vehicle, insurance, or avatar.")
    
    # Save the file
    web_path = save_upload_file(file, sub_folder=f"driver_{current_driver.id}")
    
    docs = db.query(DriverDocument).filter(DriverDocument.driver_id == current_driver.id).first()
    if not docs:
        docs = DriverDocument(driver_id=current_driver.id)
        db.add(docs)

    if document_type == "license":
        docs.license_image = web_path
    elif document_type == "vehicle":
        docs.vehicle_image = web_path
    elif document_type == "insurance":
        docs.insurance_image = web_path
    elif document_type == "avatar":
        docs.avatar_image = web_path
        current_driver.avatar = web_path # Link to driver table as well
        db.add(current_driver)

    db.commit()
    return {"status": "success", "url": web_path, "document_type": document_type}

@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    # Fetch trips belonging to this driver
    driver_trips = db.query(Ride).filter(Ride.driver_id == current_driver.id).all()
    completed_trips = [t for t in driver_trips if t.status == "completed"]
    
    # Sum fare amount for today (mock logic: matching UI if database is empty)
    today_earnings_val = sum(t.fare_amount for t in completed_trips)
    if today_earnings_val == 0:
        # Default starting values matching UI if empty DB
        today_earnings_str = f"₹{int(current_driver.balance)}"
        trips_count_str = str(len(completed_trips) if len(completed_trips) > 0 else 8)
        rating_str = f"{current_driver.rating:.1f}"
        km_str = "112"
    else:
        today_earnings_str = f"₹{int(today_earnings_val)}"
        trips_count_str = str(len(completed_trips))
        rating_str = f"{current_driver.rating:.1f}"
        km_str = f"{len(completed_trips) * 14}" # Mock computation: avg 14km per trip

    stats = [
        QuickStat(label="Today", value=today_earnings_str, icon="cash-outline", color="#22C55E"),
        QuickStat(label="Trips", value=trips_count_str, icon="car-sport-outline", color="#3B82F6"),
        QuickStat(label="Rating", value=rating_str, icon="star-outline", color="#F59E0B"),
        QuickStat(label="Km", value=km_str, icon="navigate-outline", color="#3B5FC0"),
    ]

    # Map recent trips
    recent = []
    # If empty database, inject standard UI mock trips
    if not driver_trips:
        recent = [
            RecentTrip(id="1", from_location="Koramangala", to_location="Indiranagar", fare="₹245", time="10:30 AM", status="completed"),
            RecentTrip(id="2", from_location="MG Road", to_location="Whitefield", fare="₹380", time="09:15 AM", status="completed"),
            RecentTrip(id="3", from_location="HSR Layout", to_location="Electronic City", fare="₹290", time="08:00 AM", status="completed"),
        ]
    else:
        # Sort by updated_at descending
        sorted_trips = sorted(driver_trips, key=lambda x: x.updated_at, reverse=True)[:5]
        for t in sorted_trips:
            recent.append(
                RecentTrip(
                    id=str(t.id),
                    from_location=t.from_location.split(" ")[0], # simplify name
                    to_location=t.to_location.split(" ")[0],     # simplify name
                    fare=t.fare,
                    time=t.created_at.strftime("%I:%M %p"),
                    status=t.status
                )
            )

    return DashboardResponse(
        is_online=current_driver.is_online,
        stats=stats,
        recent_trips=recent
    )

@router.post("/toggle-online")
def toggle_online(
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    current_driver.is_online = not current_driver.is_online
    db.add(current_driver)
    db.commit()
    db.refresh(current_driver)
    return {"status": "success", "is_online": current_driver.is_online}

@router.get("/earnings", response_model=EarningsResponse)
def get_earnings(
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    # Weekly statistics (Sunday to Saturday) - Mock standard values from UX screen, updated slightly by DB if present
    driver_trips = db.query(Ride).filter(Ride.driver_id == current_driver.id).all()
    completed_trips = [t for t in driver_trips if t.status == "completed"]
    total_db_earnings = sum(t.fare_amount for t in completed_trips)
    
    weekly_total = f"₹{int(total_db_earnings or 17450)}"
    available_balance = current_driver.balance
    
    # Days details
    statistics = [
        WeeklyBar(day="Mon", amount=1800, trips=6),
        WeeklyBar(day="Tue", amount=2200, trips=7),
        WeeklyBar(day="Wed", amount=1600, trips=5),
        WeeklyBar(day="Thu", amount=2900, trips=9),
        WeeklyBar(day="Fri", amount=3400, trips=11),
        WeeklyBar(day="Sat", amount=3100, trips=10),
        WeeklyBar(day="Sun", amount=available_balance or 2450.0, trips=len(completed_trips) or 8),
    ]

    daily_breakdown = [
        EarningBreakdownItem(label="Base Fare", amount="₹1,920", icon="car-outline", color="#3B5FC0"),
        EarningBreakdownItem(label="Surge Bonus", amount="₹320", icon="flash-outline", color="#F59E0B"),
        EarningBreakdownItem(label="Tips", amount="₹150", icon="heart-outline", color="#EF4444"),
        EarningBreakdownItem(label="Incentive", amount="₹60", icon="gift-outline", color="#10B981"),
    ]

    fee_val = float(available_balance or 17450) * 0.10
    tax_val = float(available_balance or 17450) * 0.02
    net_val = float(available_balance or 17450) - fee_val - tax_val

    payment_summary = [
        PaymentSummaryRow(label="Net Earnings", value=f"₹{int(available_balance or 17450)}", bold=True),
        PaymentSummaryRow(label="Platform Fee (10%)", value=f"−₹{int(fee_val)}"),
        PaymentSummaryRow(label="Tax (2%)", value=f"−₹{int(tax_val)}"),
        PaymentSummaryRow(label="Available to Withdraw", value=f"₹{int(net_val)}", bold=True, color="#22C55E"),
    ]

    return EarningsResponse(
        weekly_total=weekly_total,
        statistics=statistics,
        daily_breakdown=daily_breakdown,
        payment_summary=payment_summary,
        available_balance=available_balance
    )

@router.post("/withdraw", response_model=WithdrawalOut)
def request_withdrawal(
    amount: float = Form(...),
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Withdrawal amount must be greater than zero")
    if current_driver.balance < amount:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient wallet balance")

    # Deduct wallet balance
    current_driver.balance -= amount
    
    # Log withdrawal
    withdraw_req = Withdrawal(
        driver_id=current_driver.id,
        amount=amount,
        status="pending"
    )
    db.add(withdraw_req)
    db.add(current_driver)
    db.commit()
    db.refresh(withdraw_req)
    return withdraw_req

# Settings Mocks (could be expanded to columns on Driver table if required)
_mock_settings = {
    "push_notifications": True,
    "dark_mode": False,
    "navigation_provider": "Google Maps"
}

@router.get("/settings", response_model=SettingsResponse)
def get_settings(current_driver: Driver = Depends(get_current_driver)):
    return SettingsResponse(**_mock_settings)

@router.put("/settings", response_model=SettingsResponse)
def update_settings(
    payload: SettingsUpdate,
    current_driver: Driver = Depends(get_current_driver)
):
    if payload.push_notifications is not None:
        _mock_settings["push_notifications"] = payload.push_notifications
    if payload.dark_mode is not None:
        _mock_settings["dark_mode"] = payload.dark_mode
    if payload.navigation_provider is not None:
        _mock_settings["navigation_provider"] = payload.navigation_provider
    return SettingsResponse(**_mock_settings)

@router.post("/support")
def submit_support_ticket(
    payload: SupportRequest,
    current_driver: Driver = Depends(get_current_driver)
):
    # Simply simulate recording request ticket and returning confirmation code
    import uuid
    ticket_id = f"GT-{uuid.uuid4().hex[:6].upper()}"
    topic = payload.topic or payload.subject or payload.category or "Support request"
    return {
        "status": "success",
        "ticket_id": ticket_id,
        "message": f"Support ticket {ticket_id} for {topic} created successfully. Our team will contact you shortly."
    }
