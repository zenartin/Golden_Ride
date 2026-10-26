import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Colors, Typography } from '../../theme';
import { useRideStore } from '../../store/rideStore';
import { getVehicleMeta, formatUSD } from '../../utils/helpers';
import api, { ENDPOINTS } from '../../api';

export default function BookingConfirmScreen({ navigation }: any) {
  const { pickup, dropoff, selectedVehicle, bookRide, isBooking } = useRideStore();
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [validating, setValidating] = useState(false);

  if (!selectedVehicle) {
    return <View style={styles.container}><Text style={styles.title}>No vehicle selected</Text></View>;
  }

  const meta = getVehicleMeta(selectedVehicle.id);
  const totalFare = Math.max(0, selectedVehicle.price - discount);

  const applyCoupon = async () => {
    if (!couponCode) return;
    setValidating(true);
    try {
      const res = await api.post(ENDPOINTS.COUPON_VALIDATE, {
        code: couponCode,
        fare_amount: selectedVehicle.price
      });
      if (res.data.valid) {
        setDiscount(res.data.discount_amount);
        Alert.alert('Success', res.data.message);
      }
    } catch (e: any) {
      Alert.alert('Invalid Coupon', e.response?.data?.detail || 'Could not apply coupon');
      setDiscount(0);
    } finally {
      setValidating(false);
    }
  };

  const handleBook = async () => {
    try {
      await bookRide(paymentMethod, discount > 0 ? couponCode : undefined);
      navigation.replace('ActiveRide');
    } catch (e: any) {
      Alert.alert('Booking Failed', e.response?.data?.detail || 'Failed to book ride');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Booking</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        {/* Route Summary */}
        <View style={styles.card}>
          <Text style={styles.routeLabel}>Pickup</Text>
          <Text style={styles.routeText} numberOfLines={1}>{pickup}</Text>
          <View style={styles.divider} />
          <Text style={styles.routeLabel}>Dropoff</Text>
          <Text style={styles.routeText} numberOfLines={1}>{dropoff}</Text>
        </View>

        {/* Vehicle */}
        <View style={styles.card}>
          <View style={styles.vehicleRow}>
            <View style={[styles.vehicleIcon, { backgroundColor: meta.bgColor }]}>
              <Text style={{ fontSize: 30 }}>{meta.emoji}</Text>
            </View>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleName}>{selectedVehicle.title}</Text>
              <Text style={styles.vehicleDesc}>{selectedVehicle.subtitle}</Text>
            </View>
          </View>
        </View>

        {/* Coupon */}
        <View style={styles.couponRow}>
          <TextInput
            style={styles.couponInput}
            placeholder="Promo Code"
            placeholderTextColor={Colors.textMuted}
            value={couponCode}
            onChangeText={setCouponCode}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.applyBtn} onPress={applyCoupon} disabled={validating}>
            {validating ? <ActivityIndicator size="small" color={Colors.background} /> : <Text style={styles.applyBtnText}>Apply</Text>}
          </TouchableOpacity>
        </View>

        {/* Fare */}
        <View style={styles.card}>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Base Fare</Text>
            <Text style={styles.fareValue}>{formatUSD(selectedVehicle.price)}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.fareRow}>
              <Text style={[styles.fareLabel, { color: Colors.success }]}>Discount</Text>
              <Text style={[styles.fareValue, { color: Colors.success }]}>-{formatUSD(discount)}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.fareRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatUSD(totalFare)}</Text>
          </View>
        </View>

        {/* Payment */}
        <View style={styles.paymentSelector}>
          <TouchableOpacity 
            style={[styles.paymentOption, paymentMethod === 'card' && styles.paymentActive]}
            onPress={() => setPaymentMethod('card')}
          >
            <Text style={styles.paymentText}>💳 Card</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.paymentOption, paymentMethod === 'wallet' && styles.paymentActive]}
            onPress={() => setPaymentMethod('wallet')}
          >
            <Text style={styles.paymentText}>💰 Wallet</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.paymentOption, paymentMethod === 'cash' && styles.paymentActive]}
            onPress={() => setPaymentMethod('cash')}
          >
            <Text style={styles.paymentText}>💵 Cash</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.bookBtn} onPress={handleBook} disabled={isBooking}>
          {isBooking ? (
            <ActivityIndicator color={Colors.background} />
          ) : (
            <Text style={styles.bookBtnText}>Confirm Booking {formatUSD(totalFare)}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
  backBtn: { padding: 5 },
  backText: { color: Colors.textPrimary, fontSize: 16 },
  headerTitle: { color: Colors.textPrimary, fontSize: Typography.h3, fontWeight: 'bold' },
  content: { flex: 1, padding: 15, gap: 15 },
  card: { backgroundColor: Colors.surface, borderRadius: 12, padding: 15, borderWidth: 1, borderColor: Colors.border },
  routeLabel: { color: Colors.textSecondary, fontSize: Typography.small, marginBottom: 4 },
  routeText: { color: Colors.textPrimary, fontSize: Typography.body, fontWeight: '500' },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 12 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center' },
  vehicleIcon: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  vehicleInfo: { flex: 1 },
  vehicleName: { color: Colors.textPrimary, fontSize: Typography.h3, fontWeight: 'bold' },
  vehicleDesc: { color: Colors.textSecondary, fontSize: Typography.small },
  couponRow: { flexDirection: 'row', gap: 10 },
  couponInput: { flex: 1, backgroundColor: Colors.surface, borderRadius: 8, padding: 12, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border },
  applyBtn: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' },
  applyBtnText: { color: Colors.background, fontWeight: 'bold' },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  fareLabel: { color: Colors.textSecondary, fontSize: Typography.body },
  fareValue: { color: Colors.textPrimary, fontSize: Typography.body, fontWeight: '500' },
  totalLabel: { color: Colors.textPrimary, fontSize: Typography.h3, fontWeight: 'bold' },
  totalValue: { color: Colors.primary, fontSize: Typography.h3, fontWeight: 'bold' },
  paymentSelector: { flexDirection: 'row', gap: 10, marginTop: 5 },
  paymentOption: { flex: 1, backgroundColor: Colors.surface, padding: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  paymentActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  paymentText: { color: Colors.textPrimary, fontWeight: '600' },
  footer: { padding: 20, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  bookBtn: { backgroundColor: Colors.primary, padding: 16, borderRadius: 30, alignItems: 'center' },
  bookBtnText: { color: Colors.background, fontSize: Typography.h4, fontWeight: 'bold' },
  title: { color: Colors.textPrimary, fontSize: Typography.h2, textAlign: 'center', marginTop: 50 },
});
