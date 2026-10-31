import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { BASE_URL } from '../../../api/client';
import { useAuthStore } from '../../../store/authStore';

export const FamilyDashboardScreen = () => {
  const navigation = useNavigation<any>();
  const { token, user } = useAuthStore();
  const [familyData, setFamilyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<any[]>([]);

  const fetchCoupons = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/family/coupons`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCoupons(response.data);
    } catch {
      setCoupons([]);
    }
  };

  const copyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    Alert.alert('Copied', `Coupon ${code} copied. Paste it when booking a ride.`);
  };

  const [trips, setTrips] = useState<any[]>([]);

  const fetchFamilyTrips = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/family/trips`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrips(response.data);
    } catch {
      setTrips([]);
    }
  };

  const fetchFamily = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/family/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFamilyData(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setFamilyData(null);
      } else {
        Alert.alert('Error', 'Failed to load family data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilyTrips();
    fetchFamily();
    fetchCoupons();
  }, []);

  const createFamily = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${BASE_URL}/family`, { family_name: `${user?.name}'s Family` }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFamilyData(response.data);
    } catch (error) {
      Alert.alert('Error', 'Could not create family group');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  if (!familyData) {
    return (
      <View style={styles.center}>
        <Ionicons name="people-circle-outline" size={80} color="#ccc" />
        <Text style={styles.title}>Family Group</Text>
        <Text style={styles.subtitle}>Create a family group to manage rides and payments for your loved ones.</Text>
        <TouchableOpacity style={styles.button} onPress={createFamily}>
          <Text style={styles.buttonText}>Create Family</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{familyData.family_name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={familyData.members}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={() => (
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Members</Text>
            {familyData.organizer_user_id === user?.id && (
              <TouchableOpacity onPress={() => navigation.navigate('InviteFamilyMember')}>
                <Text style={styles.inviteText}>+ Invite</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.memberCard}>
            <View style={styles.memberAvatar}>
              <Text style={styles.avatarText}>{item.user?.name?.[0] || '?'}</Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{item.user?.name || 'Pending Invite'}</Text>
              <Text style={styles.memberRole}>{item.role}</Text>
            </View>
          </View>
        )}
        ListFooterComponent={() => (
          <>
          {trips.length > 0 && <Text style={{ fontWeight: "800", marginHorizontal: 16, marginTop: 16 }}>Family trips</Text>}
          {trips.map((t) => (
            <View key={t.id} style={{ marginHorizontal: 16, marginTop: 8, padding: 12, backgroundColor: "#fff", borderRadius: 12 }}>
              <Text style={{ fontWeight: "700" }}>{t.member}: {t.fare}</Text>
              <Text style={{ color: "#6B7280" }}>{t.from_location} to {t.to_location}</Text>
              <Text style={{ color: "#6B7280", textTransform: "capitalize" }}>{t.status} · {new Date(t.created_at).toLocaleDateString()}</Text>
            </View>
          ))}
          <View style={styles.couponSection}>
            <Text style={styles.sectionTitle}>Family Coupons</Text>
            {coupons.map((c) => (
              <View key={c.code} style={[styles.couponCard, !c.unlocked && styles.couponLocked]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.couponTitle}>{c.title}</Text>
                  <Text style={styles.couponDesc}>{c.description}</Text>
                  {c.rides_required > 0 && (
                    <Text style={styles.couponProgress}>
                      Rides: {Math.min(c.rides_completed, c.rides_required)}/{c.rides_required}
                      {c.unlocked ? '  • Unlocked' : c.locked_reason ? `  • ${c.locked_reason}` : ''}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  disabled={!c.unlocked}
                  style={[styles.codeBtn, !c.unlocked && { opacity: 0.4 }]}
                  onPress={() => copyCode(c.code)}
                >
                  <Text style={styles.codeText}>{c.code}</Text>
                  <Ionicons name="copy-outline" size={14} color="#000" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          </>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 30 },
  button: { backgroundColor: '#FFD700', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 25 },
  buttonText: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  inviteText: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
  memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, marginHorizontal: 20, marginBottom: 10, borderRadius: 12 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#666' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '600' },
  memberRole: { fontSize: 14, color: '#666', marginTop: 4 },
  couponSection: { padding: 20 },
  couponCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF9DB', borderWidth: 1, borderColor: '#FFD700', borderStyle: 'dashed', padding: 15, borderRadius: 12, marginTop: 12 },
  couponLocked: { backgroundColor: '#f1f1f1', borderColor: '#ccc' },
  couponTitle: { fontSize: 15, fontWeight: '700' },
  couponDesc: { fontSize: 13, color: '#666', marginTop: 2 },
  couponProgress: { fontSize: 12, color: '#B45309', marginTop: 6, fontWeight: '600' },
  codeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFD700', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 10 },
  codeText: { fontSize: 13, fontWeight: '800', color: '#000' },
});
