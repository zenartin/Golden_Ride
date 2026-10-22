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
import GiftCardsScreen from "../screens/main/GiftCardsScreen";
import { SafetyHubScreen } from "../screens/safety/SafetyHubScreen";
import { EmergencyContactsScreen } from "../screens/safety/EmergencyContactsScreen";
import { FamilyDashboardScreen } from "../features/family/screens/FamilyDashboardScreen";
import { InviteMembersScreen } from "../features/family/screens/InviteMembersScreen";

export type MainStackParamList = {
  Shell: { tab?: string; screen?: string; pickedLocation?: { mode: "pickup" | "dropoff"; place: GeocodedPlace } } | undefined;
  TrackRide: undefined;
  TripDetail: { tripId: string };
  Chat: { rideId: string };
  LocationPicker: { mode: "pickup" | "dropoff"; editRideId?: number };
  Content: { slug: string; title: string };
  EditProfile: undefined;
  SavedLocations: undefined;
  PaymentMethods: undefined;
  Payment: { tripId: string };
  Rating: { tripId: string };
  ApiConsole: undefined;
  SafetyHub: undefined;
  EmergencyContacts: undefined;
  FamilyDashboard: undefined;
  InviteFamilyMember: undefined;
  GiftCards: undefined;
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
      <Stack.Screen name="SafetyHub" component={SafetyHubScreen as any} />
      <Stack.Screen name="EmergencyContacts" component={EmergencyContactsScreen as any} />
      <Stack.Screen name="FamilyDashboard" component={FamilyDashboardScreen as any} />
      <Stack.Screen name="InviteFamilyMember" component={InviteMembersScreen as any} />
      <Stack.Screen name="Rating" component={RatingScreen} options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="GiftCards" component={GiftCardsScreen} options={{ animation: "slide_from_right" }} />
    </Stack.Navigator>
  );
}
