import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View, StyleSheet, ScrollView } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import AppButton from "../../components/AppButton";
import { MainStackParamList } from "../../navigation/MainNavigator";
import { useRideStore } from "../../store/rideStore";
import { useAuthStore } from "../../store/authStore";
import { Colors, Spacing, Typography } from "../../theme";
import { openDirectionsInMaps } from "../../utils/openMaps";

type Props = NativeStackScreenProps<MainStackParamList, "TrackRide">;

const statusSteps = [
  { key: "searching", label: "Searching", icon: "search-outline" },
  { key: "confirmed", label: "Confirmed", icon: "checkmark-circle-outline" },
  { key: "arriving", label: "Driver Arrived", icon: "car-outline" },
  { key: "on_trip", label: "On Trip", icon: "navigate-outline" },
  { key: "completed", label: "Completed", icon: "flag-outline" },
] as const;

const statusColors: Record<string, string> = {
  searching: "#F59E0B",
  confirmed: "#10B981",
  arriving: "#3B82F6",
  on_trip: "#8B5CF6",
  completed: "#22D3EE",
  cancelled: "#EF4444",
};

const statusDescriptions: Record<string, string> = {
  searching: "Sending your request to nearby drivers…",
  confirmed: "Your driver is heading to your pickup location.",
  arriving: "Your driver has arrived at the pickup location.",
  on_trip: "You're on the way to your destination.",
  completed: "You've arrived! Trip completed.",
  cancelled: "This trip was cancelled.",
};

const statusHeaders: Record<string, string> = {
  searching: "Searching for driver…",
  confirmed: "Ride Confirmed",
  arriving: "Driver Arrived",
  on_trip: "Trip Started",
  completed: "Trip Completed",
  cancelled: "Trip Cancelled",
};

export default function TrackRideScreen({ navigation }: Props) {
  const activeTrip = useRideStore((state) => state.activeTrip);
  const cancelActiveTrip = useRideStore((state) => state.cancelActiveTrip);
  const refreshActiveTrip = useRideStore((state) => state.refreshActiveTrip);
  
  const mapRef = useRef<MapView>(null);

  // Poll for status updates every 4 seconds when trip is active
  useEffect(() => {
    if (!activeTrip || activeTrip.status === "completed" || activeTrip.status === "cancelled") return;
    
    // Immediate initial fetch
    refreshActiveTrip();

    const interval = setInterval(() => {
      refreshActiveTrip();
    }, 4000);
    
    return () => clearInterval(interval);
  }, [activeTrip?.status]);

  // Dynamic zoom fitting map to show both markers
  useEffect(() => {
    if (activeTrip && mapRef.current) {
      const coords = [];
      if (activeTrip.pickupLatitude && activeTrip.pickupLongitude) {
        coords.push({ latitude: activeTrip.pickupLatitude, longitude: activeTrip.pickupLongitude });
      }
      if (activeTrip.dropoffLatitude && activeTrip.dropoffLongitude) {
        coords.push({ latitude: activeTrip.dropoffLatitude, longitude: activeTrip.dropoffLongitude });
      }
      if (activeTrip.driverLatitude && activeTrip.driverLongitude) {
        coords.push({ latitude: activeTrip.driverLatitude, longitude: activeTrip.driverLongitude });
      }
      
      if (coords.length >= 2) {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }
    }
  }, [activeTrip?.pickupLatitude, activeTrip?.dropoffLatitude, activeTrip?.driverLatitude]);

  const handleCancel = async () => {
    Alert.alert("Cancel Ride?", "Are you sure you want to cancel this ride?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          await cancelActiveTrip();
          navigation.navigate("Shell");
        },
      },
    ]);
  };

  if (!activeTrip) {
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="map-outline" size={48} color={Colors.primary} />
        <Text style={styles.title}>No active ride</Text>
        <Text style={styles.subtitle}>Book a trip from the Home tab to see live tracking here.</Text>
        <AppButton title="Go home" onPress={() => navigation.navigate("Shell")} />
      </View>
    );
  }

  const currentColor = statusColors[activeTrip.status] ?? Colors.primary;
  const currentDesc = statusDescriptions[activeTrip.status] ?? activeTrip.status;
  const currentStepIndex = statusSteps.findIndex((s) => s.key === activeTrip.status);

  const user = useAuthStore((s) => s.user);

  // Map Region defaults
  const pickupRegion = {
    latitude: activeTrip.pickupLatitude ?? (user?.country === "USA" ? 39.8283 : 20.5937),
    longitude: activeTrip.pickupLongitude ?? (user?.country === "USA" ? -98.5795 : 78.9629),
    latitudeDelta: activeTrip.pickupLatitude ? 0.08 : (user?.country === "USA" ? 30 : 20),
    longitudeDelta: activeTrip.pickupLatitude ? 0.08 : (user?.country === "USA" ? 30 : 20),
  };

  return (
    <View style={styles.root}>
      {/* Real Live Map - identical layout style to home page map */}
      <View style={styles.mapCard}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={pickupRegion}
          showsUserLocation
          showsMyLocationButton={false}
          pitchEnabled={false}
        >
          {activeTrip.pickupLatitude && activeTrip.pickupLongitude && (
            <Marker
              coordinate={{ latitude: activeTrip.pickupLatitude, longitude: activeTrip.pickupLongitude }}
              pinColor="#10B981"
              title="Pickup"
              description={activeTrip.pickup}
            />
          )}
          {activeTrip.dropoffLatitude && activeTrip.dropoffLongitude && (
            <Marker
              coordinate={{ latitude: activeTrip.dropoffLatitude, longitude: activeTrip.dropoffLongitude }}
              pinColor={Colors.primary}
              title="Destination"
              description={activeTrip.dropoff}
            />
          )}
          {/* Driver car marker */}
          {activeTrip.driverLatitude && activeTrip.driverLongitude && (
            <Marker
              coordinate={{ latitude: activeTrip.driverLatitude, longitude: activeTrip.driverLongitude }}
              title="Driver Location"
              description={activeTrip.driver}
            >
              <View style={styles.carMarker}>
                <Ionicons name="car-sport" size={20} color="#fff" />
              </View>
            </Marker>
          )}
          {activeTrip.pickupLatitude && activeTrip.dropoffLatitude && (
            <Polyline
              coordinates={[
                { latitude: activeTrip.pickupLatitude, longitude: activeTrip.pickupLongitude! },
                { latitude: activeTrip.dropoffLatitude, longitude: activeTrip.dropoffLongitude! },
              ]}
              strokeColor={Colors.primary}
              strokeWidth={3}
              lineDashPattern={[6, 4]}
            />
          )}
        </MapView>
      </View>

      {/* Main Details wrapped in ScrollView for small screens (Redmi, etc.) to prevent overflow */}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={[styles.card, { borderColor: currentColor, borderWidth: 1.5 }]}>
          <View style={styles.statusHeader}>
            {activeTrip.status === "searching" ? (
              <ActivityIndicator size="small" color={currentColor} />
            ) : (
              <View style={[styles.statusIcon, { backgroundColor: `${currentColor}22` }]}>
                <Ionicons
                  name={statusSteps[currentStepIndex]?.icon ?? "radio-button-on"}
                  size={20}
                  color={currentColor}
                />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusBig, { color: currentColor }]}>
                {statusHeaders[activeTrip.status] ?? activeTrip.status.toUpperCase()}
              </Text>
              <Text style={styles.statusDesc}>{currentDesc}</Text>
            </View>
          </View>
        </View>

        {/* Driver info — only when confirmed+ */}
        {activeTrip.status !== "searching" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Driver Details</Text>
            <View style={styles.driverRow}>
              <View style={styles.driverAvatar}>
                <Ionicons name="person" size={24} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverName}>{activeTrip.driver || "Assigned Driver"}</Text>
                <Text style={styles.driverMeta} numberOfLines={1}>{activeTrip.car} · Plate: {activeTrip.plate}</Text>
                {activeTrip.driverPhone ? (
                  <Text style={[styles.driverMeta, { fontWeight: "bold", marginTop: 2 }]}>📞 {activeTrip.driverPhone}</Text>
                ) : null}
              </View>
              <Pressable style={styles.mapBtn} onPress={() => openDirectionsInMaps(activeTrip.dropoff)}>
                <Ionicons name="navigate" size={18} color={Colors.primary} />
              </Pressable>
            </View>
            <View style={styles.fareRow}>
              <Ionicons name="cash-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.fareText}>₹{activeTrip.price} · {activeTrip.distance} · {activeTrip.duration}</Text>
            </View>
          </View>
        )}

        {/* Fare summary */}
        {activeTrip.status === "searching" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Ride Summary</Text>
            <View style={styles.fareRow}>
              <Ionicons name="car-sport-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.fareText}>{activeTrip.rideTitle}</Text>
            </View>
            <View style={styles.fareRow}>
              <Ionicons name="cash-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.fareText}>₹{activeTrip.price} · {activeTrip.distance} · {activeTrip.duration}</Text>
            </View>
            <View style={styles.fareRow}>
              <Ionicons name="card-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.fareText}>{activeTrip.paymentMethod}</Text>
            </View>
          </View>
        )}

        {/* Progress timeline */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Trip Progress</Text>
          <View style={styles.timeline}>
            {statusSteps.map((step, i) => {
              const isDone = currentStepIndex > i;
              const isActive = currentStepIndex === i;
              const color = isActive ? currentColor : isDone ? "#10B981" : Colors.border;
              return (
                <View key={step.key} style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: color }]}>
                    {isDone && <Ionicons name="checkmark" size={10} color="#fff" />}
                    {isActive && activeTrip.status === "searching" && (
                      <ActivityIndicator size="small" color="#fff" style={{ transform: [{ scale: 0.5 }] }} />
                    )}
                  </View>
                  <Text style={[styles.timelineLabel, { color: isActive ? currentColor : isDone ? Colors.textPrimary : Colors.textSecondary }]}>
                    {step.label}
                  </Text>
                  {i < statusSteps.length - 1 && <View style={[styles.timelineConnector, { backgroundColor: isDone ? "#10B981" : Colors.border }]} />}
                </View>
              );
            })}
          </View>
        </View>

        {/* Actions */}
        {(activeTrip.status === "searching" || activeTrip.status === "confirmed") && (
          <AppButton title="Cancel Ride" onPress={handleCancel} variant="secondary" />
        )}

        {activeTrip.status !== "cancelled" && activeTrip.status !== "completed" && activeTrip.status !== "searching" && (
          <AppButton
            title="Chat with driver"
            onPress={() => navigation.navigate("Chat", { rideId: activeTrip.id })}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  mapCard: {
    height: 200,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  map: { flex: 1 },
  scroll: { padding: 16, gap: 12, paddingBottom: 32 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  statusHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  statusBig: { fontSize: Typography.body, fontWeight: "800", letterSpacing: 0.2 },
  statusDesc: { color: Colors.textSecondary, fontSize: Typography.small, marginTop: 1 },
  sectionTitle: { color: Colors.textPrimary, fontSize: Typography.body, fontWeight: "800" },
  driverRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  driverAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#FFF3D9",
    alignItems: "center", justifyContent: "center",
  },
  driverName: { color: Colors.textPrimary, fontWeight: "700", fontSize: Typography.small },
  driverMeta: { color: Colors.textSecondary, fontSize: Typography.small, marginTop: 1 },
  mapBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#FFF3D9",
    alignItems: "center", justifyContent: "center",
  },
  fareRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  fareText: { color: Colors.textSecondary, fontSize: Typography.small },
  title: { color: Colors.textPrimary, fontSize: Typography.heading, fontWeight: "900" },
  subtitle: { color: Colors.textSecondary, fontSize: Typography.body, textAlign: "center" },
  timeline: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginTop: 4 },
  timelineItem: { alignItems: "center", flex: 1, position: "relative" },
  timelineDot: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
  },
  timelineLabel: { fontSize: 8, fontWeight: "700", textAlign: "center", marginTop: 3 },
  timelineConnector: {
    position: "absolute",
    top: 10,
    left: "50%",
    width: "100%",
    height: 2,
    zIndex: -1,
  },
  carMarker: {
    backgroundColor: Colors.primary,
    padding: 6,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
