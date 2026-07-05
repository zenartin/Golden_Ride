import React from "react";
import { ActivityIndicator, Text, View, StyleSheet } from "react-native";

import { Colors, Typography } from "../../theme";

export default function SplashScreen() {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.title}>Golden Ride</Text>
      <Text style={styles.subtitle}>Loading your trip app...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background, gap: 12 },
  title: { color: Colors.textPrimary, fontSize: Typography.heading, fontWeight: "900" },
  subtitle: { color: Colors.textSecondary, fontSize: Typography.body },
});
