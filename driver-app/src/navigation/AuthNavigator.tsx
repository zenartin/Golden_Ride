import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SplashScreen from "../features/auth/screens/SplashScreen";
import WelcomeScreen from "../features/auth/screens/WelcomeScreen";
import LoginScreen from "../features/auth/screens/LoginScreen";
import OtpScreen from "../features/auth/screens/OtpScreen";

import PersonalInfoScreen from "../features/auth/screens/Register/PersonalInfoScreen";



const Stack = createNativeStackNavigator<any>();

interface AppNavigatorInnerProps {
  initialRouteName?: string;
}

export default function AppNavigatorInner({ initialRouteName = "Splash" }: AppNavigatorInnerProps) {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      {/* ── Auth ── */}
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="OTP" component={OtpScreen} />

      {/* ── Registration ── */}
      <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
    </Stack.Navigator>
  );
}