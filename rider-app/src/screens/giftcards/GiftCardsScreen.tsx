import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import api, { ENDPOINTS } from '../../api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface GiftCard {
  id: string;
  code: string;
  balance: number;
  expiry_date: string;
  is_active: boolean;
}

export default function GiftCardsScreen() {
  const navigation = useNavigation<any>();
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);

  const fetchGiftCards = async () => {
    try {
      setLoading(true);
      const response = await api.get(ENDPOINTS.GIFT_CARDS);
      setGiftCards(response.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchGiftCards();
    });
    return unsubscribe;
  }, [navigation]);

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return;
    try {
      setRedeemLoading(true);
      await api.post(ENDPOINTS.GIFT_CARD_REDEEM, { code: redeemCode });
      Alert.alert('Success', 'Gift card redeemed successfully!');
      setRedeemCode('');
      fetchGiftCards();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to redeem gift card');
    } finally {
      setRedeemLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gift Cards</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.sectionTitle}>My Gift Cards</Text>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
        ) : giftCards.length === 0 ? (
          <Text style={styles.emptyText}>🎁 No gift cards yet</Text>
        ) : (
          giftCards.map((card) => (
            <LinearGradient
              key={card.id}
              colors={card.is_active ? ['#F5B800', '#D9A200'] : ['#555', '#333']}
              style={styles.card}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>🎁 GOLDEN RIDE GIFT CARD</Text>
                <View style={[styles.badge, !card.is_active && styles.badgeExpired]}>
                  <Text style={styles.badgeText}>{card.is_active ? 'ACTIVE' : 'EXPIRED'}</Text>
                </View>
              </View>
              <Text style={styles.cardBalance}>${card.balance.toFixed(2)}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardCode}>**** {card.code.slice(-8)}</Text>
                <Text style={styles.cardExpiry}>Expires: {card.expiry_date}</Text>
              </View>
            </LinearGradient>
          ))
        )}

        <View style={styles.redeemSection}>
          <Text style={styles.sectionTitle}>Redeem a Gift Card</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="ENTER CODE"
              placeholderTextColor={Colors.textMuted}
              value={redeemCode}
              onChangeText={(text) => setRedeemCode(text.toUpperCase())}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.redeemButton} onPress={handleRedeem} disabled={redeemLoading}>
              {redeemLoading ? (
                <ActivityIndicator size="small" color={Colors.background} />
              ) : (
                <Text style={styles.redeemButtonText}>Redeem</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.buyButton} onPress={() => navigation.navigate('BuyGiftCard')}>
          <Text style={styles.buyButtonText}>Buy a Gift Card</Text>
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
  },
  contentContainer: {
    padding: Spacing.m,
  },
  sectionTitle: {
    fontSize: Typography.h4,
    color: Colors.text,
    marginBottom: Spacing.m,
  },
  loader: {
    marginVertical: Spacing.xl,
  },
  emptyText: {
    fontSize: Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    marginVertical: Spacing.xl,
  },
  card: {
    height: 140,
    borderRadius: Radius.m,
    padding: Spacing.m,
    marginBottom: Spacing.m,
    justifyContent: 'space-between',
    ...Shadow.m,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: Typography.subtitle,
    color: '#FFF',
    fontWeight: 'bold',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.s,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radius.s,
  },
  badgeExpired: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardBalance: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardCode: {
    fontSize: Typography.caption,
    color: '#FFF',
  },
  cardExpiry: {
    fontSize: Typography.caption,
    color: '#FFF',
  },
  redeemSection: {
    marginTop: Spacing.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 50,
    backgroundColor: Colors.surface,
    borderRadius: Radius.s,
    paddingHorizontal: Spacing.m,
    color: Colors.text,
    marginRight: Spacing.s,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  redeemButton: {
    backgroundColor: Colors.primary,
    height: 50,
    paddingHorizontal: Spacing.l,
    borderRadius: Radius.s,
    justifyContent: 'center',
    alignItems: 'center',
  },
  redeemButtonText: {
    fontSize: Typography.button,
    color: Colors.background,
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
});
