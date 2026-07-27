import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AppInput from "../../../components/inputs/AppInput";
import PrimaryButton from "../../../components/buttons/PrimaryButton";
import { Colors, Spacing, Typography } from "../../../theme";
import { useAuthStore } from "../../../store/authStore";
import { BASE_URL } from "../../../api/axios";

export default function EditProfileScreen({ navigation }: any) {
  const driver = useAuthStore((s) => s.driver);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const uploadDocumentFile = useAuthStore((s) => s.uploadDocumentFile);
  const removeAvatar = useAuthStore((s) => s.removeAvatar);

  const [name, setName] = useState(driver?.name || "");
  const [phone, setPhone] = useState(driver?.phone || "");
  const [email, setEmail] = useState(driver?.email || "");
  const [city, setCity] = useState(driver?.residential_address || "");
  const [vehicle, setVehicle] = useState(driver?.documents?.vehicle_model || "");
  const [vehicleType, setVehicleType] = useState(driver?.documents?.vehicle_type || "");
  const [plate, setPlate] = useState(driver?.documents?.vehicle_plate_number || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
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
    if (!city.trim()) {
      Alert.alert("Missing City", "Please enter your city.");
      return;
    }
    if (!vehicle.trim()) {
      Alert.alert("Missing Vehicle", "Please enter your vehicle model.");
      return;
    }
    if (!plate.trim()) {
      Alert.alert("Missing Number Plate", "Please enter your vehicle number plate.");
      return;
    }

    setSaving(true);
    const success = await updateProfile({
      name,
      phone,
      email,
      residential_address: city,
      vehicle_model: vehicle,
      vehicle_type: vehicleType,
      vehicle_plate_number: plate,
    });
    setSaving(false);
    if (success) {
      navigation.goBack();
    }
  };

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // disabled to prevent unstyled native crop screen
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setSaving(true);
      const uri = result.assets[0].uri;
      const fileData = { uri, type: "image/jpeg", name: "avatar.jpg" } as any;
      const success = await uploadDocumentFile("avatar", fileData);
      setSaving(false);
      if (success) {
        Alert.alert("Success", "Profile photo updated!");
      } else {
        Alert.alert("Error", "Failed to upload photo. Please try again.");
      }
    }
  };

  const handleRemoveAvatar = async () => {
    Alert.alert("Remove Photo", "Are you sure you want to remove your profile photo?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Remove", 
        style: "destructive", 
        onPress: async () => {
          setSaving(true);
          await removeAvatar();
          setSaving(false);
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            {driver?.avatar ? (
              <Image 
                source={{ uri: driver.avatar.startsWith('http') ? driver.avatar : `${BASE_URL.replace('/api', '')}${driver.avatar}` }} 
                style={styles.avatarImage} 
              />
            ) : (
              <Text style={styles.avatarInitial}>
                {driver?.name ? driver.name.charAt(0).toUpperCase() : "D"}
              </Text>
            )}
          </View>
          <View style={styles.photoActions}>
            <TouchableOpacity style={styles.changePhoto} onPress={handlePickAvatar}>
              <Ionicons name="camera" size={16} color={Colors.primary} />
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
            {driver?.avatar && (
              <TouchableOpacity style={styles.removePhotoBtn} onPress={handleRemoveAvatar}>
                <Ionicons name="trash-outline" size={16} color={Colors.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Personal Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.formCard}>
            <AppInput
              label="Full Name"
              leftIcon="person-outline"
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
            />
            <AppInput
              label="Phone Number"
              leftIcon="call-outline"
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 XXXXX XXXXX"
              keyboardType="phone-pad"
            />
            <AppInput
              label="Email Address"
              leftIcon="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              keyboardType="email-address"
            />
            <AppInput
              label="City"
              leftIcon="location-outline"
              value={city}
              onChangeText={setCity}
              placeholder="Your city"
            />
          </View>
        </View>

        {/* Vehicle Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Information</Text>
          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>Vehicle Class</Text>
            <View style={styles.pickerRow}>
              {["hatchback", "sedan", "xuv"].map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.pickerBtn, vehicleType === opt && styles.pickerBtnActive]}
                  onPress={() => setVehicleType(opt)}
                >
                  <Text style={[styles.pickerText, vehicleType === opt && styles.pickerTextActive]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <AppInput
              label="Vehicle Model"
              leftIcon="car-outline"
              value={vehicle}
              onChangeText={setVehicle}
              placeholder="Vehicle make & model"
            />
            <AppInput
              label="Number Plate"
              leftIcon="id-card-outline"
              value={plate}
              onChangeText={setPlate}
              placeholder="KA 00 XX 0000"
              autoCapitalize="characters"
            />
          </View>
        </View>

        {/* Document Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documents</Text>
          <View style={styles.card}>
            {[
              { label: "Driving License", status: driver?.documents?.license_image ? "verified" : "missing", icon: "id-card-outline" as const },
              { label: "Vehicle Photo", status: driver?.documents?.vehicle_image ? "verified" : "missing", icon: "document-text-outline" as const },
              { label: "Insurance", status: driver?.documents?.insurance_image ? "verified" : "missing", icon: "shield-outline" as const },
              { label: "Profile Photo", status: driver?.avatar ? "verified" : "missing", icon: "camera-outline" as const },
            ].map((doc, i) => (
              <View
                key={doc.label}
                style={[styles.docRow, i > 0 && styles.rowBorder]}
              >
                <View style={styles.docLeft}>
                  <View style={styles.docIcon}>
                    <Ionicons name={doc.icon} size={18} color={Colors.primary} />
                  </View>
                  <Text style={styles.docLabel}>{doc.label}</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.docBadge,
                    { backgroundColor: doc.status === "verified" ? Colors.successLight : Colors.warningLight },
                  ]}
                  onPress={() => {
                    if (doc.status === "missing") {
                      navigation.navigate("CompleteProfile");
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={doc.status === "verified" ? "checkmark-circle" : "alert-circle"}
                    size={14}
                    color={doc.status === "verified" ? Colors.success : Colors.warning}
                  />
                    <Text
                      style={[
                        styles.docBadgeText,
                        { color: doc.status === "verified" ? Colors.success : Colors.warning },
                      ]}
                    >
                      {doc.status === "verified" ? "Verified" : "Upload"}
                    </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        <PrimaryButton title="Save Changes" onPress={handleSave} loading={saving} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surface,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  pageTitle: { fontSize: Typography.subHeading, fontWeight: "800", color: Colors.textPrimary },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 40, gap: 20 },
  avatarSection: { alignItems: "center", paddingTop: Spacing.md, gap: 12 },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 28,
    backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center",
    shadowColor: Colors.primary, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%", height: "100%", resizeMode: "cover",
  },
  avatarInitial: { fontSize: 30, fontWeight: "800", color: Colors.white },
  photoActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  changePhoto: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.primaryLight, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
  },
  changePhotoText: { fontSize: Typography.caption, fontWeight: "700", color: Colors.primary },
  removePhotoBtn: {
    backgroundColor: Colors.errorLight, padding: 10, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: Typography.caption, fontWeight: "700", color: Colors.textSecondary,
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  formCard: {
    backgroundColor: Colors.surface, borderRadius: 18, padding: Spacing.md,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  inputLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 8, fontWeight: "600", paddingHorizontal: 4, marginTop: 4 },
  pickerRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  pickerBtn: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 10, borderWidth: 1, borderColor: Colors.divider, backgroundColor: Colors.background },
  pickerBtnActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  pickerText: { fontSize: 13, color: Colors.textSecondary, fontWeight: "500", textTransform: "capitalize" },
  pickerTextActive: { color: Colors.primaryDark, fontWeight: "700" },
  card: {
    backgroundColor: Colors.surface, borderRadius: 18,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, overflow: "hidden",
  },
  docRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: Spacing.md },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.divider },
  docLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  docIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primaryLight,
    alignItems: "center", justifyContent: "center",
  },
  docLabel: { fontSize: Typography.body, color: Colors.textPrimary, fontWeight: "500" },
  docBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  docBadgeText: { fontSize: Typography.small, fontWeight: "700" },
});
