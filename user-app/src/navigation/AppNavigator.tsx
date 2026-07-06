import React, { useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuthStore } from "../store/authStore";
import AuthNavigator from "./AuthNavigator";
import MainNavigator from "./MainNavigator";
import SplashScreen from "../screens/auth/SplashScreen";
import { connectUserWebSocket, disconnectUserWebSocket } from "../services/websocket";
import NetInfo from "@react-native-community/netinfo";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const initialize = useAuthStore((state) => state.initialize);
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isAuthenticated && user && user.id != null && token) {
      connectUserWebSocket(user.id, token);
    } else {
      disconnectUserWebSocket();
    }
  }, [isAuthenticated, user?.id, token]);

  // Monitor network connectivity changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      console.log("User App network connectivity changed:", state.isConnected);
      if (state.isConnected && isAuthenticated && user && user.id != null && token) {
        // Reconnect user WebSocket on network recovery
        connectUserWebSocket(user.id, token);
      }
    });
    return () => unsubscribe();
  }, [isAuthenticated, user?.id, token]);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator id="root-stack" screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}
