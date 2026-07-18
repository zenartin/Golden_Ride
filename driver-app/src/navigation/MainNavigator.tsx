import React, { useEffect } from "react";
import { AppState } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useRideStore } from "../store/rideStore";

import DriverTabNavigator from "./DriverTabNavigator";
import RideRequestScreen from "../features/rides/screens/RideRequestScreen";
import ActiveRideScreen from "../features/rides/screens/ActiveRideScreen";
import TripDetailScreen from "../features/rides/screens/TripDetailScreen";
import NotificationsScreen from "../features/home/screens/NotificationsScreen";
import SettingsScreen from "../features/profile/screens/SettingsScreen";
import SupportScreen from "../features/profile/screens/SupportScreen";
import EditProfileScreen from "../features/profile/screens/EditProfileScreen";
import ChatDetailScreen from "../features/home/screens/ChatDetailScreen";
import CompleteProfileScreen from "../features/profile/screens/CompleteProfileScreen";

const Stack = createNativeStackNavigator();

export default function MainNavigator() {
  const fetchIncomingRequests = useRideStore((s) => s.fetchIncomingRequests);

  useEffect(() => {
    // Initial fetch when navigator mounts
    fetchIncomingRequests().catch(() => undefined);

    // Global listener for foregrounding the app
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        fetchIncomingRequests().catch(() => undefined);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DriverDashboard" component={DriverTabNavigator} />
      <Stack.Screen
        name="RideRequest"
        component={RideRequestScreen}
        options={{ presentation: "transparentModal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen name="ActiveRide" component={ActiveRideScreen} />
      <Stack.Screen name="TripDetail" component={TripDetailScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
      <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
    </Stack.Navigator>
  );
}
