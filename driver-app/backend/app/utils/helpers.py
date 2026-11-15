import math
import uuid
import logging
import urllib.request
import urllib.parse
import json
from typing import Optional

logger = logging.getLogger("app")


def parse_duration_minutes(value) -> int:
    """Parse '600 min', '1 hr 5 min', or a number into total minutes."""
    import re
    if isinstance(value, (int, float)):
        return int(value)
    text = str(value or "0").lower()
    hrs = re.search(r"(\d+)\s*(?:h|hr|hrs|hour|hours)\b", text)
    mins = re.search(r"(\d+)\s*(?:m|min|mins|minute|minutes)\b", text)
    if hrs or mins:
        return int(hrs.group(1) if hrs else 0) * 60 + int(mins.group(1) if mins else 0)
    num = re.search(r"\d+", text)
    return int(num.group(0)) if num else 0


def format_duration(duration_min: int) -> str:
    """Format duration in minutes to hours and minutes string."""
    duration_min = parse_duration_minutes(duration_min)
    if duration_min < 60:
        return f"{duration_min} min"
    
    hours = duration_min // 60
    mins = duration_min % 60
    if mins == 0:
        return f"{hours} hr"
    return f"{hours} hr {mins} min"


def calculate_distance_haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the straight-line distance between two coordinates using the Haversine formula.
    Returns distance in kilometers.
    """
    if not all([lat1, lon1, lat2, lon2]):
        return 0.0
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    return round(c * 6371, 2)


def get_osrm_route(lat1: float, lon1: float, lat2: float, lon2: float) -> dict:
    """
    Get real road distance and duration from OSRM public API.
    Works globally (USA, India, Europe, etc.) — completely free, no API key.
    Returns: { "distance_km": float, "duration_min": int }
    Falls back to haversine estimate on any error.
    """
    try:
        # OSRM expects lon,lat order
        url = (
            f"http://router.project-osrm.org/route/v1/driving/"
            f"{lon1},{lat1};{lon2},{lat2}"
            f"?overview=false&steps=false"
        )
        req = urllib.request.Request(url, headers={"User-Agent": "GoldenRideApp/1.0"})
        with urllib.request.urlopen(req, timeout=1) as resp:
            data = json.loads(resp.read().decode())

        if data.get("code") == "Ok" and data.get("routes"):
            route = data["routes"][0]
            distance_m = route["distance"]       # metres
            duration_s = route["duration"]       # seconds
            distance_km = round(distance_m / 1000, 2)
            duration_min = max(1, round(duration_s / 60))
            logger.info(f"OSRM route: {distance_km} km, {duration_min} min")
            return {"distance_km": distance_km, "duration_min": duration_min}
    except Exception as e:
        logger.warning(f"OSRM routing failed, using haversine fallback: {e}")

    # Haversine fallback with 1.35× road factor (accounts for non-straight roads)
    straight = calculate_distance_haversine(lat1, lon1, lat2, lon2)
    distance_km = round(straight * 1.35, 2)
    duration_min = max(5, round(distance_km * 3))
    return {"distance_km": distance_km, "duration_min": duration_min}


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Legacy compatibility — returns km using haversine."""
    return calculate_distance_haversine(lat1, lon1, lat2, lon2)


def is_vehicle_class_compatible(driver_vehicle_type: str, ride_class: str, accepted_ride_classes: Optional[str] = None) -> bool:
    """
    Check if a driver's vehicle type can accept a given ride class.
    Handles cross-naming (e.g. sedan vs comfort vs hatchback vs xuv).
    """
    # 1. Strict Filter check: If driver specified accepted classes, STRICTLY enforce them.
    if accepted_ride_classes:
        allowed = [x.strip().lower() for x in accepted_ride_classes.split(",") if x.strip()]
        if allowed:
            # Check if the requested ride class is exactly one of the allowed classes
            return str(ride_class).lower().strip() in allowed

    # 2. No filter check: Fallback to checking vehicle_type against ride_class.
    if not driver_vehicle_type or not ride_class:
        return True

    d = str(driver_vehicle_type).lower().strip()
    r = str(ride_class).lower().strip()

    if d == r:
        return True

    # Check for direct inclusion since "golden ride suv" contains "suv"
    if d in r or r in d:
        return True

    # Strict family fallback logic: do not group van and suv together unless strictly needed.
    # Group only identical categories.
    economy_family = {"hatchback", "economy", "golden ride economy", "ridex", "golden ridex"}
    comfort_family = {"sedan", "comfort", "golden ride comfort", "golden ride sedan"}
    suv_family = {"suv", "xuv", "golden ride suv", "ridexl", "golden ridexl"}
    van_family = {"van", "golden ride van"}
    pet_family = {"pet", "golden ride pet"}

    if d in suv_family and r in suv_family: return True
    if d in van_family and r in van_family: return True
    if d in comfort_family and r in comfort_family: return True
    if d in economy_family and r in economy_family: return True
    if d in pet_family and r in pet_family: return True

    return False  # If it doesn't match the families and strict filter wasn't met, deny.


# Driver radius filter (5 km / 10 km / all): the pickup must be within the chosen distance of the
# driver's CURRENT location. The location must be recent, otherwise we cannot tell where the driver is.
LOCATION_MAX_AGE_SECONDS = 600


def driver_location_is_fresh(driver) -> bool:
    ts = getattr(driver, "location_updated_at", None)
    if ts is None or driver.latitude is None or driver.longitude is None:
        return False
    from datetime import datetime
    return (datetime.utcnow() - ts).total_seconds() <= LOCATION_MAX_AGE_SECONDS


def is_pickup_within_driver_radius(driver, ride) -> bool:
    """True when the driver has no radius filter, or the ride's pickup is within it."""
    radius = getattr(driver, "radius_filter", 0) or 0
    if radius <= 0:
        return True
    if ride.pickup_latitude is None or ride.pickup_longitude is None:
        return True  # nothing to measure against
    if not driver_location_is_fresh(driver):
        return False  # cannot confirm the pickup is close, so do not offer it
    return calculate_distance(driver.latitude, driver.longitude, ride.pickup_latitude, ride.pickup_longitude) <= radius


# Destination mode tuning (km)
DEST_NEAR_KM = 10.0          # a trip ending this close to the driver's destination always qualifies
DEST_MIN_PROGRESS_KM = 1.0   # an "on the way" trip must end at least this much closer to the destination than it starts
DEST_PICKUP_NEAR_KM = 6.0    # a trip starting this close to the destination also qualifies when it ends near it
DEST_MAX_DETOUR_KM = 15.0


def is_ride_eligible_for_destination_mode(
    driver_lat: Optional[float],
    driver_lng: Optional[float],
    dest_lat: float,
    dest_lng: float,
    pickup_lat: float,
    pickup_lng: float,
    dropoff_lat: float,
    dropoff_lng: float,
    max_detour_km: float = DEST_MAX_DETOUR_KM
) -> bool:
    """
    Decide whether a ride suits a driver who has set a destination.

    A ride qualifies when either:
      1. It ends at or near the driver's destination (within DEST_NEAR_KM), wherever it starts; or
      2. It is on the way: it ends clearly closer to the destination than it started, and,
         when the driver's position is known and plausible, picking it up does not add much detour.
    """
    if None in (dest_lat, dest_lng, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng):
        return True  # cannot judge a ride without coordinates, so do not hide it

    dist_dropoff_to_dest = calculate_distance(dropoff_lat, dropoff_lng, dest_lat, dest_lng)
    dist_pickup_to_dest = calculate_distance(pickup_lat, pickup_lng, dest_lat, dest_lng)

    # 1. Ends at / near the destination: always a match
    if dist_dropoff_to_dest <= DEST_NEAR_KM:
        return True

    # 2. On the way: must make real progress towards the destination
    if dist_dropoff_to_dest > dist_pickup_to_dest - DEST_MIN_PROGRESS_KM:
        return False

    # Detour check only when we have a believable driver position (a stale or default
    # position far from the pickup says nothing about where the driver is heading)
    if driver_lat is not None and driver_lng is not None:
        dist_driver_to_pickup = calculate_distance(driver_lat, driver_lng, pickup_lat, pickup_lng)
        dist_driver_to_dest = calculate_distance(driver_lat, driver_lng, dest_lat, dest_lng)
        dist_pickup_to_dropoff = calculate_distance(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng)
        # driver far from the pickup (>50 km) = unreliable position, skip the detour check
        if 0 < dist_driver_to_pickup <= 50:
            detour = dist_driver_to_pickup + dist_pickup_to_dropoff + dist_dropoff_to_dest - dist_driver_to_dest
            if detour > max(max_detour_km, dist_driver_to_dest * 0.25):
                return False

    return True


def generate_uuid() -> str:
    return str(uuid.uuid4())

