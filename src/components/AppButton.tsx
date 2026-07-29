import React from "react";
import { ActivityIndicator, Pressable, Text, StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, Typography } from "../theme";

interface AppButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  style?: ViewStyle;
}

export default function AppButton({ title, onPress, loading, disabled, variant = "primary", style }: AppButtonProps) {
  if (variant === "primary") {
    return (
      <Pressable onPress={onPress} disabled={disabled || loading} style={style}>
        <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.primary}>
          {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryText}>{title}</Text>}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.base,
        variant === "secondary" ? styles.secondary : styles.ghost,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "ghost" ? Colors.primary : Colors.textPrimary} />
      ) : (
        <Text style={[styles.baseText, variant === "ghost" && styles.ghostText]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  primary: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  primaryText: { color: Colors.white, fontSize: Typography.body, fontWeight: "800" },
  baseText: { color: Colors.textPrimary, fontSize: Typography.body, fontWeight: "700" },
  secondary: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  ghost: { backgroundColor: "transparent", borderWidth: 1, borderColor: Colors.border },
  ghostText: { color: Colors.primary },
});
