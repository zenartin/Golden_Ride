import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, Spacing, Typography } from "../../theme";

interface Props {
  label: string;
  value: string;
  color?: string;
}

export default function StatBadge({ label, value, color = Colors.primary }: Props) {
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: Colors.surface,
    minWidth: 80,
  },
  value: {
    fontSize: Typography.subHeading,
    fontWeight: "800",
  },
  label: {
    fontSize: Typography.small,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
