import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import BottomShellBar from "../../components/BottomShellBar";
import UserDashboardHeader from "../../components/UserDashboardHeader";
import UserQuickActions from "../../components/UserQuickActions";
import { Colors } from "../../theme";
import HomeScreen from "./HomeScreen";
import TripsScreen from "./TripsScreen";
import WalletScreen from "./WalletScreen";
import ProfileScreen from "./ProfileScreen";
import { MainStackParamList } from "../../navigation/MainNavigator";

type Props = NativeStackScreenProps<MainStackParamList, "Shell">;
type TabKey = "Home" | "Trips" | "Wallet" | "Profile";

export default function MainShellScreen({ navigation }: Props) {
  const [tab, setTab] = useState<TabKey>("Home");

  const content = useMemo(() => {
    if (tab === "Trips") return <TripsScreen navigation={navigation} />;
    if (tab === "Wallet") return <WalletScreen />;
    if (tab === "Profile") return <ProfileScreen navigation={navigation} />;
    return <HomeScreen navigation={navigation} openTab={setTab} />;
  }, [navigation, tab]);

  return (
    <View style={styles.wrap}>
      <UserDashboardHeader activeTab={tab} onProfilePress={() => setTab("Profile")} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <UserQuickActions
          actions={[
            { icon: "navigate", label: "Book", color: "#FEF3C7", onPress: () => setTab("Home") },
            { icon: "receipt-outline", label: "Trips", color: "#DBEAFE", onPress: () => setTab("Trips") },
            { icon: "wallet-outline", label: "Wallet", color: "#DCFCE7", onPress: () => setTab("Wallet") },
            { icon: "headset-outline", label: "Help", color: "#EDE9FE", onPress: () => setTab("Profile") },
          ]}
        />
        {content}
      </ScrollView>
      <BottomShellBar activeTab={tab} onTabPress={setTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 24, gap: 16 },
});
