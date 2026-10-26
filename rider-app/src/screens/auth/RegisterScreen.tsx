import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Colors, Typography } from '../../theme';
import { useAuthStore } from '../../store/authStore';

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();

  const handleRegister = async () => {
    if (!name || !phone || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register({ name, phone, email, password, country: 'USA' });
      navigation.replace('KYC');
    } catch (error: any) {
      Alert.alert('Registration Failed', error.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.content}>
            <Text style={styles.title}>Create Account</Text>
            
            <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor={Colors.textMuted} value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Phone Number (e.g. +1 234 567 8900)" placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
            <TextInput style={styles.input} placeholder="Email" placeholderTextColor={Colors.textMuted} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
            <TextInput style={styles.input} placeholder="Password" placeholderTextColor={Colors.textMuted} secureTextEntry value={password} onChangeText={setPassword} />
            <TextInput style={styles.input} placeholder="Confirm Password" placeholderTextColor={Colors.textMuted} secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
            
            <TouchableOpacity style={styles.primaryButton} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color={Colors.background} /> : <Text style={styles.primaryButtonText}>Create Account</Text>}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.footer} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerText}>Already have an account? <Text style={styles.footerTextHighlight}>Sign In</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, justifyContent: 'space-between' },
  backButton: { padding: 20 },
  backText: { color: Colors.textPrimary, fontSize: 16 },
  content: { flex: 1, padding: 20 },
  title: { fontSize: Typography.h2, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 20 },
  input: { backgroundColor: Colors.surfaceElevated, borderRadius: 12, padding: 16, color: Colors.textPrimary, marginBottom: 15, borderWidth: 1, borderColor: Colors.border },
  primaryButton: { backgroundColor: Colors.primary, padding: 16, borderRadius: 30, alignItems: 'center', marginTop: 20 },
  primaryButtonText: { color: Colors.background, fontSize: Typography.h4, fontWeight: 'bold' },
  footer: { padding: 20, alignItems: 'center' },
  footerText: { color: Colors.textSecondary, fontSize: Typography.body },
  footerTextHighlight: { color: Colors.primary, fontWeight: 'bold' },
});
