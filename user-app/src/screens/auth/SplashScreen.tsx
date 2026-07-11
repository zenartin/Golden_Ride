import React from "react";
import { ActivityIndicator, Text, View, StyleSheet } from "react-native";

import { Colors, Typography } from "../../theme";
import { PoweredByZenartin } from "../../components/PoweredByZenartin";

export default function SplashScreen() {
  return (
    <View style={styles.wrap}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.title}>Golden Ride</Text>
        <Text style={styles.subtitle}>Loading your trip app...</Text>
      </View>
      <View style={styles.footer}>
        <PoweredByZenartin />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  footer: { paddingBottom: 40, alignItems: "center" },
  title: { color: Colors.textPrimary, fontSize: Typography.heading, fontWeight: "900" },
  subtitle: { color: Colors.textSecondary, fontSize: Typography.body },
});
