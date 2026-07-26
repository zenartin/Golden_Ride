import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MainShellScreen from "../screens/main/MainShellScreen";
import TrackRideScreen from "../screens/main/TrackRideScreen";
import TripDetailScreen from "../screens/main/TripDetailScreen";
import ChatScreen from "../screens/main/ChatScreen";
import LocationPickerScreen from "../screens/main/LocationPickerScreen";
import { GeocodedPlace } from "../services/geocoding";
import ContentScreen from "../screens/settings/ContentScreen";
import EditProfileScreen from "../screens/settings/EditProfileScreen";
import SavedLocationsScreen from "../screens/settings/SavedLocationsScreen";
import PaymentMethodsScreen from "../screens/settings/PaymentMethodsScreen";
import PaymentScreen from "../screens/main/PaymentScreen";
import RatingScreen from "../screens/main/RatingScreen";

export type MainStackParamList = {
  Shell: { pickedLocation?: { mode: "pickup" | "dropoff"; place: GeocodedPlace } } | undefined;
  TrackRide: undefined;
  TripDetail: { tripId: string };
  Chat: { rideId: string };
  LocationPicker: { mode: "pickup" | "dropoff" };
  Content: { slug: string; title: string };
  EditProfile: undefined;
  SavedLocations: undefined;
  PaymentMethods: undefined;
  Payment: { tripId: string };
  Rating: { tripId: string };
  ApiConsole: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainNavigator() {
  return (
    <Stack.Navigator id="main-stack" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Shell" component={MainShellScreen} />
      <Stack.Screen name="TrackRide" component={TrackRideScreen} />
      <Stack.Screen name="TripDetail" component={TripDetailScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen
        name="LocationPicker"
        component={LocationPickerScreen}
        options={{ animation: "slide_from_bottom" }}
      />
      <Stack.Screen name="Content" component={ContentScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="SavedLocations" component={SavedLocationsScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="Rating" component={RatingScreen} options={{ animation: "slide_from_bottom" }} />
    </Stack.Navigator>
  );
}
