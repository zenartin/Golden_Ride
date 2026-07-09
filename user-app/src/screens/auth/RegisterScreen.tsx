import React, { useState } from "react";
import { Alert, ScrollView, Text, StyleSheet, View } from "react-native";

import AppButton from "../../components/AppButton";
import AppInput from "../../components/AppInput";
import { useAuthStore } from "../../store/authStore";
import { Colors, Spacing, Typography } from "../../theme";

export default function RegisterScreen({ navigation }: any) {
  const register = useAuthStore((state) => state.register);
  const error = useAuthStore((state) => state.error);
  const [name, setName] = useState("Golden Rider");
  const [email, setEmail] = useState("user@goldenride.com");
  const [phone, setPhone] = useState("9876543210");
  const [password, setPassword] = useState("123456");
  const [country, setCountry] = useState("USA");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
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
      <AppInput label="Name" value={name} onChangeText={setName} placeholder="Full name" />
      <AppInput label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" />
      <AppInput label="Phone" value={phone} onChangeText={setPhone} placeholder="Phone number" />
      <AppInput label="Password" value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, padding: Spacing.xl, justifyContent: "center", gap: 14, backgroundColor: Colors.background },
  title: { color: Colors.textPrimary, fontSize: Typography.heading, fontWeight: "900" },
  subtitle: { color: Colors.textSecondary, fontSize: Typography.body, marginBottom: 4 },
  countryPicker: { marginBottom: 10 },
  countryLabel: { color: Colors.textPrimary, fontSize: Typography.body, fontWeight: "bold", marginBottom: 8 },
});
