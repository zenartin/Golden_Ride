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

const VEHICLE_TYPES = ["Auto", "Hatchback", "Sedan", "SUV"];

const VehicleScreen = ({ navigation }: any) => {
  const { update } = useRegistration();
  const [form, setForm] = useState({
    type: "Sedan",
    number: "",
    model: "",
    year: "",
  });

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (!form.type || !form.number || !form.model) {
      alert("Please enter your vehicle type, number, and model.");
      return;
    }
    update("vehicle", form);
    navigation.navigate("Insurance");
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
              Vehicle{"\n"}
              <Text style={styles.titleAccent}>Information</Text>
            </Animated.Text>

            <Text style={styles.subtitle}>
              Tell us what you drive so riders can identify your cab quickly.
            </Text>

            <View style={styles.stepRow}>
              <Step label="License" done />
              <Step active label="Vehicle" />
              <Step label="Insurance" />
              <Step label="Photo" />
            </View>
          </LinearGradient>

          <Animated.View entering={FadeInDown.delay(200)} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons name="car-sport" size={24} color="#0E2A5A" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Vehicle Info</Text>
                <Text style={styles.cardSubtitle}>Step 3 of 5</Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Vehicle Type</Text>
            <View style={styles.typeGrid}>
              {VEHICLE_TYPES.map((type) => {
                const selected = form.type === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeChip, selected && styles.typeChipSelected]}
                    onPress={() => handleChange("type", type)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={type === "Auto" ? "car-outline" : "car-sport-outline"}
                      size={18}
                      color={selected ? "#0B1B3A" : "#6B7280"}
                    />
                    <Text style={[styles.typeText, selected && styles.typeTextSelected]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Input
              icon="pricetag-outline"
              placeholder="Vehicle Number (KA01AB1234)"
              value={form.number}
              onChangeText={(value: string) => handleChange("number", value)}
              autoCapitalize="characters"
            />
            <Input
              icon="construct-outline"
              placeholder="Vehicle Model"
              value={form.model}
              onChangeText={(value: string) => handleChange("model", value)}
            />
            <Input
              icon="calendar-outline"
              placeholder="Manufacturing Year"
              value={form.year}
              onChangeText={(value: string) => handleChange("year", value)}
              keyboardType="number-pad"
            />

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

export default VehicleScreen;

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
  fieldLabel: { color: "#0E2A5A", fontWeight: "700", marginBottom: 10 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  typeChip: {
    minWidth: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#EEE",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  typeChipSelected: { backgroundColor: "#FFF4BF", borderColor: "#FFD000" },
  typeText: { color: "#6B7280", fontWeight: "700" },
  typeTextSelected: { color: "#0B1B3A" },
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
