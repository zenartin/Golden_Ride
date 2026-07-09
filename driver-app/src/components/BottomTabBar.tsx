import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Typography } from "../theme";

interface Tab {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}

const TABS: Tab[] = [
  { name: "Home", label: "Home", icon: "home-outline", activeIcon: "home" },
  { name: "Trips", label: "Trips", icon: "car-outline", activeIcon: "car" },
  { name: "Earnings", label: "Earnings", icon: "cash-outline", activeIcon: "cash" },
  { name: "Messages", label: "Messages", icon: "chatbubble-outline", activeIcon: "chatbubble" },
  { name: "Profile", label: "Profile", icon: "person-outline", activeIcon: "person" },
];

interface Props {
  activeTab: string;
  onTabPress: (name: string) => void;
}

export default function BottomTabBar({ activeTab, onTabPress }: Props) {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.name;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => onTabPress(tab.name)}
            activeOpacity={0.7}
          >
            {isActive && <View style={styles.activeIndicator} />}
            <Ionicons
              name={isActive ? tab.activeIcon : tab.icon}
              size={24}
              color={isActive ? Colors.primary : Colors.textSecondary}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    height: 64,
    alignItems: "center",
    justifyContent: "space-between",
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 8,
    position: "relative",
  },
  activeIndicator: {
    position: "absolute",
    top: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  label: {
    marginTop: 4,
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  labelActive: {
    color: Colors.primary,
    fontWeight: "700",
  },
});
