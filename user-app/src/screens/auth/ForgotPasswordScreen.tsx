import React, { useState } from "react";
import { Alert, ScrollView, Text, View, StyleSheet, TouchableOpacity } from "react-native";

import AppButton from "../../components/AppButton";
import AppInput from "../../components/AppInput";
import { Colors, Spacing, Typography } from "../../theme";
import { Ionicons } from "@expo/vector-icons";
import api from "../../api/client";

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim()) {
      Alert.alert("Missing Email", "Please enter your email address.");
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.post("/user/auth/forgot-password", { email });
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
    <ScrollView contentContainerStyle={styles.wrap}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
      </TouchableOpacity>
      
      <Text style={styles.title}>Forgot Password?</Text>
      <Text style={styles.subtitle}>Enter the email address associated with your account.</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Reset via Email</Text>
        <AppInput label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" />
        
        <View style={{ marginTop: 10 }}>
          <AppButton title="Send Reset Code" onPress={submit} loading={loading} />
        </View>
      </View>
    </ScrollView>
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
