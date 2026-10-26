import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { Colors, Typography } from '../../theme';
import { useAuthStore } from '../../store/authStore';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (error: any) {
      console.log("Rider login error:", error);
      const detail = error.response?.data?.detail || (error.message ? `Connection error: ${error.message}` : 'Invalid email or password');
      Alert.alert('Login Failed', detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to Golden Ride</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        
        <TouchableOpacity style={styles.forgotButton}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color={Colors.background} /> : <Text style={styles.primaryButtonText}>Sign In</Text>}
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.footer} onPress={() => navigation.navigate('Register')}>
        <Text style={styles.footerText}>New to Golden Ride? <Text style={styles.footerTextHighlight}>Register</Text></Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  backButton: { padding: 20 },
  backText: { color: Colors.textPrimary, fontSize: 16 },
  content: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: Typography.h2, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 5 },
  subtitle: { fontSize: Typography.body, color: Colors.textSecondary, marginBottom: 30 },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 16,
    color: Colors.textPrimary,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  forgotButton: { alignSelf: 'flex-end', marginBottom: 30 },
  forgotText: { color: Colors.primary, fontSize: Typography.body },
  primaryButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  primaryButtonText: { color: Colors.background, fontSize: Typography.h4, fontWeight: 'bold' },
  footer: { padding: 20, alignItems: 'center' },
  footerText: { color: Colors.textSecondary, fontSize: Typography.body },
  footerTextHighlight: { color: Colors.primary, fontWeight: 'bold' },
});
