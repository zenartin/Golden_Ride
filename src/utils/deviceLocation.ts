import * as Location from "expo-location";

export interface DeviceCoords {
  latitude: number;
  longitude: number;
}

export const getCurrentDeviceLocation = async (): Promise<DeviceCoords | null> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return null;
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    const lastKnown = await Location.getLastKnownPositionAsync();

    if (lastKnown) {
      return {
        latitude: lastKnown.coords.latitude,
        longitude: lastKnown.coords.longitude,
      };
    }

    if (!servicesEnabled) {
      return null;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch (error) {
    console.log("Device location error:", error);
    try {
      const fallback = await Location.getLastKnownPositionAsync();
      if (fallback) {
        return {
          latitude: fallback.coords.latitude,
          longitude: fallback.coords.longitude,
        };
      }
    } catch (fallbackError) {
      console.log("Last known location error:", fallbackError);
    }
    return null;
  }
};
