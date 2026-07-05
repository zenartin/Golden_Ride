import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors, Spacing, Typography } from "../theme";

type Action = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
};

export default function UserQuickActions({ actions }: { actions: Action[] }) {
  return (
    <View style={styles.container}>
      {actions.map((item) => (
        <Pressable key={item.label} style={[styles.card, { backgroundColor: item.color }]} onPress={item.onPress}>
          <Ionicons name={item.icon} size={22} color={Colors.black} />
          <Text style={styles.label}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  card: {
    flex: 1,
    minHeight: 96,
    borderRadius: 18,
    padding: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    marginTop: 8,
    color: Colors.black,
    fontSize: Typography.small,
    fontWeight: "800",
    textAlign: "center",
  },
});
