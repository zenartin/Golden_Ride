import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import api, { ENDPOINTS } from '../../api';
import { useAuthStore } from '../../store/authStore';

export default function PaymentsScreen() {
  const navigation = useNavigation<any>();
  const { user, refreshProfile } = useAuthStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refreshProfile();
  }, []);

  const handleTopUp = async () => {
    const amount = selectedAmount || parseFloat(customAmount);
    if (!amount || isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please select or enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      await api.post(ENDPOINTS.WALLET_TOPUP, { amount });
      Alert.alert('Success', `Successfully added $${amount.toFixed(2)} to your wallet`);
      await refreshProfile();
      setModalVisible(false);
      setSelectedAmount(null);
      setCustomAmount('');
    } catch (error) {
      Alert.alert('Error', 'Failed to top up wallet');
    } finally {
      setLoading(false);
    }
  };

  const predefinedAmounts = [10, 25, 50, 100];

  const maskCardNumber = (num: string) => {
    if (!num) return '';
    const last4 = num.slice(-4);
    return `•••• •••• •••• ${last4}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Payments</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <LinearGradient
          colors={['#F5B800', '#D9A200']}
          style={styles.walletCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View>
            <Text style={styles.walletLabel}>Golden Ride Wallet</Text>
            <Text style={styles.walletBalance}>
              ${user?.wallet_balance ? parseFloat(user.wallet_balance).toFixed(2) : '0.00'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addFundsButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.addFundsText}>Add Funds</Text>
          </TouchableOpacity>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Saved Payment Method</Text>

        {user?.card_number ? (
          <LinearGradient
            colors={['#1a1a40', '#0d0d20']}
            style={styles.creditCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardTopRow}>
              <Text style={styles.cardBrand}>GOLDEN RIDE</Text>
              <Text style={styles.chipEmoji}>📡</Text>
            </View>
            <Text style={styles.cardNumber}>{maskCardNumber(user.card_number)}</Text>
            <View style={styles.cardBottomRow}>
              <View>
                <Text style={styles.cardLabel}>VALID THRU</Text>
                <Text style={styles.cardExpiry}>{user.card_expiry}</Text>
              </View>
              <View>
                <Text style={styles.cardLabel}>CARD HOLDER</Text>
                <Text style={styles.cardHolder}>{user.card_holder}</Text>
              </View>
              <Text style={styles.visaText}>VISA</Text>
            </View>
          </LinearGradient>
        ) : (
          <TouchableOpacity
            style={styles.placeholderCard}
            onPress={() => navigation.navigate('AddCard')}
          >
            <Ionicons name="add" size={32} color={Colors.textLight} />
            <Text style={styles.placeholderText}>Add a payment card</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.changeCardButton}
          onPress={() => navigation.navigate('AddCard')}
        >
          <Text style={styles.changeCardText}>
            {user?.card_number ? 'Change Card' : 'Add Card'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Funds</Text>

            <View style={styles.amountGrid}>
              {predefinedAmounts.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.amountButton,
                    selectedAmount === amount && styles.amountButtonSelected,
                  ]}
                  onPress={() => {
                    setSelectedAmount(amount);
                    setCustomAmount('');
                  }}
                >
                  <Text
                    style={[
                      styles.amountButtonText,
                      selectedAmount === amount && styles.amountButtonTextSelected,
                    ]}
                  >
                    ${amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.customAmountInput}
              placeholder="Custom Amount"
              placeholderTextColor={Colors.textLight}
              keyboardType="numeric"
              value={customAmount}
              onChangeText={(text) => {
                setCustomAmount(text);
                setSelectedAmount(null);
              }}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setModalVisible(false)}
                disabled={loading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmit}
                onPress={handleTopUp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.modalSubmitText}>Top Up</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.m,
  },
  backButton: {
    padding: Spacing.xs,
  },
  title: {
    fontSize: Typography.h2,
    color: Colors.text,
  },
  content: {
    flex: 1,
    padding: Spacing.m,
  },
  walletCard: {
    padding: Spacing.l,
    borderRadius: Radius.l,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    ...Shadow.medium,
  },
  walletLabel: {
    fontSize: Typography.body,
    color: Colors.white,
    opacity: 0.9,
    marginBottom: Spacing.xs,
  },
  walletBalance: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.white,
  },
  addFundsButton: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderRadius: Radius.m,
  },
  addFundsText: {
    fontSize: Typography.subtitle,
    color: '#D9A200',
  },
  sectionTitle: {
    fontSize: Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.m,
  },
  creditCard: {
    height: 160,
    borderRadius: Radius.l,
    padding: Spacing.m,
    justifyContent: 'space-between',
    marginBottom: Spacing.l,
    ...Shadow.medium,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBrand: {
    color: Colors.white,
    fontWeight: 'bold',
    letterSpacing: 2,
    fontSize: 16,
  },
  chipEmoji: {
    fontSize: 24,
  },
  cardNumber: {
    color: Colors.white,
    fontSize: 22,
    letterSpacing: 3,
    textAlign: 'center',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardLabel: {
    color: Colors.white,
    fontSize: 10,
    opacity: 0.7,
    marginBottom: 2,
  },
  cardExpiry: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
  cardHolder: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  visaText: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  placeholderCard: {
    height: 160,
    borderRadius: Radius.l,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.l,
  },
  placeholderText: {
    fontSize: Typography.body,
    color: Colors.textLight,
    marginTop: Spacing.s,
  },
  changeCardButton: {
    alignItems: 'center',
    padding: Spacing.m,
  },
  changeCardText: {
    fontSize: Typography.subtitle,
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.l,
    padding: Spacing.l,
  },
  modalTitle: {
    fontSize: Typography.h3,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.l,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.m,
  },
  amountButton: {
    width: '48%',
    backgroundColor: Colors.background,
    padding: Spacing.m,
    borderRadius: Radius.m,
    alignItems: 'center',
    marginBottom: Spacing.m,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  amountButtonSelected: {
    borderColor: '#D9A200',
    backgroundColor: 'rgba(217, 162, 0, 0.1)',
  },
  amountButtonText: {
    fontSize: Typography.h3,
    color: Colors.text,
  },
  amountButtonTextSelected: {
    color: '#D9A200',
  },
  customAmountInput: {
    backgroundColor: Colors.background,
    borderRadius: Radius.m,
    padding: Spacing.m,
    fontSize: Typography.body,
    color: Colors.text,
    marginBottom: Spacing.l,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancel: {
    flex: 1,
    padding: Spacing.m,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: Typography.subtitle,
    color: Colors.textLight,
  },
  modalSubmit: {
    flex: 1,
    backgroundColor: '#D9A200',
    padding: Spacing.m,
    borderRadius: Radius.m,
    alignItems: 'center',
    marginLeft: Spacing.s,
  },
  modalSubmitText: {
    fontSize: Typography.subtitle,
    color: Colors.white,
  },
});
