import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, Typography } from "../../../theme";
import { useAuthStore } from "../../../store/authStore";

const MENU_SECTIONS = [
  {
    title: "Account",
    items: [
      { icon: "document-text-outline" as const, label: "Complete Profile (8 Steps)", screen: "CompleteProfile" },
      { icon: "person-outline" as const, label: "Edit Basic Details", screen: "EditProfile" },
    ],
  },
  {
    title: "Preferences",
    items: [
      { icon: "notifications-outline" as const, label: "Notifications", screen: "Settings" },
      { icon: "language-outline" as const, label: "Language", screen: "Settings" },
      { icon: "map-outline" as const, label: "Navigation App", screen: "Settings" },
    ],
  },
  {
    title: "Support",
    items: [
      { icon: "help-circle-outline" as const, label: "Help & Support", screen: "Support" },
      { icon: "chatbubble-outline" as const, label: "Send Feedback", screen: "Support" },
      { icon: "star-outline" as const, label: "Rate the App", screen: "Support" },
    ],
  },
];

export default function ProfileScreen({ navigation }: any) {
  const driver = useAuthStore((s) => s.driver);
  const logoutFn = useAuthStore((s) => s.logout);
  const toggleOnlineFn = useAuthStore((s) => s.toggleOnline);
  const fetchProfileFn = useAuthStore((s) => s.fetchProfile);

  const driverName = driver?.name ?? "Driver";
  const driverPhone = driver?.phone ?? "";
  const driverEmail = driver?.email ?? "";
  const driverRating = driver?.rating?.toFixed(1) ?? "5.0";
  const driverBalance = driver?.balance ?? 0;
  const initials = driverName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const [isOnline, setIsOnline] = React.useState(driver?.is_online ?? false);

  React.useEffect(() => {
    fetchProfileFn().catch(() => undefined);
  }, []);

  React.useEffect(() => {
    if (driver) {
      setIsOnline(driver.is_online);
    }
  }, [driver?.is_online]);

  const handleToggle = async () => {
    await toggleOnlineFn();
    setIsOnline((v) => !v);
  };

  const handleLogout = async () => {
    await logoutFn();
    navigation.replace("Welcome");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Profile</Text>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => navigation.navigate("Settings")}
          >
            <Ionicons name="settings-outline" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          style={styles.profileCard}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.driverName}>{driverName}</Text>
            <Text style={styles.driverPhone}>{driverPhone}</Text>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={13} color={Colors.primary} />
              <Text style={styles.ratingText}>{driverRating} • Rating</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate("EditProfile")}
          >
            <Ionicons name="pencil" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </LinearGradient>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {[
            { label: "This Month", value: `₹${driverBalance.toLocaleString()}`, icon: "cash-outline" as const, color: Colors.success },
            { label: "Total KM", value: "0", icon: "navigate-outline" as const, color: Colors.info },
            { label: "Acceptance", value: "100%", icon: "checkmark-circle-outline" as const, color: Colors.warning },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Ionicons name={s.icon} size={22} color={s.color} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Availability Toggle */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleLeft}>
            <View style={[styles.toggleDot, { backgroundColor: isOnline ? Colors.success : Colors.textMuted }]} />
            <View>
              <Text style={styles.toggleTitle}>{isOnline ? "Available for Rides" : "Unavailable"}</Text>
              <Text style={styles.toggleSub}>{isOnline ? "You'll receive ride requests" : "You won't get any requests"}</Text>
            </View>
          </View>
          <Switch
            value={isOnline}
            onValueChange={handleToggle}
            thumbColor={Colors.white}
            trackColor={{ false: Colors.border, true: Colors.success }}
          />
        </View>

        {/* Vehicle Badge */}
        <View style={styles.vehicleCard}>
          <View style={styles.vehicleIcon}>
            <Ionicons name="car-sport" size={24} color={Colors.primary} />
          </View>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleName}>
              {driver?.documents?.vehicle_model || "Vehicle not added"}
            </Text>
            <Text style={styles.vehiclePlate}>
              {driver?.documents?.vehicle_plate_number || driver?.documents?.vehicle_number 
                ? `${driver.documents.vehicle_plate_number || driver.documents.vehicle_number} • ${driver.documents.vehicle_color || 'No Color'}`
                : "No plate provided"}
            </Text>
          </View>
          <View style={[styles.verifiedBadge]}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        </View>

        {!driver?.profile_completed && (
          <TouchableOpacity
            style={[styles.incompleteProfileBanner, { marginTop: Spacing.md }]}
            onPress={() => navigation.navigate("CompleteProfile")}
          >
            <View style={styles.warningIconContainer}>
              <Ionicons name="alert-circle" size={22} color={Colors.warning} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.bannerTitle}>Complete Your Profile</Text>
              <Text style={styles.bannerSub}>Required to go online and accept rides.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Menu Sections */}
        {MENU_SECTIONS.map((section) => (
          <View key={section.title} style={styles.menuSection}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.menuItem, index > 0 && styles.menuItemBorder]}
                  onPress={() => navigation.navigate(item.screen)}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuLeft}>
                    <View style={styles.menuIcon}>
                      <Ionicons name={item.icon} size={18} color={Colors.primary} />
                    </View>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Golden Ride Driver v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 120, gap: 16 },
  pageHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingTop: Spacing.md,
  },
  pageTitle: { fontSize: Typography.heading, fontWeight: "800", color: Colors.textPrimary },
  settingsBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surface,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  profileCard: { borderRadius: 24, padding: Spacing.lg, flexDirection: "row", alignItems: "center", gap: 14 },
  avatarCircle: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.4)",
  },
  avatarText: { fontSize: 22, fontWeight: "800", color: Colors.white },
  profileInfo: { flex: 1 },
  driverName: { fontSize: Typography.subHeading, fontWeight: "800", color: Colors.white },
  driverPhone: { fontSize: Typography.caption, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  ratingBadge: {
    flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6,
    backgroundColor: Colors.white, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 20, alignSelf: "flex-start",
  },
  ratingText: { fontSize: Typography.small, fontWeight: "700", color: Colors.primary },
  editBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: Colors.white, alignItems: "center", justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row", gap: 10,
  },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 18, padding: Spacing.md,
    alignItems: "center", gap: 4,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statValue: { fontSize: Typography.body, fontWeight: "800", color: Colors.textPrimary },
  statLabel: { fontSize: 10, color: Colors.textSecondary, textAlign: "center" },
  toggleCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: Colors.surface, borderRadius: 18, padding: Spacing.md,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  toggleLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  toggleDot: { width: 12, height: 12, borderRadius: 6 },
  toggleTitle: { fontSize: Typography.body, fontWeight: "700", color: Colors.textPrimary },
  toggleSub: { fontSize: Typography.small, color: Colors.textSecondary, marginTop: 2 },
  vehicleCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.surface, borderRadius: 18, padding: Spacing.md,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  vehicleIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: Colors.primaryLight, alignItems: "center", justifyContent: "center",
  },
  vehicleInfo: { flex: 1 },
  vehicleName: { fontSize: Typography.body, fontWeight: "700", color: Colors.textPrimary },
  vehiclePlate: { fontSize: Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  verifiedText: { fontSize: Typography.small, color: Colors.success, fontWeight: "600" },
  incompleteProfileBanner: {
    backgroundColor: Colors.warningLight,
    borderRadius: 16,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  warningIconContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 8,
    shadowColor: Colors.warning,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  bannerTitle: { color: Colors.textPrimary, fontWeight: "800", fontSize: 15 },
  bannerSub: { color: Colors.textSecondary, fontSize: 12, marginTop: 2, lineHeight: 16 },
  menuSection: { gap: 8, marginTop: Spacing.md },
  sectionTitle: { fontSize: Typography.caption, fontWeight: "700", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.8 },
  menuCard: {
    backgroundColor: Colors.surface, borderRadius: 18,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    overflow: "hidden",
  },
  menuItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: Spacing.md },
  menuItemBorder: { borderTopWidth: 1, borderTopColor: Colors.divider },
  menuLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primaryLight, alignItems: "center", justifyContent: "center",
  },
  menuLabel: { fontSize: Typography.body, color: Colors.textPrimary, fontWeight: "500" },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, height: 52, backgroundColor: Colors.errorLight, borderRadius: 16,
  },
  logoutText: { fontSize: Typography.body, fontWeight: "700", color: Colors.error },
  version: { textAlign: "center", fontSize: Typography.small, color: Colors.textMuted },
});
