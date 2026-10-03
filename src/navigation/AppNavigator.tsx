import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { RegistrationProvider } from "../features/auth/screens/Register/RegistrationContext";
import AuthNavigator from "./AuthNavigator";
import MainNavigator from "./MainNavigator";
import CompleteProfileScreen from "../features/profile/screens/CompleteProfileScreen";
import { useAuthStore } from "../store/authStore";
import { useEffect, useState, useRef } from "react";
import { AppState, AppStateStatus, View, StyleSheet, Platform } from "react-native";
import { navigationRef } from "./navigationRef";
import { connectDriverWebSocket, disconnectDriverWebSocket } from "../services/websocket";
import NetInfo from "@react-native-community/netinfo";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import GifSplashScreen from "../screens/GifSplashScreen";
import * as Notifications from "expo-notifications";
import { Audio } from "expo-av";
import apiClient from "../api/axios";
import { API_ENDPOINTS } from "../api/endpoints";


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function AppNavigator() {
  const initialize = useAuthStore((s) => s.initialize);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const driver = useAuthStore((s) => s.driver);
  const token = useAuthStore((s) => s.token);
  const [ready, setReady] = useState(false);

  // Track whether the GIF splash has finished playing
  const [gifDone, setGifDone] = useState(false);

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

  // Handle push notifications and ringtone
  useEffect(() => {
    let soundObj: Audio.Sound | null = null;

    async function setupPush() {
      if (!isAuthenticated || !token) return;
      
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') return;

      // Set up Android Channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('trip_requests', {
          name: 'Trip Requests',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'trip_request.wav' // Refers to the audio asset
        });
      }

      // Get token and send to backend
      try {
        const pushTokenData = await Notifications.getExpoPushTokenAsync();
        const pushToken = pushTokenData.data;
        apiClient.post(API_ENDPOINTS.DEVICE_TOKEN, {
          token: pushToken,
          platform: Platform.OS
        }).catch(err => console.log("Failed to register token:", err));
      } catch (e) {
        console.log("Push token error:", e);
      }
    }

    setupPush();

    // Foreground notification handler
    const notificationListener = Notifications.addNotificationReceivedListener(async notification => {
      const data = notification.request.content.data;
      if (data?.type === 'new_ride') {
        // Play looping ringtone
        try {
          if (soundObj) {
            await soundObj.unloadAsync();
          }
          const { sound } = await Audio.Sound.createAsync(
            require('../../assets/sounds/trip_request.wav'),
            { isLooping: true }
          );
          soundObj = sound;
          await soundObj.playAsync();
          
          // Auto stop after 15s to match backend
          setTimeout(async () => {
            if (soundObj) {
              await soundObj.stopAsync();
              await soundObj.unloadAsync();
              soundObj = null;
            }
          }, 15000);
        } catch (e) {
          console.log("Error playing ringtone:", e);
        }
      }
    });

    // Handle user tapping notification or response
    const responseListener = Notifications.addNotificationResponseReceivedListener(async response => {
      // Stop sound if it's playing
      if (soundObj) {
        await soundObj.stopAsync();
        await soundObj.unloadAsync();
        soundObj = null;
      }
    });

    return () => {
      if (notificationListener) notificationListener.remove();
      if (responseListener) responseListener.remove();
      if (soundObj) {
        soundObj.unloadAsync();
      }
    };
  }, [isAuthenticated, token]);

  // Show GIF splash until BOTH: GIF has played AND auth is ready
  const showSplash = !gifDone || !ready;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.root}>
        {/* Main app renders underneath — pre-loads while GIF plays */}
        {ready && (
          <RegistrationProvider>
            <NavigationContainer ref={navigationRef}>
              {!isAuthenticated ? (
                <AuthNavigator />
              ) : (
                <MainNavigator />
              )}
            </NavigationContainer>
          </RegistrationProvider>
        )}

        {/* GIF Splash overlays on top until done */}
        {showSplash && (
          <GifSplashScreen onFinish={() => setGifDone(true)} />
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});