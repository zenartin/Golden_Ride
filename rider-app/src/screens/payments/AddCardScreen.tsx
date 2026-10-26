import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import api, { ENDPOINTS } from '../../api';
import { useAuthStore } from '../../store/authStore';

export default function AddCardScreen() {
  const navigation = useNavigation();
  const { refreshProfile } = useAuthStore();
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [loading, setLoading] = useState(false);

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const match = cleaned.match(/.{1,4}/g);
    return match ? match.join(' ') : '';
  };

  const handleCardNumberChange = (text: string) => {
    setCardNumber(formatCardNumber(text));
  };

  const handleExpiryChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      setExpiry(`${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`);
    } else {
      setExpiry(cleaned);
    }
  };

  const validate = () => {
    const digitsOnly = cardNumber.replace(/\s/g, '');
    if (digitsOnly.length !== 16) {
      return 'Card number must be 16 digits';
    }
    
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      return 'Expiry must match MM/YY format';
    }
    
    const [month] = expiry.split('/');
    if (parseInt(month, 10) < 1 || parseInt(month, 10) > 12) {
      return 'Invalid expiry month';
    }

    if (cvv.length < 3 || cvv.length > 4) {
      return 'CVV must be 3-4 digits';
    }

    if (!cardHolder.trim()) {
      return 'Card holder name is required';
    }

    return null;
  };

  const handleSaveCard = async () => {
    const error = validate();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }

    setLoading(true);
    try {
      const digitsOnly = cardNumber.replace(/\s/g, '');
      await api.put(ENDPOINTS.PROFILE_CARD, {
        card_number: digitsOnly,
        card_expiry: expiry,
        card_holder: cardHolder.trim(),
        cvv,
      });
      
      Alert.alert('Success', 'Card saved successfully');
      await refreshProfile();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Add Card</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
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
            <Text style={styles.cardNumberPreview}>
              {cardNumber || '•••• •••• •••• ••••'}
            </Text>
            <View style={styles.cardBottomRow}>
              <View>
                <Text style={styles.cardLabel}>VALID THRU</Text>
                <Text style={styles.cardExpiry}>{expiry || 'MM/YY'}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.l }}>
                <Text style={styles.cardLabel}>CARD HOLDER</Text>
                <Text style={styles.cardHolder} numberOfLines={1}>
                  {cardHolder || 'CARD HOLDER'}
                </Text>
              </View>
              <Text style={styles.visaText}>VISA</Text>
            </View>
          </LinearGradient>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Card Number</Text>
              <TextInput
                style={styles.input}
                value={cardNumber}
                onChangeText={handleCardNumberChange}
                keyboardType="numeric"
                maxLength={19}
                placeholder="0000 0000 0000 0000"
                placeholderTextColor={Colors.textLight}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.s }]}>
                <Text style={styles.inputLabel}>Expiry</Text>
                <TextInput
                  style={styles.input}
                  value={expiry}
                  onChangeText={handleExpiryChange}
                  keyboardType="numeric"
                  maxLength={5}
                  placeholder="MM/YY"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: Spacing.s }]}>
                <Text style={styles.inputLabel}>CVV</Text>
                <TextInput
                  style={styles.input}
                  value={cvv}
                  onChangeText={setCvv}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry={true}
                  placeholder="123"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Card Holder Name</Text>
              <TextInput
                style={styles.input}
                value={cardHolder}
                onChangeText={setCardHolder}
                autoCapitalize="characters"
                placeholder="JOHN DOE"
                placeholderTextColor={Colors.textLight}
              />
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveCard}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>Save Card</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  creditCard: {
    height: 160,
    borderRadius: Radius.l,
    padding: Spacing.m,
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
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
  cardNumberPreview: {
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
  formContainer: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: Spacing.l,
  },
  row: {
    flexDirection: 'row',
  },
  inputLabel: {
    fontSize: Typography.subtitle,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.m,
    padding: Spacing.m,
    fontSize: Typography.body,
    color: Colors.text,
  },
  saveButton: {
    backgroundColor: '#D9A200',
    padding: Spacing.l,
    borderRadius: Radius.m,
    alignItems: 'center',
    marginTop: Spacing.m,
    marginBottom: Spacing.xl,
  },
  saveButtonText: {
    fontSize: Typography.subtitle,
    color: Colors.white,
    fontWeight: 'bold',
  },
});
