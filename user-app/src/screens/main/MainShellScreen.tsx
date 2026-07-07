import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

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

  const content = useMemo(() => {
    if (tab === "Trips") return <TripsScreen navigation={navigation} />;
    if (tab === "Wallet") return <WalletScreen />;
    if (tab === "Profile") return <ProfileScreen navigation={navigation} />;
    return <HomeScreen navigation={navigation} route={route} openTab={setTab} />;
  }, [navigation, route, tab]);

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
});
