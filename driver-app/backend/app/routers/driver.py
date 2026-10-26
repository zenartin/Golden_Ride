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
    DriverProfileUpdateRequest,
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

@router.put("/profile", response_model=DriverOut)
def update_profile(
    payload: DriverProfileUpdateRequest,
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    if payload.name is not None: current_driver.name = payload.name
    if payload.email is not None: current_driver.email = payload.email
    if payload.phone is not None: current_driver.phone = payload.phone
    if payload.date_of_birth is not None: current_driver.date_of_birth = payload.date_of_birth
    if payload.residential_address is not None: current_driver.residential_address = payload.residential_address
    if payload.accepted_ride_classes is not None: current_driver.accepted_ride_classes = payload.accepted_ride_classes
    if payload.radius_filter is not None: current_driver.radius_filter = payload.radius_filter

    docs = db.query(DriverDocument).filter(DriverDocument.driver_id == current_driver.id).first()
    if not docs:
        docs = DriverDocument(driver_id=current_driver.id)
        db.add(docs)

    update_data = payload.dict(exclude_unset=True)
    doc_fields = [
        "license_number", "license_state", "license_expiry", "license_image", "license_back_image",
        "vehicle_model", "vehicle_year", "vehicle_type", "vehicle_color", "vehicle_vin", "vehicle_plate_number",
        "vehicle_registration_image", "vehicle_inspection_image", "insurance_policy", "insurance_expiry", "insurance_image",
        "criminal_bg_status", "driving_record_status", "identity_verification_status",
        "bank_name", "account_number", "routing_number", "upi_id",
        "emergency_contact_name", "emergency_contact_phone", "preferred_language", "avatar_image",
        "tax_id", "w9_form_image"
    ]
    for field in doc_fields:
        if field in update_data:
            setattr(docs, field, update_data[field])
            
    if payload.avatar_image is not None:
        current_driver.avatar = payload.avatar_image

    # Mark profile completed if basic critical info is provided
    if docs.license_number and docs.vehicle_plate_number:
        current_driver.profile_completed = True

    db.commit()
    db.refresh(current_driver)
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
    if document_type not in ["license", "license_back", "vehicle", "insurance", "avatar"]:
        raise HTTPException(status_code=400, detail="Invalid document_type. Must be license, license_back, vehicle, insurance, or avatar.")
    
    # Save the file
    web_path = save_upload_file(file, sub_folder=f"driver_{current_driver.id}")
    
    docs = db.query(DriverDocument).filter(DriverDocument.driver_id == current_driver.id).first()
    if not docs:
        docs = DriverDocument(driver_id=current_driver.id)
        db.add(docs)

    if document_type == "license":
        docs.license_image = web_path
    elif document_type == "license_back":
        docs.license_back_image = web_path
    elif document_type == "vehicle":
        docs.vehicle_image = web_path
    elif document_type == "insurance":
        docs.insurance_image = web_path
    elif document_type == "avatar":
        import time
        timestamped_path = f"{web_path}?t={int(time.time())}"
        docs.avatar_image = timestamped_path
        current_driver.avatar = timestamped_path # Link to driver table as well
        db.add(current_driver)

    db.commit()
    return {"status": "success", "url": web_path, "document_type": document_type}

@router.post("/profile/remove-avatar")
def remove_avatar(
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    try:
        current_driver.avatar = None
        docs = db.query(DriverDocument).filter(DriverDocument.driver_id == current_driver.id).first()
        if docs:
            docs.avatar_image = None
        
        db.add(current_driver)
        db.commit()
        db.refresh(current_driver)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(
    filter: Optional[str] = "daily",
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    # Fetch trips belonging to this driver
    driver_trips = db.query(Ride).filter(Ride.driver_id == current_driver.id).all()
    completed_trips = [t for t in driver_trips if t.status == "completed"]
    
    # Real stats from DB only
    today = datetime.utcnow().date()
    
    if filter == "weekly":
        start_date = today - timedelta(days=7)
        filtered_trips = [t for t in completed_trips if t.completed_at and start_date <= t.completed_at.date() <= today]
        if not filtered_trips:
            filtered_trips = [t for t in completed_trips if start_date <= (t.updated_at or t.created_at).date() <= today]
        stat_label = "This Week"
    else:
        filtered_trips = [t for t in completed_trips if t.completed_at and t.completed_at.date() == today]
        if not filtered_trips:
            filtered_trips = [t for t in completed_trips if (t.updated_at or t.created_at).date() == today]
        stat_label = "Today"
    
    # 80% driver cut applied here!
    earnings_val = sum((t.fare_amount * 0.80) for t in filtered_trips)
    
    # Currency
    currency_sym = "$"
            
    earnings_str = f"{currency_sym}{earnings_val:.2f}"
    trips_count_str = str(len(completed_trips))
    rating_str = f"{current_driver.rating:.1f}"
    total_km = sum(float(t.distance.replace(' km', '').replace('km', '').replace(' miles', '').replace(' mi', '').strip()) if t.distance else 0.0 for t in completed_trips)
    km_str = f"{int(total_km)}"

    stats = [
        QuickStat(label=stat_label, value=earnings_str, icon="cash-outline", color="#22C55E"),
        QuickStat(label="Trips", value=trips_count_str, icon="car-sport-outline", color="#3B82F6"),
        QuickStat(label="Rating", value=rating_str, icon="star-outline", color="#F59E0B"),
        QuickStat(label="Miles", value=km_str, icon="navigate-outline", color="#3B5FC0"),
    ]

    # Map recent trips — only real trips from DB
    recent = []
    if driver_trips:
        sorted_trips = sorted(driver_trips, key=lambda x: x.updated_at, reverse=True)[:5]
        for t in sorted_trips:
            recent.append(
                RecentTrip(
                    id=str(t.id),
                    from_location=t.from_location,
                    to_location=t.to_location,
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
async def toggle_online(
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    if not current_driver.is_online and not current_driver.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has not been approved by an administrator yet."
        )
    current_driver.is_online = not current_driver.is_online
    db.add(current_driver)
    db.commit()
    db.refresh(current_driver)

    if current_driver.is_online:
        from app.services.dispatch_service import DispatchService
        await DispatchService.dispatch_pending_rides_to_driver(db, current_driver)

    return {"status": "success", "is_online": current_driver.is_online}

from app.schemas.driver import DestinationModeRequest

@router.post("/destination-mode", response_model=DriverOut)
async def toggle_destination_mode(
    payload: DestinationModeRequest,
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    current_driver.destination_mode_active = payload.active
    if payload.active:
        current_driver.destination_lat = payload.lat
        current_driver.destination_lng = payload.lng
        current_driver.destination_address = payload.address
    else:
        current_driver.destination_lat = None
        current_driver.destination_lng = None
        current_driver.destination_address = None

    db.add(current_driver)
    db.commit()
    db.refresh(current_driver)

    if current_driver.is_online:
        from app.services.dispatch_service import DispatchService
        await DispatchService.dispatch_pending_rides_to_driver(db, current_driver)

    return current_driver

@router.get("/earnings", response_model=EarningsResponse)
def get_earnings(
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    # Weekly statistics (Sunday to Saturday) - Mock standard values from UX screen, updated slightly by DB if present
    driver_trips = db.query(Ride).filter(Ride.driver_id == current_driver.id).all()
    completed_trips = [t for t in driver_trips if t.status == "completed"]
    # Driver gets 80%
    total_db_earnings = sum(t.fare_amount * 0.80 for t in completed_trips)
    
    # Currency
    currency_sym = "$"
            
    weekly_total = f"{currency_sym}{total_db_earnings:.2f}"
    available_balance = current_driver.balance or 0.0
    
    # Calculate daily statistics dynamically based on completed rides this week (past 7 days)
    from datetime import timedelta
    today = datetime.utcnow().date()
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    stats_dict = {day: {"amount": 0.0, "trips": 0} for day in days}
    
    for t in completed_trips:
        dt = t.completed_at or t.updated_at or t.created_at
        if dt:
            day_name = dt.strftime("%a")
            if day_name in stats_dict:
                stats_dict[day_name]["amount"] += (t.fare_amount * 0.80 if t.fare_amount else 0.0)
                stats_dict[day_name]["trips"] += 1
                
    statistics = [
        WeeklyBar(day=day, amount=stats_dict[day]["amount"], trips=stats_dict[day]["trips"])
        for day in days
    ]

    # Calculate today's breakdown from actual today's rides
    today_trips = [t for t in completed_trips if t.completed_at and t.completed_at.date() == today]
    if not today_trips:
        today_trips = [t for t in completed_trips if (t.updated_at or t.created_at).date() == today]
        
    today_gross = sum(t.fare_amount for t in today_trips)
    # Drivers get 80% of total
    net_earnings = round(today_gross * 0.80, 2)
    platform_fee = round(today_gross * 0.20, 2)
    # Tips (currently no tip field in DB, assuming 0 for now)
    tips = 0.0

    daily_breakdown = [
        EarningBreakdownItem(label="Total Fares Collected", amount=f"{currency_sym}{today_gross:.2f}", icon="cash-outline", color="#22C55E"),
        EarningBreakdownItem(label="Driver Earnings (80%)", amount=f"{currency_sym}{net_earnings:.2f}", icon="car-outline", color="#3B5FC0"),
        EarningBreakdownItem(label="Platform Fee (20%)", amount=f"-{currency_sym}{platform_fee:.2f}", icon="pie-chart-outline", color="#EF4444"),
        EarningBreakdownItem(label="Tips (100%)", amount=f"{currency_sym}{tips:.2f}", icon="heart-outline", color="#10B981"),
    ]

    # available_balance already is 80% of fares (computed in ride_service), so we don't deduct again!
    gross_wallet = available_balance / 0.80 if available_balance > 0 else 0
    fee_val = gross_wallet * 0.20
    net_val = available_balance

    payment_summary = [
        PaymentSummaryRow(label="Gross Fares", value=f"{currency_sym}{gross_wallet:.2f}", bold=True),
        PaymentSummaryRow(label="Platform Fees (20%)", value=f"−{currency_sym}{fee_val:.2f}"),
        PaymentSummaryRow(label="Available to Withdraw", value=f"{currency_sym}{net_val:.2f}", bold=True, color="#22C55E"),
    ]

    withdrawals_db = db.query(Withdrawal).filter(Withdrawal.driver_id == current_driver.id).order_by(Withdrawal.created_at.desc()).all()
    
    return EarningsResponse(
        weekly_total=weekly_total,
        statistics=statistics,
        daily_breakdown=daily_breakdown,
        payment_summary=payment_summary,
        available_balance=available_balance,
        withdrawals=withdrawals_db
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

from pydantic import BaseModel
from typing import Optional
class DeviceTokenPayload(BaseModel):
    token: str
    platform: Optional[str] = "android"

@router.post("/device-token")
def register_device_token(
    payload: DeviceTokenPayload,
    current_driver: Driver = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    from app.repositories.device_token_repository import DeviceTokenRepository
    DeviceTokenRepository.save_token(db, current_driver.id, payload.token, payload.platform)
    return {"status": "success", "message": "Device token registered"}
