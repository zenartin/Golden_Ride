import React from 'react';
import "react-native-gesture-handler";
import { Text, TextInput, View, ScrollView } from "react-native";
import { 
  useFonts, 
  Inter_400Regular, 
  Inter_500Medium, 
  Inter_600SemiBold, 
  Inter_700Bold 
} from "@expo-google-fonts/inter";
import AppNavigator from "./src/navigation/AppNavigator";

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, padding: 20, paddingTop: 60, backgroundColor: 'white' }}>
          <Text style={{ fontSize: 20, color: 'red', fontWeight: 'bold' }}>App Crashed!</Text>
          <ScrollView style={{ marginTop: 20 }}>
            <Text style={{ color: 'black' }}>{String(this.state.error)}</Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

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
    <ErrorBoundary>
      <AppNavigator />
    </ErrorBoundary>
  );
}