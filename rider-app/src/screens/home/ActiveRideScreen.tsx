import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, Dimensions, Image } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors, Typography } from '../../theme';
import { useRideStore } from '../../store/rideStore';
import { getRideStatusLabel, formatUSD } from '../../utils/helpers';
import * as Linking from 'expo-linking';

export default function ActiveRideScreen({ navigation }: any) {
  const { activeRide, fetchActiveRide, cancelRide } = useRideStore();

  useEffect(() => {
    fetchActiveRide();
    const interval = setInterval(fetchActiveRide, 5000); // poll every 5s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeRide?.status === 'completed') {
      navigation.replace('RideCompleted');
    }
  }, [activeRide?.status]);

  if (!activeRide) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.title}>No active ride</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.primaryButtonText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCancel = () => {
    Alert.alert('Cancel Ride', 'Are you sure you want to cancel this ride? A fee may apply.', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
        try {
          await cancelRide(activeRide.id);
          navigation.replace('Home');
        } catch (e: any) {
          Alert.alert('Error', 'Failed to cancel ride');
        }
      }}
    ]);
  };

  const handleSos = () => {
    Alert.alert('Emergency SOS', 'Call 911?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call 911', style: 'destructive', onPress: () => Linking.openURL('tel:911') }
    ]);
  };

  const region = activeRide.pickup_latitude ? {
    latitude: activeRide.pickup_latitude,
    longitude: activeRide.pickup_longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  } : undefined;

  return (
    <View style={styles.container}>
      <MapView 
        style={styles.map} 
        provider={PROVIDER_GOOGLE}
        region={region}
        showsUserLocation
      >
        {activeRide.pickup_latitude && activeRide.pickup_longitude && (
          <Marker coordinate={{ latitude: activeRide.pickup_latitude, longitude: activeRide.pickup_longitude }} pinColor="green" title="Pickup" />
        )}
        {activeRide.dropoff_latitude && activeRide.dropoff_longitude && (
          <Marker coordinate={{ latitude: activeRide.dropoff_latitude, longitude: activeRide.dropoff_longitude }} pinColor="red" title="Dropoff" />
        )}
        {activeRide.driver_latitude && activeRide.driver_longitude && (
          <Marker coordinate={{ latitude: activeRide.driver_latitude, longitude: activeRide.driver_longitude }} title="Driver">
            <Text style={{ fontSize: 30 }}>🚖</Text>
          </Marker>
        )}
      </MapView>

      {/* Floating Buttons */}
      <View style={styles.floatingButtons}>
        <TouchableOpacity style={styles.sosBtn} onPress={handleSos}>
          <Text style={styles.sosText}>SOS</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{getRideStatusLabel(activeRide.status)}</Text>
        </View>

        {activeRide.status === 'pending' ? (
          <View style={styles.pendingContainer}>
            <Text style={styles.findingText}>Finding a premium driver for you...</Text>
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 20 }} />
          </View>
        ) : (
          <>
            <View style={styles.driverInfo}>
              <View style={styles.driverAvatar}>
                {activeRide.driver_avatar ? (
                  <Image source={{ uri: activeRide.driver_avatar }} style={{ width: 50, height: 50, borderRadius: 25 }} />
                ) : (
                  <Text style={{ fontSize: 30 }}>👨‍✈️</Text>
                )}
              </View>
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{activeRide.driver_name || 'Driver'}</Text>
                <Text style={styles.driverRating}>⭐ 4.9</Text>
              </View>
              <View style={styles.vehicleDetails}>
                <Text style={styles.vehiclePlate}>{activeRide.driver_vehicle_number || 'GOLD-1'}</Text>
                <Text style={styles.vehicleModel}>{activeRide.driver_vehicle_model || activeRide.ride_class}</Text>
              </View>
            </View>

            {activeRide.verification_pin && (
              <View style={styles.pinContainer}>
                <Text style={styles.pinLabel}>Provide this PIN to your driver</Text>
                <Text style={styles.pinText}>{activeRide.verification_pin}</Text>
              </View>
            )}
          </>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelBtnText}>Cancel Ride</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

import { ActivityIndicator } from 'react-native';

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1 },
  title: { fontSize: Typography.h3, color: Colors.textPrimary, marginBottom: 20 },
  primaryButton: { backgroundColor: Colors.primary, padding: 15, borderRadius: 25 },
  primaryButtonText: { color: Colors.background, fontWeight: 'bold' },
  floatingButtons: { position: 'absolute', top: 50, right: 20 },
  sosBtn: { backgroundColor: Colors.error, width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  sosText: { color: 'white', fontWeight: 'bold' },
  bottomSheet: { backgroundColor: Colors.surface, padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, elevation: 20 },
  statusBadge: { backgroundColor: Colors.primaryLight, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 15 },
  statusText: { color: Colors.primary, fontWeight: 'bold', fontSize: Typography.small },
  pendingContainer: { alignItems: 'center', paddingVertical: 20 },
  findingText: { color: Colors.textPrimary, fontSize: Typography.h4 },
  driverInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  driverAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.surfaceElevated, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  driverDetails: { flex: 1 },
  driverName: { color: Colors.textPrimary, fontSize: Typography.h4, fontWeight: 'bold' },
  driverRating: { color: Colors.textSecondary, fontSize: Typography.small },
  vehicleDetails: { alignItems: 'flex-end' },
  vehiclePlate: { color: Colors.textPrimary, fontWeight: 'bold', backgroundColor: Colors.surfaceElevated, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, overflow: 'hidden' },
  vehicleModel: { color: Colors.textSecondary, fontSize: Typography.small, marginTop: 4 },
  pinContainer: { backgroundColor: Colors.surfaceElevated, padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  pinLabel: { color: Colors.textSecondary, fontSize: Typography.small, marginBottom: 5 },
  pinText: { color: Colors.primary, fontSize: Typography.h1, fontWeight: 'bold', letterSpacing: 5 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, backgroundColor: 'rgba(239,68,68,0.1)', padding: 16, borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { color: Colors.error, fontWeight: 'bold' },
});
