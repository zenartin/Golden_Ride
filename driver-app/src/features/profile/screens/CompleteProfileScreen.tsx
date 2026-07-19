import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuthStore } from "../../../store/authStore";
import { Colors, Spacing, Typography } from "../../../theme";
import apiClient from "../../../api/axios";
import { API_ENDPOINTS } from "../../../api/endpoints";

export default function CompleteProfileScreen({ navigation }: any) {
  const driver = useAuthStore((s) => s.driver);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  const [isLoading, setIsLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState<number | null>(0);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerField, setPickerField] = useState<string | null>(null);

  const [licenseFrontUri, setLicenseFrontUri] = useState<string | null>(driver?.documents?.license_image || null);
  const [licenseBackUri, setLicenseBackUri] = useState<string | null>(driver?.documents?.license_back_image || null);
  const [vehicleUri, setVehicleUri] = useState<string | null>(driver?.documents?.vehicle_image || null);
  const [insuranceUri, setInsuranceUri] = useState<string | null>(driver?.documents?.insurance_image || null);

  const [form, setForm] = useState({
    date_of_birth: driver?.date_of_birth || "",
    residential_address: driver?.residential_address || "",
    
    license_number: driver?.documents?.license_number || "",
    license_state: driver?.documents?.license_state || "",
    license_expiry: driver?.documents?.license_expiry || "",
    
    vehicle_model: driver?.documents?.vehicle_model || "",
    vehicle_type: driver?.documents?.vehicle_type || "",
    vehicle_year: driver?.documents?.vehicle_year?.toString() || "",
    vehicle_color: driver?.documents?.vehicle_color || "",
    vehicle_plate_number: driver?.documents?.vehicle_plate_number || "",
    vehicle_vin: driver?.documents?.vehicle_vin || "",
    
    bank_name: driver?.documents?.bank_name || "",
    account_number: driver?.documents?.account_number || "",
    routing_number: driver?.documents?.routing_number || "",
    upi_id: driver?.documents?.upi_id || "",
    card_number: driver?.documents?.card_number || "",
    card_expiry: driver?.documents?.card_expiry || "",
    card_cvv: driver?.documents?.card_cvv || "",
    
    emergency_contact_name: driver?.documents?.emergency_contact_name || "",
    emergency_contact_phone: driver?.documents?.emergency_contact_phone || "",
    preferred_language: driver?.documents?.preferred_language || "",
    
    insurance_policy: driver?.documents?.insurance_policy || "",
    insurance_expiry: driver?.documents?.insurance_expiry || "",
    
    tax_id: driver?.documents?.tax_id || "",
  });

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (selectedDate && pickerField) {
      if (pickerField === 'card_expiry') {
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const year = String(selectedDate.getFullYear()).slice(2);
        handleChange(pickerField, `${month}/${year}`);
      } else {
        const formattedDate = selectedDate.toISOString().split('T')[0];
        handleChange(pickerField, formattedDate);
      }
    }
  };

  const pickImage = async (type: 'front' | 'back' | 'vehicle' | 'insurance') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // disabled to prevent unstyled native crop screen
      quality: 0.8,
    });
    if (!result.canceled) {
      if (type === 'front') setLicenseFrontUri(result.assets[0].uri);
      else if (type === 'back') setLicenseBackUri(result.assets[0].uri);
      else if (type === 'vehicle') setVehicleUri(result.assets[0].uri);
      else if (type === 'insurance') setInsuranceUri(result.assets[0].uri);
    }
  };

  const uploadDocument = async (uri: string, type: string) => {
    try {
      const formData = new FormData();
      formData.append("document_type", type);
      formData.append("file", { uri, type: "image/jpeg", name: `${type}.jpg` } as any);
      await apiClient.post(API_ENDPOINTS.DRIVER_UPLOAD_DOCUMENT, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return true;
    } catch (err) {
      console.log("Upload err:", err);
      return false;
    }
  };

  const handleSave = async () => {
    // Validation
    const requiredFields = [
      { key: 'date_of_birth', name: 'Date of Birth' },
      { key: 'residential_address', name: 'Residential Address' },
      { key: 'license_number', name: 'License Number' },
      { key: 'license_state', name: 'State of Issue' },
      { key: 'license_expiry', name: 'License Expiration Date' },
      { key: 'vehicle_type', name: 'Vehicle Class' },
      { key: 'vehicle_model', name: 'Vehicle Make & Model' },
      { key: 'vehicle_year', name: 'Vehicle Year' },
      { key: 'vehicle_color', name: 'Vehicle Color' },
      { key: 'vehicle_plate_number', name: 'License Plate Number' },
      { key: 'emergency_contact_name', name: 'Emergency Contact Name' },
      { key: 'emergency_contact_phone', name: 'Emergency Contact Phone' },
      { key: 'preferred_language', name: 'Preferred Language' },
      { key: 'insurance_policy', name: 'Insurance Policy Number' },
      { key: 'insurance_expiry', name: 'Insurance Expiration Date' },
    ];
    
    for (const field of requiredFields) {
      const val = (form as any)[field.key];
      if (!val || (typeof val === 'string' && !val.trim())) {
        Alert.alert("Missing Information", `Please provide your ${field.name}.`);
        return;
      }
    }
    
    const hasUpi = Boolean(form.upi_id?.trim());
    const hasCard = Boolean(form.card_number?.trim() && form.card_expiry?.trim() && form.card_cvv?.trim());
    const hasBank = Boolean(form.bank_name?.trim() && form.account_number?.trim() && form.routing_number?.trim());
    
    if (!hasUpi && !hasCard && !hasBank) {
      Alert.alert("Missing Payout Method", "Please provide at least one complete payout method (Bank Account, Card, or UPI).");
      return;
    }

    if (!licenseFrontUri || !licenseBackUri) {
      Alert.alert("Missing Document", "Please upload both front and back photos of your driver's license.");
      return;
    }
    if (!vehicleUri) {
      Alert.alert("Missing Document", "Please upload a photo of your vehicle.");
      return;
    }
    if (!insuranceUri) {
      Alert.alert("Missing Document", "Please upload a photo of your insurance document.");
      return;
    }

    setIsLoading(true);
    const payload = {
      ...form,
      vehicle_year: form.vehicle_year ? parseInt(form.vehicle_year, 10) : undefined,
    };
    
    if (licenseFrontUri && !licenseFrontUri.startsWith("http")) {
      await uploadDocument(licenseFrontUri, "license");
    }
    if (licenseBackUri && !licenseBackUri.startsWith("http")) {
      await uploadDocument(licenseBackUri, "license_back");
    }
    if (vehicleUri && !vehicleUri.startsWith("http")) {
      await uploadDocument(vehicleUri, "vehicle");
    }
    if (insuranceUri && !insuranceUri.startsWith("http")) {
      await uploadDocument(insuranceUri, "insurance");
    }
    
    const success = await updateProfile(payload);
    setIsLoading(false);

    if (success) {
      await fetchProfile();
      Alert.alert("Success", "Profile updated successfully!", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } else {
      Alert.alert("Error", "Failed to update profile. Please try again.");
    }
  };

  const SECTIONS = [
    {
      id: 0, title: "1. Personal Information", fields: [
        { key: "date_of_birth", label: "Date of Birth (YYYY-MM-DD)", placeholder: "e.g. 1990-01-01", type: "date" },
        { key: "residential_address", label: "Residential Address", placeholder: "Full Address" },
      ]
    },
    {
      id: 1, title: "2. Driver's License", fields: [
        { key: "license_number", label: "License Number", placeholder: "e.g. DL-123456" },
        { key: "license_state", label: "State of Issue", placeholder: "e.g. California" },
        { key: "license_expiry", label: "Expiration Date", placeholder: "YYYY-MM-DD", type: "date" },
      ]
    },
    {
      id: 2, title: "3. Vehicle Information", fields: [
        { key: "vehicle_type", label: "Vehicle Class", type: "picker", options: ["hatchback", "sedan", "xuv"] },
        { key: "vehicle_model", label: "Make & Model", placeholder: "e.g. Toyota Camry" },
        { key: "vehicle_year", label: "Year", placeholder: "e.g. 2022" },
        { key: "vehicle_color", label: "Color", placeholder: "e.g. Silver" },
        { key: "vehicle_plate_number", label: "License Plate Number", placeholder: "e.g. ABC-123" },
        { key: "vehicle_vin", label: "VIN", placeholder: "Vehicle Identification Number" },
      ]
    },
    {
      id: 3, title: "4. Banking & Payouts", fields: [
        { key: "upi_id", label: "UPI ID (India Payouts)", placeholder: "e.g. name@ybl" },
        { key: "card_number", label: "Card Number (USA Stripe Payouts)", placeholder: "0000 0000 0000 0000" },
        { key: "card_expiry", label: "Card Expiry", placeholder: "MM/YY", type: "date" },
        { key: "card_cvv", label: "Card CVV", placeholder: "123" },
        { key: "bank_name", label: "Bank Name", placeholder: "e.g. Chase Bank" },
        { key: "account_number", label: "Account Number", placeholder: "..." },
        { key: "routing_number", label: "Routing Number", placeholder: "..." },
      ]
    },
    {
      id: 4, title: "5. Profile & Emergency", fields: [
        { key: "emergency_contact_name", label: "Emergency Contact Name", placeholder: "..." },
        { key: "emergency_contact_phone", label: "Emergency Contact Phone", placeholder: "..." },
        { key: "preferred_language", label: "Preferred Language", placeholder: "e.g. English" },
      ]
    },
    {
      id: 5, title: "6. Tax Information", fields: [
        { key: "tax_id", label: "SSN or Tax ID (EIN)", placeholder: "..." },
      ]
    },
    {
      id: 6, title: "7. Insurance Information", fields: [
        { key: "insurance_policy", label: "Insurance Policy Number", placeholder: "..." },
        { key: "insurance_expiry", label: "Expiration Date", placeholder: "YYYY-MM-DD", type: "date" },
      ]
    }
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="close-outline" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Complete Profile</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color={Colors.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.infoTitle}>Required for Rides</Text>
              <Text style={styles.infoDesc}>
                You must provide your personal details, license number, and vehicle information before you can go online. 
                Background checks will be reviewed by our team.
              </Text>
            </View>
          </View>

          {SECTIONS.map((section) => (
            <View key={section.id} style={styles.accordionContainer}>
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
              >
                <Text style={styles.accordionTitle}>{section.title}</Text>
                <Ionicons
                  name={expandedSection === section.id ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
              
              {expandedSection === section.id && (
                <View style={styles.accordionBody}>
                  {section.fields.map((field) => (
                    <View key={field.key} style={styles.inputWrapper}>
                      <Text style={styles.label}>{field.label}</Text>
                      {(field as any).type === "date" ? (
                        <TouchableOpacity 
                          style={styles.input} 
                          onPress={() => { setPickerField(field.key); setShowPicker(true); }}
                        >
                          <Text style={{ color: (form as any)[field.key] ? Colors.textPrimary : Colors.textMuted }}>
                            {(form as any)[field.key] || field.placeholder}
                          </Text>
                        </TouchableOpacity>
                      ) : (field as any).type === "picker" ? (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {(field as any).options.map((opt: string) => (
                            <TouchableOpacity 
                              key={opt}
                              style={[
                                styles.input, 
                                { flex: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: (form as any)[field.key] === opt ? Colors.primaryLight : Colors.background, borderColor: (form as any)[field.key] === opt ? Colors.primary : Colors.divider }
                              ]}
                              onPress={() => handleChange(field.key, opt)}
                            >
                              <Text style={{ textTransform: 'capitalize', fontSize: 13, color: (form as any)[field.key] === opt ? Colors.primaryDark : Colors.textSecondary, fontWeight: (form as any)[field.key] === opt ? '700' : '500' }}>
                                {opt}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        <TextInput
                          style={styles.input}
                          placeholder={field.placeholder}
                          placeholderTextColor={Colors.textMuted}
                          value={(form as any)[field.key]}
                          onChangeText={(text) => handleChange(field.key, text)}
                        />
                      )}
                    </View>
                  ))}
                  {section.id === 1 && (
                    <View style={styles.uploadRow}>
                      <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage('front')}>
                        {licenseFrontUri ? <Image source={{ uri: licenseFrontUri }} style={styles.uploadedImg} /> : <><Ionicons name="camera" size={24} color={Colors.textMuted}/><Text style={styles.uploadText}>Front</Text></>}
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage('back')}>
                        {licenseBackUri ? <Image source={{ uri: licenseBackUri }} style={styles.uploadedImg} /> : <><Ionicons name="camera" size={24} color={Colors.textMuted}/><Text style={styles.uploadText}>Back</Text></>}
                      </TouchableOpacity>
                    </View>
                  )}
                  {section.id === 2 && (
                    <View style={styles.uploadRow}>
                      <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage('vehicle')}>
                        {vehicleUri ? <Image source={{ uri: vehicleUri }} style={styles.uploadedImg} /> : <><Ionicons name="car-outline" size={24} color={Colors.textMuted}/><Text style={styles.uploadText}>Vehicle Photo</Text></>}
                      </TouchableOpacity>
                    </View>
                  )}
                  {section.id === 6 && (
                    <View style={styles.uploadRow}>
                      <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage('insurance')}>
                        {insuranceUri ? <Image source={{ uri: insuranceUri }} style={styles.uploadedImg} /> : <><Ionicons name="shield-outline" size={24} color={Colors.textMuted}/><Text style={styles.uploadText}>Insurance Document</Text></>}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}

          {/* Documents & Background Info */}
          <View style={styles.accordionContainer}>
            <View style={[styles.accordionHeader, { borderBottomWidth: 0 }]}>
              <Text style={styles.accordionTitle}>7 & 8. Documents & Background</Text>
              <Ionicons name="time-outline" size={20} color={Colors.warning} />
            </View>
            <View style={styles.accordionBody}>
              <Text style={{ color: Colors.textSecondary, fontSize: 13 }}>
                Your documents and background checks are pending administrative review. You will be notified once approved.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={isLoading}
          >
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.btnGradient}>
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.saveBtnText}>SAVE PROFILE</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

        </ScrollView>
        {showPicker && (
          <DateTimePicker
            value={pickerField && (form as any)[pickerField] ? new Date((form as any)[pickerField]) : new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.surface,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  headerTitle: { fontSize: Typography.subHeading, fontWeight: "800", color: Colors.textPrimary },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 40, gap: 16 },
  infoCard: {
    flexDirection: "row", backgroundColor: Colors.primaryLight, borderRadius: 16,
    padding: Spacing.md, alignItems: "center",
  },
  infoTitle: { fontWeight: "700", color: Colors.primaryDark, fontSize: 15 },
  infoDesc: { color: Colors.primaryDark, fontSize: 12, marginTop: 4, lineHeight: 18 },
  
  accordionContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  accordionHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: Spacing.md,
  },
  accordionTitle: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  accordionBody: {
    padding: Spacing.md, paddingTop: 0,
  },
  inputWrapper: { marginBottom: 12 },
  label: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4, fontWeight: "600" },
  input: {
    borderWidth: 1, borderColor: Colors.divider, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },

  saveBtn: { borderRadius: 16, overflow: "hidden", marginTop: Spacing.md },
  btnGradient: { height: 56, alignItems: "center", justifyContent: "center" },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
  uploadRow: { flexDirection: "row", gap: 12, marginTop: 10 },
  uploadBox: { flex: 1, height: 100, borderWidth: 1, borderColor: Colors.divider, borderStyle: "dashed", borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background, overflow: "hidden" },
  uploadText: { fontSize: 12, color: Colors.textMuted, marginTop: 4, fontWeight: "600" },
  uploadedImg: { width: "100%", height: "100%", resizeMode: "cover" },
});
