import React from "react";
import { Pressable, ScrollView, Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors, Spacing, Typography } from "../../theme";
import { PoweredByZenartin } from "../../components/PoweredByZenartin";

export default function WelcomeScreen({ navigation }: any) {
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.hero}>
        <View style={styles.badge}>
          <Ionicons name="car-sport" size={22} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Golden Ride</Text>
        <Text style={styles.subtitle}>Book, track, and manage every ride from one place.</Text>
      </View>

      <View style={styles.featureRow}>
        <View style={styles.feature}>
          <Ionicons name="navigate" size={20} color={Colors.primary} />
          <Text style={styles.featureText}>Live pickup tracking</Text>
        </View>
        <View style={styles.feature}>
          <Ionicons name="time" size={20} color={Colors.primary} />
          <Text style={styles.featureText}>Trip history and status</Text>
        </View>
        <View style={styles.feature}>
          <Ionicons name="wallet" size={20} color={Colors.primary} />
          <Text style={styles.featureText}>Wallet and payments</Text>
        </View>
      </View>

      <Pressable style={styles.primary} onPress={() => navigation.navigate("Login")}>
        <Text style={styles.primaryText}>Login</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={() => navigation.navigate("Register")}>
        <Text style={styles.secondaryText}>Create account</Text>
      </Pressable>

      <View style={{ marginTop: 20 }}>
        <PoweredByZenartin />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, padding: Spacing.xl, justifyContent: "center", gap: 20, backgroundColor: Colors.background },
  hero: { alignItems: "center", gap: 10 },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#FFF3D9",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: Colors.textPrimary, fontSize: Typography.heading, fontWeight: "900" },
  subtitle: { color: Colors.textSecondary, fontSize: Typography.body, textAlign: "center", lineHeight: 22 },
  featureRow: { gap: 12 },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: Spacing.md,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureText: { color: Colors.textPrimary, fontSize: Typography.body, fontWeight: "600" },
  primary: { minHeight: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: Colors.primary },
  primaryText: { color: Colors.white, fontSize: Typography.body, fontWeight: "800" },
  secondary: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  secondaryText: { color: Colors.textPrimary, fontSize: Typography.body, fontWeight: "700" },
});
