import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
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

  // Track whether the GIF splash has finished playing
  const [gifDone, setGifDone] = useState(false);

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
      if (state.isConnected && isAuthenticated && user && user.id != null && token) {
        connectUserWebSocket(user.id, token);
      }
    });
    return () => unsubscribe();
  }, [isAuthenticated, user?.id, token]);

  // Show GIF splash until BOTH: GIF has played AND auth has finished loading
  const showSplash = !gifDone || isLoading;

  return (
    <View style={styles.root}>
      {/* Main app renders underneath — pre-loads while GIF plays */}
      {!isLoading && (
        <Stack.Navigator id="root-stack" screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <Stack.Screen name="Main" component={MainNavigator} />
          ) : (
            <Stack.Screen name="Auth" component={AuthNavigator} />
          )}
        </Stack.Navigator>
      )}

      {/* GIF Splash overlays on top until done */}
      {showSplash && (
        <SplashScreen onFinish={() => setGifDone(true)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

