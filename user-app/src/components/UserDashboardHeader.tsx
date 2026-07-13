import React from "react";
import { Pressable, StyleSheet, Text, View, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthStore } from "../store/authStore";
import { Colors, Spacing, Typography } from "../theme";

type Props = {
  activeTab: string;
  onProfilePress: () => void;
};

export default function UserDashboardHeader({ activeTab, onProfilePress }: Props) {
  const user = useAuthStore((state) => state.user);
  const firstName = user?.name?.split(" ")[0] || "Rider";
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.titleBlock}>
        <Text style={styles.greeting} numberOfLines={1} adjustsFontSizeToFit>Good day, {firstName}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{activeTab === "Home" ? "Where are we going today?" : "Golden Ride passenger app"}</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable 
          style={styles.iconButton} 
          onPress={() => {
            Alert.alert("Notifications", "You have no new notifications.");
          }}
        >
          <Ionicons name="notifications-outline" size={22} color={Colors.black} />
          <View style={styles.badge} />
        </Pressable>
        <Pressable style={styles.avatar} onPress={onProfilePress}>
          <Ionicons name="person" size={20} color={Colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  titleBlock: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  greeting: {
    color: Colors.black,
    fontSize: Typography.heading,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: Typography.body,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.cardShadow,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  badge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.error,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#FFF3D9",
    alignItems: "center",
    justifyContent: "center",
  },
});
