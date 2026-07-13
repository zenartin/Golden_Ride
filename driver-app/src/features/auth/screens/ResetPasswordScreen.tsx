import React, { useState } from "react";
import { View, Text, StyleSheet, Alert, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppInput from "../../../components/inputs/AppInput";
import PrimaryButton from "../../../components/buttons/PrimaryButton";
import { Colors, Spacing, Typography } from "../../../theme";
import api from "../../../api/client";

export default function ResetPasswordScreen({ route, navigation }: any) {
  const { email } = route.params || {};
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!otp.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Password Mismatch", "The new passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/reset-password", {
        email,
        otp,
        new_password: newPassword,
      });
      setLoading(false);
      
      Alert.alert("Success", response.data.message || "Password reset successfully.", [
        { text: "Log In", onPress: () => navigation.navigate("Login") }
      ]);
    } catch (err: any) {
      setLoading(false);
      Alert.alert("Error", err.response?.data?.detail || "Failed to reset password.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.content}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter the 4-digit code sent to {email} and your new password.
            </Text>

            <AppInput
              value={otp}
              onChangeText={setOtp}
              placeholder="4-Digit OTP Code (e.g. 1234)"
              keyboardType="number-pad"
              maxLength={4}
            />

            <AppInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New Password"
              secureTextEntry
            />

            <AppInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm New Password"
              secureTextEntry
            />

            <View style={{ marginTop: Spacing.xl }}>
              <PrimaryButton
                title={loading ? "Resetting..." : "Reset Password"}
                onPress={handleResetPassword}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  backButton: {
    padding: Spacing.md,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: "center",
  },
  title: {
    fontSize: Typography.heading,
    fontWeight: "bold",
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
});
