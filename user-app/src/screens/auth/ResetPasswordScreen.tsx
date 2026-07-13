import React, { useState } from "react";
import { Alert, ScrollView, Text, View, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";

import AppButton from "../../components/AppButton";
import AppInput from "../../components/AppInput";
import { Colors, Spacing, Typography } from "../../theme";
import { Ionicons } from "@expo/vector-icons";
import api from "../../api/client";

export default function ResetPasswordScreen({ route, navigation }: any) {
  const { email } = route.params || {};
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
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
      const response = await api.post("/user/auth/reset-password", { 
        email,
        otp,
        new_password: newPassword
      });
      setLoading(false);
      
      Alert.alert(
        "Success", 
        response.data.message || "Password successfully reset.",
        [{ text: "Log In", onPress: () => navigation.navigate("Login") }]
      );
    } catch (err: any) {
      setLoading(false);
      Alert.alert("Error", err.response?.data?.detail || "Failed to reset password.");
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter the 4-digit code sent to {email}.</Text>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>New Password</Text>
          
          <AppInput 
            label="4-Digit OTP Code" 
            value={otp} 
            onChangeText={setOtp} 
            placeholder="e.g. 1234" 
            keyboardType="number-pad"
            maxLength={4}
          />
          
          <AppInput 
            label="New Password" 
            value={newPassword} 
            onChangeText={setNewPassword} 
            placeholder="New password" 
            secureTextEntry 
          />
          
          <AppInput 
            label="Confirm Password" 
            value={confirmPassword} 
            onChangeText={setConfirmPassword} 
            placeholder="Confirm new password" 
            secureTextEntry 
          />
          
          <View style={{ marginTop: 10 }}>
            <AppButton title="Reset Password" onPress={submit} loading={loading} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, padding: Spacing.xl, justifyContent: "center", gap: 10, backgroundColor: Colors.background },
  backButton: { marginBottom: Spacing.md, alignSelf: "flex-start" },
  title: { color: Colors.textPrimary, fontSize: Typography.heading, fontWeight: "900" },
  subtitle: { color: Colors.textSecondary, fontSize: Typography.body, marginBottom: 8 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  cardTitle: { color: Colors.textPrimary, fontSize: Typography.subHeading, fontWeight: "900" },
});
