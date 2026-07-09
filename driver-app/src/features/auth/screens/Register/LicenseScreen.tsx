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

const LicenseScreen = ({ navigation }: any) => {
  const { update } = useRegistration();
  const [form, setForm] = useState({
    licenseNumber: "",
    expiry: "",
    issuingState: "",
  });

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (!form.licenseNumber || !form.expiry) {
      alert("Please enter your license number and expiry date.");
      return;
    }
    update("license", form);
    navigation.navigate("Vehicle");
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
              Driving{"\n"}
              <Text style={styles.titleAccent}>License Details</Text>
            </Animated.Text>

            <Text style={styles.subtitle}>
              Add the license information that matches your government ID.
            </Text>

            <View style={styles.stepRow}>
              <Step active label="License" />
              <Step label="Vehicle" />
              <Step label="Insurance" />
              <Step label="Photo" />
            </View>
          </LinearGradient>

          <Animated.View entering={FadeInDown.delay(200)} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons name="card" size={22} color="#0E2A5A" />
              </View>
              <View>
                <Text style={styles.cardTitle}>License Info</Text>
                <Text style={styles.cardSubtitle}>Step 2 of 5</Text>
              </View>
            </View>

            <Input
              icon="card-outline"
              placeholder="License Number"
              value={form.licenseNumber}
              onChangeText={(value: string) => handleChange("licenseNumber", value)}
              autoCapitalize="characters"
            />
            <Input
              icon="calendar-outline"
              placeholder="Expiry Date (DD/MM/YYYY)"
              value={form.expiry}
              onChangeText={(value: string) => handleChange("expiry", value)}
              keyboardType="numbers-and-punctuation"
            />
            <Input
              icon="location-outline"
              placeholder="Issuing State / RTO"
              value={form.issuingState}
              onChangeText={(value: string) => handleChange("issuingState", value)}
            />

            <View style={styles.noteBox}>
              <Ionicons name="shield-checkmark" size={18} color="#0E2A5A" />
              <Text style={styles.noteText}>
                Your license details are used only for driver verification.
              </Text>
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
      autoCapitalize={autoCapitalize ?? "none"}
      style={styles.input}
    />
  </View>
);

const Step = ({ label, active }: any) => (
  <View style={[styles.step, active && styles.stepActive]}>
    <Text style={[styles.stepText, active && styles.stepTextActive]}>{label}</Text>
  </View>
);

export default LicenseScreen;

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
  noteBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F5F7FB",
    borderRadius: 14,
    padding: 12,
    marginBottom: 6,
  },
  noteText: { flex: 1, color: "#6B7280", fontSize: 12, lineHeight: 17 },
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
