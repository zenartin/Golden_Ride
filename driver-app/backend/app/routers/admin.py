from typing import List, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.user import User
from app.models.driver import Driver
from app.models.ride import Ride

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    total_drivers = db.query(Driver).count()
    online_drivers = db.query(Driver).filter(Driver.is_online == True).count()
    
    active_trips = db.query(Ride).filter(Ride.status.in_(["pending", "accepted", "arrived", "started"])).count()
    completed_trips = db.query(Ride).filter(Ride.status == "completed").count()
    cancelled_trips = db.query(Ride).filter(Ride.status == "cancelled").count()
    completed_rides = db.query(Ride).filter(Ride.status == "completed").all()
    
    total_revenue = sum(
        ((r.fare_amount or 0) / 83.0 if r.payment_method == "razorpay" else (r.fare_amount or 0)) 
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
def get_all_users(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    return [{
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "phone": u.phone,
        "wallet_balance": u.wallet_balance,
        "country": u.country,
        "created_at": u.created_at
    } for u in users]

@router.get("/drivers")
def get_all_drivers(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
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
def get_all_rides(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    rides = db.query(Ride).order_by(Ride.created_at.desc()).offset(skip).limit(limit).all()
    return [{
        "id": r.id,
        "user_id": r.user_id,
        "driver_id": r.driver_id,
        "status": r.status,
        "pickup": r.from_location,
        "dropoff": r.to_location,
        "fare": (r.fare_amount / 83.0) if r.payment_method == "razorpay" else r.fare_amount,
        "payment_method": r.payment_method,
        "created_at": r.created_at
    } for r in rides]

@router.get("/chart-data")
def get_chart_data(db: Session = Depends(get_db)):
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
