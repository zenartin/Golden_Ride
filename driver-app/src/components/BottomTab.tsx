import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing } from "../theme";

const tabs = [
  { label: "Home", icon: "home" },
  { label: "Trips", icon: "car-outline" },
  { label: "Earnings", icon: "cash-outline" },
  { label: "Messages", icon: "chatbubble-ellipses-outline" },
  { label: "Profile", icon: "person-outline" },
];

export default function BottomTab() {
  return (
    <View style={styles.container}>
      {tabs.map((tab, index) => (
        <TouchableOpacity key={tab.label} style={styles.tab}>
          <Ionicons
            name={tab.icon as any}
            size={24}
            color={index === 0 ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[styles.label, index === 0 && { color: Colors.primary }]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 20,
    height: 72,
    backgroundColor: Colors.white,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    shadowColor: Colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
