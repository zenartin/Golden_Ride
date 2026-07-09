import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing } from "../theme";
import { getCurrentDeviceLocation, DeviceCoords } from "../utils/deviceLocation";

export default function MapCard() {
  const mapRef = useRef<MapView>(null);
  const [location, setLocation] = useState<DeviceCoords | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchLocation = async () => {
      try {
        const coords = await getCurrentDeviceLocation();
        if (!cancelled) {
          if (coords) {
            setLocation(coords);
          } else {
            setError(true);
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchLocation();

    // Refresh location every 15 seconds
    const interval = setInterval(fetchLocation, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <View style={styles.card}>
      {/* Header badge */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <Ionicons name="location" size={14} color={Colors.primary} />
          <Text style={styles.badgeText}>Your Location</Text>
        </View>
        {!loading && !error && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      {/* Map area */}
      <View style={styles.mapWrapper}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.infoText}>Getting your location...</Text>
          </View>
        ) : error || !location ? (
          <View style={styles.centered}>
            <Ionicons name="location-outline" size={36} color={Colors.textSecondary} />
            <Text style={styles.infoText}>Location unavailable</Text>
            <Text style={styles.infoSubText}>Enable location permissions to see your position</Text>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            region={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsUserLocation={false}
            showsMyLocationButton={false}
            pitchEnabled={false}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
          >
            <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }}>
              <View style={styles.carMarker}>
                <Ionicons name="car-sport" size={18} color="#fff" />
              </View>
            </Marker>
          </MapView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 28,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary + "14",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: 20,
    gap: 6,
  },
  badgeText: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#10B98120",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  liveText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#10B981",
    letterSpacing: 0.5,
  },
  mapWrapper: {
    height: 220,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#F4F6FA",
  },
  map: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
  },
  infoText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  infoSubText: {
    color: Colors.textSecondary,
    fontSize: 11,
    textAlign: "center",
    opacity: 0.7,
  },
  carMarker: {
    backgroundColor: Colors.primary,
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
});
