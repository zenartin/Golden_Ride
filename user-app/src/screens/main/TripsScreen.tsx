import React, { useEffect } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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

  useEffect(() => {
    refreshActiveTrip().catch(() => undefined);
    refreshHistory().catch(() => undefined);
  }, [refreshActiveTrip, refreshHistory]);

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.card}>
        <SectionHeader title="Active ride" />
        {activeTrip ? (
          <Pressable style={styles.trip} onPress={() => navigation.navigate("TrackRide")}>
            <View style={styles.tripIcon}>
              <Ionicons name="car-sport" size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tripTitle}>{activeTrip.rideTitle}</Text>
              <Text style={styles.tripMeta}>{activeTrip.pickup} → {activeTrip.dropoff}</Text>
              <Text style={styles.tripMeta}>Status: {activeTrip.status}</Text>
            </View>
          </Pressable>
        ) : (
          <Text style={styles.empty}>No active trip right now.</Text>
        )}
      </View>

      <View style={styles.card}>
        <SectionHeader title="Trip history" />
        <View style={{ gap: 10 }}>
          {history.map((trip) => (
            <Pressable
              key={trip.id}
              style={styles.trip}
              onPress={() => navigation.navigate("TripDetail", { tripId: trip.id })}
            >
              <View style={styles.tripIcon}>
                <Ionicons name={trip.status === "completed" ? "checkmark-circle" : "close-circle"} size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tripTitle}>{trip.rideTitle}</Text>
                <Text style={styles.tripMeta}>{trip.pickup} → {trip.dropoff}</Text>
                <Text style={styles.tripMeta}>Rs. {trip.price} · {trip.createdAt.slice(0, 10)}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "#FFF3D9",
    alignItems: "center",
    justifyContent: "center",
  },
  tripTitle: { color: Colors.textPrimary, fontSize: Typography.body, fontWeight: "800" },
  tripMeta: { color: Colors.textSecondary, fontSize: Typography.small, marginTop: 2 },
  empty: { color: Colors.textSecondary, fontSize: Typography.body },
});
