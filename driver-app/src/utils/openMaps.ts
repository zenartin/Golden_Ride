import { Alert, Linking, Platform } from "react-native";
import { getCurrentDeviceLocation } from "./deviceLocation";

interface OpenLocationOptions {
  latitude?: number | null;
  longitude?: number | null;
  label?: string;
  query?: string;
}

interface OpenDirectionsOptions {
  destination: string;
}

const encode = (value: string) => encodeURIComponent(value);

const openUrlWithFallback = async (primaryUrl: string, fallbackUrl: string) => {
  try {
    const supported = await Linking.canOpenURL(primaryUrl);
    await Linking.openURL(supported ? primaryUrl : fallbackUrl);
  } catch {
    try {
      await Linking.openURL(fallbackUrl);
    } catch {
      Alert.alert("Map unavailable", "Unable to open a map app on this device.");
    }
  }
};

export const openLocationInMaps = async ({
  latitude,
  longitude,
  label = "Current location",
  query,
}: OpenLocationOptions) => {
  const hasCoordinates =
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude);

  const locationQuery = hasCoordinates
    ? `${latitude},${longitude}`
    : query?.trim() || label;

  const encodedLabel = encode(label);
  const encodedQuery = encode(locationQuery);
  const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;

  if (Platform.OS === "ios") {
    const iosUrl = hasCoordinates
      ? `maps://?ll=${latitude},${longitude}&q=${encodedLabel}`
      : `maps://?q=${encodedQuery}`;
    await openUrlWithFallback(iosUrl, fallbackUrl);
    return;
  }

  if (Platform.OS === "android") {
    const androidUrl = hasCoordinates
      ? `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodedLabel})`
      : `geo:0,0?q=${encodedQuery}`;
    await openUrlWithFallback(androidUrl, fallbackUrl);
    return;
  }

  await Linking.openURL(fallbackUrl);
};

export const openDirectionsInMaps = async ({ destination }: OpenDirectionsOptions) => {
  const trimmedDestination = destination.trim();
  if (!trimmedDestination) {
    Alert.alert("Destination unavailable", "There is no destination to open in maps.");
    return;
  }

  const encodedDestination = encode(trimmedDestination);
  const currentLocation = await getCurrentDeviceLocation();
  const originParam = currentLocation
    ? `&origin=${currentLocation.latitude},${currentLocation.longitude}`
    : "";
  const fallbackUrl = `https://www.google.com/maps/dir/?api=1${originParam}&destination=${encodedDestination}`;

  if (Platform.OS === "ios") {
    const iosUrl = currentLocation
      ? `maps://?saddr=${currentLocation.latitude},${currentLocation.longitude}&daddr=${encodedDestination}`
      : `maps://?daddr=${encodedDestination}`;
    await openUrlWithFallback(iosUrl, fallbackUrl);
    return;
  }

  if (Platform.OS === "android") {
    await openUrlWithFallback(`google.navigation:q=${encodedDestination}`, fallbackUrl);
    return;
  }

  await Linking.openURL(fallbackUrl);
};
