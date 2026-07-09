import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Typography } from "../theme";

const actions = [
  { icon: "car-sport", label: "My Trips", color: "#FEF3C7" },
  { icon: "wallet-outline", label: "Earnings", color: "#DBEAFE" },
  { icon: "star-outline", label: "Ratings", color: "#EDE9FE" },
  { icon: "headset-outline", label: "Support", color: "#DCFCE7" },
];

export default function QuickActions() {
  return (
    <View style={styles.container}>
      {actions.map((item) => (
        <TouchableOpacity key={item.label} style={[styles.card, { backgroundColor: item.color }]}> 
          <Ionicons name={item.icon as any} size={22} color={Colors.black} />
          <Text style={styles.label}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  card: {
    flex: 1,
    borderRadius: 22,
    padding: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
    minHeight: 110,
  },
  label: {
    marginTop: 10,
    fontWeight: "700",
    color: Colors.black,
    textAlign: "center",
  },
});
