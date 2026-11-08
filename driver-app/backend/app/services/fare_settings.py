"""Fare rates the admin can edit (Settings > Fare Rates). Stored in app_settings; defaults match the original fares."""
import json
from typing import Any, Dict

from app.database import SessionLocal
from app.models.app_setting import AppSetting

MILE_KM = 1.609344

CLASS_KEYS = {
    "golden ride sedan": "mult_sedan",
    "golden ride suv": "mult_suv",
    "golden ride van": "mult_van",
    "golden ridex": "mult_x",
    "golden ridexl": "mult_xl",
    "golden ride pet": "mult_pet",
}

FARE_DEFAULTS: Dict[str, float] = {
    "base_fare": 1.50,
    "per_mile": 0.885,          # = $0.55 per km
    "per_minute": 0.15,
    "booking_fee": 1.50,
    "minimum_fare": 4.00,
    "mult_sedan": 1.0,
    "mult_suv": 1.5,
    "mult_van": 2.0,
    "mult_x": 1.2,
    "mult_xl": 2.5,
    "mult_pet": 1.3,
}


def get_fare_config(db=None) -> Dict[str, float]:
    """Current fare rates: admin values over the defaults. Pass an open session or let it open its own."""
    cfg = dict(FARE_DEFAULTS)
    own = db is None
    session = SessionLocal() if own else db
    try:
        for row in session.query(AppSetting).filter(AppSetting.key.in_(list(FARE_DEFAULTS))).all():
            try:
                value = float(json.loads(row.value))
                if value >= 0:
                    cfg[row.key] = value
            except Exception:
                pass
    finally:
        if own:
            session.close()
    return cfg


def class_multiplier(cfg: Dict[str, float], ride_class: str) -> float:
    return cfg.get(CLASS_KEYS.get((ride_class or "").lower(), ""), 1.0)


def breakdown(cfg: Dict[str, float], ride_class: str) -> Dict[str, Any]:
    """What the rider app shows under 'Fare breakdown'."""
    return {
        "base_fare": cfg["base_fare"],
        "per_mile": cfg["per_mile"],
        "per_minute": cfg["per_minute"],
        "booking_fee": cfg["booking_fee"],
        "minimum_fare": cfg["minimum_fare"],
        "ride_type_multiplier": class_multiplier(cfg, ride_class),
    }
