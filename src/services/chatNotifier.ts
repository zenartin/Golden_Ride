import * as Notifications from "expo-notifications";
import { AppState } from "react-native";
import { navigationRef } from "../navigation/navigationRef";

/** Shows a system notification for an incoming chat message (driver app). */
export async function notifyIncomingMessage(m: any) {
  try {
    const currentRoute = navigationRef.isReady() ? navigationRef.getCurrentRoute() : null;
    const rideId = m?.ride_id;
    // Skip if the driver is already looking at this conversation in the foreground
    if (
      AppState.currentState === "active" &&
      currentRoute?.name === "ChatDetail" &&
      String((currentRoute.params as any)?.rideId) === String(rideId)
    ) {
      return;
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: m?.is_support ? "Support Desk" : "New message from passenger",
        body: m?.content || "You have a new message",
        sound: "default",
        data: { type: "chat_message", rideId },
      },
      trigger: null,
    });
  } catch (e) {
    console.log("notifyIncomingMessage error:", e);
  }
}
