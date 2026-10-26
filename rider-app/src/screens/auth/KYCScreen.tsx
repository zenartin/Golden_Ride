import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Typography } from '../../theme';
import api, { ENDPOINTS } from '../../api';
import { useAuthStore } from '../../store/authStore';

export default function KYCScreen({ navigation }: any) {
  const { user, loadUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [address, setAddress] = useState('');
  const [dob, setDob] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0].uri) {
      setAvatar(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (avatar) {
        const formData = new FormData();
        formData.append('file', {
          uri: avatar,
          name: 'avatar.jpg',
          type: 'image/jpeg',
        } as any);
        await api.post(ENDPOINTS.PROFILE_AVATAR, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      await api.put(ENDPOINTS.PROFILE, { name });
      
      // Let app navigator handle route change by reloading user state
      await loadUser();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    await loadUser(); // Trigger Main nav
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Complete Your Profile</Text>
        
        <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarEmoji}>👤</Text>
            </View>
          )}
          <Text style={styles.avatarText}>Tap to add photo</Text>
        </TouchableOpacity>

        <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor={Colors.textMuted} value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Date of Birth (MM/DD/YYYY)" placeholderTextColor={Colors.textMuted} value={dob} onChangeText={setDob} />
        <TextInput style={styles.input} placeholder="Home Address" placeholderTextColor={Colors.textMuted} value={address} onChangeText={setAddress} />
        
        <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color={Colors.background} /> : <Text style={styles.primaryButtonText}>Save & Continue</Text>}
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: Typography.h2, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 30, textAlign: 'center' },
  avatarContainer: { alignItems: 'center', marginBottom: 30 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
  avatarEmoji: { fontSize: 40 },
  avatarText: { color: Colors.primary, marginTop: 10, fontSize: Typography.body },
  input: { backgroundColor: Colors.surfaceElevated, borderRadius: 12, padding: 16, color: Colors.textPrimary, marginBottom: 15, borderWidth: 1, borderColor: Colors.border },
  primaryButton: { backgroundColor: Colors.primary, padding: 16, borderRadius: 30, alignItems: 'center', marginTop: 20 },
  primaryButtonText: { color: Colors.background, fontSize: Typography.h4, fontWeight: 'bold' },
  skipButton: { padding: 16, alignItems: 'center', marginTop: 10 },
  skipText: { color: Colors.textSecondary, fontSize: Typography.body },
});
