import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Typography } from "../../../theme";
import { useRideStore, Ride } from "../../../store/rideStore";

type TripStatus = "completed" | "cancelled" | "ongoing" | "pending" | "accepted" | "arrived" | "started" | "declined";

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  completed: { label: "Completed", color: Colors.success, bg: Colors.successLight },
  cancelled:  { label: "Cancelled",  color: Colors.error,   bg: Colors.errorLight   },
  ongoing:    { label: "Ongoing",    color: Colors.warning,  bg: Colors.warningLight  },
  pending:    { label: "Pending",    color: Colors.info,     bg: Colors.infoLight ?? "#EFF6FF" },
  accepted:   { label: "Accepted",   color: Colors.info,     bg: Colors.infoLight ?? "#EFF6FF" },
  arrived:    { label: "Arrived",    color: Colors.warning,  bg: Colors.warningLight  },
  started:    { label: "In Progress",color: Colors.warning,  bg: Colors.warningLight  },
  declined:   { label: "Declined",   color: Colors.error,    bg: Colors.errorLight   },
};

export default function TripsScreen({ navigation }: any) {
  const { history, isLoading, fetchRideHistory } = useRideStore();
  const [filter, setFilter] = useState<"all" | TripStatus>("all");

  useEffect(() => {
    fetchRideHistory();
  }, []);

  const filtered = filter === "all" ? history : history.filter((t) => t.status === filter);

  const completedCount = history.filter((t) => t.status === "completed").length;
  const cancelledCount = history.filter((t) => t.status === "cancelled" || t.status === "declined").length;

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    return (
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((s) => (
          <Ionicons
            key={s}
            name={s <= rating ? "star" : "star-outline"}
            size={11}
            color={Colors.warning}
          />
        ))}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>My Trips</Text>
        <TouchableOpacity style={styles.filterIconBtn} onPress={() => fetchRideHistory()}>
          <Ionicons name="refresh-outline" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Summary Row */}
      <View style={styles.summaryRow}>
        {[
          { label: "Total", value: history.length.toString(), color: Colors.info },
          { label: "Completed", value: completedCount.toString(), color: Colors.success },
          { label: "Cancelled", value: cancelledCount.toString(), color: Colors.error },
        ].map((s) => (
          <View key={s.label} style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.summaryLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(["all", "completed", "cancelled"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === "all" ? "All Trips" : statusConfig[f].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => `${item.id}-${item.created_at ?? item.from_location}-${item.to_location}`}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onRefresh={fetchRideHistory}
        refreshing={isLoading}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No trips found</Text>
          </View>
        }
        renderItem={({ item }) => {
          const conf = statusConfig[item.status] ?? statusConfig.completed;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("TripDetail", { tripId: item.id, trip: item })}
              activeOpacity={0.85}
            >
              {/* Date badge */}
              <View style={styles.cardTop}>
                <Text style={styles.tripDate}>{item.created_at?.slice(0, 10) ?? "—"}</Text>
                <View style={[styles.statusPill, { backgroundColor: conf.bg }]}>
                  <Text style={[styles.statusText, { color: conf.color }]}>{conf.label}</Text>
                </View>
              </View>

              {/* Route */}
              <View style={styles.routeBlock}>
                <View style={styles.routeDot}>
                  <View style={[styles.dot, { backgroundColor: Colors.success }]} />
                  <View style={styles.routeLine} />
                  <View style={[styles.dot, { backgroundColor: Colors.error }]} />
                </View>
                <View style={styles.routeText}>
                  <Text style={styles.location}>{item.from_location}</Text>
                  <View style={{ height: 12 }} />
                  <Text style={styles.location}>{item.to_location}</Text>
                </View>
              </View>

              {/* Footer */}
              <View style={styles.cardFooter}>
                <View style={styles.metaRow}>
                  <Ionicons name="navigate-outline" size={13} color={Colors.textSecondary} />
                  <Text style={styles.metaText}>{item.distance}</Text>
                  <Ionicons name="time-outline" size={13} color={Colors.textSecondary} />
                  <Text style={styles.metaText}>{item.duration}</Text>
                  {renderStars(item.rider_rating)}
                </View>
                <Text style={styles.fareText}>{item.fare}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
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
  pageTitle: { fontSize: Typography.heading, fontWeight: "800", color: Colors.textPrimary },
  filterIconBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surface,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  summaryRow: {
    flexDirection: "row", marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: 18,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  summaryItem: { flex: 1, alignItems: "center", paddingVertical: Spacing.md },
  summaryValue: { fontSize: Typography.heading, fontWeight: "800" },
  summaryLabel: { fontSize: Typography.small, color: Colors.textSecondary, marginTop: 2 },
  filterRow: { flexDirection: "row", paddingHorizontal: Spacing.lg, gap: 8, marginBottom: Spacing.md },
  filterTab: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
  },
  filterTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: Typography.caption, fontWeight: "600", color: Colors.textSecondary },
  filterTextActive: { color: Colors.white },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: 12 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: Spacing.md,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md },
  tripDate: { fontSize: Typography.small, color: Colors.textSecondary },
  statusPill: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 20 },
  statusText: { fontSize: Typography.small, fontWeight: "700" },
  routeBlock: { flexDirection: "row", gap: 12, marginBottom: Spacing.md },
  routeDot: { alignItems: "center", paddingTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  routeLine: { width: 2, flex: 1, backgroundColor: Colors.border, marginVertical: 3 },
  routeText: { flex: 1 },
  location: { fontSize: Typography.caption, fontWeight: "600", color: Colors.textPrimary },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: Spacing.sm },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: Typography.small, color: Colors.textSecondary, marginRight: 4 },
  stars: { flexDirection: "row", gap: 1, marginLeft: 4 },
  fareText: { fontSize: Typography.body, fontWeight: "800", color: Colors.textPrimary },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: Typography.body, color: Colors.textMuted },
});
