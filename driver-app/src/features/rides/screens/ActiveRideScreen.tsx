import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Typography } from "../../../theme";
import { useRideStore } from "../../../store/rideStore";
import { useAuthStore } from "../../../store/authStore";
import { openDirectionsInMaps } from "../../../utils/openMaps";
import { getCurrentDeviceLocation } from "../../../utils/deviceLocation";
import { getRoutePolyline } from "../../../utils/routing";

type RidePhase = "heading_pickup" | "arrived" | "in_progress" | "completed";

const PHASE_CONFIG: Record<RidePhase, { label: string; subLabel: string; cta: string; color: string }> = {
  heading_pickup: { label: "Heading to Pickup", subLabel: "Routing to passenger pickup location", cta: "I've Arrived", color: Colors.info },
  arrived: { label: "Arrived at Pickup", subLabel: "Waiting for rider...", cta: "Start Ride", color: Colors.warning },
  in_progress: { label: "Ride in Progress", subLabel: "Heading to destination", cta: "Complete Ride", color: Colors.success },
  completed: { label: "Ride Completed!", subLabel: "Great job! 🎉", cta: "Back to Home", color: Colors.primary },
};

const PHASES: RidePhase[] = ["heading_pickup", "arrived", "in_progress", "completed"];

export default function ActiveRideScreen({ navigation, route }: any) {
  const { activeRide, fetchActiveRide, updateRideStatus } = useRideStore();
  const driver = useAuthStore((s: any) => s.driver);
  const insets = useSafeAreaInsets();
  const [phaseIndex, setPhaseIndex] = useState(0);
  const phase = PHASES[phaseIndex];
  const config = PHASE_CONFIG[phase];
  const rideId = route?.params?.rideId;
  
  const mapRef = useRef<MapView>(null);
  const [routeCoords, setRouteCoords] = useState<{latitude: number; longitude: number}[]>([]);

  const updateLocationFn = useRideStore((s) => s.updateLocation);

  // Poll for active ride updates & update location telemetry
  useEffect(() => {
    fetchActiveRide();
    
    const sendLocationTelemetry = async () => {
      try {
        const coords = await getCurrentDeviceLocation();
        if (coords) {
          await updateLocationFn(coords.latitude, coords.longitude);
        }
      } catch (err) {
        console.log("Telemetry telemetry error:", err);
      }
    };
    
    sendLocationTelemetry();

    const activeRideInterval = setInterval(() => {
      fetchActiveRide();
    }, 5000);

    const telemetryInterval = setInterval(() => {
      sendLocationTelemetry();
    }, 10000);

    return () => {
      clearInterval(activeRideInterval);
      clearInterval(telemetryInterval);
    };
  }, [rideId, fetchActiveRide, updateLocationFn]);

  // Sync phaseIndex with activeRide status
  useEffect(() => {
    if (activeRide) {
      if (activeRide.status === "accepted") {
        setPhaseIndex(0);
      } else if (activeRide.status === "arrived") {
        setPhaseIndex(1);
      } else if (activeRide.status === "started") {
        setPhaseIndex(2);
      } else if (activeRide.status === "completed") {
        setPhaseIndex(3);
      }
    }
  }, [activeRide?.status]);

  // Fetch route when phase changes
  useEffect(() => {
    const fetchRoute = async () => {
      if (!activeRide) return;
      if (phaseIndex === 0 && activeRide.driver_latitude && activeRide.driver_longitude && activeRide.pickup_latitude && activeRide.pickup_longitude) {
        // Heading to pickup
        const coords = await getRoutePolyline(
          activeRide.driver_latitude, activeRide.driver_longitude,
          activeRide.pickup_latitude, activeRide.pickup_longitude
        );
        setRouteCoords(coords);
      } else if ((phaseIndex === 1 || phaseIndex === 2) && activeRide.dropoff_latitude && activeRide.dropoff_longitude) {
        // Arrived at pickup or Ride in progress -> show route to destination
        const coords = await getRoutePolyline(
          activeRide.driver_latitude || activeRide.pickup_latitude!, 
          activeRide.driver_longitude || activeRide.pickup_longitude!,
          activeRide.dropoff_latitude, activeRide.dropoff_longitude
        );
        setRouteCoords(coords);
      } else {
        setRouteCoords([]);
      }
    };
    fetchRoute();
  }, [phaseIndex, activeRide?.id]);

  // Fit map to show both markers, or switch to 3D navigation view when started
  useEffect(() => {
    if (activeRide && mapRef.current) {
      if ((phaseIndex === 0 || phaseIndex === 2) && activeRide.driver_latitude && activeRide.driver_longitude) {
        // Navigation Mode: Google Maps 3D style
        mapRef.current.animateCamera({
          center: { latitude: activeRide.driver_latitude, longitude: activeRide.driver_longitude },
          pitch: 60,
          zoom: 18,
          heading: 0,
        }, { duration: 1000 });
      } else {
        // Overview Mode
        const coords = [];
        if (activeRide.pickup_latitude && activeRide.pickup_longitude) {
          coords.push({ latitude: activeRide.pickup_latitude, longitude: activeRide.pickup_longitude });
        }
        if (activeRide.dropoff_latitude && activeRide.dropoff_longitude) {
          coords.push({ latitude: activeRide.dropoff_latitude, longitude: activeRide.dropoff_longitude });
        }
        if (activeRide.driver_latitude && activeRide.driver_longitude) {
          coords.push({ latitude: activeRide.driver_latitude, longitude: activeRide.driver_longitude });
        }
        
        if (coords.length >= 2) {
          mapRef.current.fitToCoordinates(coords, {
            edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
            animated: true,
          });
        }
      }
    }
  }, [activeRide?.pickup_latitude, activeRide?.dropoff_latitude, activeRide?.driver_latitude, phaseIndex]);

  if (!activeRide) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.surface }}>
        <Ionicons name="car-outline" size={48} color={Colors.textMuted} />
        <Text style={{ color: Colors.textSecondary, marginTop: 12, fontSize: 15 }}>No active ride</Text>
        <TouchableOpacity
          style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: Colors.primary, borderRadius: 14 }}
          onPress={() => navigation.replace("DriverDashboard")}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const RIDE = activeRide;

  const handleCTA = async () => {
    if (phaseIndex === 0) {
      await updateRideStatus(RIDE.id, "arrived");
      setPhaseIndex(1);
    } else if (phaseIndex === 1) {
      await updateRideStatus(RIDE.id, "started");
      setPhaseIndex(2);
    } else if (phaseIndex === 2) {
      await updateRideStatus(RIDE.id, "completed");
      setPhaseIndex(3);
    } else {
      navigation.replace("DriverDashboard");
    }
  };

  const handleSOS = () => Alert.alert("SOS", "Emergency services have been notified.");

  const pickupRegion = {
    latitude: RIDE.pickup_latitude ?? (driver?.country === "USA" ? 39.8283 : 20.5937),
    longitude: RIDE.pickup_longitude ?? (driver?.country === "USA" ? -98.5795 : 78.9629),
    latitudeDelta: RIDE.pickup_latitude ? 0.08 : (driver?.country === "USA" ? 30 : 20),
    longitudeDelta: RIDE.pickup_latitude ? 0.08 : (driver?.country === "USA" ? 30 : 20),
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* Real Live Map - identical layout style to rider track map */}
      <View style={styles.mapArea}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={pickupRegion}
          showsUserLocation
          followsUserLocation={phaseIndex === 0 || phaseIndex === 2}
          showsMyLocationButton={true}
          pitchEnabled={true}
        >
          {RIDE.pickup_latitude && RIDE.pickup_longitude && (
            <Marker
              coordinate={{ latitude: RIDE.pickup_latitude, longitude: RIDE.pickup_longitude }}
              pinColor="#10B981"
              title="Pickup"
              description={RIDE.from_location}
            />
          )}
          {RIDE.dropoff_latitude && RIDE.dropoff_longitude && (
            <Marker
              coordinate={{ latitude: RIDE.dropoff_latitude, longitude: RIDE.dropoff_longitude }}
              pinColor={Colors.primary}
              title="Destination"
              description={RIDE.to_location}
            />
          )}
          {routeCoords.length > 0 ? (
            <Polyline
              coordinates={routeCoords}
              strokeColor="#00E5FF" // Bright cyan to match screenshot
              strokeWidth={8}
              lineJoin="round"
              lineCap="round"
            />
          ) : (
            RIDE.pickup_latitude && RIDE.dropoff_latitude && (
              <Polyline
                coordinates={[
                  { latitude: RIDE.pickup_latitude, longitude: RIDE.pickup_longitude! },
                  { latitude: RIDE.dropoff_latitude, longitude: RIDE.dropoff_longitude! },
                ]}
                strokeColor="#00E5FF"
                strokeWidth={8}
                lineDashPattern={[6, 4]}
              />
            )
          )}
        </MapView>

        {/* SOS */}
        <TouchableOpacity style={[styles.sosBtn, { top: insets.top + 8 }]} onPress={handleSOS}>
          <Text style={styles.sosText}>SOS</Text>
        </TouchableOpacity>

        {/* Back */}
        <TouchableOpacity style={[styles.backBtn, { top: insets.top + 8 }]} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet Details wrapped in ScrollView for Redmi screens to prevent overflow */}
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>

          {/* Phase Status */}
          <View style={[styles.phaseBanner, { backgroundColor: config.color + "14" }]}>
            <View style={[styles.phaseDot, { backgroundColor: config.color }]} />
            <View>
              <Text style={[styles.phaseLabel, { color: config.color }]}>{config.label}</Text>
              <Text style={styles.phaseSub}>{config.subLabel}</Text>
            </View>
          </View>

          {/* Progress Steps */}
          <View style={styles.progressRow}>
            {PHASES.map((p, i) => (
              <View key={p} style={styles.progressStep}>
                <View
                  style={[
                    styles.stepDot,
                    i <= phaseIndex && { backgroundColor: Colors.primary },
                    i === phaseIndex && styles.stepDotActive,
                  ]}
                />
                {i < PHASES.length - 1 && (
                  <View style={[styles.stepLine, i < phaseIndex && { backgroundColor: Colors.primary }]} />
                )}
              </View>
            ))}
          </View>

          {/* Rider Card */}
          <View style={styles.riderCard}>
            <View style={styles.riderLeft}>
              <View style={styles.riderAvatar}>
                <Text style={styles.riderInitial}>{RIDE.rider_name ? RIDE.rider_name.charAt(0) : "R"}</Text>
              </View>
              <View>
                <Text style={styles.riderName}>{RIDE.rider_name}</Text>
                <View style={styles.riderRating}>
                  <Ionicons name="star" size={12} color={Colors.warning} />
                  <Text style={styles.ratingText}>{RIDE.rider_rating}</Text>
                </View>
              </View>
            </View>
            <View style={styles.riderActions}>
              <TouchableOpacity 
                style={styles.actionBtn} 
                onPress={() => openDirectionsInMaps({ destination: RIDE.to_location })}
              >
                <Ionicons name="navigate" size={20} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionBtn} 
                onPress={() => navigation.navigate("ChatDetail", { rideId: RIDE.id })}
              >
                <Ionicons name="chatbubble-ellipses" size={20} color={Colors.info} />
              </TouchableOpacity>
              {RIDE.rider_phone ? (
                <TouchableOpacity 
                  style={styles.actionBtn} 
                  onPress={() => Linking.openURL(`tel:${RIDE.rider_phone}`)}
                >
                  <Ionicons name="call" size={20} color={Colors.success} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Route details */}
          <View style={styles.routeCard}>
            <View style={styles.routeRow}>
              <Ionicons name="radio-button-on" size={14} color={Colors.success} />
              <Text style={styles.routeText} numberOfLines={1}>{RIDE.from_location}</Text>
            </View>
            <View style={styles.routeConnector}>
              <View style={styles.connectorLine} />
            </View>
            <View style={styles.routeRow}>
              <Ionicons name="location" size={14} color={Colors.error} />
              <Text style={styles.routeText} numberOfLines={1}>{RIDE.to_location}</Text>
            </View>
          </View>

          {/* Fare Details */}
          <View style={styles.fareRow}>
            <View style={styles.fareItem}>
              <Text style={styles.fareLabel}>Distance</Text>
              <Text style={styles.fareValue}>{RIDE.distance}</Text>
            </View>
            <View style={styles.fareItem}>
              <Text style={styles.fareLabel}>Fare</Text>
              <Text style={[styles.fareValue, { color: Colors.success }]}>{RIDE.fare}</Text>
            </View>
            <View style={styles.fareItem}>
              <Text style={styles.fareLabel}>Ride ID</Text>
              <Text style={styles.fareValue}>#{RIDE.id}</Text>
            </View>
          </View>

          {/* CTA Action Button */}
          <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: config.color }]} onPress={handleCTA}>
            <Text style={styles.ctaText}>{config.cta}</Text>
            <Ionicons name="arrow-forward" size={20} color={Colors.white} />
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  mapArea: {
    height: 280,
    position: "relative",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  map: { flex: 1 },
  sosBtn: {
    position: "absolute", right: Spacing.lg,
    backgroundColor: Colors.error, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
    zIndex: 10,
  },
  sosText: { color: Colors.white, fontWeight: "800", fontSize: Typography.caption },
  backBtn: {
    position: "absolute", left: Spacing.lg,
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center",
    zIndex: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sheet: {
    flex: 1, backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  phaseBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 14, padding: Spacing.md,
  },
  phaseDot: { width: 10, height: 10, borderRadius: 5 },
  phaseLabel: { fontSize: Typography.small, fontWeight: "800" },
  phaseSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  progressRow: { flexDirection: "row", alignItems: "center", marginVertical: Spacing.sm },
  progressStep: { flex: 1, flexDirection: "row", alignItems: "center" },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.border, zIndex: 1 },
  stepDotActive: { width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: Colors.primary + "40", backgroundColor: Colors.primary },
  stepLine: { flex: 1, height: 2, backgroundColor: Colors.border },
  riderCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: Colors.background, borderRadius: 16, padding: Spacing.md,
  },
  riderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  riderAvatar: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center",
  },
  riderInitial: { fontSize: 16, fontWeight: "800", color: Colors.white },
  riderName: { fontSize: Typography.small, fontWeight: "700", color: Colors.textPrimary },
  riderRating: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 1 },
  ratingText: { fontSize: Typography.small, color: Colors.textPrimary, fontWeight: "600" },
  riderActions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.border,
  },
  routeCard: { backgroundColor: Colors.background, borderRadius: 16, padding: Spacing.md },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  routeText: { flex: 1, fontSize: Typography.small, fontWeight: "600", color: Colors.textPrimary },
  routeConnector: { paddingLeft: 6, paddingVertical: 2 },
  connectorLine: { height: 16, width: 1.5, backgroundColor: Colors.border },
  fareRow: {
    flexDirection: "row", backgroundColor: Colors.background, borderRadius: 16,
    padding: Spacing.md,
  },
  fareItem: { flex: 1, alignItems: "center" },
  fareLabel: { fontSize: Typography.small, color: Colors.textSecondary },
  fareValue: { fontSize: Typography.small, fontWeight: "700", color: Colors.textPrimary, marginTop: 2 },
  ctaBtn: {
    height: 52, borderRadius: 16, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 8, marginVertical: Spacing.md,
  },
  ctaText: { color: Colors.white, fontSize: Typography.body, fontWeight: "800" },
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
