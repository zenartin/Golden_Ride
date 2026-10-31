import React, { useEffect, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest } from "../../api/client";
import AppButton from "../../components/AppButton";
import { Colors, Spacing, Typography } from "../../theme";

type Faq = { question: string; answer: string };
type Ticket = { id: number; subject: string; status: string; created_at: string };

export default function HelpScreen({ navigation }: any) {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const loadTickets = () => apiRequest<Ticket[]>("/rider/support/tickets").then(setTickets).catch(() => undefined);

  useEffect(() => {
    apiRequest<Faq[]>("/rider/support/faqs").then(setFaqs).catch(() => undefined);
    loadTickets();
  }, []);

  const submit = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert("Missing details", "Please enter a subject and a message.");
      return;
    }
    setSending(true);
    try {
      await apiRequest("/rider/support/ticket", { method: "POST", body: { subject, message } });
      setSubject("");
      setMessage("");
      await loadTickets();
      Alert.alert("Ticket submitted", "Our team will get back to you.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not submit your ticket.");
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Help Center</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>Frequently asked questions</Text>
        {faqs.map((f, i) => (
          <TouchableOpacity key={f.question} style={styles.card} onPress={() => setOpen(open === i ? null : i)}>
            <View style={styles.faqRow}>
              <Text style={styles.question}>{f.question}</Text>
              <Ionicons name={open === i ? "chevron-up" : "chevron-down"} size={18} color={Colors.textSecondary} />
            </View>
            {open === i && <Text style={styles.answer}>{f.answer}</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.section}>Chat with support</Text>
        <TouchableOpacity
          style={styles.card}
          onPress={() => Linking.openURL("mailto:support@golden-ride.com")}
        >
          <Text style={styles.question}>Email support@golden-ride.com</Text>
        </TouchableOpacity>
        <Text style={styles.note}>During a trip, use the chat button on the trip screen to reach your driver.</Text>

        <Text style={styles.section}>Submit a ticket</Text>
        <TextInput style={styles.input} placeholder="Subject" placeholderTextColor={Colors.textSecondary} value={subject} onChangeText={setSubject} />
        <TextInput style={[styles.input, { height: 100 }]} placeholder="How can we help?" placeholderTextColor={Colors.textSecondary} value={message} onChangeText={setMessage} multiline />
        <AppButton title={sending ? "Submitting..." : "Submit Ticket"} onPress={submit} disabled={sending} />

        {tickets.length > 0 && <Text style={styles.section}>Your tickets</Text>}
        {tickets.map((t) => (
          <View key={t.id} style={[styles.card, styles.faqRow]}>
            <Text style={styles.question}>{t.subject}</Text>
            <Text style={[styles.status, t.status === "resolved" && { color: Colors.success }]}>{t.status}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.md },
  title: { fontSize: Typography.subHeading, fontWeight: "800", color: Colors.textPrimary },
  scroll: { padding: Spacing.md, gap: 10, paddingBottom: 40 },
  section: { fontWeight: "800", color: Colors.textPrimary, marginTop: 12 },
  card: { backgroundColor: Colors.surface, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: Colors.border },
  faqRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  question: { flex: 1, fontWeight: "700", color: Colors.textPrimary },
  answer: { color: Colors.textSecondary, marginTop: 8, lineHeight: 20 },
  note: { color: Colors.textSecondary, fontSize: Typography.small },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, color: Colors.textPrimary },
  status: { color: Colors.primary, fontWeight: "700", textTransform: "capitalize" },
});
