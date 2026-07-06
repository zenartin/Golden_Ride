import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Typography } from "../theme";

type TabKey = "Home" | "Trips" | "Wallet" | "Profile";

const tabs: Array<{ key: TabKey; icon: keyof typeof Ionicons.glyphMap; label: string }> = [
  { key: "Home", icon: "car-sport-outline", label: "Book" },
  { key: "Trips", icon: "receipt-outline", label: "Trips" },
  { key: "Wallet", icon: "wallet-outline", label: "Wallet" },
  { key: "Profile", icon: "person-outline", label: "Profile" },
];

export default function BottomShellBar({
  activeTab,
  onTabPress,
}: {
  activeTab: TabKey;
  onTabPress: (tab: TabKey) => void;
}) {
  return (
    <View style={styles.wrap}>
      {tabs.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <Pressable key={tab.key} onPress={() => onTabPress(tab.key)} style={styles.tab}>
            <Ionicons name={tab.icon} size={22} color={active ? Colors.primary : Colors.textMuted} />
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  tab: { flex: 1, alignItems: "center", gap: 4 },
  label: { fontSize: Typography.tiny, color: Colors.textMuted, fontWeight: "700" },
  labelActive: { color: Colors.primary },
});
