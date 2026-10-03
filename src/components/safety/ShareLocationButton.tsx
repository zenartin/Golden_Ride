import React from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Typography } from "../../theme";
import { shareCurrentLocation } from "../../services/safetyService";

export const ShareLocationButton = () => {
  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.8}
      onPress={shareCurrentLocation}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="location" size={24} color={Colors.white} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>Share Live Location</Text>
        <Text style={styles.subtitle}>Send your coordinates via SMS/WhatsApp</Text>
      </View>
      <Ionicons name="share-social" size={20} color={Colors.primaryDark} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginVertical: Spacing.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: Colors.primaryDark,
    fontSize: Typography.md,
    fontWeight: "700",
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.xs,
    marginTop: 2,
  },
});
