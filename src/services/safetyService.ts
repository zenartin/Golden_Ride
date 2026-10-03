import * as Location from "expo-location";
import { Alert, Share, Linking } from "react-native";

export async function shareCurrentLocation() {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== "granted") {
      Alert.alert(
        "Location permission required",
        "Enable location access to share your current location."
      );
      return;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const { latitude, longitude } = location.coords;

    const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

    await Share.share({
      message: `I need assistance. My current location is: ${mapUrl}`,
      title: "Share emergency location",
    });
  } catch {
    Alert.alert(
      "Location unavailable",
      "Please check your GPS and try again."
    );
  }
}

export const callEmergencyServices = async () => {
  const phoneUrl = "tel:112";

  try {
    const supported = await Linking.canOpenURL(phoneUrl);

    if (supported) {
      await Linking.openURL(phoneUrl);
    } else {
      Alert.alert(
        "Unable to make a call",
        "Please dial 112 directly from your phone."
      );
    }
  } catch {
    Alert.alert(
      "Unable to make a call",
      "Please dial 112 directly from your phone."
    );
  }
};

export const callEmergencyContact = async (phoneNumber: string) => {
  if (!phoneNumber) {
    Alert.alert("Error", "Emergency contact number is missing.");
    return;
  }

  try {
    await Linking.openURL(`tel:${phoneNumber}`);
  } catch {
    Alert.alert(
      "Unable to call",
      "Please try calling the contact manually."
    );
  }
};
