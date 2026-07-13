import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { RegistrationProvider } from "../features/auth/screens/Register/RegistrationContext";
import AuthNavigator from "./AuthNavigator";
import MainNavigator from "./MainNavigator";
import CompleteProfileScreen from "../features/profile/screens/CompleteProfileScreen";
import { useAuthStore } from "../store/authStore";
import { useEffect, useState, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { navigationRef } from "./navigationRef";
import { connectDriverWebSocket, disconnectDriverWebSocket } from "../services/websocket";
import NetInfo from "@react-native-community/netinfo";
import { createNativeStackNavigator } from "@react-navigation/native-stack";



export default function AppNavigator() {
  const initialize = useAuthStore((s) => s.initialize);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const driver = useAuthStore((s) => s.driver);
  const token = useAuthStore((s) => s.token);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Restore auth token on startup
    initialize().finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (isAuthenticated && driver && token) {
      connectDriverWebSocket(driver.id, token);
      // NOTE: Push token registration (expo-notifications) requires a development build.
      // expo-notifications remote push is NOT supported in Expo Go (SDK 53+).
    } else {
      disconnectDriverWebSocket();
    }
  }, [isAuthenticated, driver?.id, token]);

  // Monitor network connectivity and reconnect WebSocket on recovery
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && isAuthenticated && driver && token) {
        connectDriverWebSocket(driver.id, token);
      }
    });
    return () => unsubscribe();
  }, [isAuthenticated, driver?.id, token]);

  // Monitor AppState (foreground/background) to reconnect WebSocket
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (nextAppState === "active" && isAuthenticated && driver && token) {
        connectDriverWebSocket(driver.id, token);
      } else if (nextAppState === "background") {
        disconnectDriverWebSocket();
      }
    });
    return () => subscription.remove();
  }, [isAuthenticated, driver?.id, token]);

  if (!ready) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RegistrationProvider>
        <NavigationContainer ref={navigationRef}>
          {!isAuthenticated ? (
            <AuthNavigator />
          ) : (
            <MainNavigator />
          )}
        </NavigationContainer>
      </RegistrationProvider>
    </GestureHandlerRootView>
  );
}