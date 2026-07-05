import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MainShellScreen from "../screens/main/MainShellScreen";
import TrackRideScreen from "../screens/main/TrackRideScreen";
import TripDetailScreen from "../screens/main/TripDetailScreen";
import ApiConsoleScreen from "../screens/main/ApiConsoleScreen";

export type MainStackParamList = {
  Shell: undefined;
  TrackRide: undefined;
  TripDetail: { tripId: string };
  ApiConsole: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainNavigator() {
  return (
    <Stack.Navigator id="main-stack" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Shell" component={MainShellScreen} />
      <Stack.Screen name="TrackRide" component={TrackRideScreen} />
      <Stack.Screen name="TripDetail" component={TripDetailScreen} />
      <Stack.Screen name="ApiConsole" component={ApiConsoleScreen} />
    </Stack.Navigator>
  );
}
