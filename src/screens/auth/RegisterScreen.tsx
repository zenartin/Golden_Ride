import React, { useState } from "react";
import { Alert, ScrollView, Text, StyleSheet, View, KeyboardAvoidingView, Platform } from "react-native";

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
  const [homeAddress, setHomeAddress] = useState("");
  const [dob, setDob] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    if (!homeAddress.trim()) {
      Alert.alert("Missing Address", "Please enter your home address.");
      return;
    }
    const dobMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob.trim());
    const dobDate = dobMatch ? new Date(dob.trim()) : null;
    if (!dobDate || isNaN(dobDate.getTime()) || dobDate > new Date()) {
      Alert.alert("Invalid Date of Birth", "Please enter your date of birth as YYYY-MM-DD.");
      return;
    }
    const ageYears = (Date.now() - dobDate.getTime()) / (365.25 * 24 * 3600 * 1000);
    if (ageYears < 18) {
      Alert.alert("Age Requirement", "You must be at least 18 years old to register.");
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
    const ok = await register({ name, email, phone, password, home_address: homeAddress.trim(), date_of_birth: dob.trim() });
    setLoading(false);
    if (!ok) {
      Alert.alert("Register failed", error || "Please fill every field.");
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Set up your rider profile in a minute.</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Details</Text>
          <AppInput label="Full Name" value={name} onChangeText={setName} placeholder="Full name" />
          <AppInput label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" />
          <AppInput label="Phone Number" value={phone} onChangeText={setPhone} placeholder="Phone number" />
          <AppInput label="Home Address" value={homeAddress} onChangeText={setHomeAddress} placeholder="Street, city, state, ZIP" />
          <AppInput label="Date of Birth" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" />
          <AppInput label="Password" value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
          <AppInput label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Re-enter password" secureTextEntry />

          <AppButton title="Register" onPress={submit} loading={loading} />
          <AppButton title="Back to login" onPress={() => navigation.navigate("Login")} variant="secondary" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
});
