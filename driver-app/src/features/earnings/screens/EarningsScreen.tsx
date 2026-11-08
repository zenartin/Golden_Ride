import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, Typography } from "../../../theme";
import apiClient from "../../../api/axios";
import { API_ENDPOINTS } from "../../../api/endpoints";

interface WeeklyBar { day: string; amount: number; trips: number; }
interface BreakdownItem { label: string; amount: string; icon: string; color: string; }
interface Withdrawal {
  id: number;
  amount: number;
  status: string;
  method?: string;
  reference?: string | null;
  admin_note?: string | null;
  created_at: string;
}
interface EarningsData {
  weekly_total: string;
  statistics: WeeklyBar[];
  daily_breakdown: BreakdownItem[];
  available_balance: number;
  withdrawals: Withdrawal[];
}
interface PayoutAccount {
  account_holder_name: string;
  bank_name: string;
  routing_number: string;
  account_number_masked: string | null;
  complete: boolean;
}

const money = (v: number) => `$${(v || 0).toFixed(2)}`;

const STATUS: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: "Pending review", color: "#B45309", bg: "#FEF3C7", icon: "time-outline" },
  completed: { label: "Paid", color: "#047857", bg: "#D1FAE5", icon: "checkmark-circle-outline" },
  rejected: { label: "Rejected", color: "#B91C1C", bg: "#FEE2E2", icon: "close-circle-outline" },
  failed: { label: "Failed", color: "#B91C1C", bg: "#FEE2E2", icon: "alert-circle-outline" },
};

const formatDate = (iso: string) => {
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export default function EarningsScreen() {
  const [data, setData] = useState<EarningsData | null>(null);
  const [account, setAccount] = useState<PayoutAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<"daily" | "weekly">("weekly");

  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amountText, setAmountText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [showAccount, setShowAccount] = useState(false);
  const [holder, setHolder] = useState("");
  const [bank, setBank] = useState("");
  const [routing, setRouting] = useState("");
  const [number, setNumber] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const [earn, acct] = await Promise.all([
        apiClient.get(API_ENDPOINTS.DRIVER_EARNINGS),
        apiClient.get("/driver/payout-account").catch(() => ({ data: null })),
      ]);
      setData(earn.data);
      setAccount(acct.data);
    } catch (err) {
      setError("We couldn't load your earnings right now.");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Pick up the admin's decision on a withdrawal without leaving the screen
    const t = setInterval(() => load(true), 20000);
    return () => clearInterval(t);
  }, [load]);

  const balance = data?.available_balance ?? 0;
  const bars = data?.statistics ?? [];
  const maxBar = Math.max(...bars.map((b) => b.amount), 1);
  const weekTrips = bars.reduce((n, b) => n + b.trips, 0);
  const todayTrips = bars[bars.length - 1]?.trips ?? 0;
  const pendingTotal = (data?.withdrawals ?? []).filter((w) => w.status === "pending").reduce((n, w) => n + w.amount, 0);

  const openWithdraw = () => {
    if (!account?.complete) {
      openAccount();
      return;
    }
    if (balance < 1) {
      Alert.alert("Nothing to withdraw", "You need at least $1.00 available to request a withdrawal.");
      return;
    }
    setAmountText(balance.toFixed(2));
    setShowWithdraw(true);
  };

  const openAccount = () => {
    setHolder(account?.account_holder_name || "");
    setBank(account?.bank_name || "");
    setRouting(account?.routing_number || "");
    setNumber("");
    setShowAccount(true);
  };

  const saveAccount = async () => {
    setSavingAccount(true);
    try {
      const res = await apiClient.put("/driver/payout-account", {
        account_holder_name: holder,
        bank_name: bank,
        routing_number: routing,
        account_number: number,
      });
      setAccount(res.data);
      setShowAccount(false);
      Alert.alert("Bank account saved", "You can now request withdrawals to this account.");
    } catch (err: any) {
      Alert.alert("Could not save", err.response?.data?.detail || "Please check the details and try again.");
    } finally {
      setSavingAccount(false);
    }
  };

  const submitWithdraw = async () => {
    const amount = parseFloat(amountText);
    if (!amount || amount < 1) {
      Alert.alert("Enter an amount", "The minimum withdrawal is $1.00.");
      return;
    }
    if (amount > balance + 0.001) {
      Alert.alert("Too much", `You have ${money(balance)} available.`);
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("amount", amount.toFixed(2));
      await apiClient.post(API_ENDPOINTS.DRIVER_WITHDRAW, form, { headers: { "Content-Type": "multipart/form-data" } });
      setShowWithdraw(false);
      await load(true);
      Alert.alert("Request sent", "The Golden Ride team has been notified and will send the money to your bank account.");
    } catch (err: any) {
      Alert.alert("Could not send request", err.response?.data?.detail || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCashOut = async () => {
    try {
      const { data: status } = await apiClient.get("/driver/payout/status");
      if (!status.instant_available) {
        const { data: link } = await apiClient.post("/driver/payout/connect");
        if (link.url) {
          await Linking.openURL(link.url);
          return;
        }
      }
      if (balance <= 0) {
        Alert.alert("Nothing to cash out", "Your balance is $0.00.");
        return;
      }
      Alert.alert("Instant cash out", `Send ${money(balance)} to your debit card now?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Cash out",
          onPress: async () => {
            try {
              await apiClient.post("/driver/payout/instant", {});
              Alert.alert("Cash out sent", "Your money is on its way to your debit card.");
              await load(true);
            } catch (err: any) {
              Alert.alert("Cash out failed", err.response?.data?.detail || "Please try again.");
            }
          },
        },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.detail || "Could not start cash out.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
      >
        {error && (
          <TouchableOpacity style={styles.errorBanner} onPress={() => load()}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorAction}>Retry</Text>
          </TouchableOpacity>
        )}

        <View style={styles.titleRow}>
          <Text style={styles.title}>Earnings</Text>
          <View style={styles.segment}>
            {(["daily", "weekly"] as const).map((r) => (
              <TouchableOpacity key={r} style={[styles.segBtn, range === r && styles.segBtnOn]} onPress={() => setRange(r)}>
                <Text style={[styles.segText, range === r && styles.segTextOn]}>{r === "daily" ? "Today" : "This week"}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Balance */}
        <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available balance</Text>
          <Text style={styles.balanceAmount}>{money(balance)}</Text>
          <Text style={styles.balanceSub}>
            {range === "daily"
              ? `Today ${data?.daily_breakdown?.[1]?.amount ?? "$0.00"} · ${todayTrips} trip${todayTrips === 1 ? "" : "s"}`
              : `This week ${data?.weekly_total ?? "$0.00"} · ${weekTrips} trip${weekTrips === 1 ? "" : "s"}`}
          </Text>
          {pendingTotal > 0 && (
            <View style={styles.pendingPill}>
              <Ionicons name="time-outline" size={13} color="#fff" />
              <Text style={styles.pendingPillText}>{money(pendingTotal)} withdrawal pending</Text>
            </View>
          )}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.primaryAction} onPress={openWithdraw}>
              <Ionicons name="arrow-down-circle-outline" size={18} color={Colors.primaryDark} />
              <Text style={styles.primaryActionText}>Withdraw</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostAction} onPress={handleCashOut}>
              <Ionicons name="flash" size={16} color="#fff" />
              <Text style={styles.ghostActionText}>Instant cash out</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Payout account */}
        <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={openAccount}>
          <View style={styles.accountRow}>
            <View style={[styles.iconBubble, { backgroundColor: Colors.primary + "1A" }]}>
              <Ionicons name="business-outline" size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitleSmall}>Bank account for withdrawals</Text>
              {account?.complete ? (
                <Text style={styles.accountText}>{account.bank_name} · {account.account_number_masked}</Text>
              ) : (
                <Text style={[styles.accountText, { color: Colors.warning }]}>Add your bank details to withdraw</Text>
              )}
            </View>
            <Text style={styles.linkText}>{account?.complete ? "Edit" : "Add"}</Text>
          </View>
        </TouchableOpacity>

        {/* Chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Last 7 days</Text>
          <View style={styles.chart}>
            {bars.map((b, i) => (
              <View key={b.day + i} style={styles.barCol}>
                <Text style={styles.barAmount}>{b.amount > 0 ? `$${Math.round(b.amount)}` : ""}</Text>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, i === bars.length - 1 && styles.barToday, { height: `${Math.max((b.amount / maxBar) * 100, b.amount > 0 ? 6 : 0)}%` }]} />
                </View>
                <Text style={[styles.barDay, i === bars.length - 1 && styles.barDayToday]}>{b.day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Today */}
        {data?.daily_breakdown && data.daily_breakdown.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Today</Text>
            {data.daily_breakdown.map((item, i) => (
              <View key={item.label} style={[styles.row, i > 0 && styles.rowBorder]}>
                <View style={[styles.iconBubble, { backgroundColor: item.color + "1A" }]}>
                  <Ionicons name={item.icon as any} size={18} color={item.color} />
                </View>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={[styles.rowValue, { color: item.color }]}>{item.amount}</Text>
              </View>
            ))}
          </View>
        )}

        {/* History */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Withdrawal history</Text>
          {(data?.withdrawals ?? []).length === 0 ? (
            <Text style={styles.empty}>No withdrawals yet. Request one when you have a balance.</Text>
          ) : (
            data!.withdrawals.map((w, i) => {
              const s = STATUS[w.status] ?? STATUS.pending;
              return (
                <View key={w.id} style={[styles.historyRow, i > 0 && styles.rowBorder]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyAmount}>{money(w.amount)}</Text>
                    <Text style={styles.historyMeta}>
                      {formatDate(w.created_at)} · {w.method === "instant" ? "Instant" : "Bank transfer"}
                    </Text>
                    {w.status === "completed" && w.reference ? <Text style={styles.historyMeta}>Ref: {w.reference}</Text> : null}
                    {w.status === "rejected" && w.admin_note ? <Text style={[styles.historyMeta, { color: "#B91C1C" }]}>{w.admin_note}</Text> : null}
                  </View>
                  <View style={[styles.chip, { backgroundColor: s.bg }]}>
                    <Ionicons name={s.icon as any} size={13} color={s.color} />
                    <Text style={[styles.chipText, { color: s.color }]}>{s.label}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Withdraw modal */}
      <Modal visible={showWithdraw} transparent animationType="slide" onRequestClose={() => setShowWithdraw(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalWrap}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowWithdraw(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Withdraw money</Text>
              <TouchableOpacity onPress={() => setShowWithdraw(false)}><Ionicons name="close" size={24} color={Colors.textPrimary} /></TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>Amount (available {money(balance)})</Text>
            <View style={styles.amountBox}>
              <Text style={styles.amountPrefix}>$</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="decimal-pad"
                value={amountText}
                onChangeText={(t) => setAmountText(t.replace(/[^0-9.]/g, ""))}
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
              />
              <TouchableOpacity onPress={() => setAmountText(balance.toFixed(2))}>
                <Text style={styles.linkText}>Max</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.sendTo}>
              <Ionicons name="business-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.sendToText}>To {account?.bank_name} · {account?.account_number_masked}</Text>
            </View>
            <Text style={styles.note}>The Golden Ride team reviews every request and sends the money to this account by bank transfer. You can follow its status under Withdrawal history.</Text>
            <TouchableOpacity style={[styles.submit, submitting && { opacity: 0.6 }]} disabled={submitting} onPress={submitWithdraw}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Request withdrawal</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Bank account modal */}
      <Modal visible={showAccount} transparent animationType="slide" onRequestClose={() => setShowAccount(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalWrap}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowAccount(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Bank account</Text>
              <TouchableOpacity onPress={() => setShowAccount(false)}><Ionicons name="close" size={24} color={Colors.textPrimary} /></TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>Account holder name</Text>
            <TextInput style={styles.input} value={holder} onChangeText={setHolder} placeholder="Name on the account" placeholderTextColor={Colors.textMuted} autoCapitalize="words" />
            <Text style={styles.fieldLabel}>Bank name</Text>
            <TextInput style={styles.input} value={bank} onChangeText={setBank} placeholder="e.g. Chase" placeholderTextColor={Colors.textMuted} autoCapitalize="words" />
            <Text style={styles.fieldLabel}>Routing number (9 digits)</Text>
            <TextInput style={styles.input} value={routing} onChangeText={(t) => setRouting(t.replace(/\D/g, "").slice(0, 9))} keyboardType="number-pad" placeholder="021000021" placeholderTextColor={Colors.textMuted} />
            <Text style={styles.fieldLabel}>Account number</Text>
            <TextInput style={styles.input} value={number} onChangeText={(t) => setNumber(t.replace(/\D/g, "").slice(0, 17))} keyboardType="number-pad" secureTextEntry placeholder={account?.complete ? "Enter again to change" : "Account number"} placeholderTextColor={Colors.textMuted} />
            <TouchableOpacity style={[styles.submit, savingAccount && { opacity: 0.6 }]} disabled={savingAccount} onPress={saveAccount}>
              {savingAccount ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save bank account</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 110, gap: 14 },
  errorBanner: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#FEF2F2", borderColor: "#FECACA", borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 8 },
  errorText: { flex: 1, color: "#B91C1C", fontWeight: "600", fontSize: Typography.caption },
  errorAction: { color: Colors.primary, fontWeight: "700", marginLeft: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: Spacing.md },
  title: { fontSize: 26, fontWeight: "800", color: Colors.textPrimary },
  segment: { flexDirection: "row", backgroundColor: Colors.divider, borderRadius: 18, padding: 3 },
  segBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15 },
  segBtnOn: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  segText: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  segTextOn: { color: Colors.textPrimary },
  balanceCard: { borderRadius: 24, padding: Spacing.lg },
  balanceLabel: { color: "rgba(255,255,255,0.85)", fontSize: Typography.caption, fontWeight: "600" },
  balanceAmount: { color: "#fff", fontSize: 44, fontWeight: "800", marginTop: 2 },
  balanceSub: { color: "rgba(255,255,255,0.9)", fontSize: Typography.caption, marginTop: 2 },
  pendingPill: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", backgroundColor: "rgba(0,0,0,0.18)", borderRadius: 14, paddingVertical: 4, paddingHorizontal: 10, marginTop: 10 },
  pendingPillText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  primaryAction: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#fff", borderRadius: 16, paddingVertical: 13 },
  primaryActionText: { color: Colors.primaryDark, fontWeight: "800", fontSize: 15 },
  ghostAction: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderColor: "rgba(255,255,255,0.7)", borderWidth: 1.5, borderRadius: 16, paddingVertical: 12 },
  ghostActionText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  card: { backgroundColor: Colors.surface, borderRadius: 22, padding: Spacing.lg, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: Typography.body, fontWeight: "800", color: Colors.textPrimary, marginBottom: 10 },
  cardTitleSmall: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },
  accountRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  accountText: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  linkText: { color: Colors.primary, fontWeight: "700", fontSize: 14 },
  iconBubble: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  chart: { flexDirection: "row", gap: 8, height: 130, alignItems: "flex-end" },
  barCol: { flex: 1, alignItems: "center", gap: 4, height: "100%" },
  barAmount: { fontSize: 9, color: Colors.textMuted, height: 12 },
  barBg: { flex: 1, width: "100%", backgroundColor: Colors.divider, borderRadius: 8, justifyContent: "flex-end", overflow: "hidden" },
  barFill: { backgroundColor: Colors.border, width: "100%", borderRadius: 8 },
  barToday: { backgroundColor: Colors.primary },
  barDay: { fontSize: 11, color: Colors.textSecondary },
  barDayToday: { color: Colors.primary, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.divider },
  rowLabel: { flex: 1, fontSize: Typography.caption, color: Colors.textPrimary, fontWeight: "500" },
  rowValue: { fontSize: Typography.body, fontWeight: "700" },
  empty: { color: Colors.textSecondary, fontSize: Typography.caption, lineHeight: 20 },
  historyRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 10 },
  historyAmount: { fontSize: 17, fontWeight: "800", color: Colors.textPrimary },
  historyMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 14, paddingVertical: 5, paddingHorizontal: 9 },
  chipText: { fontSize: 12, fontWeight: "700" },
  modalWrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: Spacing.lg, paddingBottom: 34 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sheetTitle: { fontSize: 20, fontWeight: "800", color: Colors.textPrimary },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: Colors.textSecondary, marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: Colors.textPrimary, backgroundColor: Colors.background },
  amountBox: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingHorizontal: 14, backgroundColor: Colors.background },
  amountPrefix: { fontSize: 24, fontWeight: "800", color: Colors.textPrimary, marginRight: 4 },
  amountInput: { flex: 1, fontSize: 26, fontWeight: "800", color: Colors.textPrimary, paddingVertical: 12 },
  sendTo: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
  sendToText: { fontSize: 14, color: Colors.textPrimary, fontWeight: "600" },
  note: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18, marginTop: 10 },
  submit: { marginTop: 18, backgroundColor: Colors.primary, borderRadius: 16, alignItems: "center", justifyContent: "center", height: 54 },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
