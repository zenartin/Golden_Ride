import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, Alert, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Colors, Spacing, Typography } from "../../theme";
import { useAuthStore } from "../../store/authStore";
import { BASE_URL } from "../../api/client";
import AppInput from "../../components/AppInput";
import AppButton from "../../components/AppButton";

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const uploadAvatar = useAuthStore((s) => s.uploadAvatar);
  const removeAvatar = useAuthStore((s) => s.removeAvatar);

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    setSaving(true);
    const success = await updateProfile(name, email, phone);
    setSaving(false);
    if (success) {
      Alert.alert("Success", "Your profile has been updated.");
      navigation.goBack();
    } else {
      Alert.alert("Error", "Failed to update profile. Please try again.");
    }
  };

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setSaving(true);
      const success = await uploadAvatar(result.assets[0].uri);
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
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              {user?.avatar ? (
                <Image 
                  source={{ uri: user.avatar.startsWith('http') ? user.avatar : `${BASE_URL.replace('/api', '')}${user.avatar}` }} 
                  style={styles.avatarImage} 
                />
              ) : (
                <Text style={styles.avatarInitial}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                </Text>
              )}
            </View>
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.changePhotoBtn} onPress={handlePickAvatar}>
                <Ionicons name="camera" size={16} color={Colors.primary} />
                <Text style={styles.changePhotoText}>Change Photo</Text>
              </TouchableOpacity>
              {user?.avatar && (
                <TouchableOpacity style={styles.removePhotoBtn} onPress={handleRemoveAvatar}>
                  <Ionicons name="trash-outline" size={16} color={Colors.error} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <AppInput
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
            />
            <AppInput
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <AppInput
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="Your phone number"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.spacer} />
          
          <AppButton 
            title="Save Changes" 
            onPress={handleSave} 
            loading={saving} 
            style={styles.saveBtn}
          />
          
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.background,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: Colors.textPrimary, letterSpacing: 0.5 },
  scroll: { padding: Spacing.lg, paddingBottom: 60 },
  avatarSection: {
    alignItems: "center",
    marginVertical: Spacing.xl,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 16,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: "900",
    color: Colors.white,
  },
  changePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.primaryDark,
  },
  photoActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  removePhotoBtn: {
    backgroundColor: Colors.errorLight,
    padding: 10,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  spacer: {
    height: 24,
  },
  saveBtn: {
    marginTop: 8,
  }
});
