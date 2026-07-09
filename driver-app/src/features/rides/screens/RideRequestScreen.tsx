import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, Typography } from "../../../theme";
import { useRideStore } from "../../../store/rideStore";
import { useAuthStore } from "../../../store/authStore";




export default function RideRequestScreen({ navigation, route }: any) {
  const { incomingRequests, fetchIncomingRequests, acceptRide, declineRide } = useRideStore();
  const driver = useAuthStore((s) => s.driver);
  const [timeLeft, setTimeLeft] = useState(20);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const rideId = route?.params?.rideId;
  const RIDE = rideId
    ? incomingRequests.find((r) => String(r.id) === String(rideId))
    : incomingRequests[0];

  const riderInitials = RIDE?.rider_name
    ? RIDE.rider_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "R";

  useEffect(() => {
    if (!RIDE) fetchIncomingRequests();
    // Countdown
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(interval); navigation.goBack(); return 0; }
        return t - 1;
      });
    }, 1000);

    // Progress bar
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 20000,
      useNativeDriver: false,
    }).start();

    // Pulse ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();

    return () => clearInterval(interval);
  }, [RIDE?.id]);

  const handleAccept = async () => {
    if (!driver?.profile_completed) {
      Alert.alert(
        "Profile Incomplete",
        "You must complete your profile and upload necessary documents before you can accept rides.",
        [{ text: "OK" }]
      );
      return;
    }
    if (!RIDE) return;
    const ok = await acceptRide(RIDE.id);
    if (ok) navigation.replace("ActiveRide", { rideId: RIDE.id });
  };

  const handleDecline = async () => {
    if (!RIDE) { navigation.goBack(); return; }
    await declineRide(RIDE.id);
    navigation.goBack();
  };

  if (!RIDE) {
    return (
      <View style={styles.overlay}>
        <View style={[styles.card, { alignItems: "center", paddingVertical: 40 }]}>
          <Ionicons name="car-outline" size={48} color={Colors.textMuted} />
          <Text style={{ color: Colors.textSecondary, marginTop: 12 }}>No pending ride requests</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
            <Text style={{ color: Colors.primary, fontWeight: "700" }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.overlay}>
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.6)" />

      <View style={styles.card}>
        {/* Timer */}
        <View style={styles.timerBar}>
          <Animated.View
            style={[
              styles.timerFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.timerText}>Respond in {timeLeft}s</Text>

        {/* Rider info */}
        <View style={styles.riderRow}>
          <Animated.View style={[styles.avatarWrap, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{riderInitials}</Text>
            </View>
          </Animated.View>
          <View style={styles.riderInfo}>
            <Text style={styles.riderName}>{RIDE.rider_name}</Text>
            <View style={styles.riderMeta}>
              <Ionicons name="star" size={13} color={Colors.warning} />
              <Text style={styles.riderRating}>{RIDE.rider_rating}</Text>
              <Text style={styles.riderTrips}>• {RIDE.rider_trips} trips</Text>
            </View>
            {/* Ride type/class badge */}
            <View style={styles.rideClassBadge}>
              <Text style={styles.rideClassText}>{String(RIDE.ride_class || "sedan").toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.fareBadge}>
            <Text style={styles.fareText}>{RIDE.fare}</Text>
            <Text style={styles.payType}>{RIDE.payment_method}</Text>
          </View>
        </View>

        {/* Route */}
        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <Ionicons name="radio-button-on" size={16} color={Colors.success} />
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>Pickup</Text>
              <Text style={styles.routeLocation}>{RIDE.from_location}</Text>
            </View>
            <Text style={styles.pickupEta}>{RIDE.pickup_eta}</Text>
          </View>
          <View style={styles.routeDivider} />
          <View style={styles.routeRow}>
            <Ionicons name="location" size={16} color={Colors.error} />
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>Drop-off</Text>
              <Text style={styles.routeLocation}>{RIDE.to_location}</Text>
            </View>
          </View>
        </View>

        {/* Trip Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="navigate-outline" size={18} color={Colors.primary} />
            <Text style={styles.statText}>{RIDE.distance}</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={18} color={Colors.info} />
            <Text style={styles.statText}>{RIDE.duration}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="cash-outline" size={18} color={Colors.success} />
            <Text style={styles.statText}>{RIDE.fare}</Text>
            <Text style={styles.statLabel}>Fare</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.declineBtn}
            onPress={handleDecline}
          >
            <Ionicons name="close" size={24} color={Colors.error} />
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={handleAccept}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[Colors.success, "#16A34A"]}
              style={styles.acceptGrad}
            >
              <Ionicons name="checkmark" size={24} color={Colors.white} />
              <Text style={styles.acceptText}>Accept Ride</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
    paddingTop: 8,
  },
  timerBar: { height: 4, backgroundColor: Colors.divider, borderRadius: 2, marginBottom: 6, overflow: "hidden" },
  timerFill: { height: 4, backgroundColor: Colors.primary, borderRadius: 2 },
  timerText: { textAlign: "center", fontSize: Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.lg },
  riderRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: Spacing.lg },
  avatarWrap: { shadowColor: Colors.primary, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  avatar: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center",
  },
  avatarInitial: { fontSize: 20, fontWeight: "800", color: Colors.white },
  riderInfo: { flex: 1 },
  riderName: { fontSize: Typography.body, fontWeight: "800", color: Colors.textPrimary },
  riderMeta: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 },
  riderRating: { fontSize: Typography.caption, fontWeight: "700", color: Colors.textPrimary },
  riderTrips: { fontSize: Typography.caption, color: Colors.textSecondary },
  fareBadge: { alignItems: "flex-end" },
  fareText: { fontSize: Typography.subHeading, fontWeight: "800", color: Colors.textPrimary },
  payType: { fontSize: Typography.small, color: Colors.success, fontWeight: "600", marginTop: 2 },
  routeCard: {
    backgroundColor: Colors.background, borderRadius: 18, padding: Spacing.md, marginBottom: Spacing.md,
  },
  routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  routeInfo: { flex: 1 },
  routeLabel: { fontSize: Typography.small, color: Colors.textSecondary },
  routeLocation: { fontSize: Typography.body, fontWeight: "600", color: Colors.textPrimary, marginTop: 2 },
  routeDivider: { height: 20, width: 1, backgroundColor: Colors.border, marginLeft: 7, marginVertical: 4 },
  pickupEta: { fontSize: Typography.small, color: Colors.success, fontWeight: "700" },
  statsRow: {
    flexDirection: "row", backgroundColor: Colors.background, borderRadius: 18,
    paddingVertical: Spacing.md, marginBottom: Spacing.lg,
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statText: { fontSize: Typography.body, fontWeight: "700", color: Colors.textPrimary },
  statLabel: { fontSize: Typography.small, color: Colors.textSecondary },
  statDivider: { width: 1, backgroundColor: Colors.border },
  actions: { flexDirection: "row", gap: 12 },
  declineBtn: {
    width: 110, height: 58, borderRadius: 18,
    borderWidth: 1.5, borderColor: Colors.error,
    alignItems: "center", justifyContent: "center", gap: 2,
  },
  declineText: { fontSize: Typography.small, color: Colors.error, fontWeight: "700" },
  acceptBtn: { flex: 1, borderRadius: 18, overflow: "hidden" },
  acceptGrad: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 58 },
  acceptText: { color: Colors.white, fontSize: Typography.body, fontWeight: "800" },
  rideClassBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF3D9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  rideClassText: {
    color: Colors.primary,
    fontSize: 9,
    fontWeight: "900",
  },
});
