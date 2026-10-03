import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { BASE_URL } from '../../../api/client';
import { useAuthStore } from '../../../store/authStore';
import * as Clipboard from 'expo-clipboard';

export const InviteMembersScreen = () => {
  const navigation = useNavigation<any>();
  const { token } = useAuthStore();
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  const sendInvite = async () => {
    if (!contact.trim()) {
      Alert.alert('Error', 'Please enter an email or phone number');
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.post(`${BASE_URL}/family/invitations`, { invitee_contact: contact }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInviteToken(response.data.invitation_token_hash);
      Alert.alert('Success', 'Invitation generated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = async () => {
    if (inviteToken) {
      const link = `goldenride://family/invite/${inviteToken}`;
      await Clipboard.setStringAsync(link);
      Alert.alert('Copied', 'Invite link copied to clipboard!');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite Member</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Email or Phone Number</Text>
        <TextInput
          style={styles.input}
          value={contact}
          onChangeText={setContact}
          placeholder="e.g. +1234567890 or user@example.com"
          autoCapitalize="none"
        />

        <TouchableOpacity 
          style={[styles.button, !contact.trim() && styles.buttonDisabled]} 
          onPress={sendInvite}
          disabled={!contact.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonText}>Send Invitation</Text>
          )}
        </TouchableOpacity>

        {inviteToken && (
          <View style={styles.linkContainer}>
            <Text style={styles.linkText}>Invite Link Generated!</Text>
            <TouchableOpacity style={styles.copyButton} onPress={copyInviteLink}>
              <Ionicons name="copy-outline" size={20} color="#000" />
              <Text style={styles.copyText}>Copy Link to Share</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { padding: 20 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  input: { backgroundColor: '#f0f0f0', padding: 15, borderRadius: 10, fontSize: 16, marginBottom: 20 },
  button: { backgroundColor: '#FFD700', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 16, fontWeight: 'bold' },
  linkContainer: { marginTop: 40, padding: 20, backgroundColor: '#f8f9fa', borderRadius: 12, alignItems: 'center' },
  linkText: { fontSize: 16, fontWeight: '600', marginBottom: 15 },
  copyButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0e0e0', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  copyText: { marginLeft: 10, fontWeight: '600' }
});
