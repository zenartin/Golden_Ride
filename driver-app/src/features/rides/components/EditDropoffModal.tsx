import React, { useRef, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import apiClient from "../../../api/axios";
import { GeocodedPlace, searchPlaces } from "../../../services/geocoding";
import { Colors, Spacing, Typography } from "../../../theme";

export default function EditDropoffModal({ visible, rideId, onClose }: { visible: boolean; rideId: number; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodedPlace[]>([]);
  const [sending, setSending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = (text: string) => {
    setQuery(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => searchPlaces(text, 5).then(setResults).catch(() => setResults([])), 400);
  };

  const propose = async (place: GeocodedPlace) => {
    setSending(true);
    try {
      await apiClient.post(`/rides/${rideId}/destination-request`, {
        dropoff: place.shortName,
        dropoff_latitude: place.lat,
        dropoff_longitude: place.lon,
      });
      setQuery("");
      setResults([]);
      onClose();
      Alert.alert("Sent to rider", "The drop-off changes once the rider confirms.");
    } catch (err: any) {
      Alert.alert("Could not send", err?.response?.data?.detail || "Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Change drop-off</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Search for the new address"
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={search}
            autoFocus
          />
          {results.map((r) => (
            <Pressable key={r.placeId} style={styles.result} disabled={sending} onPress={() => propose(r)}>
              <Text style={styles.resultName}>{r.shortName}</Text>
              <Text style={styles.resultAddress} numberOfLines={1}>{r.displayName}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, gap: 10, minHeight: 420 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: Typography.subHeading, fontWeight: "800", color: Colors.textPrimary },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, color: Colors.textPrimary },
  result: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  resultName: { fontWeight: "700", color: Colors.textPrimary },
  resultAddress: { color: Colors.textMuted, fontSize: Typography.small },
});
