import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Colors, Typography } from '../../theme';
import { useRideStore } from '../../store/rideStore';
import { formatUSD, formatDate, formatTime } from '../../utils/helpers';

export default function RideCompletedScreen({ navigation }: any) {
  const { activeRide, rateRide, clearBookingState } = useRideStore();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!activeRide) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.title}>Ride Completed</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => { clearBookingState(); navigation.navigate('Home'); }}>
          <Text style={styles.primaryButtonText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleSubmitRating = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }
    setLoading(true);
    try {
      await rateRide(activeRide.id, rating, comment);
      setSubmitted(true);
      Alert.alert('Thank You', 'Your feedback has been submitted.');
    } catch (e: any) {
      Alert.alert('Error', 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = () => {
    const receiptText = `
Receipt for Ride #${activeRide.id}
Date: ${formatDate(activeRide.created_at)} ${formatTime(activeRide.created_at)}
From: ${activeRide.from_location}
To: ${activeRide.to_location}
Vehicle: ${activeRide.ride_class}
Driver: ${activeRide.driver_name || 'N/A'}

Total Fare: ${formatUSD(activeRide.fare_amount)}
Payment Method: ${activeRide.payment_method}
    `;
    Alert.alert('Receipt', receiptText);
  };

  const handleDone = () => {
    clearBookingState();
    navigation.navigate('Home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🎉</Text>
        <Text style={styles.title}>Ride Complete!</Text>
        <Text style={styles.subtitle}>Hope you enjoyed your Golden Ride.</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.receiptCard}>
          <Text style={styles.cardTitle}>Fare Summary</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Distance</Text>
            <Text style={styles.value}>{activeRide.distance}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Duration</Text>
            <Text style={styles.value}>{activeRide.duration}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.totalLabel}>Total Fare</Text>
            <Text style={styles.totalValue}>{formatUSD(activeRide.fare_amount)}</Text>
          </View>
          <Text style={styles.paymentMethod}>Paid via {activeRide.payment_method}</Text>
        </View>

        {!submitted ? (
          <View style={styles.ratingCard}>
            <Text style={styles.cardTitle}>Rate your driver</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Text style={[styles.star, { color: star <= rating ? Colors.primary : Colors.borderStrong }]}>⭐</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.commentInput}
              placeholder="Leave a comment (optional)"
              placeholderTextColor={Colors.textMuted}
              value={comment}
              onChangeText={setComment}
              multiline
            />
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitRating} disabled={loading}>
              {loading ? <ActivityIndicator color={Colors.background} /> : <Text style={styles.submitBtnText}>Submit Rating</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.ratingCard}>
            <Text style={styles.cardTitle}>Thanks for rating!</Text>
          </View>
        )}

        <TouchableOpacity style={styles.receiptBtn} onPress={handleDownloadReceipt}>
          <Text style={styles.receiptBtnText}>View Receipt</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleDone}>
          <Text style={styles.primaryButtonText}>Book Another Ride</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { alignItems: 'center', padding: 30 },
  headerEmoji: { fontSize: 60, marginBottom: 10 },
  title: { fontSize: Typography.h2, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 5 },
  subtitle: { fontSize: Typography.body, color: Colors.textSecondary },
  content: { flex: 1, padding: 20, gap: 20 },
  receiptCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { color: Colors.textPrimary, fontSize: Typography.h4, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  label: { color: Colors.textSecondary, fontSize: Typography.body },
  value: { color: Colors.textPrimary, fontSize: Typography.body, fontWeight: '500' },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 15 },
  totalLabel: { color: Colors.textPrimary, fontSize: Typography.h3, fontWeight: 'bold' },
  totalValue: { color: Colors.primary, fontSize: Typography.h3, fontWeight: 'bold' },
  paymentMethod: { color: Colors.textSecondary, fontSize: Typography.small, textAlign: 'right', marginTop: 5 },
  ratingCard: { backgroundColor: Colors.surfaceElevated, borderRadius: 16, padding: 20 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 15 },
  star: { fontSize: 35 },
  commentInput: { backgroundColor: Colors.surface, borderRadius: 8, padding: 12, color: Colors.textPrimary, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: Colors.border, marginBottom: 15 },
  submitBtn: { backgroundColor: Colors.primary, padding: 12, borderRadius: 8, alignItems: 'center' },
  submitBtnText: { color: Colors.background, fontWeight: 'bold' },
  receiptBtn: { alignSelf: 'center', padding: 10 },
  receiptBtnText: { color: Colors.primary, fontSize: Typography.body, fontWeight: '600' },
  footer: { padding: 20 },
  primaryButton: { backgroundColor: Colors.primary, padding: 16, borderRadius: 30, alignItems: 'center' },
  primaryButtonText: { color: Colors.background, fontSize: Typography.h4, fontWeight: 'bold' },
});
