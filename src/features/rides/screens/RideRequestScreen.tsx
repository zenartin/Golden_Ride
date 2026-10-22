import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  StatusBar,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, Typography } from "../../../theme";
import { useRideStore } from "../../../store/rideStore";
import { useAuthStore } from "../../../store/authStore";
import { stopRingtone, playRingtone } from "../../../services/websocket";
import { formatDuration } from "../../../utils/formatDuration";

export default function RideRequestScreen({ navigation, route }: any) {
  const { incomingRequests, fetchIncomingRequests, acceptRide, declineRide } = useRideStore();
  const driver = useAuthStore((s) => s.driver);
  const [selectedRideId, setSelectedRideId] = useState<string | number | null>(route?.params?.rideId || null);
  const [timeLeft, setTimeLeft] = useState(30);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const RIDE = incomingRequests.find((r) => String(r.id) === String(selectedRideId)) || incomingRequests[0];

  const riderInitials = RIDE?.rider_name
    ? RIDE.rider_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "R";

  useEffect(() => {
    if (!RIDE) fetchIncomingRequests();
    if (RIDE?.id != null) {
      // Fresh sound per request id (deduped inside playRingtone)
      playRingtone(RIDE.id).catch(() => {});
    }
    setTimeLeft(30);
    progressAnim.setValue(1);
    // Countdown
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          stopRingtone().catch(() => {});
          if (navigation.canGoBack()) navigation.goBack();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    // Progress bar
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 30000,
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

  // Fully unload the sound whenever this screen goes away
  useEffect(() => {
    return () => {
      // Don't silence a newer incoming request's ringtone
      if (useRideStore.getState().incomingRequests.length === 0) stopRingtone().catch(() => {});
    };
  }, []);

  const moveToNextOrClose = () => {
    stopRingtone().catch(() => {});
    const store = useRideStore.getState();
    const remaining = store.incomingRequests.filter(r => String(r.id) !== String(RIDE?.id));
    if (remaining.length > 0) {
      // Switch in place (no stacked duplicate screens); effect above plays a fresh sound
      setSelectedRideId(remaining[0].id);
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

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
    await stopRingtone();
    const ok = await acceptRide(RIDE.id);
    if (ok) navigation.reset({ index: 1, routes: [{ name: "DriverDashboard" }, { name: "ActiveRide", params: { rideId: RIDE.id } }] });
  };

  const handleDecline = async () => {
    if (!RIDE) { navigation.goBack(); return; }
    await stopRingtone();
    await declineRide(RIDE.id);
    moveToNextOrClose();
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
        {/* Multi-Request Switcher Tabs if more than 1 pending */}
        {incomingRequests.length > 1 && (
          <View style={styles.multiReqContainer}>
            <Text style={styles.multiReqLabel}>
              Pending Requests ({incomingRequests.length})
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.multiReqScroll}
            >
              {incomingRequests.map((req, idx) => {
                const isSelected = String(req.id) === String(RIDE?.id);
                return (
                  <TouchableOpacity
                    key={req.id}
                    onPress={() => setSelectedRideId(req.id)}
                    style={[
                      styles.multiReqChip,
                      isSelected && styles.multiReqChipActive,
                    ]}
                  >
                    <Ionicons
                      name="car"
                      size={14}
                      color={isSelected ? Colors.white : Colors.primary}
                    />
                    <Text
                      style={[
                        styles.multiReqText,
                        isSelected && styles.multiReqTextActive,
                      ]}
                    >
                      {req.rider_name ? req.rider_name.split(" ")[0] : `Ride #${idx + 1}`} ({req.fare || `$${req.fare_amount || 0}`})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

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
              {RIDE.rider_avatar ? (
                <Image source={{ uri: RIDE.rider_avatar }} style={{ width: "100%", height: "100%", borderRadius: 18 }} />
              ) : (
                <Text style={styles.avatarInitial}>{riderInitials}</Text>
              )}
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
              <Text style={styles.rideClassText}>{String((RIDE as any).ride_class || "sedan").toUpperCase()}</Text>
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
            <Text style={styles.pickupEta}>{formatDuration(RIDE.pickup_eta)}</Text>
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
            <Text style={styles.statText}>{formatDuration(RIDE.duration as any)}</Text>
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
  multiReqContainer: {
    marginBottom: 12,
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  multiReqLabel: {
    fontSize: Typography.small,
    fontWeight: "800",
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  multiReqScroll: {
    gap: 8,
    flexDirection: "row",
  },
  multiReqChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  multiReqChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  multiReqText: {
    fontSize: Typography.caption,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  multiReqTextActive: {
    color: Colors.white,
    fontWeight: "800",
  },
});
