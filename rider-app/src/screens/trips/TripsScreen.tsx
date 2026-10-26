import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Mock theme imports
const Colors = {
  primary: '#D4AF37',
  background: '#FFFFFF',
  surface: '#F8F9FA',
  text: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
};
const Typography = {
  h1: 24, h2: 20, body: 16, caption: 14,
};
const Spacing = { s: 8, m: 16, l: 24, xl: 32 };
const Radius = { s: 4, m: 8, l: 16, round: 9999 };
const Shadow = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
};

// Mock api
const api = {
  get: async (url: string) => ({ data: [] }),
};
const ENDPOINTS = {
  RIDE_HISTORY: '/user/rides/history',
};

interface Trip {
  id: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  date: string;
  fare: string;
}

export default function TripsScreen() {
  const navigation = useNavigation();
  
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      // Mock data
      const mockTrips: Trip[] = [
        { id: '1', status: 'pending', pickup_address: '123 Main St', dropoff_address: '456 Market St', date: 'Sep 26, 2024 · 2:30 PM', fare: '$12.50' },
        { id: '2', status: 'completed', pickup_address: 'Airport', dropoff_address: 'Hotel', date: 'Sep 20, 2024 · 9:00 AM', fare: '$45.00' },
        { id: '3', status: 'cancelled', pickup_address: 'Home', dropoff_address: 'Office', date: 'Sep 19, 2024 · 8:00 AM', fare: '$0.00' },
      ];
      setTrips(mockTrips);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTrips();
  };

  const filteredTrips = trips.filter(trip => {
    if (activeTab === 'upcoming') return ['pending', 'accepted', 'in_progress'].includes(trip.status);
    return ['completed', 'cancelled'].includes(trip.status);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return Colors.success;
      case 'cancelled': return Colors.warning;
      case 'pending':
      case 'accepted':
      case 'in_progress': return Colors.primary;
      default: return Colors.textSecondary;
    }
  };

  const renderTrip = ({ item }: { item: Trip }) => (
    <TouchableOpacity
      style={styles.tripCard}
      onPress={() => navigation.navigate('TripDetail' as never, { tripId: item.id } as never)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name="car-outline" size={20} color={Colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: Spacing.s }}>
          <Text style={styles.dateText}>{item.date}</Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
      
      <View style={styles.routeContainer}>
        <Text style={styles.addressText} numberOfLines={1}>{item.pickup_address}</Text>
        <Ionicons name="arrow-forward" size={16} color={Colors.textSecondary} style={{ marginHorizontal: Spacing.s }} />
        <Text style={styles.addressText} numberOfLines={1}>{item.dropoff_address}</Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.fareText}>{item.fare}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Trips</Text>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="calendar-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>Upcoming</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>Past</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          {[1,2,3].map(i => <View key={i} style={styles.skeletonCard} />)}
        </View>
      ) : (
        <FlatList
          data={filteredTrips}
          keyExtractor={item => item.id}
          renderItem={renderTrip}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🗺️</Text>
              <Text style={styles.emptyTitle}>No trips yet</Text>
              <Text style={styles.emptySub}>Book your first ride!</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.m, borderBottomWidth: 1, borderColor: Colors.border },
  headerTitle: { fontSize: Typography.h1 },
  headerIcon: { padding: Spacing.s },
  
  tabContainer: { flexDirection: 'row', padding: Spacing.m, gap: Spacing.m },
  tab: { flex: 1, paddingVertical: Spacing.s, alignItems: 'center', borderRadius: Radius.round, borderWidth: 1, borderColor: Colors.primary },
  activeTab: { backgroundColor: Colors.primary },
  tabText: { fontSize: Typography.body, color: Colors.primary, fontWeight: 'bold' },
  activeTabText: { color: Colors.white },

  listContent: { padding: Spacing.m, gap: Spacing.m, paddingBottom: Spacing.xl },
  
  tripCard: { backgroundColor: Colors.white, borderRadius: Radius.m, padding: Spacing.m, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.m },
  iconContainer: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  dateText: { fontSize: Typography.caption, fontWeight: 'bold' },
  statusChip: { paddingHorizontal: Spacing.s, paddingVertical: 4, borderRadius: Radius.s },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  
  routeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.m },
  addressText: { flex: 1, fontSize: Typography.body },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderColor: Colors.border, paddingTop: Spacing.s },
  fareText: { fontSize: Typography.h2, color: Colors.primary },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xl * 2 },
  emptyEmoji: { fontSize: 60, marginBottom: Spacing.m },
  emptyTitle: { fontSize: Typography.h2, marginBottom: Spacing.s },
  emptySub: { fontSize: Typography.body, color: Colors.textSecondary },

  loadingContainer: { padding: Spacing.m, gap: Spacing.m },
  skeletonCard: { height: 120, backgroundColor: Colors.surface, borderRadius: Radius.m, ...Shadow.sm },
});
