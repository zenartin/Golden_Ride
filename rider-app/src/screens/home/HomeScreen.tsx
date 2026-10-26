import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import { useRideStore, RideOption } from '../../store/rideStore';
import { useAuthStore } from '../../store/authStore';
import api, { ENDPOINTS } from '../../api';

const { height } = Dimensions.get('window');

const SHEET_COLLAPSED_HEIGHT = 280;
const SHEET_EXPANDED_HEIGHT = height * 0.72;

interface VehicleTypeDef {
  id: string;
  emoji: string;
  name: string;
  seats: number;
  color: string;
  premium?: boolean;
  defaultPrice: number;
}

const VEHICLE_TYPES: VehicleTypeDef[] = [
  { id: 'Golden Ride Economy', emoji: '🚗', name: 'Golden Ride Economy', seats: 4, color: Colors.sedan, defaultPrice: 12 },
  { id: 'Golden Ride Comfort', emoji: '🚙', name: 'Golden Ride Comfort', seats: 4, color: Colors.suv, defaultPrice: 18 },
  { id: 'Golden Ride Premium', emoji: '👑', name: 'Golden Ride Premium', seats: 6, color: Colors.van, premium: true, defaultPrice: 32 },
  { id: 'Golden RideX', emoji: '⭐', name: 'Golden RideX', seats: 4, color: Colors.rideX, premium: true, defaultPrice: 25 },
  { id: 'Golden RideXL', emoji: '🚐', name: 'Golden RideXL', seats: 6, color: Colors.rideXL, premium: true, defaultPrice: 32 },
  { id: 'Golden Ride Pet', emoji: '🐾', name: 'Golden Ride Pet', seats: 4, color: Colors.ridePet, defaultPrice: 20 },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  return 'Good evening';
}

interface SavedAddress {
  id: number;
  type: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

interface RecentTrip {
  id: number;
  from_location: string;
  to_location: string;
}

type MergedOption = RideOption & { emoji: string; color: string; premium?: boolean };

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuthStore();
  const {
    pickup,
    dropoff,
    rideOptions,
    selectedVehicle,
    setSelectedVehicle,
    fetchRideOptions,
    isFetchingOptions,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    setPickup,
    setDropoff,
  } = useRideStore();

  const mapRef = useRef<MapView>(null);
  const sheetAnim = useRef(new Animated.Value(SHEET_COLLAPSED_HEIGHT)).current;

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);

  const hasDropoff = !!dropoff;
  const canBook = !!selectedVehicle;

  // Expand/collapse bottom sheet
  useEffect(() => {
    Animated.spring(sheetAnim, {
      toValue: hasDropoff ? SHEET_EXPANDED_HEIGHT : SHEET_COLLAPSED_HEIGHT,
      useNativeDriver: false,
      tension: 65,
      friction: 11,
    }).start();
  }, [hasDropoff]);

  // Auto-fetch ride options
  useEffect(() => {
    if (pickup && dropoff) {
      fetchRideOptions(
        pickup,
        dropoff,
        pickupLat ?? undefined,
        pickupLng ?? undefined,
        dropoffLat ?? undefined,
        dropoffLng ?? undefined,
      ).catch(() => {});
    }
  }, [pickup, dropoff, pickupLat, pickupLng, dropoffLat, dropoffLng]);

  // Request location permissions and get current location
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Required', 'Please allow location access to use this app.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (!isMounted) return;
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setUserLocation(coords);
      mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 800);

      if (!pickup) {
        try {
          const [geo] = await Location.reverseGeocodeAsync(coords);
          if (geo && isMounted) {
            const addr = [geo.name, geo.street, geo.city].filter(Boolean).join(', ');
            setPickup(addr, coords.latitude, coords.longitude);
          }
        } catch {}
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Load saved addresses and history
  useEffect(() => {
    (async () => {
      try {
        const [addrRes, histRes] = await Promise.allSettled([
          api.get(ENDPOINTS.ADDRESSES),
          api.get(ENDPOINTS.RIDE_HISTORY),
        ]);
        if (addrRes.status === 'fulfilled') setSavedAddresses(addrRes.value.data || []);
        if (histRes.status === 'fulfilled') setRecentTrips((histRes.value.data || []).slice(0, 3));
      } catch {}
    })();
  }, []);

  // Handle params from AddressSearch
  useFocusEffect(
    useCallback(() => {
      const params = route.params as any;
      if (!params) return;
      if (params.pickupAddress) {
        setPickup(params.pickupAddress, params.pickupLat, params.pickupLng);
        navigation.setParams({ pickupAddress: undefined });
      }
      if (params.dropoffAddress) {
        setDropoff(params.dropoffAddress, params.dropoffLat, params.dropoffLng);
        navigation.setParams({ dropoffAddress: undefined });
      }
    }, [route.params]),
  );

  // Fit map to markers
  useEffect(() => {
    if (pickupLat && pickupLng && dropoffLat && dropoffLng) {
      mapRef.current?.fitToCoordinates(
        [
          { latitude: pickupLat, longitude: pickupLng },
          { latitude: dropoffLat, longitude: dropoffLng },
        ],
        {
          edgePadding: { top: 120, right: 60, bottom: SHEET_EXPANDED_HEIGHT + 20, left: 60 },
          animated: true,
        },
      );
    }
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng]);

  const homeAddress = savedAddresses.find(a => a.type === 'home');
  const workAddress = savedAddresses.find(a => a.type === 'work');

  const getMergedOptions = (): MergedOption[] => {
    return VEHICLE_TYPES.map(vt => {
      const apiOpt = rideOptions.find(r => r.id === vt.id);
      return {
        id: vt.id,
        title: vt.name,
        subtitle: vt.premium ? 'Premium' : '',
        seats: apiOpt?.seats ?? vt.seats,
        eta: apiOpt?.eta ?? '5 min',
        price: apiOpt?.price ?? vt.defaultPrice,
        distance: apiOpt?.distance ?? '',
        duration: apiOpt?.duration ?? '',
        emoji: vt.emoji,
        color: vt.color,
        premium: vt.premium,
      };
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Full-screen Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        showsMyLocationButton={false}
        initialRegion={{
          latitude: userLocation?.latitude ?? 40.7128,
          longitude: userLocation?.longitude ?? -74.006,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        customMapStyle={darkMapStyle}
      >
        {!!pickupLat && !!pickupLng && (
          <Marker coordinate={{ latitude: pickupLat, longitude: pickupLng }} title="Pickup" pinColor="green" />
        )}
        {!!dropoffLat && !!dropoffLng && (
          <Marker coordinate={{ latitude: dropoffLat, longitude: dropoffLng }} title="Dropoff" pinColor="red" />
        )}
      </MapView>

      {/* Top gradient */}
      <LinearGradient
        colors={['rgba(14,14,24,0.92)', 'rgba(14,14,24,0.5)', 'transparent']}
        style={styles.topGradient}
        pointerEvents="none"
      />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greetingSmall}>{getGreeting()},</Text>
          <Text style={styles.greetingName}>{user?.name?.split(' ')[0] ?? 'Rider'}! 👋</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Floating safety button */}
      <TouchableOpacity style={styles.safetyBtn} onPress={() => navigation.navigate('SafetyHub')}>
        <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.safetyBtnInner}>
          <Ionicons name="shield-checkmark" size={20} color={Colors.black} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Bottom Sheet */}
      <Animated.View style={[styles.sheet, { height: sheetAnim }]}>
        <View style={styles.sheetHandle} />

        {!hasDropoff ? (
          <View style={styles.sheetContent}>
            <Text style={styles.sheetTitle}>Where to?</Text>

            {/* Search bar */}
            <TouchableOpacity style={styles.searchBar} onPress={() => navigation.navigate('AddressSearch')} activeOpacity={0.85}>
              <Ionicons name="search" size={18} color={Colors.primary} />
              <Text style={styles.searchPlaceholder}>Search destination...</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>

            {/* Quick address buttons */}
            <View style={styles.quickRow}>
              <TouchableOpacity
                style={styles.quickBtn}
                onPress={() => homeAddress ? setDropoff(homeAddress.address, homeAddress.latitude, homeAddress.longitude) : navigation.navigate('AddressSearch')}
              >
                <View style={[styles.quickIcon, { backgroundColor: 'rgba(79,70,229,0.15)' }]}>
                  <Text style={styles.quickIconText}>🏠</Text>
                </View>
                <Text style={styles.quickLabel} numberOfLines={1}>{homeAddress ? 'Home' : 'Set Home'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickBtn}
                onPress={() => workAddress ? setDropoff(workAddress.address, workAddress.latitude, workAddress.longitude) : navigation.navigate('AddressSearch')}
              >
                <View style={[styles.quickIcon, { backgroundColor: 'rgba(5,150,105,0.15)' }]}>
                  <Text style={styles.quickIconText}>🏢</Text>
                </View>
                <Text style={styles.quickLabel} numberOfLines={1}>{workAddress ? 'Work' : 'Set Work'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('AddressSearch')}>
                <View style={[styles.quickIcon, { backgroundColor: Colors.primaryLight }]}>
                  <Ionicons name="add" size={20} color={Colors.primary} />
                </View>
                <Text style={styles.quickLabel}>More</Text>
              </TouchableOpacity>
            </View>

            {/* Recent trips */}
            {recentTrips.length > 0 && (
              <View>
                <Text style={styles.sectionLabel}>Recent trips</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {recentTrips.map(trip => (
                    <TouchableOpacity
                      key={trip.id}
                      style={styles.recentChip}
                      onPress={() => setDropoff(trip.to_location)}
                    >
                      <Ionicons name="time-outline" size={13} color={Colors.textSecondary} />
                      <Text style={styles.recentChipText} numberOfLines={1}>{trip.to_location}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.sheetContent}>
            {/* Route summary */}
            <TouchableOpacity style={styles.routeSummary} onPress={() => navigation.navigate('AddressSearch')} activeOpacity={0.85}>
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, { backgroundColor: Colors.success }]} />
                <Text style={styles.routeText} numberOfLines={1}>{pickup || 'Pickup location'}</Text>
              </View>
              <View style={styles.routeConnector} />
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, { backgroundColor: Colors.error }]} />
                <Text style={styles.routeText} numberOfLines={1}>{dropoff}</Text>
              </View>
              <Ionicons name="pencil-outline" size={16} color={Colors.textMuted} style={styles.editIcon} />
            </TouchableOpacity>

            {/* Vehicle cards */}
            {isFetchingOptions ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Finding best rides for you...</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.vehicleScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: canBook ? 90 : 20 }}
              >
                {getMergedOptions().map(v => {
                  const isSelected = selectedVehicle?.id === v.id;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.vehicleCard, isSelected && styles.vehicleCardSelected]}
                      onPress={() => setSelectedVehicle(v)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.vehicleEmojiBox, { backgroundColor: `${v.color}22` }]}>
                        <Text style={styles.vehicleEmoji}>{v.emoji}</Text>
                      </View>
                      <View style={styles.vehicleInfo}>
                        <View style={styles.vehicleNameRow}>
                          <Text style={styles.vehicleName}>{v.title}</Text>
                          {v.premium && (
                            <View style={styles.premiumBadge}>
                              <Text style={styles.premiumBadgeText}>PREMIUM</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.vehicleMeta}>
                          <Ionicons name="people-outline" size={12} color={Colors.textSecondary} />
                          <Text style={styles.vehicleMetaText}>{v.seats} seats</Text>
                          <Text style={styles.vehicleMetaDot}>·</Text>
                          <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
                          <Text style={styles.vehicleMetaText}>{v.eta}</Text>
                        </View>
                      </View>
                      <View style={styles.vehiclePriceCol}>
                        <Text style={[styles.vehiclePrice, isSelected && { color: Colors.primary }]}>
                          ${typeof v.price === 'number' ? v.price.toFixed(2) : v.price}
                        </Text>
                        {isSelected && <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}

        {/* Book Now */}
        {canBook && (
          <View style={styles.bookBtnContainer}>
            <TouchableOpacity onPress={() => navigation.navigate('BookingConfirm')} activeOpacity={0.88}>
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={styles.bookBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="car-sport" size={20} color={Colors.black} />
                <Text style={styles.bookBtnText}>Book {selectedVehicle?.title}</Text>
                <Text style={styles.bookBtnPrice}>
                  ${typeof selectedVehicle?.price === 'number' ? selectedVehicle.price.toFixed(2) : selectedVehicle?.price}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    zIndex: 1,
  },

  topBar: {
    position: 'absolute',
    top: 56,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },

  greetingSmall: {
    fontSize: Typography.small,
    color: Colors.textSecondary,
    fontWeight: Typography.fontRegular as any,
  },
  greetingName: {
    fontSize: Typography.h3,
    color: Colors.textPrimary,
    fontWeight: Typography.fontBold as any,
    marginTop: 1,
  },

  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(24,24,40,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },

  safetyBtn: {
    position: 'absolute',
    top: 110,
    right: Spacing.lg,
    zIndex: 10,
  },
  safetyBtnInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.button,
  },

  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    ...Shadow.card,
    overflow: 'hidden',
  },

  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.borderStrong,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },

  sheetContent: { flex: 1, paddingHorizontal: Spacing.lg },

  sheetTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.fontBold as any,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  searchPlaceholder: {
    fontSize: Typography.body,
    color: Colors.textMuted,
    flex: 1,
  },

  quickRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  quickBtn: { flex: 1, alignItems: 'center', gap: Spacing.xs },
  quickIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickIconText: { fontSize: 24 },
  quickLabel: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: Typography.fontMedium as any,
  },

  sectionLabel: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    fontWeight: Typography.fontSemibold as any,
    marginBottom: Spacing.sm,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: 200,
  },
  recentChipText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    maxWidth: 150,
  },

  routeSummary: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeText: {
    fontSize: Typography.small,
    color: Colors.textPrimary,
    flex: 1,
    fontWeight: Typography.fontMedium as any,
  },
  routeConnector: {
    width: 1,
    height: 14,
    backgroundColor: Colors.border,
    marginLeft: 5,
    marginVertical: 3,
  },
  editIcon: { position: 'absolute', right: Spacing.md, top: Spacing.lg },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  loadingText: { fontSize: Typography.small, color: Colors.textSecondary },

  vehicleScroll: { flex: 1 },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...Shadow.card,
  },
  vehicleCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  vehicleEmojiBox: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  vehicleEmoji: { fontSize: 30 },
  vehicleInfo: { flex: 1 },
  vehicleNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 4 },
  vehicleName: {
    fontSize: Typography.body,
    fontWeight: Typography.fontSemibold as any,
    color: Colors.textPrimary,
  },
  premiumBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  premiumBadgeText: {
    fontSize: 9,
    fontWeight: Typography.fontBold as any,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  vehicleMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  vehicleMetaText: { fontSize: Typography.xs, color: Colors.textSecondary },
  vehicleMetaDot: { fontSize: Typography.xs, color: Colors.textMuted, marginHorizontal: 2 },
  vehiclePriceCol: { alignItems: 'flex-end', gap: 4 },
  vehiclePrice: {
    fontSize: Typography.h4,
    fontWeight: Typography.fontBold as any,
    color: Colors.textPrimary,
  },

  bookBtnContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: Radius.xl,
    gap: Spacing.sm,
    ...Shadow.button,
  },
  bookBtnText: {
    fontSize: Typography.body,
    fontWeight: Typography.fontBold as any,
    color: Colors.black,
    flex: 1,
    textAlign: 'center',
  },
  bookBtnPrice: {
    fontSize: Typography.body,
    fontWeight: Typography.fontBold as any,
    color: Colors.black,
  },
});
