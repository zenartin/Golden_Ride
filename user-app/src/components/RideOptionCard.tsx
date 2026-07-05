import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Typography } from "../theme";
import { RideOption } from "../store/rideStore";

export default function RideOptionCard({
  option,
  selected,
  onPress,
}: {
  option: RideOption;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.card, selected && styles.cardSelected]}>
      <View style={styles.left}>
        <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
          <Ionicons
            name={option.id === "economy" ? "car-outline" : option.id === "comfort" ? "car-sport-outline" : "diamond-outline"}
            size={20}
            color={selected ? Colors.white : Colors.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{option.title}</Text>
          <Text style={styles.subtitle}>{option.subtitle}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.price}>Rs. {option.price}</Text>
        <Text style={styles.meta}>{option.eta} • {option.seats} seats</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  cardSelected: { borderColor: Colors.primary, backgroundColor: "#FFF8EB" },
  left: { flexDirection: "row", gap: 12, alignItems: "center" },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.primary + "22",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapSelected: { backgroundColor: Colors.primary },
  title: { color: Colors.textPrimary, fontSize: Typography.body, fontWeight: "800" },
  subtitle: { color: Colors.textSecondary, fontSize: Typography.caption, marginTop: 2 },
  right: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  price: { color: Colors.textPrimary, fontSize: Typography.body, fontWeight: "800" },
  meta: { color: Colors.textSecondary, fontSize: Typography.small },
});
