export async function getRoutePolyline(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number
): Promise<{ latitude: number; longitude: number }[]> {
  try {
    // OSRM expects coordinates in longitude,latitude format
    const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.routes && data.routes.length > 0) {
      const geometry = data.routes[0].geometry;
      // GeoJSON coordinates are [longitude, latitude]
      return geometry.coordinates.map((coord: [number, number]) => ({
        latitude: coord[1],
        longitude: coord[0],
      }));
    }
    return [];
  } catch (error) {
    console.log("Error fetching route polyline:", error);
    return [];
  }
}
