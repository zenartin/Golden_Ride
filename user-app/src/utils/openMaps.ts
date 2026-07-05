import { Alert, Linking, Platform } from "react-native";
import { getCurrentDeviceLocation } from "./deviceLocation";

const encode = (value: string) => encodeURIComponent(value);

const openWithFallback = async (primaryUrl: string, fallbackUrl: string) => {
  try {
    const canOpen = await Linking.canOpenURL(primaryUrl);
    await Linking.openURL(canOpen ? primaryUrl : fallbackUrl);
  } catch {
    try {
      await Linking.openURL(fallbackUrl);
    } catch {
      Alert.alert("Map unavailable", "Unable to open maps on this device.");
    }
  }
};

export const openDirectionsInMaps = async (destination: string) => {
  const trimmed = destination.trim();
  if (!trimmed) return;

  const current = await getCurrentDeviceLocation();
  const encodedDestination = encode(trimmed);
  const originParam = current ? `&origin=${current.latitude},${current.longitude}` : "";
  const fallbackUrl = `https://www.google.com/maps/dir/?api=1${originParam}&destination=${encodedDestination}`;

  if (Platform.OS === "ios") {
    const iosUrl = current
      ? `maps://?saddr=${current.latitude},${current.longitude}&daddr=${encodedDestination}`
      : `maps://?daddr=${encodedDestination}`;
    await openWithFallback(iosUrl, fallbackUrl);
    return;
  }

  if (Platform.OS === "android") {
    const androidUrl = current
      ? `geo:${current.latitude},${current.longitude}?q=${encodedDestination}`
      : `geo:0,0?q=${encodedDestination}`;
    await openWithFallback(androidUrl, fallbackUrl);
    return;
  }

  await Linking.openURL(fallbackUrl);
};
