import React, { useEffect, useState } from "react";
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
import { Colors, Spacing, Typography } from "../../../theme";
import { useAppStore } from "../../../store/appStore";

interface SettingRow {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  type: "toggle" | "nav" | "value";
  value?: string;
  toggleKey?: string;
}

const SECTIONS: { title: string; items: SettingRow[] }[] = [
  {
    title: "Notifications",
    items: [
      { icon: "car-outline", label: "Ride Requests", sub: "Get notified for new rides", type: "toggle", toggleKey: "rideRequests" },
      { icon: "cash-outline", label: "Earnings Updates", sub: "Payments and bonuses", type: "toggle", toggleKey: "earnings" },
      { icon: "megaphone-outline", label: "Promotions", sub: "Special offers and surge alerts", type: "toggle", toggleKey: "promos" },
    ],
  },
  {
    title: "Navigation",
    items: [
      { icon: "map-outline", label: "Navigation App", type: "value", value: "Google Maps" },
      { icon: "locate-outline", label: "Auto-start Navigation", type: "toggle", toggleKey: "autoNav" },
      { icon: "volume-high-outline", label: "Voice Guidance", type: "toggle", toggleKey: "voice" },
    ],
  },
  {
    title: "Privacy & Safety",
    items: [
      { icon: "shield-outline", label: "Share Location", type: "toggle", toggleKey: "location" },
      { icon: "eye-off-outline", label: "Hide Phone Number", type: "toggle", toggleKey: "hidePhone" },
      { icon: "lock-closed-outline", label: "Change Password", type: "nav" },
    ],
  },
  {
    title: "App",
    items: [
      { icon: "language-outline", label: "Language", type: "value", value: "English" },
      { icon: "phone-portrait-outline", label: "App Version", type: "value", value: "v1.0.0" },
      { icon: "information-circle-outline", label: "Terms & Privacy", type: "nav" },
    ],
  },
];

export default function SettingsScreen({ navigation }: any) {
  const { settings, fetchSettings, updateSettings } = useAppStore();

  useEffect(() => {
    fetchSettings();
  }, []);

  const [localToggles, setLocalToggles] = useState<Record<string, boolean>>({
    rideRequests: true, earnings: true, promos: false,
    autoNav: true, voice: true, location: true, hidePhone: false,
  });

  const toggle = (key: string) => {
    const newVal = !localToggles[key];
    setLocalToggles((p) => ({ ...p, [key]: newVal }));
    // Sync push_notifications to backend when that toggle changes
    if (key === "rideRequests") {
      updateSettings({ push_notifications: newVal });
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, i) => (
                <View
                  key={item.label}
                  style={[styles.row, i > 0 && styles.rowBorder]}
                >
                  <View style={styles.rowLeft}>
                    <View style={styles.iconBox}>
                      <Ionicons name={item.icon} size={18} color={Colors.primary} />
                    </View>
                    <View>
                      <Text style={styles.rowLabel}>{item.label}</Text>
                      {item.sub && <Text style={styles.rowSub}>{item.sub}</Text>}
                    </View>
                  </View>
                  {item.type === "toggle" && item.toggleKey && (
                    <Switch
                      value={localToggles[item.toggleKey] ?? false}
                      onValueChange={() => toggle(item.toggleKey!)}
                      thumbColor={Colors.white}
                      trackColor={{ false: Colors.border, true: Colors.primary }}
                    />
                  )}
                  {item.type === "value" && (
                    <Text style={styles.rowValue}>{item.value}</Text>
                  )}
                  {item.type === "nav" && (
                    <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: Colors.error }]}>Danger Zone</Text>
          <TouchableOpacity style={styles.dangerBtn}>
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
            <Text style={styles.dangerText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
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
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 40, gap: 8 },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: Typography.caption, fontWeight: "700", color: Colors.textSecondary,
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: 18,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: Spacing.md },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.divider },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primaryLight, alignItems: "center", justifyContent: "center",
  },
  rowLabel: { fontSize: Typography.body, color: Colors.textPrimary, fontWeight: "500" },
  rowSub: { fontSize: Typography.small, color: Colors.textSecondary, marginTop: 1 },
  rowValue: { fontSize: Typography.caption, color: Colors.textSecondary, fontWeight: "600" },
  dangerBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    height: 52, backgroundColor: Colors.errorLight, borderRadius: 16,
  },
  dangerText: { fontSize: Typography.body, fontWeight: "700", color: Colors.error },
});
