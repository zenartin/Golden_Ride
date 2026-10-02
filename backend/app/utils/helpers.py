import math
import uuid
import logging
import urllib.request
import urllib.parse
import json

logger = logging.getLogger("app")


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


def is_ride_eligible_for_destination_mode(
    driver_lat: float,
    driver_lng: float,
    dest_lat: float,
    dest_lng: float,
    pickup_lat: float,
    pickup_lng: float,
    dropoff_lat: float,
    dropoff_lng: float,
    max_detour_km: float = 5.0
) -> bool:
    """
    Evaluates if a ride request brings the driver closer to their specified destination mode target.
    """
    if any(v is None for v in [driver_lat, driver_lng, dest_lat, dest_lng, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng]):
        return False

    dist_driver_to_dest = calculate_distance(driver_lat, driver_lng, dest_lat, dest_lng)
    dist_pickup_to_dest = calculate_distance(pickup_lat, pickup_lng, dest_lat, dest_lng)
    dist_dropoff_to_dest = calculate_distance(dropoff_lat, dropoff_lng, dest_lat, dest_lng)
    dist_pickup_to_dropoff = calculate_distance(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng)
    dist_driver_to_pickup = calculate_distance(driver_lat, driver_lng, pickup_lat, pickup_lng)

    # 1. Dropoff must bring driver closer to destination than driver's starting point (with 1.0 km tolerance)
    if dist_dropoff_to_dest > (dist_driver_to_dest + 1.0):
        return False

    # 2. Ride must move towards destination (dropoff closer to dest than pickup)
    if dist_dropoff_to_dest >= dist_pickup_to_dest:
        return False

    # 3. Detour check (total ride path vs direct distance to dest)
    base_distance = dist_driver_to_dest
    ride_path_distance = dist_driver_to_pickup + dist_pickup_to_dropoff + dist_dropoff_to_dest
    detour = ride_path_distance - base_distance

    if detour > max_detour_km:
        return False

    return True


def generate_uuid() -> str:
    return str(uuid.uuid4())

