import React from "react";
import { Text, TextInput, View, StyleSheet, TextInputProps } from "react-native";
import { Colors, Spacing, Typography } from "../theme";

interface AppInputProps extends TextInputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
}

export default function AppInput({
  label,
  value,
  onChangeText,
  style,
  ...rest
}: AppInputProps) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={Colors.textMuted}
        style={[styles.input, rest.multiline && styles.multi, style]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { color: Colors.textSecondary, fontSize: Typography.small, fontWeight: "600" },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: Typography.body,
  },
  multi: { minHeight: 88, textAlignVertical: "top" },
});
