import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { Colors, Typography } from '../../theme';
import api, { ENDPOINTS } from '../../api';
import { useAuthStore } from '../../store/authStore';

export default function OTPScreen({ navigation }: any) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { loginOtp } = useAuthStore();

  const handleRequestOtp = async () => {
    if (!phone) { Alert.alert('Error', 'Enter phone number'); return; }
    setLoading(true);
    try {
      await api.post(ENDPOINTS.OTP_REQUEST, { phone });
      setStep(2);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 4) return;
    setLoading(true);
    try {
      await loginOtp(phone, otp);
      // Let app navigator handle route change
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => step === 2 ? setStep(1) : navigation.goBack()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <View style={styles.content}>
        {step === 1 ? (
          <>
            <Text style={styles.title}>Enter your phone</Text>
            <TextInput style={styles.input} placeholder="+1 234 567 8900" placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
            <TouchableOpacity style={styles.primaryButton} onPress={handleRequestOtp} disabled={loading}>
              {loading ? <ActivityIndicator color={Colors.background} /> : <Text style={styles.primaryButtonText}>Send OTP</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>Verify OTP</Text>
            <Text style={styles.subtitle}>Enter sandbox OTP: 1234</Text>
            <TextInput style={styles.input} placeholder="1234" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" maxLength={4} value={otp} onChangeText={setOtp} />
            <TouchableOpacity style={styles.primaryButton} onPress={handleVerifyOtp} disabled={loading}>
              {loading ? <ActivityIndicator color={Colors.background} /> : <Text style={styles.primaryButtonText}>Verify</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  backButton: { padding: 20 },
  backText: { color: Colors.textPrimary, fontSize: 16 },
  content: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: Typography.h2, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 20 },
  subtitle: { fontSize: Typography.body, color: Colors.textSecondary, marginBottom: 20 },
  input: { backgroundColor: Colors.surfaceElevated, borderRadius: 12, padding: 16, color: Colors.textPrimary, marginBottom: 20, borderWidth: 1, borderColor: Colors.border, fontSize: Typography.h3, textAlign: 'center', letterSpacing: 5 },
  primaryButton: { backgroundColor: Colors.primary, padding: 16, borderRadius: 30, alignItems: 'center' },
  primaryButtonText: { color: Colors.background, fontSize: Typography.h4, fontWeight: 'bold' },
});
