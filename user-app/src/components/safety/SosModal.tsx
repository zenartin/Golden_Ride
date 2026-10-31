import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest } from "../../api/client";
import { Colors, Spacing, Typography } from "../../theme";

type Coords = { latitude: number; longitude: number };

export default function SosModal({ visible, rideId, onClose }: { visible: boolean; rideId?: number | string; onClose: () => void }) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLocating(true);
    Location.requestForegroundPermissionsAsync()
      .then(({ status }) => (status === "granted" ? Location.getCurrentPositionAsync({}) : null))
      .then((pos) => setCoords(pos ? { latitude: pos.coords.latitude, longitude: pos.coords.longitude } : null))
      .catch(() => setCoords(null))
      .finally(() => setLocating(false));
  }, [visible]);

  const sendAlert = async (kind: "sos" | "silent") => {
    setSending(true);
    try {
      await apiRequest("/rider/safety/alert", {
        method: "POST",
        body: { kind, ride_id: rideId ? Number(rideId) : undefined, latitude: coords?.latitude, longitude: coords?.longitude },
      });
      if (kind === "silent") Alert.alert("Alert sent", "Our safety team has been notified.");
    } catch {
      if (kind === "silent") Alert.alert("Could not send", "Please call 911 if you are in danger.");
    } finally {
      setSending(false);
    }
  };

  const call911 = () => {
    sendAlert("sos");
    Linking.openURL("tel:911");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Emergency</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.callBtn} onPress={call911}>
            <Ionicons name="call" size={22} color={Colors.white} />
            <Text style={styles.callText}>Call 911</Text>
          </TouchableOpacity>
          <Text style={styles.label}>Your location to tell the operator</Text>
          {locating ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <Text style={styles.coords} selectable>
              {coords ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}` : "Location unavailable"}
            </Text>
          )}
          <TouchableOpacity style={styles.silentBtn} onPress={() => sendAlert("silent")} disabled={sending}>
            <Ionicons name="notifications-off-outline" size={20} color={Colors.textPrimary} />
            <Text style={styles.silentText}>{sending ? "Sending..." : "Send silent alert to Golden Ride"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, gap: 12, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: Typography.subHeading, fontWeight: "800", color: Colors.textPrimary },
  callBtn: { flexDirection: "row", gap: 10, backgroundColor: Colors.error, padding: 18, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  callText: { color: Colors.white, fontWeight: "800", fontSize: 18 },
  label: { color: Colors.textSecondary, fontSize: Typography.small, textAlign: "center" },
  coords: { color: Colors.textPrimary, fontSize: 20, fontWeight: "800", textAlign: "center" },
  silentBtn: { flexDirection: "row", gap: 8, borderWidth: 1, borderColor: Colors.border, padding: 14, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  silentText: { color: Colors.textPrimary, fontWeight: "700" },
});
