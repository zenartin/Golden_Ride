import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Colors, Spacing, Typography } from "../theme";

export default function OnlineStatusCard() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.statusDot} />
        <View>
          <Text style={styles.title}>You are Online</Text>
          <Text style={styles.subtitle}>You will receive trip requests</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.toggle} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.lg,
    shadowColor: Colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.success,
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
    backgroundColor: Colors.success,
  },
});
