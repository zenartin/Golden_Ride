import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, Typography } from "../../../theme";
import apiClient from "../../../api/axios";
import { API_ENDPOINTS } from "../../../api/endpoints";

export default function TripDetailScreen({ navigation, route }: any) {
  const tripId = route?.params?.tripId ?? "1";
  const [trip, setTrip] = useState<any>(route?.params?.trip ?? null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (trip) {
      setLoading(false);
      return;
    }

    loadTripDetails();
  }, [tripId]);

  const loadTripDetails = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.RIDES_DETAIL(tripId));
      setTrip(response.data);
    } catch (err) {
      console.log("Load trip detail error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerLoader}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Trip Details</Text>
          <View style={styles.shareBtn} />
        </View>
        <View style={styles.centerLoader}>
          <Ionicons name="car-outline" size={48} color={Colors.textMuted} />
          <Text style={{ color: Colors.textSecondary, marginTop: 12, fontSize: 15 }}>Trip not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const TRIP = trip;

  const formattedDate = TRIP.created_at ? TRIP.created_at.slice(0, 10) : "Today";
  const formattedTime = TRIP.created_at ? TRIP.created_at.slice(11, 16) : "10:30 AM";

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Trip Details</Text>
        <TouchableOpacity style={styles.shareBtn}>
          <Ionicons name="share-outline" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Status Banner */}
        <LinearGradient colors={[Colors.success, "#16A34A"]} style={styles.banner}>
          <Ionicons name="checkmark-circle" size={32} color={Colors.white} />
          <View>
            <Text style={styles.bannerTitle}>Trip Completed</Text>
            <Text style={styles.bannerSub}>{formattedDate} • {formattedTime}</Text>
          </View>
          <View style={styles.fareChip}>
            <Text style={styles.fareChipText}>{TRIP.fare}</Text>
          </View>
        </LinearGradient>

        {/* Route Map Placeholder */}
        <View style={styles.mapCard}>
          <LinearGradient colors={["#1E3A8A", "#3B82F6"]} style={styles.mapGrad}>
            <Ionicons name="map" size={32} color="rgba(255,255,255,0.5)" />
            <Text style={styles.mapLabel}>Route Map</Text>
          </LinearGradient>
        </View>

        {/* Route Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Route</Text>
          <View style={styles.routeRow}>
            <Ionicons name="radio-button-on" size={16} color={Colors.success} />
            <View style={styles.routeInfo}>
              <Text style={styles.routeType}>Pickup</Text>
              <Text style={styles.routeAddr}>{TRIP.from_location}</Text>
            </View>
          </View>
          <View style={styles.routeConnector}>
            <View style={styles.dashLine} />
          </View>
          <View style={styles.routeRow}>
            <Ionicons name="location" size={16} color={Colors.error} />
            <View style={styles.routeInfo}>
              <Text style={styles.routeType}>Drop-off</Text>
              <Text style={styles.routeAddr}>{TRIP.to_location}</Text>
            </View>
          </View>
        </View>

        {/* Trip Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trip Info</Text>
          {[
            { label: "Trip ID", value: `#${TRIP.id}` },
            { label: "Date & Time", value: `${formattedDate} ${formattedTime}` },
            { label: "Distance", value: TRIP.distance },
            { label: "Duration", value: TRIP.duration },
            { label: "Payment Method", value: TRIP.payment_method },
          ].map((row, i) => (
            <View key={row.label} style={[styles.infoRow, i > 0 && styles.rowBorder]}>
              <Text style={styles.infoLabel}>{row.label}</Text>
              <Text style={styles.infoValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Fare Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fare Breakdown</Text>
          {[
            { label: "Ride Fare", value: TRIP.fare },
            { label: "Surge Bonus", value: "₹0" },
            { label: "Tip", value: "₹0" },
          ].map((row, i) => (
            <View key={row.label} style={[styles.infoRow, i > 0 && styles.rowBorder]}>
              <Text style={styles.infoLabel}>{row.label}</Text>
              <Text style={styles.infoValue}>{row.value}</Text>
            </View>
          ))}
          <View style={[styles.infoRow, styles.rowBorder, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Earned</Text>
            <Text style={styles.totalValue}>{TRIP.fare}</Text>
          </View>
        </View>

        {/* Rider & Rating */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Rider</Text>
          <View style={styles.riderRow}>
            <View style={styles.riderAvatar}>
              <Text style={styles.riderInitial}>{TRIP.rider_name ? TRIP.rider_name.charAt(0) : "R"}</Text>
            </View>
            <View style={styles.riderInfo}>
              <Text style={styles.riderName}>{TRIP.rider_name}</Text>
              <Text style={styles.riderTrips}>{TRIP.rider_trips} trips</Text>
            </View>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons
                  key={s}
                  name={s <= Math.round(TRIP.rider_rating) ? "star" : "star-outline"}
                  size={18}
                  color={Colors.warning}
                />
              ))}
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centerLoader: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surface,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  shareBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surface,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  pageTitle: { fontSize: Typography.subHeading, fontWeight: "800", color: Colors.textPrimary },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 40, gap: 14 },
  banner: {
    borderRadius: 20, padding: Spacing.lg,
    flexDirection: "row", alignItems: "center", gap: 14,
  },
  bannerTitle: { color: Colors.white, fontSize: Typography.body, fontWeight: "800" },
  bannerSub: { color: "rgba(255,255,255,0.8)", fontSize: Typography.small, marginTop: 2 },
  fareChip: {
    marginLeft: "auto",
    backgroundColor: "rgba(255,255,255,0.25)", paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20,
  },
  fareChipText: { color: Colors.white, fontWeight: "800", fontSize: Typography.subHeading },
  mapCard: { borderRadius: 18, overflow: "hidden" },
  mapGrad: { height: 100, alignItems: "center", justifyContent: "center", gap: 6 },
  mapLabel: { color: "rgba(255,255,255,0.8)", fontSize: Typography.caption },
  card: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: Spacing.md,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardTitle: { fontSize: Typography.body, fontWeight: "700", color: Colors.textPrimary, marginBottom: Spacing.md },
  routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  routeInfo: { flex: 1 },
  routeType: { fontSize: Typography.small, color: Colors.textSecondary },
  routeAddr: { fontSize: Typography.caption, fontWeight: "600", color: Colors.textPrimary, marginTop: 2 },
  routeConnector: { paddingLeft: 6, paddingVertical: 4 },
  dashLine: { height: 24, width: 1.5, backgroundColor: Colors.border },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.divider },
  infoLabel: { fontSize: Typography.caption, color: Colors.textSecondary },
  infoValue: { fontSize: Typography.caption, fontWeight: "600", color: Colors.textPrimary, textAlign: "right", maxWidth: "60%" },
  totalRow: { paddingTop: 14 },
  totalLabel: { fontSize: Typography.body, fontWeight: "700", color: Colors.textPrimary },
  totalValue: { fontSize: Typography.body, fontWeight: "800", color: Colors.success },
  riderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  riderAvatar: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center",
  },
  riderInitial: { fontSize: 18, fontWeight: "800", color: Colors.white },
  riderInfo: { flex: 1 },
  riderName: { fontSize: Typography.body, fontWeight: "700", color: Colors.textPrimary },
  riderTrips: { fontSize: Typography.small, color: Colors.textSecondary, marginTop: 2 },
  stars: { flexDirection: "row", gap: 2 },
});
