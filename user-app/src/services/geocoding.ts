/**
 * Nominatim geocoding service (OpenStreetMap) — free, no API key required.
 * Works globally: India, USA, Europe, etc.
 */

export interface GeocodedPlace {
  placeId: string;
  displayName: string;
  shortName: string;
  lat: number;
  lon: number;
  type: string;
}

const BASE_URL = "https://nominatim.openstreetmap.org";

/** Search for places matching a text query */
export async function searchPlaces(query: string, limit = 6): Promise<GeocodedPlace[]> {
  if (!query.trim() || query.trim().length < 2) return [];
  const params = new URLSearchParams({
    q: query.trim(),
    format: "json",
    limit: String(limit),
    addressdetails: "1",
  });
  const url = `${BASE_URL}/search?${params}`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "GoldenRideApp/1.0 (noreply@goldenride.app)" },
  });
  if (!resp.ok) return [];
  const data: any[] = await resp.json();
  return data.map((item) => ({
    placeId: String(item.place_id),
    displayName: item.display_name,
    shortName: buildShortName(item),
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    type: item.type || item.class || "place",
  }));
}

/** Reverse-geocode coordinates to a place name */
export async function reverseGeocode(lat: number, lon: number): Promise<GeocodedPlace | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: "json",
    addressdetails: "1",
  });
  const url = `${BASE_URL}/reverse?${params}`;
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "GoldenRideApp/1.0 (noreply@goldenride.app)" },
    });
    if (!resp.ok) return null;
    const item: any = await resp.json();
    if (!item || item.error) return null;
    return {
      placeId: String(item.place_id),
      displayName: item.display_name,
      shortName: buildShortName(item),
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      type: item.type || "place",
    };
  } catch {
    return null;
  }
}

function buildShortName(item: any): string {
  const addr = item.address || {};
  // Prefer road + city/town/state
  const parts = [
    addr.road || addr.pedestrian || addr.path,
    addr.suburb || addr.neighbourhood,
    addr.city || addr.town || addr.village || addr.county,
    addr.state,
    addr.country,
  ].filter(Boolean);
  if (parts.length > 0) return parts.slice(0, 3).join(", ");
  return item.display_name?.split(",").slice(0, 2).join(", ") || "Unknown location";
}
