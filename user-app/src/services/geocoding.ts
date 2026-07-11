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

const BASE_URL = "https://photon.komoot.io"; // Much faster OSM geocoder

export async function searchPlaces(query: string, limit = 6): Promise<GeocodedPlace[]> {
  if (!query.trim() || query.trim().length < 2) return [];
  const params = new URLSearchParams({
    q: query.trim(),
    limit: String(limit),
  });
  const url = `${BASE_URL}/api?${params}`;
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "GoldenRideApp/1.0 (noreply@goldenride.app)" },
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!data.features) return [];
    
    return data.features.map((item: any) => {
      const props = item.properties || {};
      const [lon, lat] = item.geometry?.coordinates || [0, 0];
      const parts = [props.name, props.street, props.city, props.state, props.country].filter(Boolean);
      return {
        placeId: String(props.osm_id || Math.random()),
        displayName: parts.join(", ") || "Unknown Location",
        shortName: props.name || props.street || parts[0] || "Unknown",
        lat,
        lon,
        type: props.osm_value || "place",
      };
    });
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<GeocodedPlace | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
  });
  const url = `${BASE_URL}/reverse?${params}`;
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "GoldenRideApp/1.0 (noreply@goldenride.app)" },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.features || data.features.length === 0) return null;
    
    const item = data.features[0];
    const props = item.properties || {};
    const [itemLon, itemLat] = item.geometry?.coordinates || [0, 0];
    const parts = [props.name, props.street, props.city, props.state, props.country].filter(Boolean);
    
    return {
      placeId: String(props.osm_id || Math.random()),
      displayName: parts.join(", ") || "Unknown Location",
      shortName: props.name || props.street || parts[0] || "Unknown",
      lat: itemLat,
      lon: itemLon,
      type: props.osm_value || "place",
    };
  } catch {
    return null;
  }
}
