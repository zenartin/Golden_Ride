import { Alert, AppState } from "react-native";
import { navigationRef } from "../navigation/navigationRef";

/** Shows a system notification (or in-app alert fallback) for an incoming chat message. */
export async function notifyIncomingMessage(m: any) {
  const rideId = m?.ride_id;
  const route = navigationRef?.isReady?.() ? navigationRef.getCurrentRoute() : null;
  if (
    AppState.currentState === "active" &&
    route?.name === "Chat" &&
    String((route.params as any)?.rideId) === String(rideId)
  ) {
    return;
  }
  try {
    const Notifications = require("expo-notifications");
    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
    });
    const perm = await Notifications.getPermissionsAsync();
    if (perm.status !== "granted") await Notifications.requestPermissionsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "New message from driver",
        body: m?.content || "You have a new message",
        sound: "default",
        data: { type: "chat_message", rideId },
      },
      trigger: null,
    });
  } catch (e) {
    Alert.alert("New message from driver", m?.content || "You have a new message");
  }
}
