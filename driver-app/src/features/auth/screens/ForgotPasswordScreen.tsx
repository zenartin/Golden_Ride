import React, { useState } from "react";
import { View, Text, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppInput from "../../../components/inputs/AppInput";
import PrimaryButton from "../../../components/buttons/PrimaryButton";
import { Colors, Spacing, Typography } from "../../../theme";
import api from "../../../api/client";

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestOTP = async () => {
    if (!email.trim()) {
      Alert.alert("Missing Email", "Please enter your email address.");
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.post("/auth/forgot-password", { email });
      setLoading(false);
      
      Alert.alert(
        "Reset Code Sent", 
        response.data.message || "A reset code has been sent to your email. (Hint: Use 1234 for sandbox)",
        [{ text: "OK", onPress: () => navigation.navigate("ResetPassword", { email }) }]
      );
    } catch (err: any) {
      setLoading(false);
      Alert.alert("Error", err.response?.data?.detail || "Failed to request reset password.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>
          Enter the email address associated with your account to receive a 4-digit reset code.
        </Text>

        <AppInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email Address"
          keyboardType="email-address"
        />

        <View style={{ marginTop: Spacing.xl }}>
          <PrimaryButton
            title={loading ? "Sending..." : "Send Reset Code"}
            onPress={handleRequestOTP}
          />
        </View>
      </View>
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
