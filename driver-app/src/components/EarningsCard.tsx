import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Typography } from "../theme";

const stats = [
  { icon: "timer-outline", label: "Online Time", value: "06h 30m" },
  { icon: "navigate-outline", label: "Distance", value: "112 km" },
  { icon: "star-outline", label: "Rating", value: "4.8" },
];

export default function EarningsCard() {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.title}>Today's Earnings</Text>
          <Text style={styles.amount}>₹2,450.00</Text>
          <Text style={styles.subtitle}>8 Trips Completed</Text>
        </View>
        <Text style={styles.detail}>View Details</Text>
      </View>

      <View style={styles.statsRow}>
        {stats.map((item) => (
          <View key={item.label} style={styles.statItem}>
            <View style={styles.iconCircle}>
              <Ionicons name={item.icon as any} size={18} color={Colors.white} />
            </View>
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 28,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: Colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
  },
  title: {
    color: Colors.textSecondary,
    fontSize: Typography.caption,
    fontWeight: "700",
  },
  amount: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: "800",
    color: Colors.black,
  },
  subtitle: {
    marginTop: 6,
    color: Colors.textSecondary,
  },
  detail: {
    color: Colors.primary,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statValue: {
    fontWeight: "700",
    color: Colors.black,
  },
  statLabel: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: Typography.caption,
    textAlign: "center",
  },
});
