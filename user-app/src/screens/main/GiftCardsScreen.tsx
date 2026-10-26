import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Clipboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { useRideStore } from "../../store/rideStore";
import { Colors, Spacing, Typography } from "../../theme";
import SectionHeader from "../../components/SectionHeader";

const GIFT_AMOUNTS = [25, 50, 100];

export default function GiftCardsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const giftCards = useRideStore((state) => state.giftCards) || [];
  const fetchGiftCards = useRideStore((state) => state.fetchGiftCards);
  const purchaseGiftCard = useRideStore((state) => state.purchaseGiftCard);
  
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    fetchGiftCards().finally(() => setLoading(false));
  }, []);

  const handlePurchase = async (amount: number) => {
    Alert.alert(
      "Confirm Purchase",
      `Buy a $${amount} Gift Card?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Buy",
          onPress: async () => {
            setPurchasing(true);
            try {
              await purchaseGiftCard(amount);
              Alert.alert("Success", "Gift card purchased successfully!");
            } catch (err) {
              Alert.alert("Error", "Could not purchase gift card");
            } finally {
              setPurchasing(false);
            }
          }
        }
      ]
    );
  };

  const handleCopy = (code: string) => {
    Clipboard.setString(code);
    Alert.alert("Copied", "Gift card code copied to clipboard!");
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gift Cards</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroCard}>
          <Ionicons name="gift" size={48} color={Colors.white} />
          <Text style={styles.heroTitle}>Golden Ride Gift Cards</Text>
          <Text style={styles.heroSub}>Give the gift of premium rides. Buy a gift card and share the code with friends and family.</Text>
        </View>

        <SectionHeader title="Buy a Gift Card" />
        <View style={styles.buyGrid}>
          {GIFT_AMOUNTS.map((amount) => (
            <TouchableOpacity 
              key={amount} 
              style={styles.amountBtn}
              onPress={() => handlePurchase(amount)}
              disabled={purchasing}
            >
              <Text style={styles.amountText}>${amount}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionHeader title="Your Purchased Cards" />
        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : giftCards.length > 0 ? (
          <View style={{ gap: 12 }}>
            {giftCards.map((gc: any) => (
              <View key={gc.id} style={styles.gcCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.gcAmount}>${gc.amount.toFixed(2)}</Text>
                  <Text style={styles.gcCode} selectable>{gc.code}</Text>
                  <Text style={[styles.gcStatus, { color: gc.is_redeemed ? Colors.textSecondary : "#10B981" }]}>
                    {gc.is_redeemed ? "Redeemed" : "Active"}
                  </Text>
                </View>
                {!gc.is_redeemed && (
                  <TouchableOpacity style={styles.copyBtn} onPress={() => handleCopy(gc.code)}>
                    <Ionicons name="copy-outline" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.empty}>You haven't purchased any gift cards yet.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { marginRight: 16 },
  headerTitle: { fontSize: Typography.heading, fontWeight: "900", color: Colors.textPrimary },
  scroll: { padding: Spacing.lg, gap: 20, paddingBottom: 40 },
  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  heroTitle: { color: Colors.white, fontSize: 22, fontWeight: "900" },
  heroSub: { color: "rgba(255,255,255,0.8)", fontSize: 14, textAlign: "center", lineHeight: 20 },
  buyGrid: { flexDirection: "row", gap: 12 },
  amountBtn: {
    flex: 1,
    backgroundColor: "#FFF3D9",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  amountText: { fontSize: 18, fontWeight: "900", color: Colors.primary },
  gcCard: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  gcAmount: { fontSize: 18, fontWeight: "800", color: Colors.textPrimary, marginBottom: 4 },
  gcCode: { fontSize: 14, fontFamily: "Menlo", color: Colors.textSecondary, marginBottom: 4 },
  gcStatus: { fontSize: 12, fontWeight: "700" },
  copyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF3D9",
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { color: Colors.textSecondary, textAlign: "center", marginTop: 20 },
});
