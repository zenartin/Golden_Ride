import React, { useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator, BackHandler } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import DriverDashboard from "../features/auth/screens/driver/DriverDashboard";
import TripsScreen from "../features/rides/screens/TripsScreen";
import EarningsScreen from "../features/earnings/screens/EarningsScreen";
import MessagesScreen from "../features/home/screens/MessagesScreen";
import ProfileScreen from "../features/profile/screens/ProfileScreen";
import BottomTabBar from "../components/BottomTabBar";
import { Colors } from "../theme";

type TabName = "Home" | "Trips" | "Earnings" | "Messages" | "Profile";

export default function DriverTabNavigator({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<TabName>("Home");
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);

  React.useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(status === "granted");
    })();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (activeTab !== "Home") {
          setActiveTab("Home");
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [activeTab])
  );

  const renderScreen = () => {
    switch (activeTab) {
      case "Home":      return <DriverDashboard navigation={navigation} onSelectTab={setActiveTab} />;
      case "Trips":     return <TripsScreen navigation={navigation} />;
      case "Earnings":  return <EarningsScreen />;
      case "Messages":  return <MessagesScreen navigation={navigation} />;
      case "Profile":   return <ProfileScreen navigation={navigation} />;
    }
  };

  if (hasLocationPermission === null) {
    return (
      <View style={styles.centerLoader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (hasLocationPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="location" size={80} color={Colors.primary} />
        <Text style={styles.permissionTitle}>Location Access Required</Text>
        <Text style={styles.permissionDesc}>
          As a driver, location access is strictly required to receive rides and track trips.
          Please enable location permissions to use the app.
        </Text>
        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            setHasLocationPermission(status === "granted");
          }}
        >
          <Text style={styles.permissionBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.screen}>{renderScreen()}</View>
      <BottomTabBar activeTab={activeTab} onTabPress={(tab) => setActiveTab(tab as TabName)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  screen: { flex: 1 },
  centerLoader: { flex: 1, justifyContent: "center", alignItems: "center" },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: Colors.background,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: Colors.textPrimary,
    marginTop: 24,
    textAlign: "center",
  },
  permissionDesc: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 12,
    textAlign: "center",
    lineHeight: 22,
  },
  permissionBtn: {
    marginTop: 32,
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    width: "100%",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  permissionBtnText: {
    color: Colors.white,
    fontWeight: "800",
    fontSize: 16,
  },
});
