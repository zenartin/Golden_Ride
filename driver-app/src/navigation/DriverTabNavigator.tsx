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
import { useRideStore } from "../store/rideStore";


type TabName = "Home" | "Trips" | "Earnings" | "Messages" | "Profile";

export default function DriverTabNavigator({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<TabName>("Home");
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);
  const activeRide = useRideStore((s) => s.activeRide);
  const isRideActive = activeRide && (activeRide.status === "accepted" || activeRide.status === "arrived" || activeRide.status === "started");

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
      
      {/* Floating Active Ride Banner across all tabs */}
      {isRideActive && (
        <TouchableOpacity
          style={styles.floatingActiveBanner}
          onPress={() => navigation.navigate("ActiveRide", { rideId: activeRide.id })}
          activeOpacity={0.9}
        >
          <View style={styles.bannerIconBox}>
            <Ionicons name="car-sport" size={20} color="#fff" />
          </View>
          <View style={styles.bannerInfo}>
            <View style={styles.bannerBadgeRow}>
              <View style={styles.pulseGreenDot} />
              <Text style={styles.bannerStatusTitle}>
                {activeRide.status === "accepted"
                  ? "Heading to Pickup"
                  : activeRide.status === "arrived"
                  ? "Arrived at Pickup"
                  : "Ride in Progress"}
              </Text>
            </View>
            <Text style={styles.bannerSubText} numberOfLines={1}>
              {activeRide.rider_name} • {activeRide.to_location || activeRide.from_location}
            </Text>
          </View>
          <View style={styles.bannerBtn}>
            <Text style={styles.bannerBtnText}>Resume ➔</Text>
          </View>
        </TouchableOpacity>
      )}

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
  floatingActiveBanner: {
    position: "absolute",
    bottom: 75,
    left: 12,
    right: 12,
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: "#10B981",
    zIndex: 9999,
  },
  bannerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerInfo: {
    flex: 1,
    marginHorizontal: 10,
  },
  bannerBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pulseGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  bannerStatusTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  bannerSubText: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 2,
  },
  bannerBtn: {
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  bannerBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },
});
