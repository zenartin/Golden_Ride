import React, { useState } from "react";
import { Alert, ScrollView, Text, View, StyleSheet } from "react-native";

import AppButton from "../../components/AppButton";
import AppInput from "../../components/AppInput";
import { useAuthStore } from "../../store/authStore";
import { Colors, Spacing, Typography } from "../../theme";

export default function LoginScreen({ navigation }: any) {
  const login = useAuthStore((state) => state.login);
  const error = useAuthStore((state) => state.error);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing credentials", "Please enter both email and password.");
      return;
    }
    setLoading(true);
    const ok = await login({ email, password });
    setLoading(false);
    if (!ok) {
      Alert.alert("Login failed", error || "Please try again.");
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
