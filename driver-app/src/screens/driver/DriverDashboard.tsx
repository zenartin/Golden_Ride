import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, StatusBar, View } from "react-native";

import DashboardHeader from "../../components/DashboardHeader";
import OnlineStatusCard from "../../components/OnlineStatusCard";
import MapCard from "../../components/MapCard";
import EarningsCard from "../../components/EarningsCard";
import QuickActions from "../../components/QuickActions";
import VehicleCard from "../../components/VehicleCard";
import BottomTab from "../../components/BottomTab";

import { Colors } from "../../theme";

export default function DriverDashboard() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      <DashboardHeader />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <OnlineStatusCard />
        <MapCard />
        <EarningsCard />
        <QuickActions />
        <VehicleCard />
      </ScrollView>

      <BottomTab />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
});
