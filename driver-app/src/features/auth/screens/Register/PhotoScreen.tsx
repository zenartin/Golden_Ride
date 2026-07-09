import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRegistration } from "./RegistrationContext";

type UploadKey = "profile" | "license" | "vehicle" | "insurance";

const UPLOADS: Array<{
  key: UploadKey;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    key: "profile",
    title: "Profile Photo",
    subtitle: "Clear front-facing photo",
    icon: "person-circle-outline",
  },
  {
    key: "license",
    title: "License Photo",
    subtitle: "Front side of driving license",
    icon: "card-outline",
  },
  {
    key: "vehicle",
    title: "Vehicle Photo",
    subtitle: "Number plate visible",
    icon: "car-sport-outline",
  },
  {
    key: "insurance",
    title: "Insurance Copy",
    subtitle: "Policy document image",
    icon: "shield-checkmark-outline",
  },
];

const PhotoScreen = ({ navigation }: any) => {
  const { update } = useRegistration();
  const [uploads, setUploads] = useState<Record<UploadKey, boolean>>({
    profile: false,
    license: false,
    vehicle: false,
    insurance: false,
  });

  const completedCount = Object.values(uploads).filter(Boolean).length;
  const allRequiredDone = uploads.profile && uploads.license;

  const toggleUpload = (key: UploadKey) => {
    setUploads((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleContinue = () => {
    if (!allRequiredDone) {
      alert("Please add at least your profile photo and license photo.");
      return;
    }
    update("photo", uploads);
    navigation.navigate("Review");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={["#0B1B3A", "#0E2A5A"]} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
            <Ionicons name="arrow-back" size={24} color="#FFD000" />
          </TouchableOpacity>

          <Animated.Text entering={FadeInDown.delay(100)} style={styles.title}>
            Upload{"\n"}
            <Text style={styles.titleAccent}>Verification Photos</Text>
          </Animated.Text>

          <Text style={styles.subtitle}>
            Add clear images so your driver profile can be reviewed quickly.
          </Text>

          <View style={styles.stepRow}>
            <Step label="License" done />
            <Step label="Vehicle" done />
            <Step label="Insurance" done />
            <Step active label="Photo" />
          </View>
        </LinearGradient>

        <Animated.View entering={FadeInDown.delay(200)} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Ionicons name="cloud-upload" size={24} color="#0E2A5A" />
            </View>
            <View style={styles.cardTitleWrap}>
              <Text style={styles.cardTitle}>Upload Photo</Text>
              <Text style={styles.cardSubtitle}>{completedCount} of 4 selected</Text>
            </View>
            <View style={styles.progressPill}>
              <Text style={styles.progressText}>Step 5</Text>
            </View>
          </View>

          <View style={styles.previewBox}>
            <View style={styles.previewIcon}>
              <Ionicons name="camera-outline" size={34} color="#FFD000" />
            </View>
            <Text style={styles.previewTitle}>Tap a document below to mark it uploaded</Text>
            <Text style={styles.previewText}>
              Real file picking can be added later with Expo Image Picker.
            </Text>
          </View>

          <View style={styles.uploadList}>
            {UPLOADS.map((item) => {
              const selected = uploads[item.key];
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.uploadRow, selected && styles.uploadRowSelected]}
                  onPress={() => toggleUpload(item.key)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.uploadIcon, selected && styles.uploadIconSelected]}>
                    <Ionicons
                      name={selected ? "checkmark" : item.icon}
                      size={22}
                      color={selected ? "#0B1B3A" : "#FFD000"}
                    />
                  </View>
                  <View style={styles.uploadCopy}>
                    <Text style={styles.uploadTitle}>{item.title}</Text>
                    <Text style={styles.uploadSubtitle}>{item.subtitle}</Text>
                  </View>
                  <Ionicons
                    name={selected ? "checkmark-circle" : "add-circle-outline"}
                    size={24}
                    color={selected ? "#22C55E" : "#9CA3AF"}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.requiredBox}>
            <Ionicons name="information-circle-outline" size={18} color="#0E2A5A" />
            <Text style={styles.requiredText}>
              Required now: Profile Photo and License Photo. Vehicle and insurance photos can be updated later.
            </Text>
          </View>

          <TouchableOpacity activeOpacity={0.85} onPress={handleContinue}>
            <LinearGradient colors={["#FFD000", "#FFB800"]} style={styles.button}>
              <Text style={styles.buttonText}>REVIEW APPLICATION</Text>
              <View style={styles.arrow}>
                <Ionicons name="arrow-forward" size={20} color="#000" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const Step = ({ label, active, done }: any) => (
  <View style={[styles.step, active && styles.stepActive, done && styles.stepDone]}>
    <Text style={[styles.stepText, (active || done) && styles.stepTextActive]}>{label}</Text>
  </View>
);

export default PhotoScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB" },
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
  cardTitleWrap: { flex: 1 },
  cardTitle: { fontSize: 20, fontWeight: "700", color: "#0E2A5A" },
  cardSubtitle: { color: "#777", marginTop: 2 },
  progressPill: {
    borderRadius: 999,
    backgroundColor: "#F5F7FB",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  progressText: { color: "#0E2A5A", fontSize: 11, fontWeight: "800" },
  previewBox: {
    borderWidth: 1,
    borderColor: "#EEE",
    borderStyle: "dashed",
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
    backgroundColor: "#FAFBFD",
    marginBottom: 14,
  },
  previewIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: "#0B1B3A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  previewTitle: { color: "#0E2A5A", fontWeight: "800", textAlign: "center" },
  previewText: { color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 4, lineHeight: 17 },
  uploadList: { gap: 10 },
  uploadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#EEE",
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#fff",
  },
  uploadRowSelected: { borderColor: "#FFD000", backgroundColor: "#FFFBEB" },
  uploadIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#0B1B3A",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadIconSelected: { backgroundColor: "#FFD000" },
  uploadCopy: { flex: 1 },
  uploadTitle: { color: "#1F2937", fontWeight: "800" },
  uploadSubtitle: { color: "#6B7280", fontSize: 12, marginTop: 2 },
  requiredBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#F5F7FB",
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },
  requiredText: { flex: 1, color: "#6B7280", fontSize: 12, lineHeight: 17 },
  button: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    borderRadius: 30,
    marginTop: 14,
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
