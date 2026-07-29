import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, Typography } from "../../theme";
import { useAuthStore } from "../../store/authStore";
import AppButton from "../../components/AppButton";

export default function PaymentMethodsScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const updateCard = useAuthStore((s) => s.updateCard);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (user) {
      setCardNumber(user.card_number || "");
      setCardExpiry(user.card_expiry || "");
      setCardCvv(user.card_cvv || "");
      setCardHolder(user.card_holder || "");
    }
  }, [user]);

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    const match = cleaned.match(/.{1,4}/g);
    return match ? match.join(" ") : cleaned;
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  const handleSave = async () => {
    if (!cardNumber || !cardExpiry || !cardCvv || !cardHolder) {
      Alert.alert("Error", "Please fill in all card details.");
      return;
    }
    if (cardNumber.replace(/\s/g, "").length !== 16) {
      Alert.alert("Invalid Card Number", "Card number must contain 16 digits.");
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
      Alert.alert("Invalid Expiry", "Expiry must be in MM/YY format.");
      return;
    }
    if (cardCvv.length < 3) {
      Alert.alert("Invalid CVV", "CVV must be 3 or 4 digits.");
      return;
    }

    setSaving(true);
    const success = await updateCard({
      card_number: cardNumber,
      card_expiry: cardExpiry,
      card_cvv: cardCvv,
      card_holder: cardHolder,
    });
    setSaving(false);

    if (success) {
      Alert.alert("Success", "Credit/Debit Card details updated successfully.");
      navigation.goBack();
    } else {
      Alert.alert("Error", "Failed to update card details. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Card Details</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Metal Card Preview */}
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
              {cardNumber || "•••• •••• •••• ••••"}
            </Text>

            <View style={styles.cardPreviewBottom}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardPreviewLabel}>CARD HOLDER</Text>
                <Text style={styles.cardPreviewVal} numberOfLines={1}>
                  {cardHolder.toUpperCase() || "NAME SURNAME"}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", marginLeft: 10 }}>
                <Text style={styles.cardPreviewLabel}>EXPIRES</Text>
                <Text style={styles.cardPreviewVal}>
                  {cardExpiry || "MM/YY"}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cardholder Name</Text>
              <TextInput
                style={styles.input}
                value={cardHolder}
                onChangeText={setCardHolder}
                placeholder="e.g. JOHN DOE"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Card Number</Text>
              <TextInput
                style={styles.input}
                value={cardNumber}
                onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                placeholder="0000 0000 0000 0000"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
                maxLength={19}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Expiry Date</Text>
                <TextInput
                  style={styles.input}
                  value={cardExpiry}
                  onChangeText={(t) => setCardExpiry(formatExpiry(t))}
                  placeholder="MM/YY"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>CVV Code</Text>
                <TextInput
                  style={styles.input}
                  value={cardCvv}
                  onChangeText={(t) => setCardCvv(t.replace(/\D/g, ""))}
                  placeholder="123"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
              </View>
            </View>

            <AppButton
              title="Save Card Details"
              onPress={handleSave}
              loading={saving}
              style={styles.saveButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: Colors.textPrimary },
  scroll: {
    padding: Spacing.lg,
    gap: 20,
  },
  cardPreview: {
    borderRadius: 24,
    padding: 24,
    height: 200,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cardPreviewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardPreviewLogo: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 2,
  },
  cardPreviewNumber: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: 2.5,
    textAlign: "center",
    marginVertical: 10,
  },
  cardPreviewBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  cardPreviewLabel: {
    color: "#A5B4FC",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardPreviewVal: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  form: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  saveButton: {
    marginTop: 10,
    backgroundColor: "#6366F1",
  },
});
