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

const GOOGLE_PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY;

async function searchGooglePlaces(query: string, limit: number, bias?: { lat: number; lon: number }): Promise<GeocodedPlace[]> {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_PLACES_KEY as string,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.primaryType",
    },
    body: JSON.stringify({
      textQuery: query.trim(),
      maxResultCount: limit,
      regionCode: "US",
      ...(bias ? { locationBias: { circle: { center: { latitude: bias.lat, longitude: bias.lon }, radius: 50000 } } } : {}),
    }),
  });
  if (!response.ok) throw new Error(`Places search failed: ${response.status}`);
  const data = await response.json();
  return (data.places ?? []).map((p: any) => ({
    placeId: p.id,
    displayName: p.formattedAddress,
    shortName: p.displayName?.text ?? p.formattedAddress,
    lat: p.location.latitude,
    lon: p.location.longitude,
    type: p.primaryType ?? "place",
  }));
}

export async function searchPlaces(query: string, limit = 6, bias?: { lat: number; lon: number }): Promise<GeocodedPlace[]> {
  if (!query.trim() || query.trim().length < 2) return [];
  if (GOOGLE_PLACES_KEY) return searchGooglePlaces(query, limit, bias);
  const params = new URLSearchParams({
    q: query.trim(),
    limit: String(limit),
  });
  if (bias) {
    params.set("lat", String(bias.lat));
    params.set("lon", String(bias.lon));
    params.set("location_bias_scale", "0.5");
  }
  const url = `${BASE_URL}/api?${params}`;
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "GoldenRideApp/1.0 (noreply@goldenride.app)" },
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!data.features) return [];
    
    return data.features.map((item: any, index: number) => {
      const props = item.properties || {};
      const [lon, lat] = item.geometry?.coordinates || [0, 0];
      const parts = [props.name, props.street, props.city, props.state, props.country].filter(Boolean);
      return {
        placeId: props.osm_id ? `${props.osm_id}-${index}` : String(Math.random()),
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

export async function getRoutePolyline(startLat: number, startLon: number, endLat: number, endLon: number): Promise<{ latitude: number; longitude: number }[]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?geometries=geojson&overview=full`;
    const resp = await fetch(url);
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!data.routes || data.routes.length === 0) return [];
    
    // OSRM returns coordinates in [lon, lat] format
    const coordinates = data.routes[0].geometry.coordinates;
    return coordinates.map((coord: [number, number]) => ({
      latitude: coord[1],
      longitude: coord[0]
    }));
  } catch (err) {
    console.log("OSRM routing error:", err);
    return [];
  }
}
