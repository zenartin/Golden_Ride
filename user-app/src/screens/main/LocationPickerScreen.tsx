import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainStackParamList } from "../../navigation/MainNavigator";
import { searchPlaces, reverseGeocode, GeocodedPlace } from "../../services/geocoding";
import * as Location from "expo-location";
import { Colors, Spacing, Typography } from "../../theme";

type Props = NativeStackScreenProps<MainStackParamList, "LocationPicker">;

const INITIAL_REGION = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 20,
  longitudeDelta: 20,
};

export default function LocationPickerScreen({ navigation, route }: Props) {
  const { mode } = route.params; // "pickup" | "dropoff"
  const mapRef = useRef<MapView>(null);
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodedPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<GeocodedPlace | null>(null);
  const [mapRegion, setMapRegion] = useState(INITIAL_REGION);
  const [locating, setLocating] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const hits = await searchPlaces(query, 8);
      setResults(hits);
      setSearching(false);
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const pickCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      const place = await reverseGeocode(latitude, longitude);
      if (place) {
        selectPlace(place);
      }
    } finally {
      setLocating(false);
    }
  };

  const selectPlace = (place: GeocodedPlace) => {
    Keyboard.dismiss();
    setSelected(place);
    setQuery(place.shortName);
    setResults([]);
    const region = {
      latitude: place.lat,
      longitude: place.lon,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    };
    setMapRegion(region);
    mapRef.current?.animateToRegion(region, 600);
  };

  const handleMapPress = async (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setLocating(true);
    const place = await reverseGeocode(latitude, longitude);
    setLocating(false);
    if (place) {
      selectPlace(place);
    }
  };

  const confirm = () => {
    if (!selected) return;
    navigation.navigate("Shell", {
      pickedLocation: {
        mode,
        place: selected,
      },
    });
  };

  const isPickup = mode === "pickup";
  const pinColor = isPickup ? "#10B981" : Colors.primary;
  const title = isPickup ? "Set Pickup Location" : "Set Drop Destination";

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={isPickup ? "Search pickup location…" : "Search destination…"}
            placeholderTextColor={Colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {searching && <ActivityIndicator size="small" color={Colors.primary} />}
          {!searching && query.length > 0 && (
            <Pressable onPress={() => { setQuery(""); setResults([]); }}>
              <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
            </Pressable>
          )}
        </View>
        <Pressable style={styles.myLocBtn} onPress={pickCurrentLocation} disabled={locating}>
          {locating
            ? <ActivityIndicator size="small" color={Colors.primary} />
            : <Ionicons name="locate" size={22} color={Colors.primary} />}
        </Pressable>
      </View>

      {/* Autocomplete results */}
      {results.length > 0 && (
        <View style={styles.resultsCard}>
          <FlatList
            data={results}
            keyExtractor={(item) => item.placeId}
            keyboardShouldPersistTaps="always"
            renderItem={({ item }) => (
              <Pressable style={styles.resultRow} onPress={() => selectPlace(item)}>
                <View style={[styles.resultIcon, { backgroundColor: `${pinColor}22` }]}>
                  <Ionicons name="location-outline" size={18} color={pinColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultName} numberOfLines={1}>{item.shortName}</Text>
                  <Text style={styles.resultSub} numberOfLines={1}>{item.displayName}</Text>
                </View>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      )}

      {/* Map */}
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={mapRegion}
          onPress={handleMapPress}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {selected && (
            <Marker
              coordinate={{ latitude: selected.lat, longitude: selected.lon }}
              pinColor={pinColor}
              title={selected.shortName}
            />
          )}
        </MapView>

        {/* Map hint overlay */}
        {!selected && (
          <View style={styles.mapHint}>
            <Ionicons name="finger-print-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.mapHintText}>Tap on the map to pin a location</Text>
          </View>
        )}

        {/* Confirm button */}
        {selected && (
          <View style={[styles.confirmWrap, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.selectedChip}>
              <View style={[styles.chipDot, { backgroundColor: pinColor }]} />
              <Text style={styles.chipText} numberOfLines={1}>{selected.shortName}</Text>
            </View>
            <Pressable style={[styles.confirmBtn, { backgroundColor: pinColor }]} onPress={confirm}>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.confirmText}>Confirm {isPickup ? "Pickup" : "Destination"}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { color: Colors.textPrimary, fontWeight: "800", fontSize: Typography.body },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.body,
  },
  myLocBtn: {
    width: 48, height: 48,
    borderRadius: 14,
    backgroundColor: "#FFF3D9",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.primary + "44",
  },
  resultsCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 280,
    zIndex: 100,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  resultRow: {
    flexDirection: "row", alignItems: "center",
    gap: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  resultIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  resultName: { color: Colors.textPrimary, fontWeight: "700", fontSize: Typography.small },
  resultSub: { color: Colors.textSecondary, fontSize: 11, marginTop: 2 },
  separator: { height: 1, backgroundColor: Colors.border, marginHorizontal: 14 },
  mapWrap: { flex: 1, position: "relative" },
  map: { flex: 1 },
  mapHint: {
    position: "absolute", bottom: 140, alignSelf: "center",
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  mapHintText: { color: "#fff", fontSize: Typography.small },
  confirmWrap: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    gap: 12,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  selectedChip: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.background,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  chipDot: { width: 10, height: 10, borderRadius: 5 },
  chipText: { color: Colors.textPrimary, fontWeight: "600", fontSize: Typography.small, flex: 1 },
  confirmBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, borderRadius: 16, paddingVertical: 16,
  },
  confirmText: { color: "#fff", fontWeight: "800", fontSize: Typography.body },
});
