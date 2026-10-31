from typing import List, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.user import User
from app.models.driver import Driver, DriverDocument
from app.models.ride import Ride
from app.models.admin import Admin
from app.utils.security import get_current_admin, get_current_super_admin

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/stats")
def get_dashboard_stats(current_admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    total_drivers = db.query(Driver).count()
    online_drivers = db.query(Driver).filter(Driver.is_online == True).count()
    
    active_trips = db.query(Ride).filter(Ride.status.in_(["pending", "accepted", "arrived", "started"])).count()
    completed_trips = db.query(Ride).filter(Ride.status == "completed").count()
    cancelled_trips = db.query(Ride).filter(Ride.status == "cancelled").count()
    completed_rides = db.query(Ride).filter(Ride.status == "completed").all()
    
    total_revenue = sum(
        (r.fare_amount or 0)
        for r in completed_rides
    )

    return {
        "total_users": total_users,
        "total_drivers": total_drivers,
        "online_drivers": online_drivers,
        "active_trips": active_trips,
        "completed_trips": completed_trips,
        "cancelled_trips": cancelled_trips,
        "total_revenue": float(total_revenue)
    }

@router.get("/users")
def get_all_users(skip: int = 0, limit: int = 50, current_admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    return [{
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "phone": u.phone,
        "wallet_balance": u.wallet_balance,
        "created_at": u.created_at
    } for u in users]

@router.get("/drivers")
def get_all_drivers(skip: int = 0, limit: int = 50, current_admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    drivers = db.query(Driver).order_by(Driver.created_at.desc()).offset(skip).limit(limit).all()
    return [{
        "id": d.id,
        "name": d.name,
        "email": d.email,
        "phone": d.phone,
        "is_online": d.is_online,
        "is_approved": d.is_approved,
        "rating": d.rating,
        "created_at": d.created_at
    } for d in drivers]

@router.get("/rides")
def get_all_rides(skip: int = 0, limit: int = 50, current_admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    rides = db.query(Ride).order_by(Ride.created_at.desc()).offset(skip).limit(limit).all()
    return [{
        "id": r.id,
        "user_id": r.user_id,
        "driver_id": r.driver_id,
        "status": r.status,
        "pickup": r.from_location,
        "dropoff": r.to_location,
        "fare": (r.fare_amount / 83.0) if r.payment_method == "razorpay" else r.fare_amount,
        "driver_cut": ((r.fare_amount / 83.0) * 0.8) if r.payment_method == "razorpay" else ((r.fare_amount or 0) * 0.8),
        "admin_cut": ((r.fare_amount / 83.0) * 0.2) if r.payment_method == "razorpay" else ((r.fare_amount or 0) * 0.2),
        "payment_method": r.payment_method,
        "created_at": r.created_at
    } for r in rides]

@router.get("/chart-data")
def get_chart_data(current_admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    rides = db.query(Ride).filter(Ride.created_at >= seven_days_ago).all()
    
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    revenue_data = {d: 0 for d in days}
    activity_data = {d: {"completed": 0, "cancelled": 0} for d in days}
    
    for r in rides:
        if r.created_at:
            day_str = r.created_at.strftime("%a")
            if day_str in days:
                if r.status == "completed":
                    fare = r.fare_amount or 0
                    if r.payment_method == "razorpay":
                        fare = fare / 83.0
                    revenue_data[day_str] += fare
                    activity_data[day_str]["completed"] += 1
                elif r.status == "cancelled":
                    activity_data[day_str]["cancelled"] += 1
                    
    revenue_list = [{"name": d, "total": float(revenue_data[d])} for d in days]
    activity_list = [{"name": d, "completed": activity_data[d]["completed"], "cancelled": activity_data[d]["cancelled"]} for d in days]
    
    return {
        "revenue": revenue_list,
        "activity": activity_list
    }

@router.get("/drivers/{driver_id}/details")
def get_driver_details(driver_id: int, current_admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
        
    doc = db.query(DriverDocument).filter(DriverDocument.driver_id == driver_id).first()
    
    return {
        "id": driver.id,
        "name": driver.name,
        "email": driver.email,
        "phone": driver.phone,
        "is_online": driver.is_online,
        "is_approved": driver.is_approved,
        "rating": driver.rating,
        "created_at": driver.created_at,
        "documents": {
            "vehicle_number": doc.vehicle_number if doc else None,
            "vehicle_plate_number": doc.vehicle_plate_number if doc else None,
            "vehicle_model": doc.vehicle_model if doc else None,
            "license_number": doc.license_number if doc else None,
            "license_state": doc.license_state if doc else None,
            "insurance_policy": doc.insurance_policy if doc else None,
            "insurance_expiry": doc.insurance_expiry if doc else None,
            "background_check_status": doc.criminal_bg_status if doc else None
        }
    }


@router.post("/drivers/{driver_id}/approve")
def approve_driver(driver_id: int, current_admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    driver.is_approved = True
    db.commit()
    return {"message": "Driver approved"}


@router.post("/drivers/{driver_id}/reject")
async def reject_driver(driver_id: int, current_admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    driver.is_approved = False
    driver.is_online = False
    db.commit()

    from app.websocket.manager import manager
    await manager.send_to_driver(driver_id, {"type": "driver_revoked"})

    return {"message": "Driver approval revoked"}


# ─── Platform settings (stored in DB, super-admin editable) ──────────────────
import json
from collections import defaultdict
from pydantic import BaseModel
from app.database import engine
from app.models.app_setting import AppSetting

AppSetting.__table__.create(bind=engine, checkfirst=True)

DEFAULT_SETTINGS: Dict[str, Any] = {
    "commission_percent": 20.0,
    "base_fare": 3.0,
    "per_mile_economy": 1.2,
    "per_mile_comfort": 1.6,
    "per_mile_premium": 2.2,
    "ride_request_timeout_seconds": 60,
    "support_phone": "",
    "support_email": "",
    "maintenance_mode": False,
}


def _load_settings(db: Session) -> Dict[str, Any]:
    settings = dict(DEFAULT_SETTINGS)
    for row in db.query(AppSetting).all():
        if row.key in settings:
            try:
                settings[row.key] = json.loads(row.value)
            except Exception:
                pass
    return settings


class SettingsUpdate(BaseModel):
    commission_percent: float | None = None
    base_fare: float | None = None
    per_mile_economy: float | None = None
    per_mile_comfort: float | None = None
    per_mile_premium: float | None = None
    ride_request_timeout_seconds: int | None = None
    support_phone: str | None = None
    support_email: str | None = None
    maintenance_mode: bool | None = None


@router.get("/settings")
def get_settings(current_admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    return {"settings": _load_settings(db), "can_edit": current_admin.role == "super_admin"}


@router.put("/settings")
def update_settings(payload: SettingsUpdate, current_admin: Admin = Depends(get_current_super_admin), db: Session = Depends(get_db)):
    data = payload.dict(exclude_none=True)
    if "commission_percent" in data and not (0 <= data["commission_percent"] <= 100):
        raise HTTPException(status_code=400, detail="Commission must be between 0 and 100")
    for k, v in data.items():
        if k not in DEFAULT_SETTINGS:
            continue
        row = db.query(AppSetting).filter(AppSetting.key == k).first()
        if row:
            row.value = json.dumps(v)
            row.updated_at = datetime.utcnow()
        else:
            db.add(AppSetting(key=k, value=json.dumps(v)))
    db.commit()
    return {"settings": _load_settings(db), "can_edit": True}


# ─── Reports ─────────────────────────────────────────────────────────────────
def _ride_fare(r: Ride) -> float:
    fare = r.actual_fare if r.actual_fare is not None else (r.fare_amount or 0)
    if r.payment_method == "razorpay":
        fare = fare / 83.0
    return float(fare)


@router.get("/reports")
def get_reports(period: str = "weekly", current_admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    days_map = {"daily": 1, "weekly": 7, "monthly": 30, "yearly": 365}
    if period not in days_map:
        raise HTTPException(status_code=400, detail="period must be daily, weekly, monthly or yearly")
    days = days_map[period]
    now = datetime.utcnow()
    start = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    commission = float(_load_settings(db)["commission_percent"]) / 100.0

    rides = db.query(Ride).filter(Ride.created_at >= start).all()
    completed = [r for r in rides if r.status == "completed"]
    cancelled = [r for r in rides if r.status == "cancelled"]

    gross = sum(_ride_fare(r) for r in completed)
    admin_cut = gross * commission

    # Time series (hourly for daily, otherwise per day)
    series: Dict[str, Dict[str, float]] = defaultdict(lambda: {"rides": 0, "gross": 0.0, "admin": 0.0, "driver": 0.0})
    if period == "daily":
        labels = [f"{h:02d}:00" for h in range(24)]
        key_fn = lambda d: f"{d.hour:02d}:00"
    else:
        labels = [(start + timedelta(days=i)).strftime("%b %d") for i in range(days)]
        key_fn = lambda d: d.strftime("%b %d")
    for r in completed:
        k = key_fn(r.completed_at or r.created_at)
        f = _ride_fare(r)
        series[k]["rides"] += 1
        series[k]["gross"] += f
        series[k]["admin"] += f * commission
        series[k]["driver"] += f * (1 - commission)
    timeline = [{"label": l, **{m: round(v, 2) for m, v in series[l].items()}} for l in labels]

    # Top drivers
    per_driver: Dict[int, Dict[str, Any]] = {}
    for r in completed:
        if r.driver_id is None:
            continue
        d = per_driver.setdefault(r.driver_id, {"driver_id": r.driver_id, "name": r.driver_name or f"Driver #{r.driver_id}", "rides": 0, "earnings": 0.0})
        d["rides"] += 1
        d["earnings"] += _ride_fare(r) * (1 - commission)
    top_drivers = sorted(per_driver.values(), key=lambda x: x["earnings"], reverse=True)[:10]
    for d in top_drivers:
        d["earnings"] = round(d["earnings"], 2)

    # Payment method split
    methods: Dict[str, float] = defaultdict(float)
    for r in completed:
        methods[(r.payment_method or "Other")] += _ride_fare(r)

    total = len(rides)
    return {
        "period": period,
        "start": start.isoformat(),
        "end": now.isoformat(),
        "commission_percent": commission * 100,
        "summary": {
            "total_rides": total,
            "completed_rides": len(completed),
            "cancelled_rides": len(cancelled),
            "completion_rate": round(len(completed) / total * 100, 1) if total else 0,
            "gross_revenue": round(gross, 2),
            "admin_commission": round(admin_cut, 2),
            "driver_earnings": round(gross - admin_cut, 2),
            "avg_fare": round(gross / len(completed), 2) if completed else 0,
            "new_users": db.query(User).filter(User.created_at >= start).count(),
            "new_drivers": db.query(Driver).filter(Driver.created_at >= start).count(),
        },
        "timeline": timeline,
        "top_drivers": top_drivers,
        "payment_methods": [{"method": k, "total": round(v, 2)} for k, v in methods.items()],
    }


# ─── Payments / Stripe dashboard ─────────────────────────────────────────────
@router.get("/stripe-dashboard")
def get_stripe_dashboard(current_admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    from app.models.payment import Payment
    import stripe as _stripe
    from app.routers.stripe_router import STRIPE_SECRET_KEY

    # Live Stripe data (best-effort — page still works if Stripe is unreachable)
    stripe_info: Dict[str, Any] = {"connected": False, "error": None, "balance": {"available": 0.0, "pending": 0.0}, "recent_charges": []}
    try:
        _stripe.api_key = STRIPE_SECRET_KEY
        bal = _stripe.Balance.retrieve()
        stripe_info["balance"] = {
            "available": sum(b["amount"] for b in bal["available"] if b["currency"] == "usd") / 100.0,
            "pending": sum(b["amount"] for b in bal["pending"] if b["currency"] == "usd") / 100.0,
        }
        charges = _stripe.Charge.list(limit=20)
        stripe_info["recent_charges"] = [{
            "id": c["id"],
            "amount": c["amount"] / 100.0,
            "currency": c["currency"],
            "status": c["status"],
            "created": c["created"],
            "receipt_url": c.get("receipt_url"),
        } for c in charges["data"]]
        stripe_info["connected"] = True
    except Exception as e:  # noqa: BLE001
        stripe_info["error"] = str(getattr(e, "user_message", None) or e)[:200]

    # Platform payments from our own database
    payments = db.query(Payment).order_by(Payment.created_at.desc()).limit(50).all()
    succeeded = [p for p in db.query(Payment).filter(Payment.payment_status == "succeeded").all()]
    rides = db.query(Ride).filter(Ride.status == "completed").all()
    by_method: Dict[str, float] = defaultdict(float)
    for r in rides:
        by_method[(r.payment_method or "Other")] += _ride_fare(r)
    commission = float(_load_settings(db)["commission_percent"]) / 100.0
    gross = sum(by_method.values())

    return {
        "stripe": {"connected": stripe_info["connected"], "error": stripe_info["error"]},
        "balance": stripe_info["balance"],
        "recent_charges": stripe_info["recent_charges"],
        "summary": {
            "total_collected": round(sum(p.amount for p in succeeded), 2),
            "online_payments": len(succeeded),
            "failed_payments": db.query(Payment).filter(Payment.payment_status == "failed").count(),
            "refunded_payments": db.query(Payment).filter(Payment.refund_status != "none").count(),
            "ride_revenue": round(gross, 2),
            "admin_commission": round(gross * commission, 2),
            "driver_earnings": round(gross * (1 - commission), 2),
        },
        "by_method": [{"method": k, "total": round(v, 2)} for k, v in by_method.items()],
        "payments": [{
            "id": p.id,
            "payment_id": p.payment_id,
            "user_id": p.user_id,
            "ride_id": p.ride_id,
            "amount": p.amount,
            "currency": p.currency,
            "status": p.payment_status,
            "refund_status": p.refund_status,
            "receipt_url": p.receipt_url,
            "date": p.transaction_date or p.created_at,
        } for p in payments],
    }


# ─── Driver payouts (admin collects full fare, then pays drivers their share) ─
from app.models.driver_payout import DriverPayout
from app.models.ride import Withdrawal

DriverPayout.__table__.create(bind=engine, checkfirst=True)


class PayoutRequest(BaseModel):
    amount: float | None = None  # defaults to the full amount due
    method: str = "bank_transfer"
    reference: str | None = None
    note: str | None = None


def _driver_balances(db: Session) -> Dict[int, Dict[str, Any]]:
    commission = float(_load_settings(db)["commission_percent"]) / 100.0
    week_start = datetime.utcnow() - timedelta(days=7)
    balances: Dict[int, Dict[str, Any]] = {}
    for r in db.query(Ride).filter(Ride.status == "completed", Ride.driver_id.isnot(None)).all():
        b = balances.setdefault(r.driver_id, {"rides": 0, "gross": 0.0, "week_earned": 0.0})
        fare = _ride_fare(r)
        b["rides"] += 1
        b["gross"] += fare
        if (r.completed_at or r.created_at) and (r.completed_at or r.created_at) >= week_start:
            b["week_earned"] += fare * (1 - commission)
    paid_rows = db.query(DriverPayout.driver_id, func.coalesce(func.sum(DriverPayout.amount), 0), func.max(DriverPayout.created_at)).group_by(DriverPayout.driver_id).all()
    paid = {did: (float(total), last) for did, total, last in paid_rows}
    req_rows = db.query(Withdrawal.driver_id, func.coalesce(func.sum(Withdrawal.amount), 0)).filter(Withdrawal.status == "pending").group_by(Withdrawal.driver_id).all()
    requested = {did: float(total) for did, total in req_rows}
    for did, b in balances.items():
        b["earned"] = b["gross"] * (1 - commission)
        b["commission"] = b["gross"] * commission
        b["paid"], b["last_paid_at"] = paid.get(did, (0.0, None))
        b["due"] = max(b["earned"] - b["paid"], 0.0)
        b["requested"] = requested.get(did, 0.0)
    return balances


@router.get("/payouts")
def get_payouts(current_admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    balances = _driver_balances(db)
    drivers = {d.id: d for d in db.query(Driver).filter(Driver.id.in_(list(balances.keys()) or [0])).all()}
    docs = {x.driver_id: x for x in db.query(DriverDocument).filter(DriverDocument.driver_id.in_(list(balances.keys()) or [0])).all()}
    rows = []
    for did, b in balances.items():
        d = drivers.get(did)
        if not d:
            continue
        rows.append({
            "driver_id": did,
            "name": d.name,
            "phone": d.phone,
            "email": d.email,
            "vehicle": (docs[did].vehicle_plate_number or docs[did].vehicle_number) if did in docs else None,
            "rides": b["rides"],
            "gross": round(b["gross"], 2),
            "commission": round(b["commission"], 2),
            "earned": round(b["earned"], 2),
            "paid": round(b["paid"], 2),
            "due": round(b["due"], 2),
            "week_earned": round(b["week_earned"], 2),
            "requested": round(b["requested"], 2),
            "last_paid_at": b["last_paid_at"],
        })
    rows.sort(key=lambda x: x["due"], reverse=True)
    commission_pct = float(_load_settings(db)["commission_percent"])
    return {
        "commission_percent": commission_pct,
        "summary": {
            "total_collected": round(sum(r["gross"] for r in rows), 2),
            "admin_commission": round(sum(r["commission"] for r in rows), 2),
            "driver_share": round(sum(r["earned"] for r in rows), 2),
            "total_paid": round(sum(r["paid"] for r in rows), 2),
            "total_due": round(sum(r["due"] for r in rows), 2),
            "drivers_to_pay": len([r for r in rows if r["due"] > 0.009]),
        },
        "drivers": rows,
    }


@router.post("/drivers/{driver_id}/payout")
def pay_driver(driver_id: int, payload: PayoutRequest, current_admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    due = round(_driver_balances(db).get(driver_id, {}).get("due", 0.0), 2)
    amount = round(payload.amount if payload.amount is not None else due, 2)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Nothing to pay for this driver")
    if amount > due + 0.01:
        raise HTTPException(status_code=400, detail=f"Amount exceeds due balance (${due:.2f})")
    p = DriverPayout(driver_id=driver_id, amount=amount, method=payload.method, reference=payload.reference, note=payload.note, paid_by=current_admin.name)
    db.add(p)
    # Settle pending withdrawal requests once the payment covers them
    pending = db.query(Withdrawal).filter(Withdrawal.driver_id == driver_id, Withdrawal.status == "pending").order_by(Withdrawal.created_at).all()
    remaining = amount
    for w in pending:
        if remaining + 0.01 >= w.amount:
            w.status = "completed"
            remaining -= w.amount
    db.commit()
    db.refresh(p)
    return {"id": p.id, "driver_id": driver_id, "amount": amount, "remaining_due": round(max(due - amount, 0), 2)}


@router.get("/payouts/history")
def payout_history(limit: int = 100, current_admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    rows = db.query(DriverPayout).order_by(DriverPayout.created_at.desc()).limit(limit).all()
    names = {d.id: d.name for d in db.query(Driver).filter(Driver.id.in_([r.driver_id for r in rows] or [0])).all()}
    return [{
        "id": r.id, "driver_id": r.driver_id, "driver_name": names.get(r.driver_id, f"Driver #{r.driver_id}"),
        "amount": r.amount, "method": r.method, "reference": r.reference, "note": r.note,
        "paid_by": r.paid_by, "created_at": r.created_at,
    } for r in rows]

# ─── Coupons ─────────────────────────────────────────────────────────────────
from app.models.coupon import Coupon
from app.schemas.coupon import CouponCreate, CouponUpdate, CouponOut

@router.get("/coupons", response_model=List[CouponOut])
def get_coupons(current_admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(Coupon).order_by(Coupon.id.asc()).all()

@router.post("/coupons", response_model=CouponOut)
def create_coupon(payload: CouponCreate, current_admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    if db.query(Coupon).filter(Coupon.code == payload.code.upper()).first():
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    coupon = Coupon(**payload.dict())
    coupon.code = coupon.code.upper()
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return coupon

@router.put("/coupons/{coupon_id}", response_model=CouponOut)
def update_coupon(coupon_id: int, payload: CouponUpdate, current_admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    update_data = payload.dict(exclude_unset=True)
    if "code" in update_data:
        update_data["code"] = update_data["code"].upper()
        if db.query(Coupon).filter(Coupon.code == update_data["code"], Coupon.id != coupon_id).first():
            raise HTTPException(status_code=400, detail="Coupon code already exists")

    for key, value in update_data.items():
        setattr(coupon, key, value)
        
    db.commit()
    db.refresh(coupon)
    return coupon

@router.delete("/coupons/{coupon_id}")
def delete_coupon(coupon_id: int, current_admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    db.delete(coupon)
    db.commit()
    return {"status": "success", "message": "Coupon deleted"}


@router.get("/safety-alerts")
def list_safety_alerts(current_admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    from app.models.rider_features import SafetyAlert

    rows = db.query(SafetyAlert).order_by(SafetyAlert.created_at.desc()).limit(200).all()
    return [{
        "id": a.id, "actor_role": a.actor_role, "actor_id": a.actor_id, "ride_id": a.ride_id, "kind": a.kind,
        "message": a.message, "latitude": a.latitude, "longitude": a.longitude, "status": a.status,
        "created_at": a.created_at.isoformat(),
    } for a in rows]


@router.post("/safety-alerts/{alert_id}/resolve")
def resolve_safety_alert(alert_id: int, current_admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    from app.models.rider_features import SafetyAlert

    alert = db.query(SafetyAlert).filter(SafetyAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = "resolved"
    db.commit()
    return {"status": "success"}
