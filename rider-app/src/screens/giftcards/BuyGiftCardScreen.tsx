import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Share } from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import api, { ENDPOINTS } from '../../api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const AMOUNTS = [10, 25, 50, 100];

export default function BuyGiftCardScreen() {
  const navigation = useNavigation<any>();
  const [selectedAmount, setSelectedAmount] = useState<number>(AMOUNTS[1]);
  const [isGift, setIsGift] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [purchasedCode, setPurchasedCode] = useState<string | null>(null);

  const handlePurchase = async () => {
    try {
      setLoading(true);
      const payload: any = { amount: selectedAmount };
      if (isGift) {
        if (!email) return; // Simple validation
        payload.recipient_email = email;
      }
      const response = await api.post(ENDPOINTS.GIFT_CARD_PURCHASE, payload);
      setPurchasedCode(response.data?.code || 'ERROR_CODE');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (purchasedCode) {
      try {
        await Share.share({ message: purchasedCode });
      } catch (error) {
        console.error(error);
      }
    }
  };

  if (purchasedCode) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Gift Card Purchased!</Text>
          <LinearGradient colors={['#F5B800', '#D9A200']} style={styles.successCard}>
            <Text style={styles.cardValue}>${selectedAmount.toFixed(2)} Value</Text>
            <Text style={styles.cardCode}>{purchasedCode}</Text>
          </LinearGradient>
          <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
            <Text style={styles.copyButtonText}>Copy Code</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.footer}>
          <TouchableOpacity style={styles.buyButton} onPress={() => navigation.goBack()}>
            <Text style={styles.buyButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buy Gift Card</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Select Amount</Text>
        <View style={styles.grid}>
          {AMOUNTS.map((amount) => (
            <TouchableOpacity
              key={amount}
              style={[styles.amountButton, selectedAmount !== amount && styles.amountButtonUnselected]}
              onPress={() => setSelectedAmount(amount)}
            >
              {selectedAmount === amount ? (
                <LinearGradient colors={['#F5B800', '#D9A200']} style={styles.amountGradient}>
                  <Text style={styles.amountTextSelected}>${amount}</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.amountTextUnselected}>${amount}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Recipient</Text>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, !isGift && styles.tabActive]}
            onPress={() => setIsGift(false)}
          >
            <Text style={[styles.tabText, !isGift && styles.tabTextActive]}>For Myself</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, isGift && styles.tabActive]}
            onPress={() => setIsGift(true)}
          >
            <Text style={[styles.tabText, isGift && styles.tabTextActive]}>Gift Someone</Text>
          </TouchableOpacity>
        </View>

        {isGift && (
          <TextInput
            style={styles.input}
            placeholder="Recipient Email"
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.buyButton}
          onPress={handlePurchase}
          disabled={loading || (isGift && !email)}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.background} />
          ) : (
            <Text style={styles.buyButtonText}>Purchase ${selectedAmount}</Text>
          )}
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.h3,
    color: Colors.text,
  },
  content: {
    flex: 1,
    padding: Spacing.m,
  },
  sectionTitle: {
    fontSize: Typography.h4,
    color: Colors.text,
    marginBottom: Spacing.m,
    marginTop: Spacing.m,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  amountButton: {
    width: '48%',
    height: 100,
    marginBottom: Spacing.m,
    borderRadius: Radius.m,
    overflow: 'hidden',
    ...Shadow.s,
  },
  amountButtonUnselected: {
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  amountGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountTextSelected: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.background,
  },
  amountTextUnselected: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.s,
    marginBottom: Spacing.m,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.s,
    alignItems: 'center',
    borderRadius: Radius.s,
  },
  tabActive: {
    backgroundColor: Colors.border,
  },
  tabText: {
    fontSize: Typography.body,
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.text,
    fontWeight: 'bold',
  },
  input: {
    height: 50,
    backgroundColor: Colors.surface,
    borderRadius: Radius.s,
    paddingHorizontal: Spacing.m,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  footer: {
    padding: Spacing.m,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  buyButton: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: Radius.m,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyButtonText: {
    fontSize: Typography.button,
    color: Colors.background,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  successIcon: {
    fontSize: 60,
    marginBottom: Spacing.m,
  },
  successTitle: {
    fontSize: Typography.h2,
    color: Colors.text,
    marginBottom: Spacing.xl,
  },
  successCard: {
    width: '100%',
    height: 160,
    borderRadius: Radius.m,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.l,
    marginBottom: Spacing.xl,
    ...Shadow.m,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.background,
    marginBottom: Spacing.m,
  },
  cardCode: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.background,
    letterSpacing: 2,
  },
  copyButton: {
    paddingVertical: Spacing.s,
    paddingHorizontal: Spacing.l,
    backgroundColor: Colors.surface,
    borderRadius: Radius.s,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  copyButtonText: {
    fontSize: Typography.button,
    color: Colors.text,
  },
});
