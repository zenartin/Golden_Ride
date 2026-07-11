import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";

import { useAuthStore } from "../../../store/authStore";
import AppInput from "../../../components/inputs/AppInput";
import PrimaryButton from "../../../components/buttons/PrimaryButton";
import { Colors, Spacing, Typography } from "../../../theme";

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert("Missing Email", "Please enter your email address to log in.");
      return;
    }
    if (!password.trim()) {
      Alert.alert("Missing Password", "Please enter your password to log in.");
      return;
    }
    const success = await login(email, password);
    if (!success) {
      Alert.alert("Login Failed", error || "Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("../../../../assets/images/logo.jpeg")}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Welcome Back</Text>

      <Text style={styles.subtitle}>
        Sign in to continue
      </Text>

      <View style={{ width: "100%" }}>
        <AppInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email Address"
          keyboardType="email-address"
        />

        <AppInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
        />
      </View>

      <PrimaryButton
        title={isLoading ? "Logging in..." : "Login"}
        onPress={handleLogin}
      />

      <TouchableOpacity
        style={styles.registerContainer}
        onPress={() => navigation.navigate("PersonalInfo")}
      >
        <Text style={styles.registerText}>
          Don't have an account?
        </Text>

        <Text style={styles.register}>
          Register
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    justifyContent: "center",
  },
  logo: {
    width: 180,
    height: 180,
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.heading,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: Spacing.md,
  },
  countryCode: {
    fontSize: 18,
    fontWeight: "600",
    width: 45,
  },
  registerContainer: {
    marginTop: 25,
    flexDirection: "row",
    justifyContent: "center",
  },
  registerText: {
    color: Colors.textSecondary,
  },
  register: {
    marginLeft: 5,
    color: Colors.primary,
    fontWeight: "700",
  },
});
