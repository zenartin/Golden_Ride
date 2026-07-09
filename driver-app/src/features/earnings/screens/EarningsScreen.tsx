import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, Typography } from "../../../theme";
import apiClient from "../../../api/axios";
import { API_ENDPOINTS } from "../../../api/endpoints";

interface WeeklyBar { day: string; amount: number; trips: number; }
interface BreakdownItem { label: string; amount: string; icon: string; color: string; }
interface PaymentRow { label: string; value: string; bold?: boolean; color?: string; }
interface EarningsData {
  weekly_total: string;
  statistics: WeeklyBar[];
  daily_breakdown: BreakdownItem[];
  payment_summary: PaymentRow[];
  available_balance: number;
}

const formatAmount = (value: number) => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `Rs ${Math.round(value)}`;
  }
};

export default function EarningsScreen() {
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const response = await apiClient.get(API_ENDPOINTS.DRIVER_EARNINGS);
      setData(response.data);
    } catch (err) {
      console.log("Fetch earnings error:", err);
      setError("We couldn't load earnings right now.");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const handleSettle = async () => {
    if (!data) return;
    const amount = data.available_balance;
    if (!amount || amount === 0) {
      Alert.alert("All Settled", "Your balance is fully settled.");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("amount", String(amount));
      await apiClient.post(API_ENDPOINTS.DRIVER_WITHDRAW, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      Alert.alert("Success", "Settlement request submitted successfully!");
      await fetchEarnings(true);
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.detail || "Settlement failed");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const statistics = data?.statistics ?? [];
  const maxBar = Math.max(...statistics.map((b) => b.amount), 1);
  const withdrawableAmount = data?.available_balance ?? 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchEarnings()}>
            <Text style={styles.errorAction}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Earnings</Text>
          <TouchableOpacity style={styles.withdrawBtn} onPress={handleSettle}>
            <Ionicons name="cash-outline" size={16} color={Colors.white} />
            <Text style={styles.withdrawText}>Settle Balance</Text>
          </TouchableOpacity>
        </View>

        {/* Total Card */}
        <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total This Week</Text>
          <Text style={styles.totalAmount}>{data?.weekly_total ?? formatAmount(0)}</Text>
          <View style={styles.totalRow}>
            <View style={styles.totalStat}>
              <Ionicons name="car-sport-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.totalStatText}>
                {statistics.reduce((acc, b) => acc + b.trips, 0)} Trips
              </Text>
            </View>
            <View style={styles.totalStat}>
              <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.totalStatText}>Live Data</Text>
            </View>
            <View style={styles.totalStat}>
              <Ionicons name="star-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.totalStatText}>4.9 Avg</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Bar Chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily Breakdown</Text>
          <View style={styles.chart}>
            {statistics.map((bar) => {
              const heightPct = (bar.amount / maxBar) * 100;
              const currentDayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];
              const isToday = bar.day === currentDayName;
              return (
                <View key={bar.day} style={styles.barCol}>
                  <Text style={styles.barAmount}>{formatAmount(bar.amount)}</Text>
                  <View style={styles.barBg}>
                    <View
                      style={[
                        styles.barFill,
                        { height: `${heightPct}%` as any },
                        isToday && styles.barToday,
                      ]}
                    />
                  </View>
                  <Text style={[styles.barDay, isToday && styles.barDayToday]}>{bar.day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Today's Breakdown */}
        {data?.daily_breakdown && data.daily_breakdown.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Today's Breakdown</Text>
              <Text style={styles.cardSub}>{statistics[statistics.length - 1]?.trips ?? 0} trips</Text>
            </View>
            {data.daily_breakdown.map((item) => (
              <View key={item.label} style={styles.breakdownRow}>
                <View style={[styles.breakdownIcon, { backgroundColor: item.color + "18" }]}>
                  <Ionicons name={item.icon as any} size={18} color={item.color} />
                </View>
                <Text style={styles.breakdownLabel}>{item.label}</Text>
                <Text style={[styles.breakdownAmount, { color: item.color }]}>{item.amount}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Payment Summary */}
        {data?.payment_summary && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment Summary</Text>
            {data.payment_summary.map((row) => (
              <View key={row.label} style={styles.payRow}>
                <Text style={[styles.payLabel, row.bold && { fontWeight: "700", color: Colors.textPrimary }]}>
                  {row.label}
                </Text>
                <Text style={[styles.payValue, row.bold && { fontWeight: "800" }, row.color ? { color: row.color } : null]}>
                  {row.value}
                </Text>
              </View>
            ))}
            <TouchableOpacity style={styles.withdrawFullBtn} onPress={handleSettle}>
              <Text style={styles.withdrawFullText}>
                Settle Balance {formatAmount(Math.abs(withdrawableAmount))}
              </Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centerLoader: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  errorText: { flex: 1, color: "#B91C1C", fontSize: Typography.caption, fontWeight: "600" },
  errorAction: { color: Colors.primary, fontWeight: "700", marginLeft: 12 },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: 16 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  pageTitle: { fontSize: Typography.heading, fontWeight: "800", color: Colors.textPrimary },
  withdrawBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.primary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
  },
  withdrawText: { color: Colors.white, fontSize: Typography.caption, fontWeight: "700" },
  totalCard: { borderRadius: 24, padding: Spacing.lg },
  totalLabel: { color: "rgba(255,255,255,0.8)", fontSize: Typography.caption, fontWeight: "600" },
  totalAmount: { color: Colors.white, fontSize: 40, fontWeight: "800", marginVertical: 4 },
  totalRow: { flexDirection: "row", gap: 20, marginTop: 8 },
  totalStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  totalStatText: { color: "rgba(255,255,255,0.9)", fontSize: Typography.caption },
  card: {
    backgroundColor: Colors.surface, borderRadius: 24, padding: Spacing.lg,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.md },
  cardTitle: { fontSize: Typography.body, fontWeight: "700", color: Colors.textPrimary, marginBottom: Spacing.md },
  cardSub: { color: Colors.textSecondary, fontSize: Typography.caption },
  chart: { flexDirection: "row", gap: 8, height: 140, alignItems: "flex-end" },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  barAmount: { fontSize: 9, color: Colors.textMuted, textAlign: "center" },
  barBg: { flex: 1, width: "100%", backgroundColor: Colors.divider, borderRadius: 6, justifyContent: "flex-end" },
  barFill: { backgroundColor: Colors.border, borderRadius: 6, width: "100%" },
  barToday: { backgroundColor: Colors.primary },
  barDay: { fontSize: Typography.small, color: Colors.textSecondary },
  barDayToday: { color: Colors.primary, fontWeight: "700" },
  breakdownRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.divider,
  },
  breakdownIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  breakdownLabel: { flex: 1, fontSize: Typography.body, color: Colors.textPrimary, fontWeight: "500" },
  breakdownAmount: { fontSize: Typography.body, fontWeight: "700" },
  payRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.divider,
  },
  payLabel: { fontSize: Typography.caption, color: Colors.textSecondary },
  payValue: { fontSize: Typography.caption, color: Colors.textPrimary },
  withdrawFullBtn: {
    marginTop: Spacing.md, height: 52, backgroundColor: Colors.success, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  withdrawFullText: { color: Colors.white, fontWeight: "700", fontSize: Typography.body },
});
