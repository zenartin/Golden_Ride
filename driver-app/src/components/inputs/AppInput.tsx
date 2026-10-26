import React, { useState } from "react";
import { Colors, Typography, Spacing } from "../../theme";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props extends Omit<TextInputProps, "onChangeText"> {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  leftIcon?: string;
  rightIcon?: string;
  secureTextEntry?: boolean;
  error?: string;
  autoCapitalize?: TextInputProps["autoCapitalize"];
}

export default function AppInput({
  value,
  onChangeText,
  placeholder = "",
  label,
  leftIcon,
  rightIcon,
  keyboardType = "default",
  secureTextEntry = false,
  error,
  autoCapitalize,
  ...rest
}: Props) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputRow, error ? styles.inputError : null]}>
        {leftIcon ? (
          <Ionicons
            name={leftIcon as any}
            size={18}
            color={Colors.textMuted}
            style={styles.leftIcon}
          />
        ) : null}
        <TextInput
          style={[styles.input, leftIcon ? styles.inputWithLeft : null]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry && !showPassword}
          autoCapitalize={autoCapitalize ?? "none"}
          {...rest}
        />
        {secureTextEntry ? (
          <TouchableOpacity
            onPress={() => setShowPassword((v) => !v)}
            style={styles.rightIconBtn}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={18}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
        ) : rightIcon ? (
          <Ionicons
            name={rightIcon as any}
            size={18}
            color={Colors.textMuted}
            style={styles.rightIconBtn}
          />
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: Typography.small,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 52,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    overflow: "hidden",
  },
  inputError: {
    borderColor: Colors.error,
  },
  leftIcon: {
    paddingLeft: 14,
    paddingRight: 2,
  },
  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 14,
    fontSize: Typography.body,
    color: Colors.textPrimary,
  },
  inputWithLeft: {
    paddingLeft: 6,
  },
  rightIconBtn: {
    paddingHorizontal: 14,
  },
  errorText: {
    fontSize: Typography.small,
    color: Colors.error,
    marginTop: 4,
  },
});