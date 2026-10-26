import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import api, { ENDPOINTS } from '../../api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Types
interface FamilyMember {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  avatar?: string;
}

export const FamilyScreen = () => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRel, setNewRel] = useState('Spouse');
  const navigation = useNavigation();

  const fetchMembers = async () => {
    setLoading(true);
    try {
      // @ts-ignore
      const response = await api.get(ENDPOINTS.FAMILY);
      setMembers(response.data || []);
    } catch (error) {
      console.error('Error fetching family:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Remove Member',
      `Remove ${name} from your family?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive', 
          onPress: async () => {
            try {
              // @ts-ignore
              await api.delete(ENDPOINTS.FAMILY_MEMBER(id));
              fetchMembers();
            } catch (error) {
              console.error('Error deleting member:', error);
            }
          }
        }
      ]
    );
  };

  const handleAdd = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert('Validation Error', 'Name and phone are required.');
      return;
    }
    
    try {
      // @ts-ignore
      await api.post(ENDPOINTS.FAMILY, {
        name: newName,
        phone: newPhone,
        relationship: newRel
      });
      setModalVisible(false);
      setNewName('');
      setNewPhone('');
      setNewRel('Spouse');
      fetchMembers();
    } catch (error) {
      console.error('Error adding member:', error);
    }
  };

  const getEmoji = (rel: string) => {
    switch (rel) {
      case 'Spouse': return '💑';
      case 'Child': return '👶';
      case 'Parent': return '👴';
      default: return '👤';
    }
  };

  const renderItem = ({ item }: { item: FamilyMember }) => (
    <View style={styles.memberCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarEmoji}>{getEmoji(item.relationship)}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.name}</Text>
        <View style={styles.relBadge}>
          <Text style={styles.relText}>{item.relationship}</Text>
        </View>
        <Text style={styles.memberPhone}>{item.phone}</Text>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id, item.name)}>
        <Ionicons name="trash-outline" size={24} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text || '#fff'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Family Members</Text>
        <View style={styles.placeholder} />
      </View>
      
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary || '#D4AF37'} />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={members.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>👨‍👩‍👧</Text>
              <Text style={styles.emptyTitle}>No family members</Text>
              <Text style={styles.emptyDesc}>Add family members to share your rides</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={32} color="#000" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Family Member</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor="#888"
              value={newName}
              onChangeText={setNewName}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              placeholderTextColor="#888"
              keyboardType="phone-pad"
              value={newPhone}
              onChangeText={setNewPhone}
            />

            <View style={styles.relSelector}>
              {['Spouse', 'Child', 'Parent', 'Other'].map(rel => (
                <TouchableOpacity 
                  key={rel}
                  style={[styles.relBtn, newRel === rel && styles.relBtnActive]}
                  onPress={() => setNewRel(rel)}
                >
                  <Text style={[styles.relBtnText, newRel === rel && styles.relBtnTextActive]}>{rel}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
              <Text style={styles.addBtnText}>Add Member</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background || '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.m || 16,
    paddingVertical: Spacing.s || 12,
  },
  backBtn: { padding: 4 },
  placeholder: { width: 32 },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text || '#fff',
  },
  listContent: {
    padding: Spacing.s || 12,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: Spacing.m || 16,
    marginBottom: Spacing.s || 12,
    borderRadius: Radius.m || 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surface || '#222',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.m || 16,
  },
  avatarEmoji: { fontSize: 32 },
  memberInfo: { flex: 1 },
  memberName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  relBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.primary || '#D4AF37',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  relText: {
    color: Colors.primary || '#D4AF37',
    fontSize: 12,
  },
  memberPhone: {
    color: Colors.textSecondary || '#aaa',
    fontSize: 14,
  },
  deleteBtn: { padding: 8 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text || '#fff',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: Colors.textSecondary || '#aaa',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary || '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  relSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  relBtn: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#333',
    alignItems: 'center',
  },
  relBtnActive: {
    backgroundColor: Colors.primary || '#D4AF37',
  },
  relBtnText: {
    color: '#fff',
    fontSize: 12,
  },
  relBtnTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
  addBtn: {
    backgroundColor: Colors.primary || '#D4AF37',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  addBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FamilyScreen;
