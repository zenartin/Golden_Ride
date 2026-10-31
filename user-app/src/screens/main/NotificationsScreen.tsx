import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest } from "../../api/client";
import { Colors, Spacing, Typography } from "../../theme";

type Item = { id: number; category: string; title: string; body: string; ride_id?: number; is_read: boolean; created_at: string };
const FILTERS = [["all", "All"], ["trip", "Trips"], ["promo", "Promos"], ["system", "System"]] as const;

export default function NotificationsScreen({ navigation }: any) {
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await apiRequest<Item[]>("/rider/notifications"));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = async (item: Item) => {
    setItems((all) => all.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)));
    apiRequest(`/rider/notifications/${item.id}/read`, { method: "POST" }).catch(() => undefined);
    if (item.ride_id) navigation.navigate("TripDetail", { tripId: String(item.ride_id) });
  };

  const readAll = async () => {
    setItems((all) => all.map((n) => ({ ...n, is_read: true })));
    apiRequest("/rider/notifications/read-all", { method: "POST" }).catch(() => undefined);
  };

  const shown = filter === "all" ? items : items.filter((n) => n.category === filter);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity onPress={readAll}><Text style={styles.readAll}>Read all</Text></TouchableOpacity>
      </View>
      <View style={styles.filters}>
        {FILTERS.map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.chip, filter === key && styles.chipOn]} onPress={() => setFilter(key)}>
            <Text style={[styles.chipText, filter === key && styles.chipTextOn]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={shown}
        keyExtractor={(n) => String(n.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={{ padding: Spacing.md, gap: 10 }}
        ListEmptyComponent={loading ? null : <Text style={styles.empty}>You have no notifications yet.</Text>}
        renderItem={({ item }) => (
          <Pressable style={[styles.row, !item.is_read && styles.unread]} onPress={() => open(item)}>
            {!item.is_read && <View style={styles.dot} />}
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowBody}>{item.body}</Text>
              <Text style={styles.rowDate}>{new Date(item.created_at).toLocaleString()}</Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.md },
  title: { fontSize: Typography.subHeading, fontWeight: "800", color: Colors.textPrimary },
  readAll: { color: Colors.primary, fontWeight: "700" },
  filters: { flexDirection: "row", gap: 8, paddingHorizontal: Spacing.md },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.textSecondary, fontWeight: "600" },
  chipTextOn: { color: Colors.white },
  row: { flexDirection: "row", gap: 10, backgroundColor: Colors.surface, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: Colors.border },
  unread: { borderColor: Colors.primary },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 6 },
  rowTitle: { fontWeight: "800", color: Colors.textPrimary },
  rowBody: { color: Colors.textSecondary, marginTop: 2 },
  rowDate: { color: Colors.textSecondary, fontSize: Typography.caption, marginTop: 4 },
  empty: { textAlign: "center", color: Colors.textSecondary, marginTop: 40 },
});
