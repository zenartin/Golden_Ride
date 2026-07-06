import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
  StyleSheet,
  Platform,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import AppButton from "../../components/AppButton";
import RideOptionCard from "../../components/RideOptionCard";
import SectionHeader from "../../components/SectionHeader";
import { useRideStore } from "../../store/rideStore";
import { Colors, Spacing, Typography } from "../../theme";
import { MainStackParamList } from "../../navigation/MainNavigator";

type Props = NativeStackScreenProps<MainStackParamList, "Shell"> & {
  openTab: (tab: "Home" | "Trips" | "Wallet" | "Profile") => void;
};

export default function HomeScreen({ navigation, route, openTab }: Props) {
  const pickup = useRideStore((s) => s.pickup);
  const dropoff = useRideStore((s) => s.dropoff);
  const pickupCoords = useRideStore((s) => s.pickupCoords);
  const dropoffCoords = useRideStore((s) => s.dropoffCoords);
  const rideOptions = useRideStore((s) => s.rideOptions);
  const selectedRideClass = useRideStore((s) => s.selectedRideClass);
  const setPickup = useRideStore((s) => s.setPickup);
  const setDropoff = useRideStore((s) => s.setDropoff);
  const setSelectedRideClass = useRideStore((s) => s.setSelectedRideClass);
  const searchRides = useRideStore((s) => s.searchRides);
  const bookRide = useRideStore((s) => s.bookRide);
  const activeTrip = useRideStore((s) => s.activeTrip);

  const [searching, setSearching] = useState(false);
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  const mapRef = useRef<MapView>(null);

  // Handle location picked from LocationPickerScreen
  useEffect(() => {
    const params = route.params as any;
    if (params?.pickedLocation) {
      const { mode, place } = params.pickedLocation;
      if (mode === "pickup") {
        setPickup(place.shortName, { lat: place.lat, lon: place.lon });
      } else {
        setDropoff(place.shortName, { lat: place.lat, lon: place.lon });
      }
      // Clear the param to avoid re-applying on next render
      navigation.setParams({ pickedLocation: undefined } as any);
    }
  }, [route.params]);

  // Fit map to show both markers when both coords are available
  useEffect(() => {
    if (pickupCoords && dropoffCoords && mapRef.current) {
      mapRef.current.fitToCoordinates(
        [
          { latitude: pickupCoords.lat, longitude: pickupCoords.lon },
          { latitude: dropoffCoords.lat, longitude: dropoffCoords.lon },
        ],
        { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true }
      );
    }
  }, [pickupCoords, dropoffCoords]);

  const handleSearch = async () => {
    if (!pickup.trim() || !dropoff.trim()) {
      Alert.alert("Missing info", "Please select both pickup and destination.");
      return;
    }
    setSearching(true);
    try {
      await searchRides();
    } finally {
      setSearching(false);
    }
  };

  const handleBook = async () => {
    if (!pickup.trim() || !dropoff.trim()) {
      Alert.alert("Missing info", "Please select both pickup and destination.");
      return;
    }
    if (rideOptions.length === 0) {
      Alert.alert("No ride options", "Please tap 'Get Fare' first.");
      return;
    }
    setBooking(true);
    setBookError(null);
    try {
      const trip = await bookRide("Cash");
      if (trip) {
        navigation.navigate("TrackRide");
      }
    } catch (err: any) {
      const msg = err?.message || "Booking failed. Please try again.";
      setBookError(msg);
      Alert.alert("Booking Failed", msg);
    } finally {
      setBooking(false);
    }
  };

  const isActiveRide =
    activeTrip &&
    ["searching", "confirmed", "arriving", "on_trip"].includes(activeTrip.status);

  const statusColors: Record<string, string> = {
    searching: "#F59E0B",
    confirmed: "#10B981",
    arriving: "#3B82F6",
    on_trip: "#8B5CF6",
  };

  // Map region logic
  const mapRegion =
    pickupCoords
      ? {
          latitude: pickupCoords.lat,
          longitude: pickupCoords.lon,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }
      : {
          latitude: 20.5937,
          longitude: 78.9629,
          latitudeDelta: 20,
          longitudeDelta: 20,
        };

  return (
    <View style={{ gap: 0 }}>
      {/* Active ride banner */}
      {isActiveRide && (
        <Pressable style={styles.activeBanner} onPress={() => navigation.navigate("TrackRide")}>
          <View style={[styles.statusDot, { backgroundColor: statusColors[activeTrip!.status] ?? "#F59E0B" }]} />
          <Text style={styles.activeBannerText}>Ride active — tap to track</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
        </Pressable>
      )}

      {/* Map Card */}
      <View style={styles.mapCard}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={mapRegion}
          showsUserLocation
          showsMyLocationButton={false}
          pitchEnabled={false}
          scrollEnabled={!searching}
        >
          {pickupCoords && (
            <Marker
              coordinate={{ latitude: pickupCoords.lat, longitude: pickupCoords.lon }}
              pinColor="#10B981"
              title="Pickup"
              description={pickup}
            />
          )}
          {dropoffCoords && (
            <Marker
              coordinate={{ latitude: dropoffCoords.lat, longitude: dropoffCoords.lon }}
              pinColor={Colors.primary}
              title="Drop"
              description={dropoff}
            />
          )}
          {pickupCoords && dropoffCoords && (
            <Polyline
              coordinates={[
                { latitude: pickupCoords.lat, longitude: pickupCoords.lon },
                { latitude: dropoffCoords.lat, longitude: dropoffCoords.lon },
              ]}
              strokeColor={Colors.primary}
              strokeWidth={3}
              lineDashPattern={[6, 4]}
            />
          )}
        </MapView>
      </View>

      {/* Location inputs */}
      <View style={styles.card}>
        <SectionHeader title="Where are you going?" />

        <View style={styles.inputRow}>
          <View style={styles.dotLine}>
            <View style={[styles.dot, { backgroundColor: "#10B981" }]} />
            <View style={styles.line} />
            <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
          </View>

          <View style={{ flex: 1, gap: 10 }}>
            {/* Pickup */}
            <Pressable
              style={[styles.inputBox, pickup ? styles.inputBoxFilled : null]}
              onPress={() => navigation.navigate("LocationPicker", { mode: "pickup" })}
            >
              <Text style={pickup ? styles.inputText : styles.inputPlaceholder} numberOfLines={1}>
                {pickup || "Tap to set pickup location"}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
            </Pressable>

            {/* Dropoff */}
            <Pressable
              style={[styles.inputBox, dropoff ? styles.inputBoxFilled : null]}
              onPress={() => navigation.navigate("LocationPicker", { mode: "dropoff" })}
            >
              <Text style={dropoff ? styles.inputText : styles.inputPlaceholder} numberOfLines={1}>
                {dropoff || "Tap to set destination"}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        <AppButton
          title={searching ? "Calculating fare…" : "Get Fare"}
          onPress={handleSearch}
          style={{ opacity: searching ? 0.7 : 1 }}
        />
        {searching && (
          <View style={styles.row}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.muted}>Fetching real route via OpenStreetMap…</Text>
          </View>
        )}
      </View>

      {/* Ride options */}
      {rideOptions.length > 0 && (
        <View style={[styles.card, { marginTop: 12 }]}>
          <SectionHeader title="Choose your ride" />
          <View style={{ gap: 10 }}>
            {rideOptions.map((option) => (
              <RideOptionCard
                key={option.id}
                option={option}
                selected={option.id === selectedRideClass}
                onPress={() => setSelectedRideClass(option.id)}
              />
            ))}
          </View>

          {bookError ? <Text style={styles.errorText}>{bookError}</Text> : null}

          <Pressable
            style={[styles.bookBtn, booking && styles.bookBtnDisabled]}
            onPress={handleBook}
            disabled={booking}
          >
            {booking ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="car-sport" size={20} color="#fff" />
                <Text style={styles.bookBtnText}>Book Ride</Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      {/* Empty state */}
      {rideOptions.length === 0 && !searching && (
        <View style={[styles.emptyCard, { marginTop: 12 }]}>
          <Ionicons name="map-outline" size={40} color={Colors.textSecondary} style={{ alignSelf: "center" }} />
          <Text style={styles.emptyText}>
            Select pickup & destination above, then tap{" "}
            <Text style={{ fontWeight: "700", color: Colors.primary }}>Get Fare</Text> to see real-time pricing.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF8EB",
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  activeBannerText: { flex: 1, color: Colors.textPrimary, fontWeight: "700", fontSize: Typography.small },
  mapCard: {
    height: 200,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  map: { flex: 1 },
  card: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  inputRow: { flexDirection: "row", gap: 12, alignItems: "stretch" },
  dotLine: { alignItems: "center", paddingTop: 14, gap: 0 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  line: { flex: 1, width: 2, backgroundColor: Colors.border, marginVertical: 4 },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  inputBoxFilled: { borderColor: Colors.primary + "66" },
  inputPlaceholder: { color: Colors.textSecondary, fontSize: Typography.small, flex: 1 },
  inputText: { color: Colors.textPrimary, fontSize: Typography.small, fontWeight: "600", flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  muted: { color: Colors.textSecondary, fontSize: Typography.small },
  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  bookBtnDisabled: { opacity: 0.6 },
  bookBtnText: { color: "#fff", fontWeight: "800", fontSize: Typography.body },
  emptyCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  emptyText: { color: Colors.textSecondary, fontSize: Typography.small, textAlign: "center", lineHeight: 20 },
  errorText: { color: "#EF4444", fontSize: Typography.small, textAlign: "center" },
});
