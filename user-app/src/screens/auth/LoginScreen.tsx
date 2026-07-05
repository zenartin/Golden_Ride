import React, { useState } from "react";
import { Alert, ScrollView, Text, View, StyleSheet } from "react-native";

import AppButton from "../../components/AppButton";
import AppInput from "../../components/AppInput";
import { useAuthStore } from "../../store/authStore";
import { Colors, Spacing, Typography } from "../../theme";

export default function LoginScreen({ navigation }: any) {
  const login = useAuthStore((state) => state.login);
  const requestOtp = useAuthStore((state) => state.requestOtp);
  const verifyOtp = useAuthStore((state) => state.verifyOtp);
  const error = useAuthStore((state) => state.error);
  const [email, setEmail] = useState("user@goldenride.com");
  const [password, setPassword] = useState("123456");
  const [phone, setPhone] = useState("9876543210");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    const ok = await login({ email, password });
    setLoading(false);
    if (!ok) {
      Alert.alert("Login failed", error || "Please try again.");
    }
  };

  const sendOtp = async () => {
    setOtpLoading(true);
    const sandboxOtp = await requestOtp(phone);
    setOtpLoading(false);
    if (sandboxOtp) {
      setOtp(sandboxOtp);
      Alert.alert("OTP sent", `Use sandbox OTP ${sandboxOtp}`);
    } else {
      Alert.alert("OTP failed", error || "Please try again.");
    }
  };

  const submitOtp = async () => {
    setOtpLoading(true);
    const ok = await verifyOtp({ phone, otp });
    setOtpLoading(false);
    if (!ok) {
      Alert.alert("OTP failed", error || "Please check the code.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Sign in to book and track your rides.</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Email login</Text>
        <AppInput label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" />
        <AppInput label="Password" value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
        <AppButton title="Login" onPress={submit} loading={loading} />
        <AppButton title="Create account" onPress={() => navigation.navigate("Register")} variant="secondary" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Phone OTP</Text>
        <Text style={styles.helper}>Matches the backend sandbox OTP flow. New phone numbers create a rider profile.</Text>
        <AppInput label="Phone" value={phone} onChangeText={setPhone} placeholder="Phone number" />
        <AppInput label="OTP" value={otp} onChangeText={setOtp} placeholder="1234" />
        <View style={styles.row}>
          <AppButton title="Send OTP" onPress={sendOtp} loading={otpLoading} variant="secondary" style={{ flex: 1 }} />
          <AppButton title="Verify" onPress={submitOtp} loading={otpLoading} style={{ flex: 1 }} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, padding: Spacing.xl, justifyContent: "center", gap: 10, backgroundColor: Colors.background },
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
  helper: { color: Colors.textSecondary, fontSize: Typography.small, lineHeight: 18 },
  row: { flexDirection: "row", gap: 10 },
});
