import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRegistration } from "./RegistrationContext";
import { useAuthStore } from "../../../../store/authStore";
import { Colors, Spacing, Typography } from "../../../../theme";

export default function ReviewScreen({ navigation }: any) {
  const { data } = useRegistration();
  const registerFn = useAuthStore((state) => state.register);
  const loginFn = useAuthStore((state) => state.login);
  const error = useAuthStore((state) => state.error);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const personal = data.personal || {};
    const payload = {
      name: personal.name,
      email: personal.email,
      phone: personal.phone,
      password: personal.password,
      license_number: data.license?.licenseNumber,
      license_expiry: data.license?.expiry,
      vehicle_number: data.vehicle?.number,
      vehicle_model: data.vehicle?.model,
      vehicle_type: data.vehicle?.type,
      insurance_policy: data.insurance?.policy,
      insurance_expiry: data.insurance?.expiry,
    };

    if (!payload.name || !payload.email || !payload.phone || !payload.password) {
      setIsSubmitting(false);
      Alert.alert("Registration Error", "Please complete all registration steps first.");
      navigation.navigate("PersonalInfo");
      return;
    }

    const success = await registerFn(payload);
    if (success) {
      setIsSubmitting(false);
      Alert.alert(
        "Success",
        "Your driver account has been created!"
      );
    } else {
      setIsSubmitting(false);
      Alert.alert("Registration Failed", error || "Could not register details. Email/Phone may already exist.");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Review Details</Text>
          <View style={{ width: 44 }} />
        </View>

        <Text style={styles.subtitle}>
          Verify the information below before submitting your registration.
        </Text>

        {/* Personal Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Personal Info</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{data.personal?.name || "Not provided"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{data.personal?.email || "Not provided"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>{data.personal?.phone || "Not provided"}</Text>
          </View>
        </View>

        {/* License Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card-outline" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Driving License</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>License No.</Text>
            <Text style={styles.value}>{data.license?.licenseNumber || "Not provided"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Expiry</Text>
            <Text style={styles.value}>{data.license?.expiry || "Not provided"}</Text>
          </View>
        </View>

        {/* Vehicle Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="car-outline" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Vehicle Details</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Vehicle Model</Text>
            <Text style={styles.value}>{data.vehicle?.model || "Not provided"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Plate Number</Text>
            <Text style={styles.value}>{data.vehicle?.number || "Not provided"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Type</Text>
            <Text style={styles.value}>{data.vehicle?.type || "Not provided"}</Text>
          </View>
        </View>

        {/* Submit button */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.btnGradient}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Text style={styles.submitBtnText}>SUBMIT APPLICATION</Text>
                <Ionicons name="checkmark-circle-outline" size={22} color={Colors.white} style={styles.icon} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 40, gap: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: { fontSize: Typography.subHeading, fontWeight: "800", color: Colors.textPrimary },
  subtitle: { fontSize: Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.md },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.lg,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: Colors.divider, paddingBottom: 10, marginBottom: 4 },
  sectionTitle: { fontSize: Typography.body, fontWeight: "700", color: Colors.textPrimary },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: Typography.caption, color: Colors.textSecondary },
  value: { fontSize: Typography.caption, color: Colors.textPrimary, fontWeight: "600" },
  submitBtn: { borderRadius: 16, overflow: "hidden", marginTop: Spacing.lg },
  btnGradient: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitBtnText: { color: Colors.white, fontSize: Typography.body, fontWeight: "800" },
  icon: { marginLeft: 4 },
});
