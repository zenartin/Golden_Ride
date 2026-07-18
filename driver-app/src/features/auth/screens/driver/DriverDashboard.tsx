import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
  Image,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { Colors, Spacing, Typography } from "../../../../theme";

import { useAuthStore } from "../../../../store/authStore";
import { useAppStore } from "../../../../store/appStore";
import { useRideStore } from "../../../../store/rideStore";
import apiClient from "../../../../api/axios";
import { API_ENDPOINTS } from "../../../../api/endpoints";
import { useState } from "react";
import { openLocationInMaps } from "../../../../utils/openMaps";
import { getCurrentDeviceLocation } from "../../../../utils/deviceLocation";

interface QuickStat { label: string; value: string; icon: any; color: string; }
interface RecentTrip { id: string; from_location: string; to_location: string; fare: string; time: string; status: string; }
interface DashboardData {
  is_online: boolean;
  stats: QuickStat[];
  recent_trips: RecentTrip[];
}

type DashboardTab = "Home" | "Trips" | "Earnings" | "Messages" | "Profile";

export default function DriverDashboard({
  navigation,
  onSelectTab,
}: {
  navigation: any;
  onSelectTab?: (tab: DashboardTab) => void;
}) {
  const driver = useAuthStore((s) => s.driver);
  const toggleOnlineFn = useAuthStore((s) => s.toggleOnline);
  const notifications = useAppStore((s) => s.notifications);
  const fetchNotificationsFn = useAppStore((s) => s.fetchNotifications);

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const incomingRequests = useRideStore((s) => s.incomingRequests);
  const fetchIncomingRequests = useRideStore((s) => s.fetchIncomingRequests);

  useEffect(() => {
    loadDashboard();
    loadCurrentLocation();
    fetchNotificationsFn().catch(() => undefined);
  }, []);

  // Removed local incomingRequests navigation side-effect since it's now handled globally in the store


  const loadDashboard = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.DRIVER_DASHBOARD);
      setDashboard(response.data);
    } catch (err) {
      console.log("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        apiClient.get(API_ENDPOINTS.DRIVER_DASHBOARD).then((res) => setDashboard(res.data)),
        getCurrentDeviceLocation().then((coords) => setCurrentLocation(coords)),
        fetchNotificationsFn()
      ]);
    } catch (err) {
      console.log("Refresh error:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const loadCurrentLocation = async () => {
    setLocationLoading(true);
    const coords = await getCurrentDeviceLocation();
    setCurrentLocation(coords);
    setLocationLoading(false);
  };

  const isOnline = dashboard?.is_online ?? driver?.is_online ?? false;

  const handleToggleOnline = async () => {
    if (!isOnline && !driver?.profile_completed) {
      navigation.navigate("CompleteProfile");
      return;
    }
    await toggleOnlineFn();
    // Sync dashboard state
    setDashboard((prev) => prev ? { ...prev, is_online: !prev.is_online } : null);
  };

  const handleOpenMap = async () => {
    const coords = currentLocation ?? (await getCurrentDeviceLocation());
    if (!coords) {
      setCurrentLocation(null);
      Alert.alert(
        "Enable Location",
        "Please enable location permissions in your device settings to see your current position.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() }
        ]
      );
      return;
    }

    setCurrentLocation(coords);
    openLocationInMaps({
      latitude: coords.latitude,
      longitude: coords.longitude,
      label: "Your current location",
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loaderText}>Loading Dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stats = dashboard?.stats ?? [];
  const recentTrips = dashboard?.recent_trips ?? [];
  const driverName = driver?.name ?? "Driver";
  const initials = driverName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const ICON_COLORS: Record<string, string> = {
    "cash-outline": Colors.success,
    "car-sport-outline": Colors.info,
    "star-outline": Colors.warning,
    "navigate-outline": Colors.primary,
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.greeting}>Good day 👋</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Text style={[styles.driverName, { flexShrink: 1 }]} numberOfLines={1}>{driverName}</Text>
            {driver?.profile_completed && (
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            )}
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate("Notifications")}
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.textPrimary} />
            {notifications.filter((n) => !n.is_read).length > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {notifications.filter((n) => !n.is_read).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
        }
      >

        {/* Incomplete Profile Banner */}
        {!driver?.profile_completed && (
          <TouchableOpacity
            style={styles.incompleteProfileBanner}
            onPress={() => navigation.navigate("CompleteProfile")}
          >
            <View style={styles.warningIconContainer}>
              <Ionicons name="alert-circle" size={22} color={Colors.warning} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.bannerTitle}>Profile Incomplete</Text>
              <Text style={styles.bannerSub}>Complete your details to start accepting rides.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Online Status Card */}
        <LinearGradient
          colors={isOnline ? ["#22C55E", "#16A34A"] : ["#6B7280", "#4B5563"]}
          style={styles.statusCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View>
            <Text style={styles.statusLabel}>
              {isOnline ? "🟢  You're Online" : "⚫  You're Offline"}
            </Text>
            <Text style={styles.statusSub}>
              {isOnline ? "Accepting ride requests" : "Go online to start earning"}
            </Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={handleToggleOnline}
            thumbColor={Colors.white}
            trackColor={{ false: "#9CA3AF", true: "#86EFAC" }}
          />
        </LinearGradient>

        {/* Quick Stats Grid (2x2 for responsiveness) */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            {stats.slice(0, 2).map((s) => (
              <View key={s.label} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: (ICON_COLORS[s.icon] ?? Colors.primary) + "20" }]}>
                  <Ionicons name={s.icon} size={18} color={ICON_COLORS[s.icon] ?? Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{s.value}</Text>
                  <Text style={styles.statLabel} numberOfLines={1}>{s.label}</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={styles.statsRow}>
            {stats.slice(2, 4).map((s) => (
              <View key={s.label} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: (ICON_COLORS[s.icon] ?? Colors.primary) + "20" }]}>
                  <Ionicons name={s.icon} size={18} color={ICON_COLORS[s.icon] ?? Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{s.value}</Text>
                  <Text style={styles.statLabel} numberOfLines={1}>{s.label}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Live Map Card — shows driver's current location inline */}
        <TouchableOpacity style={styles.mapCard} onPress={handleOpenMap} activeOpacity={0.85}>
          {/* Map header */}
          <View style={styles.mapHeader}>
            <View style={styles.mapHeaderBadge}>
              <Ionicons name="location" size={14} color={Colors.primary} />
              <Text style={styles.mapHeaderBadgeText}>Your Location</Text>
            </View>
            {!locationLoading && currentLocation && (
              <View style={styles.mapLiveBadge}>
                <View style={styles.mapLiveDot} />
                <Text style={styles.mapLiveText}>LIVE</Text>
              </View>
            )}
          </View>

          {/* Map view */}
          <View style={styles.mapPreviewContainer}>
            {locationLoading ? (
              <View style={styles.mapCenter}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.mapLoadingText}>Getting your location...</Text>
              </View>
            ) : currentLocation ? (
              <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
                <MapView
                  style={styles.mapPreview}
                  provider={PROVIDER_DEFAULT}
                initialRegion={{
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                showsUserLocation={false}
                showsMyLocationButton={false}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                <Marker
                  coordinate={{
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                  }}
                  title="My Position"
                >
                  <View style={styles.currentLocationMarker}>
                    <Ionicons name="car-sport" size={22} color="#fff" />
                  </View>
                </Marker>
              </MapView>
            </View>
            ) : (
              <View style={styles.mapCenter}>
                <Ionicons name="location-outline" size={36} color={Colors.textSecondary} />
                <Text style={styles.mapErrorText}>Location unavailable</Text>
                <Text style={styles.mapErrorSub}>Tap to enable location</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Today's Earnings from API */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsTop}>
            <Text style={styles.earningsTitle}>Today's Earnings</Text>
            <TouchableOpacity onPress={() => onSelectTab?.("Earnings")}>
              <Text style={styles.earningsLink}>View All →</Text>
            </TouchableOpacity>
          </View>
          
          {(() => {
            const todayStr = stats.find((s) => s.label === "Today")?.value ?? "0";
            const amount = parseFloat(todayStr.replace(/[^0-9.]/g, "")) || 0;
            const isINR = todayStr.includes("₹");
            const dailyGoal = isINR ? 1500 : 50;
            const progress = Math.min(100, Math.max(0, (amount / dailyGoal) * 100));
            
            return (
              <>
                <Text style={styles.earningsAmount}>{todayStr}</Text>
                <View style={styles.progressBg}>
                  <View style={[styles.progressBar, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressHint}>Daily goal progress ({Math.round(progress)}%)</Text>
              </>
            );
          })()}
        </View>

        {/* Recent Trips */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Trips</Text>
            <TouchableOpacity onPress={() => onSelectTab?.("Trips")}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {recentTrips.map((trip) => (
            <View key={trip.id} style={styles.tripRow}>
              <View style={styles.tripIcon}>
                <Ionicons name="car" size={18} color={Colors.primary} />
              </View>
              <View style={styles.tripInfo}>
                <Text style={styles.tripRoute}>
                  {trip.from_location} → {trip.to_location}
                </Text>
                <Text style={styles.tripTime}>{trip.time}</Text>
              </View>
              <Text style={styles.tripFare}>{trip.fare}</Text>
            </View>
          ))}
          {recentTrips.length === 0 && (
            <Text style={styles.emptyText}>No trips yet today. Go online to start!</Text>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {[
            { icon: "help-circle-outline" as const, label: "Support", screen: "Support" },
            { icon: "settings-outline" as const, label: "Settings", screen: "Settings" },
            { icon: "person-outline" as const, label: "Profile", tab: "Profile" as DashboardTab },
          ].map((a) => (
            <TouchableOpacity
              key={a.label}
              style={styles.actionBtn}
              onPress={() => {
                if (a.tab) {
                  onSelectTab?.(a.tab);
                  return;
                }
                navigation.navigate(a.screen);
              }}
            >
              <Ionicons name={a.icon} size={22} color={Colors.primary} />
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centerLoader: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loaderText: { color: Colors.textSecondary, fontSize: Typography.body },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  greeting: { fontSize: Typography.caption, color: Colors.textSecondary, fontWeight: "500" },
  driverName: { fontSize: Typography.subHeading, fontWeight: "800", color: Colors.textPrimary },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  unreadBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.error,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  unreadBadgeText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: "900",
  },
  avatar: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: Colors.white, fontWeight: "800", fontSize: 14 },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 24, gap: 16 },
  incompleteProfileBanner: {
    backgroundColor: Colors.warningLight,
    borderRadius: 16,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  warningIconContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 8,
    shadowColor: Colors.warning,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  bannerTitle: { color: Colors.textPrimary, fontWeight: "800", fontSize: 15 },
  bannerSub: { color: Colors.textSecondary, fontSize: 12, marginTop: 2, lineHeight: 16 },
  statusCard: {
    borderRadius: 20, padding: Spacing.lg,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  statusLabel: { color: Colors.white, fontWeight: "700", fontSize: Typography.body },
  statusSub: { color: "rgba(255,255,255,0.8)", fontSize: Typography.caption, marginTop: 4 },
  statsGrid: { gap: 10 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: Spacing.md,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: Typography.body, fontWeight: "800", color: Colors.textPrimary },
  statLabel: { fontSize: Typography.caption, color: Colors.textSecondary, marginTop: 1 },
  mapCard: {
    backgroundColor: Colors.surface, borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
    padding: Spacing.md,
  },
  mapPreviewContainer: {
    height: 220,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#F4F6FA",
  },
  mapPreview: { flex: 1 },
  mapCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  mapLoadingText: { fontSize: Typography.caption, color: Colors.textSecondary },
  mapErrorText: { fontSize: Typography.body, fontWeight: "600", color: Colors.textPrimary, marginTop: 10 },
  mapErrorSub: { fontSize: Typography.small, color: Colors.textSecondary, textAlign: "center" },
  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  mapHeaderBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary + "14",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  mapHeaderBadgeText: { color: Colors.primary, fontWeight: "700", fontSize: 13 },
  mapLiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#10B98120",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  mapLiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#10B981" },
  mapLiveText: { fontSize: 11, fontWeight: "800", color: "#10B981", letterSpacing: 0.5 },
  currentLocationMarker: {
    backgroundColor: Colors.primary,
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  earningsCard: {
    backgroundColor: Colors.surface, borderRadius: 24, padding: Spacing.lg,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  earningsTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  earningsTitle: { fontSize: Typography.caption, color: Colors.textSecondary, fontWeight: "600" },
  earningsLink: { fontSize: Typography.caption, color: Colors.primary, fontWeight: "700" },
  earningsAmount: { fontSize: 32, fontWeight: "800", color: Colors.textPrimary, marginBottom: 12 },
  progressBg: { height: 8, borderRadius: 4, backgroundColor: Colors.border, marginBottom: 6 },
  progressBar: { height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  progressHint: { fontSize: Typography.small, color: Colors.textSecondary },
  section: {
    backgroundColor: Colors.surface, borderRadius: 24, padding: Spacing.lg,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.body, fontWeight: "700", color: Colors.textPrimary },
  seeAll: { fontSize: Typography.caption, color: Colors.primary, fontWeight: "700" },
  tripRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.divider },
  tripIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: "center", justifyContent: "center" },
  tripInfo: { flex: 1 },
  tripRoute: { fontSize: Typography.caption, fontWeight: "600", color: Colors.textPrimary },
  tripTime: { fontSize: Typography.small, color: Colors.textSecondary, marginTop: 2 },
  tripFare: { fontSize: Typography.body, fontWeight: "700", color: Colors.success },
  emptyText: { fontSize: Typography.caption, color: Colors.textMuted, textAlign: "center", paddingVertical: Spacing.md },
  quickActions: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 18, padding: Spacing.md,
    alignItems: "center", gap: 6,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  actionLabel: { fontSize: Typography.small, color: Colors.textPrimary, fontWeight: "600" },
});
