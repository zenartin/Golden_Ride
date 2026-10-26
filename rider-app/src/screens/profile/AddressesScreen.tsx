import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, Modal, TextInput, Switch, ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import api, { ENDPOINTS } from '../../api';

type Address = {
  id: string;
  type: 'Home' | 'Work' | 'Other';
  address: string;
  is_default: boolean;
};

const AddressesScreen = () => {
  const navigation = useNavigation();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [newType, setNewType] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [newAddress, setNewAddress] = useState('');
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [adding, setAdding] = useState(false);

  const fetchAddresses = async () => {
    try {
      const res = await api.get(ENDPOINTS.ADDRESSES || '/user/addresses');
      setAddresses(res.data?.addresses || []);
    } catch (e) {
      console.error(e);
      setAddresses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAddresses();
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Address', 'Are you sure you want to remove this address?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`${ENDPOINTS.ADDRESSES || '/user/address'}/${id}`);
            fetchAddresses();
          } catch (error) {
            Alert.alert('Error', 'Could not delete address');
          }
        }
      }
    ]);
  };

  const handleAddAddress = async () => {
    if (!newAddress.trim()) {
      Alert.alert('Error', 'Address cannot be empty');
      return;
    }
    
    try {
      setAdding(true);
      await api.post(ENDPOINTS.ADDRESSES || '/user/addresses', {
        type: newType,
        address: newAddress,
        is_default: newIsDefault,
      });
      setModalVisible(false);
      setNewAddress('');
      setNewType('Home');
      setNewIsDefault(false);
      fetchAddresses();
    } catch (error) {
      Alert.alert('Error', 'Failed to add address');
    } finally {
      setAdding(false);
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'Home': return '#4CAF50';
      case 'Work': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  const renderItem = ({ item }: { item: Address }) => (
    <View style={styles.addressCard}>
      <View style={styles.addressHeader}>
        <View style={styles.badgeRow}>
          <View style={[styles.typeBadge, { backgroundColor: getBadgeColor(item.type) }]}>
            <Text style={styles.typeText}>{item.type}</Text>
          </View>
          {item.is_default && (
            <View style={styles.defaultChip}>
              <Text style={styles.defaultText}>Default</Text>
            </View>
          )}
        </View>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="pencil" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
            <Ionicons name="trash" size={20} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.addressDetailText}>{item.address}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Addresses</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>📍 No saved addresses{'\n'}Add your first address</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={32} color={Colors.white} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Address</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Label</Text>
            <View style={styles.typeSelector}>
              {(['Home', 'Work', 'Other'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeBtn, newType === type && styles.typeBtnActive]}
                  onPress={() => setNewType(type)}
                >
                  <Text style={[styles.typeBtnText, newType === type && styles.typeBtnTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              value={newAddress}
              onChangeText={setNewAddress}
              placeholder="Enter full address"
              placeholderTextColor={Colors.textSecondary}
              multiline
            />

            <View style={styles.switchRow}>
              <Text style={styles.label}>Set as Default</Text>
              <Switch
                value={newIsDefault}
                onValueChange={setNewIsDefault}
                trackColor={{ false: Colors.border, true: Colors.primary }}
              />
            </View>

            <TouchableOpacity 
              style={styles.addBtn}
              onPress={handleAddAddress}
              disabled={adding}
            >
              {adding ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.addBtnText}>Add Address</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.h3,
    color: Colors.text,
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: Spacing.m,
    flexGrow: 1,
  },
  addressCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.m,
    borderRadius: Radius.l,
    marginBottom: Spacing.m,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.s,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: Spacing.s,
    paddingVertical: 4,
    borderRadius: Radius.s,
    marginRight: Spacing.s,
  },
  typeText: {
    fontSize: Typography.bodySmall,
    color: Colors.white,
    fontWeight: 'bold',
  },
  defaultChip: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    paddingHorizontal: Spacing.s,
    paddingVertical: 4,
    borderRadius: Radius.s,
  },
  defaultText: {
    fontSize: Typography.bodySmall,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  actionsRow: {
    flexDirection: 'row',
  },
  actionBtn: {
    marginLeft: Spacing.m,
  },
  addressDetailText: {
    fontSize: Typography.bodyMedium,
    color: Colors.text,
    lineHeight: 22,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: Typography.bodyLarge,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.l,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.l,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.l,
  },
  modalTitle: {
    fontSize: Typography.h3,
    color: Colors.text,
    fontWeight: 'bold',
  },
  label: {
    fontSize: Typography.bodyMedium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.m,
  },
  typeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.s,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: Spacing.s,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.m,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  typeBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  typeBtnText: {
    fontSize: Typography.bodyMedium,
    color: Colors.text,
  },
  typeBtnTextActive: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.m,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    color: Colors.text,
    fontSize: Typography.bodyLarge,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.l,
    marginBottom: Spacing.xl,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    padding: Spacing.m,
    borderRadius: Radius.l,
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: Typography.button,
    color: Colors.white,
    fontWeight: 'bold',
  },
});

export default AddressesScreen;
