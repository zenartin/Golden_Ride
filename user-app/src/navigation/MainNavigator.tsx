import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MainShellScreen from "../screens/main/MainShellScreen";
import TrackRideScreen from "../screens/main/TrackRideScreen";
import TripDetailScreen from "../screens/main/TripDetailScreen";
import ChatScreen from "../screens/main/ChatScreen";
import ApiConsoleScreen from "../screens/main/ApiConsoleScreen";
import LocationPickerScreen from "../screens/main/LocationPickerScreen";
import { GeocodedPlace } from "../services/geocoding";

export type MainStackParamList = {
  Shell: { pickedLocation?: { mode: "pickup" | "dropoff"; place: GeocodedPlace } } | undefined;
  TrackRide: undefined;
  TripDetail: { tripId: string };
  Chat: { rideId: string };
  ApiConsole: undefined;
  LocationPicker: { mode: "pickup" | "dropoff" };
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainNavigator() {
  return (
    <Stack.Navigator id="main-stack" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Shell" component={MainShellScreen} />
      <Stack.Screen name="TrackRide" component={TrackRideScreen} />
      <Stack.Screen name="TripDetail" component={TripDetailScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="ApiConsole" component={ApiConsoleScreen} />
      <Stack.Screen
        name="LocationPicker"
        component={LocationPickerScreen}
        options={{ animation: "slide_from_bottom" }}
      />
    </Stack.Navigator>
  );
}
