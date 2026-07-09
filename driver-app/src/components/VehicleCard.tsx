import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Typography } from "../theme";

export default function VehicleCard() {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.vehicleTitle}>Swift Dzire</Text>
          <Text style={styles.vehicleSubtitle}>KA 01 AB 1234</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={Colors.textSecondary} />
      </View>
      <View style={styles.fuelRow}>
        <Ionicons name="water-outline" size={20} color={Colors.textSecondary} />
        <Text style={styles.fuelText}>Fuel 72%</Text>
      </View>
      <View style={styles.fuelBarBackground}>
        <View style={styles.fuelBar} />
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
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  vehicleTitle: {
    fontSize: Typography.body,
    fontWeight: "800",
    color: Colors.black,
  },
  vehicleSubtitle: {
    marginTop: 4,
    color: Colors.textSecondary,
  },
  fuelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  fuelText: {
    marginLeft: Spacing.sm,
    color: Colors.textSecondary,
    fontWeight: "700",
  },
  fuelBarBackground: {
    height: 10,
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    overflow: "hidden",
  },
  fuelBar: {
    width: "72%",
    height: "100%",
    backgroundColor: Colors.success,
  },
});
