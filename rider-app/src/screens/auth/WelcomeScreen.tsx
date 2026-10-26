import React from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Colors, Typography } from '../../theme';

export default function WelcomeScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image source={require("../../../assets/images/logo.jpeg")} style={{width: 120, height: 120, marginBottom: 20}} resizeMode="contain" />
        <Text style={styles.title}>Golden Ride</Text>
        <Text style={styles.subtitle}>Your premium ride, anywhere in the US</Text>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.secondaryButtonText}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghostButton} onPress={() => navigation.navigate('OTP')}>
          <Text style={styles.ghostButtonText}>Continue with Phone</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: Typography.h1,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: Typography.h4,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    gap: 15,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.background,
    fontSize: Typography.h4,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  secondaryButtonText: {
    color: Colors.textPrimary,
    fontSize: Typography.h4,
    fontWeight: '600',
  },
  ghostButton: {
    padding: 16,
    alignItems: 'center',
  },
  ghostButtonText: {
    color: Colors.textSecondary,
    fontSize: Typography.body,
  },
});
