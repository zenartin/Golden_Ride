import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Colors, Spacing, Typography } from "../theme";
import { useAuthStore } from "../store/authStore";
import { Ionicons } from "@expo/vector-icons";

export default function OnlineStatusCard() {
  const driver = useAuthStore((s) => s.driver);
  const toggleOnline = useAuthStore((s) => s.toggleOnline);
  
  const isOnline = driver?.is_online || false;
  const earnings = driver?.balance || 0;
  const totalRides = (driver as any)?.total_rides || 0;
  // Mock data for rating and km since not all are in DB yet
  const rating = "4.9";
  const kmDriven = "1,240";
  const currency = driver?.country === "USA" ? "$" : "₹";

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.row}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? Colors.success : Colors.border }]} />
          <View>
            <Text style={styles.title}>{isOnline ? "You are Online" : "You are Offline"}</Text>
            <Text style={styles.subtitle}>{isOnline ? "You will receive trip requests" : "Go online to start earning"}</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={[styles.toggle, { backgroundColor: isOnline ? Colors.success : Colors.border, alignItems: isOnline ? "flex-end" : "flex-start", padding: 2 }]} 
          onPress={toggleOnline}
        >
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#fff" }} />
        </TouchableOpacity>
      </View>

      {/* Horizontal Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="cash-outline" size={16} color={Colors.primary} />
          <Text style={styles.statValue}>{currency}{earnings}</Text>
          <Text style={styles.statLabel}>Earnings</Text>
        </View>
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Ionicons name="car-sport-outline" size={16} color={Colors.primary} />
          <Text style={styles.statValue}>{totalRides}</Text>
          <Text style={styles.statLabel}>Trips</Text>
        </View>
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Ionicons name="star-outline" size={16} color="#D97706" />
          <Text style={styles.statValue}>{rating}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Ionicons name="speedometer-outline" size={16} color={Colors.primary} />
          <Text style={styles.statValue}>{kmDriven}</Text>
          <Text style={styles.statLabel}>Total KM</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    shadowColor: Colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: Spacing.md,
  },
  title: {
    fontSize: Typography.body,
    fontWeight: "700",
    color: Colors.black,
  },
  subtitle: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: Typography.caption,
  },
  toggle: {
    width: 54,
    height: 30,
    borderRadius: 18,
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
    gap: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textSecondary,
    textTransform: "uppercase",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
});
