import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';

// Mock theme
const Colors = {
  primary: '#D4AF37',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
};
const Typography = {
  h1: 24, h2: 20, body: 16, caption: 14,
};
const Spacing = { s: 8, m: 16, l: 24, xl: 32 };
const Radius = { s: 4, m: 8, l: 16, round: 9999 };
const Shadow = {
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
};

const api = {
  get: async (url: string) => ({ data: {} }),
  post: async (url: string, data?: any) => ({ data: {} }),
};
const ENDPOINTS = {
  RIDE_DETAIL: (id: string) => `/user/rides/${id}`,
  RIDE_RATE: (id: string) => `/rider/rides/${id}/rate`,
};

export default function TripDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const tripId = route.params?.tripId;

  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRating, setSelectedRating] = useState(0);
  const mapRef = React.useRef<MapView>(null);

  useEffect(() => {
    fetchTripDetails();
  }, [tripId]);

  const fetchTripDetails = async () => {
    try {
      // Mock data
      setTrip({
        id: tripId || '123',
        status: 'completed',
        date: 'Sep 26, 2024 · 2:30 PM',
        pickup_address: '123 Main St',
        dropoff_address: '456 Market St',
        pickup_lat: 37.7749, pickup_lng: -122.4194,
        dropoff_lat: 37.7849, dropoff_lng: -122.4094,
        distance: '3.2 mi', duration: '12 min',
        driver: { name: 'John Doe', rating: 4.8, vehicle: 'Toyota Camry - ABC1234' },
        fare: { base: 5.00, fee: 2.50, tip: 3.00, total: 10.50 },
        payment_method: '**** 1234',
        rating: null,
      });
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = () => {
    Alert.alert(
      'Receipt',
      `Trip ID: #${trip.id}\nDate: ${trip.date}\nPickup: ${trip.pickup_address}\nDropoff: ${trip.dropoff_address}\nTotal: $${trip.fare.total.toFixed(2)}\n\nThank you for riding with Golden Ride!`
    );
  };

  const handleRate = async () => {
    if (selectedRating === 0) return;
    try {
      await api.post(ENDPOINTS.RIDE_RATE(trip.id), { rating: selectedRating });
      Alert.alert('Success', 'Thank you for your feedback!');
      setTrip({ ...trip, rating: selectedRating });
    } catch (e) {
      Alert.alert('Error', 'Could not submit rating');
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'completed') return Colors.success;
    if (status === 'cancelled') return Colors.error;
    return Colors.primary;
  };

  if (loading || !trip) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const hasCoordinates = trip.pickup_lat && trip.dropoff_lat;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Details</Text>
        <TouchableOpacity onPress={handleDownloadReceipt} style={styles.iconBtn}>
          <Ionicons name="document-text-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Status Chip */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusChip, { backgroundColor: getStatusColor(trip.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(trip.status) }]}>{trip.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Map Section */}
        {hasCoordinates ? (
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                latitude: (trip.pickup_lat + trip.dropoff_lat) / 2,
                longitude: (trip.pickup_lng + trip.dropoff_lng) / 2,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
              onLayout={() => {
                mapRef.current?.fitToCoordinates([
                  { latitude: trip.pickup_lat, longitude: trip.pickup_lng },
                  { latitude: trip.dropoff_lat, longitude: trip.dropoff_lng },
                ], { edgePadding: { top: 20, right: 20, bottom: 20, left: 20 } });
              }}
            >
              <Marker coordinate={{ latitude: trip.pickup_lat, longitude: trip.pickup_lng }} pinColor={Colors.success} />
              <Marker coordinate={{ latitude: trip.dropoff_lat, longitude: trip.dropoff_lng }} pinColor={Colors.error} />
            </MapView>
          </View>
        ) : (
          <View style={[styles.mapContainer, styles.mapPlaceholder]}>
            <Text style={styles.mapEmoji}>🗺️</Text>
            <Text style={styles.placeholderText}>Route Map</Text>
          </View>
        )}

        {/* Trip Info Card */}
        <View style={styles.card}>
          <Text style={styles.dateText}>{trip.date}</Text>
          
          <View style={styles.addressRow}>
            <View style={[styles.dot, { backgroundColor: Colors.success }]} />
            <Text style={styles.addressText}>{trip.pickup_address}</Text>
          </View>
          <View style={styles.addressLine} />
          <View style={styles.addressRow}>
            <View style={[styles.dot, { backgroundColor: Colors.error }]} />
            <Text style={styles.addressText}>{trip.dropoff_address}</Text>
          </View>

          <View style={styles.tripMetaRow}>
            <Text style={styles.metaText}>{trip.distance}</Text>
            <Text style={styles.metaText}>•</Text>
            <Text style={styles.metaText}>{trip.duration}</Text>
          </View>
        </View>

        {/* Driver Card */}
        <View style={styles.card}>
          <View style={styles.driverRow}>
            <View style={styles.driverAvatar}>
              <Text style={styles.avatarText}>{trip.driver.name.charAt(0)}</Text>
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{trip.driver.name}</Text>
              <Text style={styles.driverRating}>⭐ {trip.driver.rating}</Text>
              <Text style={styles.driverVehicle}>{trip.driver.vehicle}</Text>
            </View>
          </View>
        </View>

        {/* Fare Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fare Breakdown</Text>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Base Fare</Text>
            <Text style={styles.fareValue}>${trip.fare.base.toFixed(2)}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Service Fee</Text>
            <Text style={styles.fareValue}>${trip.fare.fee.toFixed(2)}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Tip</Text>
            <Text style={styles.fareValue}>${trip.fare.tip.toFixed(2)}</Text>
          </View>
          <View style={[styles.fareRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${trip.fare.total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment */}
        <View style={styles.card}>
          <View style={styles.paymentRow}>
            <Ionicons name="card-outline" size={24} color={Colors.text} />
            <Text style={styles.paymentText}>{trip.payment_method}</Text>
          </View>
        </View>

        {/* Rating Section */}
        {!trip.rating && trip.status === 'completed' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>How was your ride?</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setSelectedRating(star)}>
                  <Ionicons
                    name={star <= selectedRating ? 'star' : 'star-outline'}
                    size={36}
                    color={Colors.primary}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.rateButton, selectedRating === 0 && styles.rateButtonDisabled]}
              onPress={handleRate}
              disabled={selectedRating === 0}
            >
              <Text style={styles.rateButtonText}>Rate Driver</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Report Issue */}
        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => navigation.navigate('Ticket' as never, { subject: `Issue with Trip #${trip.id}` } as never)}
        >
          <Text style={styles.reportButtonText}>Report Issue</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.m, backgroundColor: Colors.surface, borderBottomWidth: 1, borderColor: Colors.border },
  headerTitle: { fontSize: Typography.h2 },
  iconBtn: { padding: Spacing.s },
  
  scrollContent: { padding: Spacing.m, gap: Spacing.m, paddingBottom: Spacing.xl * 2 },

  statusContainer: { alignItems: 'flex-start' },
  statusChip: { paddingHorizontal: Spacing.m, paddingVertical: Spacing.s, borderRadius: Radius.round },
  statusText: { fontWeight: 'bold' },

  mapContainer: { height: 200, borderRadius: Radius.m, overflow: 'hidden', ...Shadow.md },
  map: { flex: 1 },
  mapPlaceholder: { backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  mapEmoji: { fontSize: 40, marginBottom: Spacing.s },
  placeholderText: { fontSize: Typography.body, color: Colors.textSecondary },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.m, padding: Spacing.m, ...Shadow.md },
  cardTitle: { fontSize: Typography.h2, marginBottom: Spacing.m },
  
  dateText: { fontSize: Typography.caption, marginBottom: Spacing.m, fontWeight: 'bold' },
  addressRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: Spacing.m },
  addressText: { flex: 1, fontSize: Typography.body },
  addressLine: { width: 2, height: 20, backgroundColor: Colors.border, marginLeft: 5, marginVertical: 4 },
  tripMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.m, paddingTop: Spacing.m, borderTopWidth: 1, borderColor: Colors.border, gap: Spacing.m },
  metaText: { fontSize: Typography.caption, fontWeight: 'bold' },

  driverRow: { flexDirection: 'row', alignItems: 'center' },
  driverAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.m },
  avatarText: { color: Colors.white, fontSize: 24, fontWeight: 'bold' },
  driverInfo: { flex: 1 },
  driverName: { fontSize: Typography.h2 },
  driverRating: { fontSize: Typography.body, marginTop: 2 },
  driverVehicle: { fontSize: Typography.caption, marginTop: 2 },

  fareRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.s },
  fareLabel: { fontSize: Typography.body, color: Colors.textSecondary },
  fareValue: { fontSize: Typography.body },
  totalRow: { borderTopWidth: 1, borderColor: Colors.border, marginTop: Spacing.s, paddingTop: Spacing.m },
  totalLabel: { fontSize: Typography.h2 },
  totalValue: { fontSize: Typography.h2, color: Colors.primary },

  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.m },
  paymentText: { fontSize: Typography.body },

  starsContainer: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.m, marginBottom: Spacing.l },
  rateButton: { backgroundColor: Colors.primary, padding: Spacing.m, borderRadius: Radius.m, alignItems: 'center' },
  rateButtonDisabled: { opacity: 0.5 },
  rateButtonText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },

  reportButton: { alignItems: 'center', padding: Spacing.m },
  reportButtonText: { color: Colors.error, fontWeight: 'bold', fontSize: Typography.body },
});
