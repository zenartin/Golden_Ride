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
  Modal,
  TouchableWithoutFeedback,
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
import { BASE_URL } from "../../../../api/axios";
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
  const setDestinationMode = useAuthStore((s) => s.setDestinationMode);
  const notifications = useAppStore((s) => s.notifications);
  const fetchNotificationsFn = useAppStore((s) => s.fetchNotifications);

  const updateProfile = useAuthStore((s) => s.updateProfile);

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [pendingAcceptedClasses, setPendingAcceptedClasses] = useState<string[]>([]);
  const [pendingRadiusFilter, setPendingRadiusFilter] = useState<number>(0);
  const [savingFilter, setSavingFilter] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [earningsFilter, setEarningsFilter] = useState<"daily" | "weekly">("daily");
  const [showEarningsDropdown, setShowEarningsDropdown] = useState(false);

  const incomingRequests = useRideStore((s) => s.incomingRequests);
  const activeRide = useRideStore((s) => s.activeRide);
  const fetchIncomingRequests = useRideStore((s) => s.fetchIncomingRequests);

  useEffect(() => {
    loadDashboard();
  }, [earningsFilter]);

  useEffect(() => {
    loadCurrentLocation();
    fetchNotificationsFn().catch(() => undefined);
  }, []);

  const isOnline = dashboard?.is_online ?? driver?.is_online ?? false;
  const acceptedClassesStr = driver?.accepted_ride_classes || "";
  const acceptedClasses = acceptedClassesStr.split(",").map((c: string) => c.trim()).filter(Boolean);
  const radiusFilter = driver?.radius_filter || 0;

  useEffect(() => {
    if (!isOnline) return;
    fetchIncomingRequests().catch(() => undefined);
    const interval = setInterval(() => {
      fetchIncomingRequests().catch(() => undefined);
    }, 4000);
    return () => clearInterval(interval);
  }, [isOnline]);


  const loadDashboard = async () => {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.DRIVER_DASHBOARD}?filter=${earningsFilter}`);
      setDashboard(response.data);
    } catch (err) {
      console.log("Dashboard load error:", err);
      // Fallback default stats so UI never hangs on loading spinners
      setDashboard({
        is_online: driver?.is_online ?? false,
        stats: [
          { label: "Today", value: `$0.00`, icon: "cash-outline", color: "#22C55E" },
          { label: "Trips", value: `${driver?.total_rides || 0}`, icon: "car-sport-outline", color: "#3B82F6" },
          { label: "Rating", value: `${driver?.rating ? driver.rating.toFixed(1) : "5.0"}`, icon: "star-outline", color: "#F59E0B" },
          { label: "Miles", value: "0", icon: "navigate-outline", color: "#3B5FC0" },
        ],
        recent_trips: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        apiClient.get(`${API_ENDPOINTS.DRIVER_DASHBOARD}?filter=${earningsFilter}`).then((res) => setDashboard(res.data)),
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

  const handleToggleOnline = async () => {
    if (!isOnline && !driver?.profile_completed) {
      navigation.navigate("CompleteProfile");
      return;
    }
    try {
      await toggleOnlineFn();
      // Sync dashboard state
      setDashboard((prev) => prev ? { ...prev, is_online: !prev.is_online } : null);
    } catch (err: any) {
      Alert.alert("Cannot Go Online", err.response?.data?.detail || "An error occurred.");
    }
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

  const handleClearDestination = async () => {
    await setDestinationMode(false);
  };

  // Dashboard renders immediately — stats load in background

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
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
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
          {(() => {
            const avatarUrl = driver?.avatar
              ? driver.avatar.startsWith("http")
                ? driver.avatar
                : `${BASE_URL.replace("/api", "")}${driver.avatar}`
              : null;
            return (
              <TouchableOpacity style={styles.avatar}>
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatarImg}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
              </TouchableOpacity>
            );
          })()}
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

        {/* Ongoing Active Ride Card */}
        {activeRide && (activeRide.status === "accepted" || activeRide.status === "arrived" || activeRide.status === "started") && (
          <TouchableOpacity
            style={styles.activeRideDashCard}
            onPress={() => navigation.navigate("ActiveRide", { rideId: activeRide.id })}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={["#059669", "#10B981"]}
              style={styles.activeGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.activeDashTop}>
                <View style={styles.activeBadgeTextRow}>
                  <View style={styles.activePulseDot} />
                  <Text style={styles.activeBadgeTitle}>ACTIVE RIDE IN PROGRESS</Text>
                </View>
                <Text style={styles.activeFareText}>{activeRide.fare}</Text>
              </View>

              <Text style={styles.activeRiderName}>Passenger: {activeRide.rider_name}</Text>
              <Text style={styles.activeRouteText} numberOfLines={1}>
                📍 {activeRide.from_location} ➔ 🏁 {activeRide.to_location}
              </Text>

              <View style={styles.activeResumeBtn}>
                <Text style={styles.activeResumeBtnText}>Resume Active Trip Navigation ➔</Text>
              </View>
            </LinearGradient>
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

        {/* Active Filters UI */}
        <View style={styles.rideModelsContainer}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.sm }}>
            <Text style={styles.rideModelsTitle}>Active Filters</Text>
            <TouchableOpacity onPress={() => {
              setPendingAcceptedClasses(acceptedClasses);
              setPendingRadiusFilter(radiusFilter);
              setFilterModalVisible(true);
            }} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 12, color: Colors.primary, fontWeight: "600" }}>Edit Filter</Text>
              <Ionicons name="pencil-outline" size={12} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rideModelsScroll}>
            {acceptedClasses.length > 0 ? acceptedClasses.map((cls) => (
              <View key={cls} style={[styles.pill, styles.pillSelected]}>
                <Text style={[styles.pillText, styles.pillTextSelected]}>
                  {cls.replace("Golden Ride", "").trim() || "Golden Ride"}
                </Text>
              </View>
            )) : (
              <Text style={{ color: Colors.textSecondary, fontSize: 13 }}>No models selected.</Text>
            )}
          </ScrollView>

          <View style={{ flexDirection: "row", alignItems: "center", marginTop: Spacing.md, gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="scan-circle-outline" size={14} color={Colors.textSecondary} />
              <Text style={{ fontSize: 13, color: Colors.textSecondary }}>
                Radius: <Text style={{ color: Colors.primary, fontWeight: "600" }}>{radiusFilter > 0 ? `${radiusFilter} km` : "All"}</Text>
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="navigate-outline" size={14} color={Colors.textSecondary} />
              <Text style={{ fontSize: 13, color: Colors.textSecondary }}>
                Destination: <Text style={{ color: Colors.primary, fontWeight: "600" }}>{driver?.destination_mode_active ? "ON" : "OFF"}</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Stats Grid (2x2 for responsiveness) */}
        {!dashboard ? (
          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              {[{ label: "Today", icon: "cash-outline" }, { label: "Trips", icon: "car-sport-outline" }].map((s) => (
                <View key={s.label} style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: (ICON_COLORS[s.icon] ?? Colors.primary) + "20" }]}>
                    <Ionicons name={s.icon as any} size={18} color={ICON_COLORS[s.icon] ?? Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ActivityIndicator size="small" color={Colors.primary} style={{ alignSelf: "flex-start" }} />
                    <Text style={styles.statLabel} numberOfLines={1}>{s.label}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={styles.statsRow}>
              {[{ label: "Rating", icon: "star-outline" }, { label: "Km", icon: "navigate-outline" }].map((s) => (
                <View key={s.label} style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: (ICON_COLORS[s.icon] ?? Colors.primary) + "20" }]}>
                    <Ionicons name={s.icon as any} size={18} color={ICON_COLORS[s.icon] ?? Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ActivityIndicator size="small" color={Colors.primary} style={{ alignSelf: "flex-start" }} />
                    <Text style={styles.statLabel} numberOfLines={1}>{s.label}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : (
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
        )}

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

        {/* Earnings from API */}
        <View style={styles.earningsCard}>
          <View style={[styles.earningsTop, { alignItems: 'center', marginBottom: 12 }]}>
            <Text style={[styles.earningsTitle, { marginBottom: 0 }]}>Earnings</Text>
            
            <View>
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.border }}
                onPress={() => setShowEarningsDropdown(true)}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.textPrimary, marginRight: 4 }}>
                  {earningsFilter === "daily" ? "Daily" : "Weekly"}
                </Text>
                <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
              
              <Modal visible={showEarningsDropdown} transparent animationType="fade">
                <TouchableWithoutFeedback onPress={() => setShowEarningsDropdown(false)}>
                  <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
                    <TouchableWithoutFeedback>
                      <View style={{ backgroundColor: '#fff', borderRadius: 12, width: 220, overflow: 'hidden' }}>
                        <TouchableOpacity 
                          style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: earningsFilter === "daily" ? Colors.primary + "15" : "#fff" }}
                          onPress={() => { setEarningsFilter("daily"); setShowEarningsDropdown(false); }}
                        >
                          <Text style={{ fontSize: 16, fontWeight: "600", color: earningsFilter === "daily" ? Colors.primary : Colors.textPrimary, textAlign: 'center' }}>Daily Earnings</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={{ padding: 16, backgroundColor: earningsFilter === "weekly" ? Colors.primary + "15" : "#fff" }}
                          onPress={() => { setEarningsFilter("weekly"); setShowEarningsDropdown(false); }}
                        >
                          <Text style={{ fontSize: 16, fontWeight: "600", color: earningsFilter === "weekly" ? Colors.primary : Colors.textPrimary, textAlign: 'center' }}>Weekly Earnings</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableWithoutFeedback>
                  </View>
                </TouchableWithoutFeedback>
              </Modal>
            </View>
          </View>
          
          {(() => {
            const statObj = stats.find((s) => s.label === "Today" || s.label === "This Week");
            const earningsStr = statObj?.value ?? "0";
            const amount = parseFloat(earningsStr.replace(/[^0-9.]/g, "")) || 0;
            const goal = earningsFilter === "daily" ? 50 : 350;
            const progress = Math.min(100, Math.max(0, (amount / goal) * 100));
            
            return (
              <>
                <Text style={styles.earningsAmount}>{earningsStr}</Text>
                <View style={styles.progressBg}>
                  <View style={[styles.progressBar, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressHint}>
                  {earningsFilter === "daily" ? "Daily" : "Weekly"} goal progress ({Math.round(progress)}%)
                </Text>
              </>
            );
          })()}

          <TouchableOpacity onPress={() => onSelectTab?.("Earnings")} style={{ marginTop: 16, alignItems: 'center', paddingVertical: 8, backgroundColor: Colors.background, borderRadius: 8, borderWidth: 1, borderColor: Colors.border }}>
            <Text style={styles.earningsLink}>View Full Details →</Text>
          </TouchableOpacity>
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

      {/* Filter Modal */}
      <Modal visible={filterModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Filters</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
              <Text style={styles.filterSectionTitle}>Destination Mode</Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.xl }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.textPrimary }}>
                    {driver?.destination_mode_active ? "Active" : "Inactive"}
                  </Text>
                  <Text style={{ fontSize: 12, color: Colors.textSecondary, marginTop: 4 }} numberOfLines={1}>
                    {driver?.destination_mode_active ? driver.destination_address : "Receive trips towards a location"}
                  </Text>
                </View>
                {driver?.destination_mode_active ? (
                  <TouchableOpacity style={styles.destClearBtn} onPress={handleClearDestination}>
                    <Text style={[styles.destSetText, { color: Colors.error }]}>Clear</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.destSetBtn} onPress={() => { setFilterModalVisible(false); navigation.navigate("DestinationPicker"); }}>
                    <Text style={styles.destSetText}>Set</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.filterSectionTitle}>Accepted Ride Models</Text>
              <View style={styles.pickerRow}>
                {["Golden Ride Sedan", "Golden Ride SUV", "Golden Ride Van", "Golden RideX", "Golden RideXL", "Golden Ride Pet"].map((opt) => {
                  const isSelected = pendingAcceptedClasses.includes(opt);
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.pickerBtn, isSelected && styles.pickerBtnActive]}
                      onPress={() => {
                        setPendingAcceptedClasses(prev => 
                          prev.includes(opt) ? prev.filter(c => c !== opt) : [...prev, opt]
                        );
                      }}
                    >
                      <Text style={[styles.pickerText, isSelected && styles.pickerTextActive]}>
                        {opt.replace("Golden Ride", "").trim() || "Golden Ride"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.filterSectionTitle, { marginTop: Spacing.xl }]}>Ride Request Radius</Text>
              <View style={styles.pickerRow}>
                {[
                  { label: "All requests", value: 0 },
                  { label: "5 km", value: 5 },
                  { label: "10 km", value: 10 }
                ].map((opt) => {
                  const isSelected = pendingRadiusFilter === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.label}
                      style={[styles.pickerBtn, isSelected && styles.pickerBtnActive]}
                      onPress={() => setPendingRadiusFilter(opt.value)}
                    >
                      <Text style={[styles.pickerText, isSelected && styles.pickerTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={{ padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.divider }}>
              <TouchableOpacity
                style={styles.saveFilterBtn}
                disabled={savingFilter}
                onPress={async () => {
                  setSavingFilter(true);
                  await updateProfile({
                    accepted_ride_classes: pendingAcceptedClasses.join(","),
                    radius_filter: pendingRadiusFilter,
                  });
                  setSavingFilter(false);
                  setFilterModalVisible(false);
                }}
              >
                {savingFilter ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.saveFilterBtnText}>Save Filters</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    overflow: "hidden",
  },
  avatarImg: { width: 44, height: 44, borderRadius: 14 },
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
    width: 36,
    height: 36,
    borderRadius: 18,
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
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContainer: { backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  modalTitle: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary },
  filterSectionTitle: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary, marginBottom: Spacing.sm },
  pickerRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  pickerBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  pickerBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pickerText: { fontSize: 13, color: Colors.textPrimary, fontWeight: "500" },
  pickerTextActive: { color: Colors.white, fontWeight: "700" },
  saveFilterBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  saveFilterBtnText: { color: Colors.white, fontSize: 15, fontWeight: "700" },
  rideModelsContainer: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: Spacing.md,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  rideModelsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  rideModelsScroll: {
    gap: Spacing.sm,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  pillTextSelected: {
    color: Colors.white,
  },
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
  activeRideDashCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#10B981",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  activeGradient: {
    padding: Spacing.lg,
    borderRadius: 20,
  },
  activeDashTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  activeBadgeTextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  activePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  activeBadgeTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  activeFareText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 20,
  },
  activeRiderName: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 4,
  },
  activeRouteText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    marginBottom: 12,
  },
  activeResumeBtn: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  activeResumeBtnText: {
    color: "#059669",
    fontWeight: "800",
    fontSize: 13,
  },
  destinationCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  destinationHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  destinationTitle: {
    fontWeight: "700",
    color: Colors.textPrimary,
    fontSize: 15,
  },
  destinationSub: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  destinationAddress: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  destSetBtn: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  destSetText: {
    color: Colors.primary,
    fontWeight: "700",
  },
  destClearBtn: {
    backgroundColor: Colors.error + "20",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  destClearText: {
    color: Colors.error,
    fontWeight: "700",
  },
});
