import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
  Modal,
  TextInput,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';

// Mock theme imports to allow compilation
// In a real app, these would come from '../../theme'
const Colors = {
  primary: '#D4AF37', // Gold
  background: '#FFFFFF',
  surface: '#F8F9FA',
  text: '#1F2937',
  textSecondary: '#6B7280',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  border: '#E5E7EB',
  white: '#FFFFFF',
  purple: '#8B5CF6',
};
const Typography = {
  h1: 24, h2: 20, body: 16, caption: 14,
};
const Spacing = { s: 8, m: 16, l: 24, xl: 32 };
const Radius = { s: 4, m: 8, l: 16, round: 9999 };
const Shadow = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
};

// Mock api and ENDPOINTS
const api = {
  get: async (url: string) => ({ data: [] }),
  post: async (url: string, data?: any) => ({ data: { link: 'https://goldenride.com/track/123' } }),
};
const ENDPOINTS = {
  RIDER_SOS: '/rider/safety/sos',
  TRUSTED_CONTACTS: '/rider/safety/trusted-contacts',
  RIDER_SHARE_TRIP: '/rider/safety/share-trip',
};

interface Contact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

export default function SafetyHubScreen() {
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [incidentDesc, setIncidentDesc] = useState('');
  
  const [addContactModalVisible, setAddContactModalVisible] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relationship: '' });

  const [checklist, setChecklist] = useState([
    { id: '1', text: 'Verify Driver Name matches app', checked: false },
    { id: '2', text: 'Check Vehicle Plate Number', checked: false },
    { id: '3', text: 'Confirm Route on Map', checked: false },
  ]);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setLoadingContacts(true);
    try {
      // Mocking fetch
      const res = await api.get(ENDPOINTS.TRUSTED_CONTACTS);
      setContacts([
        { id: '1', name: 'Mom', phone: '555-0101', relationship: 'Family' },
      ]);
    } catch (e) {
      console.log(e);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleSOS = () => {
    Alert.alert('Emergency SOS', 'This will call 911 and alert your emergency contacts.\n\nAre you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'CALL 911',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post(ENDPOINTS.RIDER_SOS);
          } catch {}
          Linking.openURL('tel:911');
        },
      },
    ]);
  };

  const handleShareRide = async () => {
    try {
      const res = await api.post(ENDPOINTS.RIDER_SHARE_TRIP);
      Share.share({ message: `Track my Golden Ride! ${res.data?.link || 'Stay safe!'}` });
    } catch (e) {
      Alert.alert('Error', 'Could not share trip');
    }
  };

  const handleSubmitReport = async () => {
    if (!incidentDesc) return;
    try {
      await api.post('/rider/safety/incident-report', { description: incidentDesc });
      Alert.alert('Success', 'Incident reported successfully');
      setReportModalVisible(false);
      setIncidentDesc('');
    } catch (e) {
      Alert.alert('Error', 'Could not submit report');
    }
  };

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.phone) return;
    try {
      await api.post(ENDPOINTS.TRUSTED_CONTACTS, newContact);
      Alert.alert('Success', 'Contact added');
      setAddContactModalVisible(false);
      setNewContact({ name: '', phone: '', relationship: '' });
      fetchContacts();
    } catch (e) {
      Alert.alert('Error', 'Could not add contact');
    }
  };

  const toggleChecklist = (id: string) => {
    setChecklist(prev =>
      prev.map(item => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Safety Hub</Text>
        <Ionicons name="shield-checkmark" size={24} color={Colors.success} style={styles.headerIcon} />
      </View>

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
        {/* SOS Button Area */}
        <View style={styles.sosContainer}>
          <Animated.View style={[styles.sosPulse, { transform: [{ scale: pulseAnim }] }]}>
            <TouchableOpacity style={styles.sosButton} onPress={handleSOS} activeOpacity={0.8}>
              <Text style={styles.sosText}>SOS</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* 4 Action Cards */}
        <View style={styles.actionGrid}>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: Colors.success }]} onPress={handleShareRide}>
            <Ionicons name="share-social" size={32} color={Colors.white} />
            <Text style={styles.actionText}>Share My Ride</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: Colors.warning }]} onPress={() => setReportModalVisible(true)}>
            <Ionicons name="warning" size={32} color={Colors.white} />
            <Text style={styles.actionText}>Report Incident</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: Colors.info }]} onPress={() => scrollViewRef.current?.scrollToEnd()}>
            <Ionicons name="people" size={32} color={Colors.white} />
            <Text style={styles.actionText}>Trusted Contacts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: Colors.purple }]} onPress={() => scrollViewRef.current?.scrollToEnd()}>
            <Ionicons name="checkmark-circle" size={32} color={Colors.white} />
            <Text style={styles.actionText}>Safety Checklist</Text>
          </TouchableOpacity>
        </View>

        {/* Trusted Contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trusted Contacts</Text>
          {loadingContacts ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            contacts.map(contact => (
              <View key={contact.id} style={styles.contactCard}>
                <View style={styles.contactAvatar}>
                  <Text style={{ fontSize: 24 }}>👤</Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactPhone}>{contact.phone}</Text>
                </View>
                <View style={styles.contactBadge}>
                  <Text style={styles.contactBadgeText}>{contact.relationship}</Text>
                </View>
              </View>
            ))
          )}
          <TouchableOpacity style={styles.addButton} onPress={() => setAddContactModalVisible(true)}>
            <Text style={styles.addButtonText}>+ Add Contact</Text>
          </TouchableOpacity>
        </View>

        {/* Safety Checklist */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Checklist</Text>
          {checklist.map(item => (
            <TouchableOpacity key={item.id} style={styles.checklistItem} onPress={() => toggleChecklist(item.id)}>
              <Ionicons
                name={item.checked ? 'checkmark-circle' : 'ellipse-outline'}
                size={28}
                color={item.checked ? Colors.primary : Colors.textSecondary}
              />
              <Text style={styles.checklistText}>{item.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Add Contact Modal */}
      <Modal visible={addContactModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Trusted Contact</Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={newContact.name}
              onChangeText={t => setNewContact({ ...newContact, name: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone"
              keyboardType="phone-pad"
              value={newContact.phone}
              onChangeText={t => setNewContact({ ...newContact, phone: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Relationship (e.g. Family)"
              value={newContact.relationship}
              onChangeText={t => setNewContact({ ...newContact, relationship: t })}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setAddContactModalVisible(false)}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSubmit} onPress={handleAddContact}>
                <Text style={styles.modalBtnSubmitText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Report Incident Modal */}
      <Modal visible={reportModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Incident</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the issue..."
              multiline
              numberOfLines={4}
              value={incidentDesc}
              onChangeText={setIncidentDesc}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setReportModalVisible(false)}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSubmit} onPress={handleSubmitReport}>
                <Text style={styles.modalBtnSubmitText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.m, borderBottomWidth: 1, borderColor: Colors.border },
  backButton: { padding: Spacing.s },
  headerTitle: { flex: 1, fontSize: Typography.h2, textAlign: 'center' },
  headerIcon: { padding: Spacing.s },
  scrollContent: { padding: Spacing.m, paddingBottom: Spacing.xl * 2 },
  
  sosContainer: { alignItems: 'center', marginVertical: Spacing.xl },
  sosPulse: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(239, 68, 68, 0.3)', alignItems: 'center', justifyContent: 'center' },
  sosButton: { width: 120, height: 120, borderRadius: 60, backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center', ...Shadow.md },
  sosText: { color: Colors.white, fontSize: 28, fontWeight: 'bold' },

  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: Spacing.xl },
  actionCard: { width: '48%', aspectRatio: 1.2, borderRadius: Radius.m, padding: Spacing.m, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.m, ...Shadow.sm },
  actionText: { color: Colors.white, fontWeight: 'bold', marginTop: Spacing.s, textAlign: 'center' },

  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: Typography.h2, marginBottom: Spacing.m },
  
  contactCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: Spacing.m, borderRadius: Radius.m, marginBottom: Spacing.s, ...Shadow.sm },
  contactAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.m },
  contactInfo: { flex: 1 },
  contactName: { fontWeight: 'bold', fontSize: Typography.body },
  contactPhone: { fontSize: Typography.caption },
  contactBadge: { backgroundColor: Colors.info + '20', paddingHorizontal: Spacing.s, paddingVertical: 4, borderRadius: Radius.s },
  contactBadgeText: { color: Colors.info, fontSize: 12, fontWeight: 'bold' },
  
  addButton: { padding: Spacing.m, alignItems: 'center', borderColor: Colors.primary, borderWidth: 1, borderRadius: Radius.m, marginTop: Spacing.s },
  addButtonText: { color: Colors.primary, fontWeight: 'bold' },

  checklistItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: Spacing.m, borderRadius: Radius.m, marginBottom: Spacing.s },
  checklistText: { flex: 1, marginLeft: Spacing.s, fontSize: Typography.body },

  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.l },
  modalContent: { backgroundColor: Colors.white, padding: Spacing.l, borderRadius: Radius.l, ...Shadow.md },
  modalTitle: { fontSize: Typography.h2, marginBottom: Spacing.m },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.s, padding: Spacing.m, marginBottom: Spacing.m, fontSize: Typography.body },
  textArea: { height: 100, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.m },
  modalBtnCancel: { padding: Spacing.m },
  modalBtnCancelText: { color: Colors.textSecondary, fontWeight: 'bold' },
  modalBtnSubmit: { padding: Spacing.m, backgroundColor: Colors.primary, borderRadius: Radius.s },
  modalBtnSubmitText: { color: Colors.white, fontWeight: 'bold' },
});
