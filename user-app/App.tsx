import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Text, TextInput } from "react-native";
import { 
  useFonts, 
  Inter_400Regular, 
  Inter_500Medium, 
  Inter_600SemiBold, 
  Inter_700Bold 
} from "@expo-google-fonts/inter";
import { navigationRef } from "./src/navigation/navigationRef";
import { StripeProvider } from "./src/utils/stripeWrapper";
import AppNavigator from "./src/navigation/AppNavigator";
import { BASE_URL } from "./src/api/client";

const DEFAULT_STRIPE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_51Trvx45bQqcPvDPuw9gtgp8Eq8v4c3ZosreDd6kIJUbT9tSZuXZaNCQCZpS3cwvD52MHSLWECw0szH7CrcCzPGLP008SIKBBHg";

export default function App() {
  const [stripePublishableKey, setStripePublishableKey] = useState<string>(DEFAULT_STRIPE_KEY);

  const [fontsLoaded] = useFonts({
    Inter: Inter_400Regular,
    Inter_Medium: Inter_500Medium,
    Inter_SemiBold: Inter_600SemiBold,
    Inter_Bold: Inter_700Bold,
  });

  useEffect(() => {
    // Fetch live or configured Stripe Publishable Key from backend
    const fetchStripeConfig = async () => {
      try {
        const response = await fetch(`${BASE_URL}/stripe/config`);
        if (response.ok) {
          const data = await response.json();
          if (data?.publishable_key) {
            setStripePublishableKey(data.publishable_key);
          }
        }
      } catch (err) {
        // Fallback to DEFAULT_STRIPE_KEY if backend config is unreachable
      }
    };
    fetchStripeConfig();
  }, []);

  if (fontsLoaded) {
    // @ts-ignore
    Text.defaultProps = Text.defaultProps || {};
    // @ts-ignore
    Text.defaultProps.style = [{ fontFamily: "Inter" }, Text.defaultProps.style];
    // @ts-ignore
    TextInput.defaultProps = TextInput.defaultProps || {};
    // @ts-ignore
    TextInput.defaultProps.style = [{ fontFamily: "Inter" }, TextInput.defaultProps.style];
  }

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeProvider publishableKey={stripePublishableKey}>
        <SafeAreaProvider>
          <NavigationContainer ref={navigationRef}>
            <StatusBar style="dark" />
            <AppNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </StripeProvider>
    </GestureHandlerRootView>
  );
}
