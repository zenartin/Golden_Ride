import math
import uuid
import logging
import urllib.request
import urllib.parse
import json
from typing import Optional

logger = logging.getLogger("app")


def format_duration(duration_min: int) -> str:
    """Format duration in minutes to hours and minutes string."""
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


def is_ride_eligible_for_destination_mode(
    driver_lat: Optional[float],
    driver_lng: Optional[float],
    dest_lat: float,
    dest_lng: float,
    pickup_lat: float,
    pickup_lng: float,
    dropoff_lat: float,
    dropoff_lng: float,
    max_detour_km: float = 15.0
) -> bool:
    """
    Evaluates if a ride request brings the driver closer to their specified destination mode target.
    """
    if dest_lat is None or dest_lng is None or pickup_lat is None or pickup_lng is None or dropoff_lat is None or dropoff_lng is None:
        return True

    # Fallback driver position to pickup if missing
    if driver_lat is None or driver_lng is None:
        driver_lat = pickup_lat
        driver_lng = pickup_lng

    dist_driver_to_dest = calculate_distance(driver_lat, driver_lng, dest_lat, dest_lng)
    dist_pickup_to_dest = calculate_distance(pickup_lat, pickup_lng, dest_lat, dest_lng)
    dist_dropoff_to_dest = calculate_distance(dropoff_lat, dropoff_lng, dest_lat, dest_lng)
    dist_pickup_to_dropoff = calculate_distance(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng)
    dist_driver_to_pickup = calculate_distance(driver_lat, driver_lng, pickup_lat, pickup_lng)

    # 1. Dropoff must bring driver closer to destination than where they started (with 3.0 km urban tolerance)
    if dist_dropoff_to_dest > (dist_driver_to_dest + 3.0):
        return False

    # 2. Dropoff must not be significantly further from destination than pickup (allow 2.0 km tolerance for winding roads)
    if dist_dropoff_to_dest > (dist_pickup_to_dest + 2.0):
        return False

    # 3. Detour check (total path vs direct distance to destination)
    base_distance = dist_driver_to_dest
    ride_path_distance = dist_driver_to_pickup + dist_pickup_to_dropoff + dist_dropoff_to_dest
    detour = ride_path_distance - base_distance

    # Allow a dynamic max detour for long trips (e.g. 20% of base distance)
    dynamic_max_detour = max(max_detour_km, base_distance * 0.2)
    
    if detour > dynamic_max_detour:
        return False

    return True


def generate_uuid() -> str:
    return str(uuid.uuid4())

