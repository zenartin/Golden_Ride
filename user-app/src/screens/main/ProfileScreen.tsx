import React from "react";
import { Alert, Text, View, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { MainStackParamList } from "../../navigation/MainNavigator";
import { useAuthStore } from "../../store/authStore";
import { Colors, Spacing, Typography } from "../../theme";

type Props = {
  navigation: {
    navigate: (screen: keyof MainStackParamList) => void;
  };
};

export default function ProfileScreen({ navigation }: Props) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const signOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "R";

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.name || "Golden Rider"}</Text>
        <Text style={styles.metaEmail}>{user?.email || "rider@goldenride.com"}</Text>
        <Text style={styles.metaPhone}>📞 {user?.phone || "+91 99999 88888"}</Text>
      </View>

      {/* Account Section */}
      <Text style={styles.sectionTitle}>Account settings</Text>
      <View style={styles.menuGroup}>
        {/* API Console Link */}
        <Pressable
          style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
          onPress={() => navigation.navigate("ApiConsole")}
        >
          <View style={[styles.iconWrap, { backgroundColor: "#EEF2F6" }]}>
            <Ionicons name="code-working-outline" size={20} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>Developer API Console</Text>
            <Text style={styles.menuSublabel}>Test endpoints and see database state</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
        </Pressable>

        <View style={styles.separator} />

        {/* Saved Places */}
        <Pressable style={styles.menuItem}>
          <View style={[styles.iconWrap, { backgroundColor: "#EBFDF5" }]}>
            <Ionicons name="location-outline" size={20} color="#10B981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>Saved Locations</Text>
            <Text style={styles.menuSublabel}>Home, Work and frequent destinations</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
        </Pressable>
      </View>

      {/* Support Section */}
      <Text style={styles.sectionTitle}>Support & Information</Text>
      <View style={styles.menuGroup}>
        <Pressable style={styles.menuItem}>
          <View style={[styles.iconWrap, { backgroundColor: "#FFFBEB" }]}>
            <Ionicons name="help-circle-outline" size={20} color="#F59E0B" />
          </View>
          <Text style={[styles.menuLabel, { flex: 1 }]}>Help & Support Desk</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
        </Pressable>

        <View style={styles.separator} />

        <Pressable style={styles.menuItem}>
          <View style={[styles.iconWrap, { backgroundColor: "#FDF2F8" }]}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#EC4899" />
          </View>
          <Text style={[styles.menuLabel, { flex: 1 }]}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
        </Pressable>
      </View>

      {/* Logout Action */}
      <Pressable
        style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
        onPress={signOut}
      >
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: 14, paddingBottom: 32 },
  headerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: Spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    color: Colors.white,
    fontWeight: "900",
    fontSize: Typography.heading,
  },
  name: {
    color: Colors.textPrimary,
    fontSize: Typography.subHeading,
    fontWeight: "900",
  },
  metaEmail: {
    color: Colors.textSecondary,
    fontSize: Typography.small,
    marginTop: 4,
  },
  metaPhone: {
    color: Colors.textSecondary,
    fontSize: Typography.small,
    marginTop: 2,
    fontWeight: "600",
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.small,
    fontWeight: "800",
    textTransform: "uppercase",
    marginLeft: 6,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  menuGroup: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: 12,
  },
  menuItemPressed: {
    backgroundColor: Colors.background,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    color: Colors.textPrimary,
    fontSize: Typography.small,
    fontWeight: "700",
  },
  menuSublabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 62,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    marginTop: 10,
  },
  logoutBtnPressed: {
    opacity: 0.8,
  },
  logoutText: {
    color: "#EF4444",
    fontWeight: "800",
    fontSize: Typography.body,
  },
});
