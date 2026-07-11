import React from "react";
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
import { StripeProvider } from '@stripe/stripe-react-native';
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter: Inter_400Regular,
    Inter_Medium: Inter_500Medium,
    Inter_SemiBold: Inter_600SemiBold,
    Inter_Bold: Inter_700Bold,
  });

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
      <StripeProvider publishableKey="pk_test_51Trvx45bQqcPvDPuw9gtgp8Eq8v4c3ZosreDd6kIJUbT9tSZuXZaNCQCZpS3cwvD52MHSLWECw0szH7CrcCzPGLP008SIKBBHg">
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
