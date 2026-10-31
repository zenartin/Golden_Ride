import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest } from "../../api/client";
import { useAuthStore } from "../../store/authStore";
import { Colors, Spacing, Typography } from "../../theme";

const TOGGLES = [
  ["trip_notifications", "Trip updates"],
  ["promo_notifications", "Promotions"],
  ["system_notifications", "Account and system"],
] as const;

export default function SettingsScreen({ navigation }: any) {
  const logout = useAuthStore((s) => s.logout);
  const [settings, setSettings] = useState<Record<string, any>>({});

  useEffect(() => {
    apiRequest<Record<string, any>>("/user/settings").then(setSettings).catch(() => undefined);
  }, []);

  const change = (key: string, value: boolean) => {
    setSettings((s) => ({ ...s, [key]: value }));
    apiRequest("/user/settings", { method: "PUT", body: { [key]: value } }).catch(() => {
      setSettings((s) => ({ ...s, [key]: !value }));
      Alert.alert("Error", "Could not save that setting.");
    });
  };

  const removeAccount = () => {
    Alert.alert("Delete account?", "This removes your personal details and saved cards. It can't be undone.", [
      { text: "Keep account", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiRequest("/user/account", { method: "DELETE" });
            await logout();
          } catch (e: any) {
            Alert.alert("Could not delete account", e?.message || "Please try again.");
          }
        },
      },
    ]);
  };

  const link = (label: string, onPress: () => void, color = Colors.textPrimary) => (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <Text style={[styles.label, { color }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.section}>Account</Text>
        <View style={styles.card}>
          {link("Edit profile", () => navigation.navigate("EditProfile"))}
          {link("Payment methods", () => navigation.navigate("PaymentMethods"))}
        </View>

        <Text style={styles.section}>Notifications</Text>
        <View style={styles.card}>
          {TOGGLES.map(([key, label]) => (
            <View key={key} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Switch value={settings[key] !== false} onValueChange={(v) => change(key, v)} />
            </View>
          ))}
        </View>

        <Text style={styles.section}>Language</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>App language</Text>
            <Text style={styles.value}>English</Text>
          </View>
        </View>

        <Text style={styles.section}>Privacy</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Share usage data</Text>
            <Switch value={settings.share_data_for_analytics === true} onValueChange={(v) => change("share_data_for_analytics", v)} />
          </View>
          {link("Privacy policy", () => navigation.navigate("Content", { slug: "privacy-policy", title: "Privacy Policy" }))}
        </View>

        <View style={[styles.card, { marginTop: 24 }]}>
          {link("Delete account", removeAccount, Colors.error)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.md },
  title: { fontSize: Typography.subHeading, fontWeight: "800", color: Colors.textPrimary },
  scroll: { padding: Spacing.md, gap: 8, paddingBottom: 40 },
  section: { fontWeight: "800", color: Colors.textSecondary, marginTop: 12, fontSize: Typography.small },
  card: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, minHeight: 52 },
  label: { fontWeight: "600", color: Colors.textPrimary, flex: 1 },
  value: { color: Colors.textSecondary },
});
