import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, Typography } from "../../theme";
import { useAuthStore } from "../../store/authStore";
import { apiRequest } from "../../api/client";
import AppButton from "../../components/AppButton";
import { CardField, useStripe } from "../../utils/stripeWrapper";

export default function PaymentMethodsScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const { confirmSetupIntent } = useStripe();

  const [complete, setComplete] = useState(false);
  const [saving, setSaving] = useState(false);

  const [cards, setCards] = useState<SavedCard[]>([]);
  const loadCards = () => apiRequest<SavedCard[]>("/user/cards").then(setCards).catch(() => undefined);

  useEffect(() => {
    fetchProfile();
    loadCards();
  }, []);

  const makeDefault = async (card: SavedCard) => {
    try {
      await apiRequest(`/user/cards/${card.id}/default`, { method: "POST" });
      await Promise.all([fetchProfile(), loadCards()]);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not change your default card.");
    }
  };

  const removeCard = (card: SavedCard) => {
    Alert.alert("Remove card?", `Remove the card ending in ${card.last4}?`, [
      { text: "Keep", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await apiRequest(`/user/cards/${card.id}`, { method: "DELETE" });
            await Promise.all([fetchProfile(), loadCards()]);
          } catch (e: any) {
            Alert.alert("Error", e?.message || "Could not remove this card.");
          }
        },
      },
    ]);
  };

  const handleSave = async () => {
    if (!complete) {
      Alert.alert("Card incomplete", "Please enter your full card number, expiry and CVC.");
      return;
    }
    setSaving(true);
    try {
      const setup = await apiRequest<{ client_secret: string | null; mock?: boolean }>(
        "/user/card/setup-intent",
        { method: "POST" }
      );
      if (!setup.client_secret) {
        throw new Error("Card payments are not available right now.");
      }
      const { setupIntent, error } = await confirmSetupIntent(setup.client_secret, {
        paymentMethodType: "Card",
      });
      if (error) throw new Error(error.message);
      const pmId = setupIntent?.paymentMethodId;
      if (!pmId) throw new Error("Card could not be verified.");
      await apiRequest("/user/card/save", { method: "POST", body: { payment_method_id: pmId } });
      await Promise.all([fetchProfile(), loadCards()]);
      Alert.alert("Success", "Your card was saved securely.");
      if (navigation.canGoBack()) navigation.goBack();
      else (navigation as any).navigate("Shell");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save card. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const savedLast4 = (user as any)?.card_last4;
  const savedBrand = ((user as any)?.card_brand || "card").toUpperCase();

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() && navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Card Details</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <LinearGradient
          colors={["#1E1B4B", "#311042", "#4C1D95"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardPreview}
        >
          <View style={styles.cardPreviewTop}>
            <Text style={styles.cardPreviewLogo}>GOLDEN RIDE</Text>
            <Ionicons name="card" size={28} color="gold" style={{ opacity: 0.8 }} />
          </View>
          <Text style={styles.cardPreviewNumber}>
            {savedLast4 ? `•••• •••• •••• ${savedLast4}` : "•••• •••• •••• ••••"}
          </Text>
          <Text style={styles.cardPreviewVal}>{savedLast4 ? savedBrand : "NO CARD SAVED"}</Text>
        </LinearGradient>

        <Text style={styles.info}>
          {savedLast4
            ? "Add another card below, or choose which saved card to use."
            : "Add a credit or debit card. Your fare is charged to this card automatically."}
        </Text>

        {cards.map((card) => (
          <View key={card.id} style={styles.savedRow}>
            <Ionicons name="card-outline" size={22} color={Colors.primary} />
            <Text style={styles.savedText}>{(card.brand || "card").toUpperCase()} •••• {card.last4}</Text>
            {card.is_default ? (
              <Text style={styles.defaultTag}>Default</Text>
            ) : (
              <TouchableOpacity onPress={() => makeDefault(card)}><Text style={styles.makeDefault}>Set default</Text></TouchableOpacity>
            )}
            <TouchableOpacity accessibilityLabel={`Remove card ending in ${card.last4}`} onPress={() => removeCard(card)}>
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.form}>
          <Text style={styles.label}>{savedLast4 ? "Add a card" : "Card"}</Text>
          <CardField
            postalCodeEnabled={false}
            placeholders={{ number: "4242 4242 4242 4242" }}
            cardStyle={{ backgroundColor: "#FFFFFF", textColor: "#111827", borderRadius: 12 }}
            style={{ width: "100%", height: 52, marginVertical: 8 }}
            onCardChange={(d: any) => setComplete(!!d?.complete)}
          />
          <Text style={styles.secure}>
            <Ionicons name="lock-closed" size={12} /> Secured by Stripe. Card details never touch our servers.
          </Text>
          <AppButton title={saving ? "Saving..." : "Save Card"} onPress={handleSave} disabled={saving} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type SavedCard = { id: number; brand?: string; last4?: string; is_default: boolean };

const styles = StyleSheet.create({
  savedRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.surface, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 8 },
  savedText: { flex: 1, fontWeight: "700", color: Colors.textPrimary },
  defaultTag: { color: Colors.success, fontWeight: "700" },
  makeDefault: { color: Colors.primary, fontWeight: "700" },
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === "android" ? 40 : 8,
    paddingBottom: Spacing.sm,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: Typography.subHeading, fontWeight: "700", color: Colors.textPrimary },
  scroll: { padding: Spacing.md },
  cardPreview: { borderRadius: 20, padding: 22, minHeight: 170, justifyContent: "space-between" },
  cardPreviewTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardPreviewLogo: { color: "gold", fontWeight: "800", letterSpacing: 2 },
  cardPreviewNumber: { color: "#fff", fontSize: 22, letterSpacing: 2, fontWeight: "600" },
  cardPreviewVal: { color: "rgba(255,255,255,0.85)", fontWeight: "600" },
  info: { color: Colors.textSecondary, marginTop: Spacing.md, lineHeight: 20 },
  form: { marginTop: Spacing.md },
  label: { color: Colors.textSecondary, marginBottom: 4, fontWeight: "600" },
  secure: { color: Colors.textSecondary, fontSize: 12, marginBottom: Spacing.md },
});
