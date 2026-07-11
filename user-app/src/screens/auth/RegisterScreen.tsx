import React, { useState } from "react";
import { Alert, ScrollView, Text, StyleSheet, View } from "react-native";

import AppButton from "../../components/AppButton";
import AppInput from "../../components/AppInput";
import { useAuthStore } from "../../store/authStore";
import { Colors, Spacing, Typography } from "../../theme";

export default function RegisterScreen({ navigation }: any) {
  const register = useAuthStore((state) => state.register);
  const error = useAuthStore((state) => state.error);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [country, setCountry] = useState("USA");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      Alert.alert("Missing Name", "Please enter your full name.");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Missing Email", "Please enter your email address.");
      return;
    }
    if (!phone.trim()) {
      Alert.alert("Missing Phone", "Please enter your phone number.");
      return;
    }
    if (!password.trim()) {
      Alert.alert("Missing Password", "Please choose a password.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password Mismatch", "The passwords you entered do not match. Please try again.");
      return;
    }
    setLoading(true);
    const ok = await register({ name, email, phone, password, country });
    setLoading(false);
    if (!ok) {
      Alert.alert("Register failed", error || "Please fill every field.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>Set up your rider profile in a minute.</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account Details</Text>
        <AppInput label="Name" value={name} onChangeText={setName} placeholder="Full name" />
        <AppInput label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" />
        <AppInput label="Phone" value={phone} onChangeText={setPhone} placeholder="Phone number" />
        <AppInput label="Password" value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
        <AppInput label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Re-enter password" secureTextEntry />
        
        <View style={styles.countryPicker}>
          <Text style={styles.countryLabel}>Operating Country:</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <AppButton 
              title="USA" 
              onPress={() => setCountry("USA")} 
              variant={country === "USA" ? "primary" : "secondary"} 
              style={{ flex: 1 }} 
            />
            <AppButton 
              title="India" 
              onPress={() => setCountry("India")} 
              variant={country === "India" ? "primary" : "secondary"} 
              style={{ flex: 1 }} 
            />
          </View>
        </View>

        <AppButton title="Register" onPress={submit} loading={loading} />
        <AppButton title="Back to login" onPress={() => navigation.navigate("Login")} variant="secondary" />
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
  countryPicker: { marginBottom: 10, marginTop: 4 },
  countryLabel: { color: Colors.textPrimary, fontSize: Typography.small, fontWeight: "bold", marginBottom: 8 },
});
