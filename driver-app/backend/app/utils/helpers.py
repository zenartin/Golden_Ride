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
        with urllib.request.urlopen(req, timeout=5) as resp:
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


def generate_uuid() -> str:
    return str(uuid.uuid4())
