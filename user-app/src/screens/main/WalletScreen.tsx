import React, { useEffect, useMemo } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import SectionHeader from "../../components/SectionHeader";
import { useRideStore } from "../../store/rideStore";
import { Colors, Spacing, Typography } from "../../theme";

const topUps = [200, 500, 1000];

export default function WalletScreen() {
  const balance = useRideStore((state) => state.walletBalance);
  const transactions = useRideStore((state) => state.transactions);
  const topUpWallet = useRideStore((state) => state.topUpWallet);
  const refreshWallet = useRideStore((state) => state.refreshWallet);

  useEffect(() => {
    refreshWallet().catch(() => undefined);
  }, [refreshWallet]);

  const recent = useMemo(() => transactions.slice(0, 5), [transactions]);

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.balanceCard}>
        <Text style={styles.kicker}>Wallet balance</Text>
        <Text style={styles.balance}>Rs. {balance}</Text>
        <Text style={styles.note}>Use wallet for instant ride payments.</Text>
      </View>

      <View style={styles.card}>
        <SectionHeader title="Quick top up" />
        <View style={styles.topUpRow}>
          {topUps.map((amount) => (
            <Pressable key={amount} style={styles.topUpButton} onPress={() => topUpWallet(amount)}>
              <Text style={styles.topUpText}>+Rs. {amount}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <SectionHeader title="Transactions" />
        <View style={{ gap: 10 }}>
          {recent.map((tx) => (
            <View key={tx.id} style={styles.txRow}>
              <View style={styles.txIcon}>
                <Ionicons name={tx.type === "credit" ? "add-circle-outline" : "remove-circle-outline"} size={18} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.txTitle}>{tx.title}</Text>
                <Text style={styles.txMeta}>{tx.date.slice(0, 10)}</Text>
              </View>
              <Text style={styles.txAmount}>{tx.type === "credit" ? "+" : "-"}Rs. {tx.amount}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: Spacing.lg,
    gap: 8,
  },
  kicker: { color: Colors.white, fontSize: Typography.caption, fontWeight: "800", textTransform: "uppercase" },
  balance: { color: Colors.white, fontSize: Typography.hero, fontWeight: "900" },
  note: { color: "#FFF6E5", fontSize: Typography.body },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  topUpRow: { flexDirection: "row", gap: 10 },
  topUpButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF3D9",
  },
  topUpText: { color: Colors.textPrimary, fontSize: Typography.body, fontWeight: "800" },
  txRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#FFF3D9",
    alignItems: "center",
    justifyContent: "center",
  },
  txTitle: { color: Colors.textPrimary, fontSize: Typography.body, fontWeight: "700" },
  txMeta: { color: Colors.textSecondary, fontSize: Typography.small },
  txAmount: { color: Colors.textPrimary, fontSize: Typography.body, fontWeight: "800" },
});
