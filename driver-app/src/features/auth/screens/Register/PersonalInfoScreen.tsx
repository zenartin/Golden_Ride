import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRegistration } from "./RegistrationContext";
import { useAuthStore } from "../../../../store/authStore";
import { Colors } from "../../../../theme";

const SignupScreen = ({ navigation }: any) => {
  const { update } = useRegistration();
  // FORM STATE
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    country: "USA",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
  };

  const registerFn = useAuthStore((state) => state.register);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignUp = async () => {
    if (!form.name.trim()) {
      Alert.alert("Missing Name", "Please enter your full name.");
      return;
    }
    if (!form.email.trim()) {
      Alert.alert("Missing Email", "Please enter your email address.");
      return;
    }
    if (!form.phone.trim()) {
      Alert.alert("Missing Phone", "Please enter your phone number.");
      return;
    }
    if (!form.password.trim()) {
      Alert.alert("Missing Password", "Please choose a password.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      Alert.alert("Password Mismatch", "The passwords you entered do not match. Please try again.");
      return;
    }
    
    setIsSubmitting(true);
    const success = await registerFn({
      name: form.name,
      email: form.email,
      phone: form.phone,
      password: form.password,
      country: form.country,
    });
    setIsSubmitting(false);

    if (success) {
      // login automatically or authStore will handle navigation if login is successful inside register
    } else {
      const errorMsg = useAuthStore.getState().error || "Registration failed. Please try again.";
      alert(errorMsg);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {/* HEADER */}
          <LinearGradient colors={["#0B1B3A", "#0E2A5A"]} style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#FFD000" />
            </TouchableOpacity>

            <Animated.Text entering={FadeInDown.delay(100)} style={styles.title}>
              Call Taxi,{"\n"}
              <Text style={{ color: "#FFD000" }}>Go Anywhere!</Text>
            </Animated.Text>

            <Text style={styles.subtitle}>
              Join our platform and start earning with every ride.
            </Text>

            <View style={styles.featureRow}>
              <Feature icon="cash" text="Great Earnings" />
              <Feature icon="shield-checkmark" text="Safe & Secure" />
              <Feature icon="time" text="Flexible Hours" />
            </View>
          </LinearGradient>

          {/* CARD */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.card}>
            <Text style={styles.cardTitle}>Create Your Account</Text>
            <Text style={styles.cardSubtitle}>Sign up to get started</Text>

            {/* INPUTS */}
            <Input
              icon="person"
              placeholder="Full Name"
              value={form.name}
              onChangeText={(v: string) => handleChange("name", v)}
            />

            <Input
              icon="mail"
              placeholder="Email Address"
              value={form.email}
              onChangeText={(v: string) => handleChange("email", v)}
            />

            <Input
              icon="call"
              placeholder="Phone Number"
              value={form.phone}
              onChangeText={(v: string) => handleChange("phone", v)}
              keyboardType="phone-pad"
            />

            {/* PASSWORD */}
            <View style={styles.inputBox}>
              <Ionicons name="lock-closed" size={20} color="#FFD000" />
              <TextInput
                placeholder="Password"
                placeholderTextColor={Colors.textMuted || "#999"}
                secureTextEntry={!showPassword}
                value={form.password}
                onChangeText={(v) => handleChange("password", v)}
                style={styles.input}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            {/* CONFIRM PASSWORD */}
            <View style={styles.inputBox}>
              <Ionicons name="lock-closed" size={20} color="#FFD000" />
              <TextInput
                placeholder="Confirm Password"
                placeholderTextColor={Colors.textMuted || "#999"}
                secureTextEntry={!showConfirm}
                value={form.confirmPassword}
                onChangeText={(v) => handleChange("confirmPassword", v)}
                style={styles.input}
              />
              <TouchableOpacity
                onPress={() => setShowConfirm(!showConfirm)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showConfirm ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            {/* COUNTRY */}
            <View style={styles.countryPicker}>
              <Text style={styles.countryLabel}>Operating Country:</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  style={[styles.countryBtn, form.country === "USA" && styles.countryBtnActive]}
                  onPress={() => handleChange("country", "USA")}
                >
                  <Text style={[styles.countryBtnText, form.country === "USA" && styles.countryBtnTextActive]}>USA</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.countryBtn, form.country === "India" && styles.countryBtnActive]}
                  onPress={() => handleChange("country", "India")}
                >
                  <Text style={[styles.countryBtnText, form.country === "India" && styles.countryBtnTextActive]}>India</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* BUTTON */}
            <TouchableOpacity activeOpacity={0.8} onPress={handleSignUp} disabled={isSubmitting}>
              <LinearGradient colors={["#FFD000", "#FFB800"]} style={[styles.button, isSubmitting && { opacity: 0.7 }]}>
                <Text style={styles.buttonText}>{isSubmitting ? "SIGNING UP..." : "SIGN UP"}</Text>
                <View style={styles.arrow}>
                  <Ionicons name="arrow-forward" size={20} color="#000" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginText}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={styles.loginText}>
                Already have an account?{" "}
                <Text style={styles.loginLink}>Login</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/* INPUT COMPONENT */
const Input = ({ icon, placeholder, value, onChangeText, keyboardType }: any) => (
  <View style={styles.inputBox}>
    <Ionicons name={icon} size={20} color="#FFD000" />
    <TextInput
      placeholder={placeholder}
      placeholderTextColor="#999"
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      style={styles.input}
    />
  </View>
);

/* FEATURE COMPONENT */
const Feature = ({ icon, text }: any) => (
  <View style={styles.feature}>
    <Ionicons name={icon} size={16} color="#FFD000" />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

export default SignupScreen;

/* STYLES */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB" },

  header: {
    padding: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  title: { fontSize: 28, fontWeight: "800", color: "#fff", marginTop: 20 },

  subtitle: { color: "#B8C7E0", marginTop: 8, fontSize: 14 },

  featureRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },

  feature: {
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  featureText: { color: "#fff", fontSize: 11 },

  card: {
    backgroundColor: "#fff",
    margin: 20,
    marginTop: -20,
    borderRadius: 25,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },

  cardTitle: { fontSize: 20, fontWeight: "700", color: "#0E2A5A" },

  cardSubtitle: { color: "#777", marginBottom: 15 },

  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEE",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 50,
  },

  input: { flex: 1, marginLeft: 10, color: "#1a1a1a", fontSize: 15 },

  button: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    borderRadius: 30,
    marginTop: 10,
  },

  buttonText: { fontWeight: "800", color: "#000", fontSize: 16 },

  arrow: {
    position: "absolute",
    right: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 5,
  },

  loginText: {
    textAlign: "center",
    marginTop: 15,
    color: "#666",
  },

  loginLink: {
    color: "#FFD000",
    fontWeight: "bold",
  },
  countryPicker: { marginBottom: 15, marginTop: 5 },
  countryLabel: { color: "#0E2A5A", fontSize: 14, fontWeight: "bold", marginBottom: 8 },
  countryBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#EEE", alignItems: "center" },
  countryBtnActive: { backgroundColor: "#0E2A5A", borderColor: "#0E2A5A" },
  countryBtnText: { color: "#666", fontWeight: "600" },
  countryBtnTextActive: { color: "#fff" },
});
