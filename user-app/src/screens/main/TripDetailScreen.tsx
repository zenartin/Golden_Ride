import React, { useEffect, useMemo, useState } from "react";
import { Alert, Share, Text, View, StyleSheet } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { apiRequest } from "../../api/client";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import AppButton from "../../components/AppButton";
import { MainStackParamList } from "../../navigation/MainNavigator";
import { useRideStore, Trip } from "../../store/rideStore";
import { Colors, Spacing, Typography } from "../../theme";
import { openDirectionsInMaps } from "../../utils/openMaps";
import { formatDuration } from "../../utils/formatDuration";

type Props = NativeStackScreenProps<MainStackParamList, "TripDetail">;

export default function TripDetailScreen({ route, navigation }: Props) {
  const history = useRideStore((state) => state.history);
  const activeTrip = useRideStore((state) => state.activeTrip);
  const fetchTripDetail = useRideStore((state) => state.fetchTripDetail);
  const [remoteTrip, setRemoteTrip] = useState<Trip | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const localTrip = useMemo(() => {
    return history.find((item) => item.id === route.params.tripId) ?? activeTrip;
  }, [activeTrip, history, route.params.tripId]);

  const trip = remoteTrip ?? localTrip;

  useEffect(() => {
    setLoading(true);
    fetchTripDetail(route.params.tripId)
      .then((data) => {
        setRemoteTrip(data);
        setRemoteError(null);
      })
      .catch((error) => {
        setRemoteError(error instanceof Error ? error.message : "Could not load trip detail");
      })
      .finally(() => setLoading(false));
  }, [fetchTripDetail, route.params.tripId]);

  if (!trip) {
    return (
      <View style={styles.empty}>
        <Text style={styles.title}>Trip not found</Text>
        {loading ? <Text style={styles.meta}>Checking backend...</Text> : null}
        {remoteError ? <Text style={styles.error}>{remoteError}</Text> : null}
        <AppButton title="Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const shareReceipt = async () => {
    try {
      const receipt = await apiRequest<{ text: string }>(`/user/rides/${trip.id}/receipt`);
      await Share.share({ message: receipt.text, title: "Golden Ride receipt" });
    } catch (e: any) {
      Alert.alert("Receipt unavailable", e?.message || "Please try again.");
    }
  };

  const openRoute = async () => {
    await openDirectionsInMaps(trip.dropoff);
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.card}>
        <Text style={styles.kicker}>Trip details</Text>
        <Text style={styles.title}>{trip.rideTitle}</Text>
        {loading ? <Text style={styles.meta}>Refreshing from backend...</Text> : null}
        {remoteError ? <Text style={styles.error}>{remoteError}</Text> : null}
        <Text style={styles.meta}>{trip.pickup} to {trip.dropoff}</Text>
        <Text style={styles.meta}>Driver: {trip.driver}</Text>
        <Text style={styles.meta}>Car: {trip.car}</Text>
        <Text style={styles.meta}>Plate: {trip.plate}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Price and status</Text>
        <Text style={styles.status}>${trip.price}</Text>
        <Text style={styles.meta}>Distance: {trip.distance}</Text>
        <Text style={styles.meta}>Duration: {formatDuration(trip.duration)}</Text>
        <Text style={styles.meta}>Payment: {trip.paymentMethod}</Text>
        <Text style={styles.meta}>Status: {trip.status}</Text>
      </View>

      {trip.pickupLatitude && trip.pickupLongitude && trip.dropoffLatitude && trip.dropoffLongitude ? (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: (trip.pickupLatitude + trip.dropoffLatitude) / 2,
            longitude: (trip.pickupLongitude + trip.dropoffLongitude) / 2,
            latitudeDelta: Math.abs(trip.pickupLatitude - trip.dropoffLatitude) * 1.8 + 0.01,
            longitudeDelta: Math.abs(trip.pickupLongitude - trip.dropoffLongitude) * 1.8 + 0.01,
          }}
        >
          <Marker coordinate={{ latitude: trip.pickupLatitude, longitude: trip.pickupLongitude }} pinColor="green" />
          <Marker coordinate={{ latitude: trip.dropoffLatitude, longitude: trip.dropoffLongitude }} />
          <Polyline
            coordinates={[
              { latitude: trip.pickupLatitude, longitude: trip.pickupLongitude },
              { latitude: trip.dropoffLatitude, longitude: trip.dropoffLongitude },
            ]}
            strokeColor={Colors.primary}
            strokeWidth={3}
          />
        </MapView>
      ) : null}
      {trip.status === "completed" ? (
        <>
          <AppButton title="Get Receipt" onPress={shareReceipt} />
          <AppButton title="Rate Driver" variant="secondary" onPress={() => (navigation as any).navigate("Rating", { tripId: trip.id })} />
        </>
      ) : null}
      <AppButton title="Open route" onPress={openRoute} />
      <AppButton title="Back to trips" onPress={() => (navigation as any).reset({ index: 0, routes: [{ name: "Shell", params: { tab: "Trips", screen: "Trips" } }] })} variant="secondary" />
    </View>
  );
}

const styles = StyleSheet.create({
  map: { height: 180, borderRadius: 20 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: Colors.background, padding: Spacing.xl },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  kicker: { color: Colors.primary, fontSize: Typography.caption, fontWeight: "800", textTransform: "uppercase" },
  title: { color: Colors.textPrimary, fontSize: Typography.heading, fontWeight: "900" },
  meta: { color: Colors.textSecondary, fontSize: Typography.body, lineHeight: 20 },
  error: { color: Colors.error, fontSize: Typography.small, fontWeight: "700", lineHeight: 18 },
  sectionTitle: { color: Colors.textPrimary, fontSize: Typography.subHeading, fontWeight: "800" },
  status: { color: Colors.textPrimary, fontSize: Typography.subHeading, fontWeight: "900" },
});
