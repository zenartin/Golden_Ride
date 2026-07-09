import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import DriverDashboard from "../features/auth/screens/driver/DriverDashboard";

export type DriverStackParamList = {
  DriverDashboard: undefined;
};

const Stack = createNativeStackNavigator<DriverStackParamList>();

export default function DriverNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="DriverDashboard"
        component={DriverDashboard}
      />
    </Stack.Navigator>
  );
}