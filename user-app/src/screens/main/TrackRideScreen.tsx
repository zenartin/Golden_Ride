import React, { useMemo } from "react";
import { Alert, Pressable, Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import AppButton from "../../components/AppButton";
import { MainStackParamList } from "../../navigation/MainNavigator";
import { useRideStore } from "../../store/rideStore";
import { Colors, Spacing, Typography } from "../../theme";
import { openDirectionsInMaps } from "../../utils/openMaps";

type Props = NativeStackScreenProps<MainStackParamList, "TrackRide">;

export default function TrackRideScreen({ navigation }: Props) {
  const activeTrip = useRideStore((state) => state.activeTrip);
  const advanceActiveTrip = useRideStore((state) => state.advanceActiveTrip);
  const cancelActiveTrip = useRideStore((state) => state.cancelActiveTrip);
  const completeActiveTrip = useRideStore((state) => state.completeActiveTrip);

  const nextAction = useMemo(() => {
    if (!activeTrip) return null;
    if (activeTrip.status === "on_trip") return "Complete ride";
    return "Advance status";
  }, [activeTrip]);

  if (!activeTrip) {
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="map-outline" size={40} color={Colors.primary} />
        <Text style={styles.title}>No active ride</Text>
        <Text style={styles.subtitle}>Book a trip from the Home tab to see live tracking here.</Text>
        <AppButton title="Go home" onPress={() => navigation.navigate("Shell")} />
      </View>
    );
  }

  const nextStep = () => {
    if (activeTrip.status === "on_trip") {
      completeActiveTrip();
      Alert.alert("Ride completed", "The trip was moved into history.");
      navigation.navigate("Shell");
      return;
    }
    advanceActiveTrip();
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.card}>
        <Text style={styles.kicker}>Tracking</Text>
        <Text style={styles.title}>{activeTrip.rideTitle}</Text>
        <Text style={styles.subtitle}>{activeTrip.pickup} → {activeTrip.dropoff}</Text>
        <Text style={styles.meta}>Driver: {activeTrip.driver}</Text>
        <Text style={styles.meta}>Car: {activeTrip.car} · {activeTrip.plate}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Current status</Text>
        <Text style={styles.status}>{activeTrip.status}</Text>
        <View style={styles.timeline}>
          {["confirmed", "arriving", "on_trip", "completed"].map((item) => (
            <View key={item} style={styles.timelineRow}>
              <View style={[styles.dot, activeTrip.status === item && styles.dotActive]} />
              <Text style={styles.meta}>{item}</Text>
            </View>
          ))}
        </View>
        <View style={styles.row}>
          <AppButton title={nextAction || "Advance"} onPress={nextStep} style={{ flex: 1 }} />
          <AppButton title="Cancel" onPress={cancelActiveTrip} variant="secondary" style={{ flex: 1 }} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Map handoff</Text>
        <Pressable style={styles.mapButton} onPress={() => openDirectionsInMaps(activeTrip.dropoff)}>
          <Ionicons name="navigate" size={18} color={Colors.primary} />
          <Text style={styles.mapText}>Open ride route in maps</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  kicker: { color: Colors.primary, fontSize: Typography.caption, fontWeight: "800", textTransform: "uppercase" },
  title: { color: Colors.textPrimary, fontSize: Typography.heading, fontWeight: "900" },
  subtitle: { color: Colors.textSecondary, fontSize: Typography.body },
  meta: { color: Colors.textSecondary, fontSize: Typography.small },
  sectionTitle: { color: Colors.textPrimary, fontSize: Typography.subHeading, fontWeight: "800" },
  status: { color: Colors.textPrimary, fontSize: Typography.subHeading, fontWeight: "900" },
  timeline: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  timelineRow: { alignItems: "center", gap: 6, flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primary },
  row: { flexDirection: "row", gap: 10 },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: Spacing.md,
    borderRadius: 16,
    backgroundColor: "#FFF3D9",
  },
  mapText: { color: Colors.textPrimary, fontSize: Typography.body, fontWeight: "700" },
});
