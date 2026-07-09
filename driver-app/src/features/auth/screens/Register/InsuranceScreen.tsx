import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRegistration } from "./RegistrationContext";

const InsuranceScreen = ({ navigation }: any) => {
  const { update } = useRegistration();
  const [form, setForm] = useState({
    provider: "",
    policy: "",
    expiry: "",
  });

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (!form.policy || !form.expiry) {
      alert("Please enter your policy number and expiry date.");
      return;
    }
    update("insurance", form);
    navigation.navigate("Photo");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <LinearGradient colors={["#0B1B3A", "#0E2A5A"]} style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
              <Ionicons name="arrow-back" size={24} color="#FFD000" />
            </TouchableOpacity>

            <Animated.Text entering={FadeInDown.delay(100)} style={styles.title}>
              Insurance{"\n"}
              <Text style={styles.titleAccent}>Verification</Text>
            </Animated.Text>

            <Text style={styles.subtitle}>
              Active insurance keeps every trip protected and compliant.
            </Text>

            <View style={styles.stepRow}>
              <Step label="License" done />
              <Step label="Vehicle" done />
              <Step active label="Insurance" />
              <Step label="Photo" />
            </View>
          </LinearGradient>

          <Animated.View entering={FadeInDown.delay(200)} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons name="shield-checkmark" size={24} color="#0E2A5A" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Insurance Info</Text>
                <Text style={styles.cardSubtitle}>Step 4 of 5</Text>
              </View>
            </View>

            <Input
              icon="business-outline"
              placeholder="Insurance Provider"
              value={form.provider}
              onChangeText={(value: string) => handleChange("provider", value)}
            />
            <Input
              icon="document-text-outline"
              placeholder="Policy Number"
              value={form.policy}
              onChangeText={(value: string) => handleChange("policy", value)}
              autoCapitalize="characters"
            />
            <Input
              icon="calendar-outline"
              placeholder="Policy Expiry Date (DD/MM/YYYY)"
              value={form.expiry}
              onChangeText={(value: string) => handleChange("expiry", value)}
              keyboardType="numbers-and-punctuation"
            />

            <View style={styles.protectionCard}>
              <View style={styles.protectionIcon}>
                <Ionicons name="lock-closed" size={18} color="#22C55E" />
              </View>
              <View style={styles.protectionCopy}>
                <Text style={styles.protectionTitle}>Secure verification</Text>
                <Text style={styles.protectionText}>
                  We verify your policy before activating ride requests.
                </Text>
              </View>
            </View>

            <TouchableOpacity activeOpacity={0.85} onPress={handleNext}>
              <LinearGradient colors={["#FFD000", "#FFB800"]} style={styles.button}>
                <Text style={styles.buttonText}>CONTINUE</Text>
                <View style={styles.arrow}>
                  <Ionicons name="arrow-forward" size={20} color="#000" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const Input = ({ icon, placeholder, value, onChangeText, keyboardType, autoCapitalize }: any) => (
  <View style={styles.inputBox}>
    <Ionicons name={icon} size={20} color="#FFD000" />
    <TextInput
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize ?? "words"}
      style={styles.input}
    />
  </View>
);

const Step = ({ label, active, done }: any) => (
  <View style={[styles.step, active && styles.stepActive, done && styles.stepDone]}>
    <Text style={[styles.stepText, (active || done) && styles.stepTextActive]}>{label}</Text>
  </View>
);

export default InsuranceScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB" },
  flex: { flex: 1 },
  header: {
    padding: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerBack: { width: 36, height: 36, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "800", color: "#fff", marginTop: 16 },
  titleAccent: { color: "#FFD000" },
  subtitle: { color: "#B8C7E0", marginTop: 8, fontSize: 14, lineHeight: 20 },
  stepRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 20 },
  step: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  stepActive: { backgroundColor: "#FFD000" },
  stepDone: { backgroundColor: "rgba(255,208,0,0.35)" },
  stepText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  stepTextActive: { color: "#0B1B3A" },
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
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#FFF4BF",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 20, fontWeight: "700", color: "#0E2A5A" },
  cardSubtitle: { color: "#777", marginTop: 2 },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEE",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 52,
    backgroundColor: "#fff",
  },
  input: { flex: 1, marginLeft: 10, color: "#1F2937" },
  protectionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 14,
    marginBottom: 6,
  },
  protectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  protectionCopy: { flex: 1 },
  protectionTitle: { color: "#166534", fontWeight: "800", marginBottom: 2 },
  protectionText: { color: "#4B5563", fontSize: 12, lineHeight: 17 },
  button: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    borderRadius: 30,
    marginTop: 12,
  },
  buttonText: { fontWeight: "800", color: "#000", fontSize: 16 },
  arrow: {
    position: "absolute",
    right: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 5,
  },
});
