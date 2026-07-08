import React, { useState } from "react";
import { Alert, Text, View, StyleSheet, Pressable, ScrollView, Image, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { MainStackParamList } from "../../navigation/MainNavigator";
import { useAuthStore } from "../../store/authStore";
import { Colors, Spacing, Typography } from "../../theme";
import { BASE_URL } from "../../api/client";

type Props = {
  navigation: {
    navigate: (screen: keyof MainStackParamList) => void;
  };
};

export default function ProfileScreen({ navigation }: Props) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const insets = useSafeAreaInsets();
  const [uploading, setUploading] = useState(false);

  const signOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleEditPhoto = () => {
    Alert.alert(
      "Profile Photo",
      "Choose an option to update your profile photo:",
      [
        { text: "Take Photo", onPress: takePhoto },
        { text: "Choose from Gallery", onPress: pickImage },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow access to your photos to upload a profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow camera access to take a profile picture.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    setUploading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const formData = new FormData();
      const filename = uri.split("/").pop() || "avatar.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append("file", {
        uri,
        name: filename,
        type,
      } as any);

      const uploadUrl = `${BASE_URL}/profile/upload-avatar`;
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data.status === "success") {
        Alert.alert("Success", "Profile photo uploaded successfully!");
        await useAuthStore.getState().fetchProfile();
      } else {
        throw new Error(data.detail || "Upload failed");
      }
    } catch (err: any) {
      Alert.alert("Upload Failed", err?.message || "Could not upload profile picture.");
    } finally {
      setUploading(false);
    }
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "R";

  // Prepend Base URL to relative static static path
  const hostUrl = BASE_URL.replace("/api", "");
  const avatarUrl = user?.avatar ? `${hostUrl}${user.avatar}` : null;

  return (
    <View style={styles.root}>
      {/* Premium Header with Notch spacing */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Profile & Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.headerCard}>
          <Pressable style={styles.avatarContainer} onPress={handleEditPhoto} disabled={uploading}>
            {uploading ? (
              <View style={styles.avatar}>
                <ActivityIndicator size="small" color={Colors.white} />
              </View>
            ) : avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            {/* Edit overlay badge */}
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={14} color={Colors.white} />
            </View>
          </Pressable>
          <Text style={styles.name}>{user?.name || "Golden Rider"}</Text>
          <Text style={styles.metaEmail}>{user?.email || "rider@goldenride.com"}</Text>
          <Text style={styles.metaPhone}>📞 {user?.phone || "+91 99999 88888"}</Text>
          <Pressable style={styles.editProfileBtn} onPress={() => navigation.navigate("EditProfile")}>
            <Text style={styles.editProfileBtnText}>Edit Profile</Text>
          </Pressable>
        </View>

        {/* Account Section */}
        <Text style={styles.sectionTitle}>Account settings</Text>
        <View style={styles.menuGroup}>


          {/* Saved Places */}
          <Pressable style={styles.menuItem} onPress={() => navigation.navigate("SavedLocations")}>
            <View style={[styles.iconWrap, { backgroundColor: "#EBFDF5" }]}>
              <Ionicons name="location-outline" size={20} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>Saved Locations</Text>
              <Text style={styles.menuSublabel}>Home, Work and frequent destinations</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
          </Pressable>

          <View style={styles.separator} />

          {/* Payment Methods */}
          <Pressable style={styles.menuItem} onPress={() => navigation.navigate("PaymentMethods")}>
            <View style={[styles.iconWrap, { backgroundColor: "#EEF2FF" }]}>
              <Ionicons name="card-outline" size={20} color="#6366F1" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>Payment Methods</Text>
              <Text style={styles.menuSublabel}>Manage credit cards and wallet</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
          </Pressable>
        </View>

        {/* Support Section */}
        <Text style={styles.sectionTitle}>Support & Information</Text>
        <View style={styles.menuGroup}>
          <Pressable style={styles.menuItem} onPress={() => navigation.navigate("Content", { slug: "support", title: "Help & Support" })}>
            <View style={[styles.iconWrap, { backgroundColor: "#FFFBEB" }]}>
              <Ionicons name="help-circle-outline" size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.menuLabel, { flex: 1 }]}>Help & Support Desk</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
          </Pressable>

          <View style={styles.separator} />

          <Pressable style={styles.menuItem} onPress={() => navigation.navigate("Content", { slug: "privacy-policy", title: "Privacy Policy" })}>
            <View style={[styles.iconWrap, { backgroundColor: "#FDF2F8" }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#EC4899" />
            </View>
            <Text style={[styles.menuLabel, { flex: 1 }]}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
          </Pressable>
          
          <View style={styles.separator} />

          <Pressable style={styles.menuItem} onPress={() => navigation.navigate("Content", { slug: "terms", title: "Terms of Service" })}>
            <View style={[styles.iconWrap, { backgroundColor: "#EFF6FF" }]}>
              <Ionicons name="document-text-outline" size={20} color="#3B82F6" />
            </View>
            <Text style={[styles.menuLabel, { flex: 1 }]}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
          </Pressable>

          <View style={styles.separator} />

          <Pressable style={styles.menuItem} onPress={() => navigation.navigate("Content", { slug: "about", title: "About Us" })}>
            <View style={[styles.iconWrap, { backgroundColor: "#F3F4F6" }]}>
              <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
            </View>
            <Text style={[styles.menuLabel, { flex: 1 }]}>About Us</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
          </Pressable>
        </View>

        {/* Logout Action */}
        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
          onPress={signOut}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: Typography.heading,
    fontWeight: "900",
    color: Colors.textPrimary,
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: 40,
    gap: 14,
  },
  headerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: Spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  avatarText: {
    color: Colors.white,
    fontWeight: "900",
    fontSize: Typography.heading,
  },
  editBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: Colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  name: {
    color: Colors.textPrimary,
    fontSize: Typography.subHeading,
    fontWeight: "900",
  },
  metaEmail: {
    color: Colors.textSecondary,
    fontSize: Typography.small,
    marginTop: 4,
  },
  metaPhone: {
    color: Colors.textSecondary,
    fontSize: Typography.small,
    marginTop: 2,
    fontWeight: "600",
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.small,
    fontWeight: "800",
    textTransform: "uppercase",
    marginLeft: 6,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  menuGroup: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  editProfileBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editProfileBtnText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: 12,
  },
  menuItemPressed: {
    backgroundColor: Colors.background,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    color: Colors.textPrimary,
    fontSize: Typography.small,
    fontWeight: "700",
  },
  menuSublabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 62,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    marginTop: 10,
  },
  logoutBtnPressed: {
    opacity: 0.8,
  },
  logoutText: {
    color: "#EF4444",
    fontWeight: "800",
    fontSize: Typography.body,
  },
});
