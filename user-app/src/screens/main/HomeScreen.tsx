import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "../../components/AppButton";
import AppInput from "../../components/AppInput";
import RideOptionCard from "../../components/RideOptionCard";
import SectionHeader from "../../components/SectionHeader";
import { useRideStore } from "../../store/rideStore";
import { Colors, Spacing, Typography } from "../../theme";
import { getCurrentDeviceLocation } from "../../utils/deviceLocation";
import { openDirectionsInMaps } from "../../utils/openMaps";

type Props = {
  navigation: {
    navigate: (screen: "TrackRide") => void;
  };
  openTab: (tab: "Home" | "Trips" | "Wallet" | "Profile") => void;
};

export default function HomeScreen({ navigation, openTab }: Props) {
  const pickup = useRideStore((state) => state.pickup);
  const dropoff = useRideStore((state) => state.dropoff);
  const rideOptions = useRideStore((state) => state.rideOptions);
  const selectedRideClass = useRideStore((state) => state.selectedRideClass);
  const setPickup = useRideStore((state) => state.setPickup);
  const setDropoff = useRideStore((state) => state.setDropoff);
  const setSelectedRideClass = useRideStore((state) => state.setSelectedRideClass);
  const searchRides = useRideStore((state) => state.searchRides);
  const bookRide = useRideStore((state) => state.bookRide);
  const activeTrip = useRideStore((state) => state.activeTrip);

  const [locationLabel, setLocationLabel] = useState("Locating...");

  useEffect(() => {
    const syncLocation = async () => {
      const coords = await getCurrentDeviceLocation();
      if (!coords) {
        setLocationLabel("Location unavailable");
        setPickup("My current location");
        return;
      }

      const label = `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
      setLocationLabel(label);
      setPickup(`My current location (${label})`);
    };

    syncLocation();
  }, [setPickup]);

  useEffect(() => {
    if (rideOptions.length === 0) {
      searchRides();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tripSummary = useMemo(() => {
    if (!activeTrip) return "No active ride";
    return `${activeTrip.rideTitle} to ${activeTrip.dropoff}`;
  }, [activeTrip]);

  const search = async () => {
    await searchRides();
  };

  const book = async () => {
    if (!pickup.trim() || !dropoff.trim()) {
      Alert.alert("Add trip details", "Please set pickup and destination first.");
      return;
    }
    const trip = await bookRide("Wallet");
    if (trip) {
      navigation.navigate("TrackRide");
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.kicker}>Backend connected</Text>
            <Text style={styles.heroTitle}>Book a ride now</Text>
          </View>
          <Pressable style={styles.mapButton} onPress={() => openDirectionsInMaps(dropoff)}>
            <Ionicons name="map-outline" size={18} color={Colors.primary} />
          </Pressable>
        </View>
        <Text style={styles.heroText}>{locationLabel}</Text>
        <View style={styles.heroStats}>
          <View style={styles.statPill}>
            <Ionicons name="flash-outline" size={16} color={Colors.primary} />
            <Text style={styles.statText}>{rideOptions.length || 3} ride classes</Text>
          </View>
          <Pressable style={styles.statPill} onPress={() => openTab("Wallet")}>
            <Ionicons name="wallet-outline" size={16} color={Colors.primary} />
            <Text style={styles.statText}>Wallet pay</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <SectionHeader title="Trip details" />
        <AppInput label="Pickup" value={pickup} onChangeText={setPickup} placeholder="Your current location" />
        <AppInput label="Dropoff" value={dropoff} onChangeText={setDropoff} placeholder="Where to?" />
        <View style={styles.row}>
          <AppButton title="Find rides" onPress={search} style={{ flex: 1 }} />
          <AppButton title="Track" onPress={() => navigation.navigate("TrackRide")} variant="secondary" style={{ flex: 1 }} />
        </View>
      </View>

      <View style={styles.card}>
        <SectionHeader title="Ride options" />
        <View style={{ gap: 10 }}>
          {rideOptions.length > 0 ? (
            rideOptions.map((option) => (
              <RideOptionCard
                key={option.id}
                option={option}
                selected={option.id === selectedRideClass}
                onPress={() => setSelectedRideClass(option.id)}
              />
            ))
          ) : (
            <Text style={styles.muted}>Tap "Find rides" to load options for your trip.</Text>
          )}
        </View>
        <AppButton title="Book ride" onPress={book} />
      </View>

      <View style={styles.card}>
        <SectionHeader title="Current ride" />
        <Text style={styles.subtitle}>{tripSummary}</Text>
        <Text style={styles.muted}>{activeTrip ? `Status: ${activeTrip.status}` : "No trip in progress right now."}</Text>
        <View style={styles.row}>
          <AppButton title="Open trips" onPress={() => openTab("Trips")} variant="secondary" style={{ flex: 1 }} />
          <AppButton title="Wallet" onPress={() => openTab("Wallet")} variant="secondary" style={{ flex: 1 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kicker: { color: Colors.primary, fontSize: Typography.caption, fontWeight: "800", textTransform: "uppercase" },
  heroTitle: { color: Colors.textPrimary, fontSize: Typography.heading, fontWeight: "900", marginTop: 2 },
  heroText: { color: Colors.textSecondary, fontSize: Typography.body },
  heroStats: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    minHeight: 36,
    borderRadius: 14,
    backgroundColor: "#FFF8EB",
  },
  statText: { color: Colors.textPrimary, fontSize: Typography.small, fontWeight: "800" },
  mapButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFF3D9",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  row: { flexDirection: "row", gap: 10 },
  subtitle: { color: Colors.textPrimary, fontSize: Typography.body, fontWeight: "700" },
  muted: { color: Colors.textSecondary, fontSize: Typography.small },
});
