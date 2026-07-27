import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, Typography } from "../../../theme";
import { useAppStore } from "../../../store/appStore";

const FAQ = [
  { q: "How are fares calculated?", a: "Fares are based on base rate + per km rate + surge multiplier when active." },
  { q: "When will I receive my payout?", a: "Payouts are processed daily and credited within 24 hours to your bank account." },
  { q: "How do I update my vehicle details?", a: "Go to Profile → My Vehicle and tap on Edit to update your vehicle information." },
  { q: "What happens if a rider cancels?", a: "If the rider cancels after you arrive, you receive a cancellation fee of ₹30-50." },
];

const CONTACT = [
  { icon: "call" as const, label: "Call Support", sub: "Mon–Sat 9 AM – 9 PM", color: Colors.success },
  { icon: "chatbubble-ellipses" as const, label: "Live Chat", sub: "Average response: 2 min", color: Colors.info },
  { icon: "mail" as const, label: "Email Us", sub: "support@goldenride.in", color: Colors.primary },
];

export default function SupportScreen({ navigation }: any) {
  const { submitSupportTicket } = useAppStore();
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  const handleQuickAction = async (label: string) => {
    const ticketId = await submitSupportTicket(
      label,
      `Issue: ${label}`,
      `Driver reported: ${label}`
    );
    if (ticketId) {
      Alert.alert("Ticket Created", `Your support ticket ${ticketId} has been submitted. Our team will contact you shortly.`);
    } else {
      Alert.alert("Error", "Failed to create support ticket.");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.heroCard}>
          <Ionicons name="headset" size={40} color={Colors.white} />
          <Text style={styles.heroTitle}>We're here to help</Text>
          <Text style={styles.heroSub}>Our team is available 7 days a week</Text>
        </LinearGradient>

        {/* Contact Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <View style={styles.contactGrid}>
            {CONTACT.map((c) => (
              <TouchableOpacity key={c.label} style={styles.contactCard} activeOpacity={0.8}>
                <View style={[styles.contactIcon, { backgroundColor: c.color + "18" }]}>
                  <Ionicons name={c.icon} size={24} color={c.color} />
                </View>
                <Text style={styles.contactLabel}>{c.label}</Text>
                <Text style={styles.contactSub}>{c.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.card}>
            {[
              { icon: "document-text-outline" as const, label: "Report a Trip Issue" },
              { icon: "car-outline" as const, label: "Report a Vehicle Problem" },
              { icon: "person-outline" as const, label: "Account Issues" },
              { icon: "cash-outline" as const, label: "Payment Dispute" },
            ].map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.actionRow, i > 0 && styles.rowBorder]}
                activeOpacity={0.7}
                onPress={() => handleQuickAction(item.label)}
              >
                <View style={styles.actionLeft}>
                  <View style={styles.actionIcon}>
                    <Ionicons name={item.icon} size={18} color={Colors.primary} />
                  </View>
                  <Text style={styles.actionLabel}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {FAQ.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.faqCard}
              onPress={() => setOpenFaq(openFaq === i ? null : i)}
              activeOpacity={0.8}
            >
              <View style={styles.faqTop}>
                <Text style={styles.faqQ} numberOfLines={openFaq === i ? undefined : 2}>{item.q}</Text>
                <Ionicons
                  name={openFaq === i ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={Colors.textSecondary}
                />
              </View>
              {openFaq === i && (
                <Text style={styles.faqA}>{item.a}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surface,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  pageTitle: { fontSize: Typography.subHeading, fontWeight: "800", color: Colors.textPrimary },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 40, gap: 20 },
  heroCard: { borderRadius: 24, padding: Spacing.xl, alignItems: "center", gap: 8 },
  heroTitle: { color: Colors.white, fontSize: Typography.subHeading, fontWeight: "800" },
  heroSub: { color: "rgba(255,255,255,0.8)", fontSize: Typography.caption },
  section: { gap: 12 },
  sectionTitle: {
    fontSize: Typography.caption, fontWeight: "700", color: Colors.textSecondary,
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  contactGrid: { flexDirection: "row", gap: 10 },
  contactCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 18, padding: Spacing.md,
    alignItems: "center", gap: 8,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  contactIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  contactLabel: { fontSize: Typography.caption, fontWeight: "700", color: Colors.textPrimary, textAlign: "center" },
  contactSub: { fontSize: 10, color: Colors.textSecondary, textAlign: "center" },
  card: {
    backgroundColor: Colors.surface, borderRadius: 18,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, overflow: "hidden",
  },
  actionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: Spacing.md },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.divider },
  actionLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  actionIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primaryLight, alignItems: "center", justifyContent: "center",
  },
  actionLabel: { fontSize: Typography.body, color: Colors.textPrimary, fontWeight: "500" },
  faqCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: Spacing.md,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  faqTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  faqQ: { flex: 1, fontSize: Typography.body, fontWeight: "600", color: Colors.textPrimary },
  faqA: { marginTop: Spacing.sm, fontSize: Typography.caption, color: Colors.textSecondary, lineHeight: 20 },
});
