import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from app.config import settings
from app.database import engine, Base
from app.models import driver, message, ride, user as user_model  # noqa: F401
from app.routers import auth, driver, messages, notifications, rides, user, stripe, razorpay

# Initialize Database tables if they do not exist
# In production, migrations (using Alembic) are used. 
# For rapid testing and sandbox delivery, direct metadata mapping is correct, modern, and reliable.
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
        }
        missing = [(name, sql_type) for name, sql_type in required_columns.items() if name not in existing]
        if missing:
            with engine.begin() as connection:
                for name, sql_type in missing:
                    connection.execute(text(f"ALTER TABLE rides ADD COLUMN {name} {sql_type}"))

    # --- users table ---
    if "users" in table_names:
        existing_users = {column["name"] for column in inspector.get_columns("users")}
        required_user_columns = {
            "stripe_customer_id": "VARCHAR",
            "country": "VARCHAR DEFAULT 'India'",
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
    description="Backend FastAPI server for Golden Ride User Mobile Application",
    version="1.0.0"
)

# Configure CORS Middleware
# Essential for React Native mobile client connections (since mobile apps run on localhost, web preview, or direct IPs)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Files folder for profile and support attachments.
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=settings.UPLOAD_DIR), name="static")

app.include_router(auth.router, prefix="/api")
app.include_router(user.router, prefix="/api")
app.include_router(driver.router, prefix="/api")
app.include_router(rides.router, prefix="/api")
app.include_router(messages.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(stripe.router, prefix="/api")
app.include_router(razorpay.router, prefix="/api")


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }
