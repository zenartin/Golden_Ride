import React from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Typography } from "../../theme";
import { callEmergencyServices } from "../../services/safetyService";

export const EmergencyCallButton = () => {
  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.8}
      onPress={callEmergencyServices}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="call" size={28} color={Colors.white} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>Call 911</Text>
        <Text style={styles.subtitle}>US emergency services</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.white} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.error,
    padding: Spacing.md,
    borderRadius: Spacing.md,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginVertical: Spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: Colors.white,
    fontSize: Typography.lg,
    fontWeight: "700",
  },
  subtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: Typography.xs,
    marginTop: 2,
  },
});
