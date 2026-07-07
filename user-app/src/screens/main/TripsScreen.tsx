import React, { useEffect } from "react";
import { Pressable, Text, View, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SectionHeader from "../../components/SectionHeader";
import { useRideStore } from "../../store/rideStore";
import { Colors, Spacing, Typography } from "../../theme";

type Props = {
  navigation: {
    navigate: (screen: "TrackRide" | "TripDetail", params?: { tripId: string }) => void;
  };
};

export default function TripsScreen({ navigation }: Props) {
  const activeTrip = useRideStore((state) => state.activeTrip);
  const history = useRideStore((state) => state.history);
  const refreshActiveTrip = useRideStore((state) => state.refreshActiveTrip);
  const refreshHistory = useRideStore((state) => state.refreshHistory);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    refreshActiveTrip().catch(() => undefined);
    refreshHistory().catch(() => undefined);
  }, [refreshActiveTrip, refreshHistory]);

  return (
    <View style={styles.root}>
      {/* Premium Header with Notch spacing */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Your Trips</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Active Ride Card */}
        <View style={styles.card}>
          <SectionHeader title="Active ride" />
          {activeTrip ? (
            <Pressable style={styles.trip} onPress={() => navigation.navigate("TrackRide")}>
              <View style={styles.tripIcon}>
                <Ionicons name="car-sport" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tripTitle}>{activeTrip.rideTitle}</Text>
                <Text style={styles.tripMeta} numberOfLines={1}>{activeTrip.pickup} → {activeTrip.dropoff}</Text>
                <Text style={styles.tripMeta}>Status: {activeTrip.status}</Text>
              </View>
            </Pressable>
          ) : (
            <Text style={styles.empty}>No active trip right now.</Text>
          )}
        </View>

        {/* History Card */}
        <View style={styles.card}>
          <SectionHeader title="Trip history" />
          <View style={{ gap: 10 }}>
            {history.length > 0 ? (
              history.map((trip) => (
                <Pressable
                  key={trip.id}
                  style={styles.trip}
                  onPress={() => navigation.navigate("TripDetail", { tripId: trip.id })}
                >
                  <View style={styles.tripIcon}>
                    <Ionicons
                      name={trip.status === "completed" ? "checkmark-circle" : "close-circle"}
                      size={20}
                      color={trip.status === "completed" ? "#10B981" : "#EF4444"}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tripTitle}>{trip.rideTitle}</Text>
                    <Text style={styles.tripMeta} numberOfLines={1}>{trip.pickup} → {trip.dropoff}</Text>
                    <Text style={styles.tripMeta}>
                      Rs. {trip.price} · {trip.createdAt.slice(0, 10)}
                    </Text>
                  </View>
                </Pressable>
              ))
            ) : (
              <Text style={styles.empty}>No past trips found.</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: Typography.heading,
    fontWeight: "900",
    color: Colors.textPrimary,
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  trip: { flexDirection: "row", gap: 12, alignItems: "center" },
  tripIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tripTitle: { color: Colors.textPrimary, fontSize: Typography.body, fontWeight: "800" },
  tripMeta: { color: Colors.textSecondary, fontSize: Typography.small, marginTop: 2 },
  empty: { color: Colors.textSecondary, fontSize: Typography.body },
});
