import os
import json
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from app.core.config import settings
from app.database import engine, Base, SessionLocal
from app.routers import auth, driver, rides, messages, notifications, user, content, stripe_router, admin, admin_auth
from app.websocket.manager import manager
from app.repositories.driver_repository import DriverRepository
from app.exceptions import register_exception_handlers
from app.models.user import User
from app.models.driver import Driver
from app.models.ride import Ride
from app.models.admin import Admin
from app.utils.security import get_password_hash
from app.middleware import setup_middleware
from app.logging_config import setup_logging

# Initialize Logging
setup_logging()
logger = logging.getLogger("app")

# Initialize Database tables if they do not exist
# In production, migrations (using Alembic) are used. 
# Initialize Database tables if they do not exist
# Initialize Database tables if they do not exist
Base.metadata.create_all(bind=engine)

def ensure_local_schema_compatibility():
    inspector = inspect(engine)
    table_names = inspector.get_table_names()

    # --- rides table ---
    if "rides" in table_names:
        existing = {column["name"] for column in inspector.get_columns("rides")}
        required_columns = {
            "user_id": "INTEGER",
            "ride_class": "VARCHAR DEFAULT 'comfort'",
            "pickup_latitude": "FLOAT",
            "pickup_longitude": "FLOAT",
            "dropoff_latitude": "FLOAT",
            "dropoff_longitude": "FLOAT",
            "started_at": "TIMESTAMP",
            "completed_at": "TIMESTAMP",
            "actual_fare": "FLOAT",
            "cancellation_reason": "VARCHAR",
            "coupon_code": "VARCHAR",
            "discount_amount": "FLOAT",
            "scheduled_time": "TIMESTAMP",
        }
        missing = [(name, sql_type) for name, sql_type in required_columns.items() if name not in existing]
        if missing:
            with engine.begin() as connection:
                for name, sql_type in missing:
                    connection.execute(text(f"ALTER TABLE rides ADD COLUMN {name} {sql_type}"))

    # --- drivers table ---
    if "drivers" in table_names:
        existing_drivers = {column["name"] for column in inspector.get_columns("drivers")}
        required_driver_columns = {
            "total_rides": "INTEGER DEFAULT 0",
            "avatar": "VARCHAR",
            "is_approved": "BOOLEAN DEFAULT false",
            "latitude": "FLOAT DEFAULT 12.9716",
            "longitude": "FLOAT DEFAULT 77.5946",
            "balance": "FLOAT DEFAULT 0.0",
            "profile_completed": "BOOLEAN DEFAULT false",
            "country": "VARCHAR DEFAULT 'USA'",
            "date_of_birth": "VARCHAR",
            "residential_address": "VARCHAR",
        }
        missing_drivers = [(name, sql_type) for name, sql_type in required_driver_columns.items() if name not in existing_drivers]
        if missing_drivers:
            with engine.begin() as connection:
                for name, sql_type in missing_drivers:
                    connection.execute(text(f"ALTER TABLE drivers ADD COLUMN {name} {sql_type}"))

    # --- driver_documents table ---
    if "driver_documents" in table_names:
        existing_docs = {column["name"] for column in inspector.get_columns("driver_documents")}
        required_doc_columns = {
            "license_state": "VARCHAR",
            "vehicle_color": "VARCHAR",
            "vehicle_plate_number": "VARCHAR",
            "vehicle_vin": "VARCHAR",
            "license_back_image": "VARCHAR",
            "vehicle_registration_image": "VARCHAR",
            "vehicle_inspection_image": "VARCHAR",
            "w9_form_image": "VARCHAR",
            "avatar_image": "VARCHAR",
            "upi_id": "VARCHAR",
            "card_number": "VARCHAR",
            "card_expiry": "VARCHAR",
            "card_cvv": "VARCHAR",
            "criminal_bg_status": "VARCHAR DEFAULT 'pending'",
            "driving_record_status": "VARCHAR DEFAULT 'pending'",
            "identity_verification_status": "VARCHAR DEFAULT 'pending'",
            "bank_name": "VARCHAR",
            "account_number": "VARCHAR",
            "routing_number": "VARCHAR",
            "emergency_contact_name": "VARCHAR",
            "emergency_contact_phone": "VARCHAR",
            "preferred_language": "VARCHAR",
            "tax_id": "VARCHAR",
        }
        missing_docs = [(name, sql_type) for name, sql_type in required_doc_columns.items() if name not in existing_docs]
        if missing_docs:
            with engine.begin() as connection:
                for name, sql_type in missing_docs:
                    connection.execute(text(f"ALTER TABLE driver_documents ADD COLUMN {name} {sql_type}"))

    # --- admins table ---
    if "admins" not in table_names:
        # It will be created by create_all, but we need to seed the default super_admin
        pass

    # Seed default super admin
    db = SessionLocal()
    try:
        admin = db.query(Admin).filter(Admin.email == "admin@goldenride.com").first()
        if not admin:
            default_admin = Admin(
                email="admin@goldenride.com",
                name="Super Admin",
                password_hash=get_password_hash("Admin123!"),
                role="super_admin"
            )
            db.add(default_admin)
            db.commit()
    finally:
        db.close()

    # --- users table ---
    if "users" in table_names:
        existing_users = {column["name"] for column in inspector.get_columns("users")}
        required_user_columns = {
            "stripe_customer_id": "VARCHAR",
            "country": "VARCHAR DEFAULT 'USA'",
            "card_number": "VARCHAR",
            "card_expiry": "VARCHAR",
            "card_cvv": "VARCHAR",
            "card_holder": "VARCHAR",
        }
        missing_users = [(name, sql_type) for name, sql_type in required_user_columns.items() if name not in existing_users]
        if missing_users:
            with engine.begin() as connection:
                for name, sql_type in missing_users:
                    connection.execute(text(f"ALTER TABLE users ADD COLUMN {name} {sql_type}"))

ensure_local_schema_compatibility()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend FastAPI server for Golden Ride Taxi Application",
    version="1.0.0"
)

# Setup tracing middleware
setup_middleware(app)

# Register custom exception handlers
register_exception_handlers(app)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Files folder for document file access
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=settings.UPLOAD_DIR), name="static")

# Include Routers with standard /api namespace
app.include_router(auth.router, prefix="/api")
app.include_router(driver.router, prefix="/api")
app.include_router(rides.router, prefix="/api")
app.include_router(messages.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(user.router, prefix="/api")
app.include_router(content.router, prefix="/api")
app.include_router(stripe_router.router, prefix="/api")
app.include_router(admin_auth.router, prefix="/api")
app.include_router(admin.router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }

@app.websocket("/ws/driver/{driver_id}")
async def websocket_driver_endpoint(websocket: WebSocket, driver_id: int):
    # Retrieve auth token from query params for verification
    token = websocket.query_params.get("token")
    if token:
        try:
            import jwt
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            sub = payload.get("sub")
            role = payload.get("role")
            if str(sub) != str(driver_id) or role != "driver":
                logger.warning(f"WS Auth failed for driver {driver_id}: claims mismatch")
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return
        except Exception as e:
            logger.warning(f"WS Auth failed for driver {driver_id}: {e}")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    await manager.connect_driver(driver_id, websocket)

    # Check for pending rides if driver is already online but just re-connected
    from app.database import SessionLocal
    from app.repositories.driver_repository import DriverRepository
    from app.services.dispatch_service import DispatchService
    db = SessionLocal()
    try:
        driver = DriverRepository.get_by_id(db, driver_id)
        if driver and driver.is_online:
            await DispatchService.dispatch_pending_rides_to_driver(db, driver)
    finally:
        db.close()

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                elif msg.get("type") == "location_update":
                    lat = msg.get("latitude")
                    lng = msg.get("longitude")
                    if lat is not None and lng is not None:
                        db = SessionLocal()
                        try:
                            driver = DriverRepository.get_by_id(db, driver_id)
                            if driver:
                                DriverRepository.update_location(db, driver, lat, lng)
                        finally:
                            db.close()
            except Exception as e:
                logger.error(f"Error handling driver websocket message: {e}")
    except WebSocketDisconnect:
        manager.disconnect_driver(driver_id)

@app.websocket("/ws/user/{user_id}")
async def websocket_user_endpoint(websocket: WebSocket, user_id: int):
    token = websocket.query_params.get("token")
    if token:
        try:
            import jwt
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            sub = payload.get("sub")
            role = payload.get("role")
            if str(sub) != str(user_id) or role != "user":
                logger.warning(f"WS Auth failed for user {user_id}: claims mismatch")
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return
        except Exception as e:
            logger.warning(f"WS Auth failed for user {user_id}: {e}")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    await manager.connect_user(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except Exception as e:
                logger.error(f"Error handling user websocket message: {e}")
    except WebSocketDisconnect:
        manager.disconnect_user(user_id)
