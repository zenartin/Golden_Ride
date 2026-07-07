import React, { useMemo, useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";

import BottomShellBar from "../../components/BottomShellBar";
import { Colors } from "../../theme";
import HomeScreen from "./HomeScreen";
import TripsScreen from "./TripsScreen";
import WalletScreen from "./WalletScreen";
import ProfileScreen from "./ProfileScreen";
import { MainStackParamList } from "../../navigation/MainNavigator";

type Props = NativeStackScreenProps<MainStackParamList, "Shell">;
type TabKey = "Home" | "Trips" | "Wallet" | "Profile";

export default function MainShellScreen({ navigation, route }: Props) {
  const [tab, setTab] = useState<TabKey>("Home");
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);

  React.useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(status === "granted");
    })();
  }, []);

  const content = useMemo(() => {
    if (tab === "Trips") return <TripsScreen navigation={navigation} />;
    if (tab === "Wallet") return <WalletScreen />;
    if (tab === "Profile") return <ProfileScreen navigation={navigation} />;
    return <HomeScreen navigation={navigation} route={route} openTab={setTab} />;
  }, [navigation, route, tab]);

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
          We need your location to find rides around you and track your journey. 
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
    <View style={styles.wrap}>
      <View style={{ flex: 1 }}>
        {content}
      </View>
      <BottomShellBar activeTab={tab} onTabPress={setTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.background },
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
