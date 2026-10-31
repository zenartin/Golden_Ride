import React, { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { apiRequest } from "../../api/client";
import AppButton from "../../components/AppButton";
import { GeocodedPlace, searchPlaces } from "../../services/geocoding";
import { Colors, Spacing, Typography } from "../../theme";

export type SavedAddress = { id: number; label: string; address: string; latitude?: number; longitude?: number };

export default function SavedLocationsScreen() {
  const navigation = useNavigation();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [label, setLabel] = useState("Home");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<GeocodedPlace | null>(null);
  const [results, setResults] = useState<GeocodedPlace[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = () => apiRequest<SavedAddress[]>("/rider/addresses").then(setAddresses).catch(() => undefined);
  useEffect(() => { load(); }, []);

  const search = (text: string) => {
    setQuery(text);
    setPicked(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => searchPlaces(text, 5).then(setResults).catch(() => setResults([])), 400);
  };

  const reset = () => {
    setEditing(null);
    setLabel("Home");
    setQuery("");
    setPicked(null);
    setResults([]);
  };

  const save = async () => {
    if (!label.trim() || !query.trim()) {
      Alert.alert("Missing details", "Please enter a name and an address.");
      return;
    }
    const body = {
      label: label.trim(),
      address: picked?.displayName ?? query.trim(),
      latitude: picked?.lat,
      longitude: picked?.lon,
    };
    try {
      await apiRequest(editing ? `/rider/addresses/${editing}` : "/rider/addresses", { method: editing ? "PUT" : "POST", body });
      reset();
      await load();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not save this address.");
    }
  };

  const remove = async (id: number) => {
    await apiRequest(`/rider/addresses/${id}`, { method: "DELETE" }).catch(() => undefined);
    await load();
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Saved Locations</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {addresses.map((a) => (
          <View key={a.id} style={styles.card}>
            <Ionicons name={a.label.toLowerCase() === "home" ? "home-outline" : a.label.toLowerCase() === "work" ? "briefcase-outline" : "location-outline"} size={20} color={Colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{a.label}</Text>
              <Text style={styles.address} numberOfLines={2}>{a.address}</Text>
            </View>
            <TouchableOpacity accessibilityLabel={`Edit ${a.label}`} onPress={() => { setEditing(a.id); setLabel(a.label); setQuery(a.address); setPicked(a.latitude && a.longitude ? { placeId: String(a.id), displayName: a.address, shortName: a.label, lat: a.latitude, lon: a.longitude, type: "saved" } : null); }}>
              <Ionicons name="pencil" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel={`Delete ${a.label}`} onPress={() => remove(a.id)}>
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
            </TouchableOpacity>
          </View>
        ))}
        {addresses.length === 0 && <Text style={styles.empty}>Save Home, Work and other places for faster booking.</Text>}

        <Text style={styles.section}>{editing ? "Edit address" : "Add an address"}</Text>
        <TextInput style={styles.input} placeholder="Name, such as Home or Work" placeholderTextColor={Colors.textSecondary} value={label} onChangeText={setLabel} />
        <TextInput style={styles.input} placeholder="Search for an address" placeholderTextColor={Colors.textSecondary} value={query} onChangeText={search} />
        {results.map((r) => (
          <Pressable key={r.placeId} style={styles.result} onPress={() => { setPicked(r); setQuery(r.displayName); setResults([]); }}>
            <Text numberOfLines={2} style={styles.address}>{r.displayName}</Text>
          </Pressable>
        ))}
        <AppButton title={editing ? "Save Changes" : "Add Address"} onPress={save} />
        {editing ? <AppButton title="Cancel" variant="secondary" onPress={reset} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.md },
  title: { fontSize: Typography.subHeading, fontWeight: "800", color: Colors.textPrimary },
  scroll: { padding: Spacing.md, gap: 10, paddingBottom: 40 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.surface, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: Colors.border },
  label: { fontWeight: "800", color: Colors.textPrimary },
  address: { color: Colors.textSecondary },
  empty: { color: Colors.textSecondary, textAlign: "center", marginVertical: 16 },
  section: { fontWeight: "800", color: Colors.textPrimary, marginTop: 12 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, color: Colors.textPrimary },
  result: { padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
});
