import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  TextInput,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Typography } from "../../../theme";
import { useAppStore } from "../../../store/appStore";
import { useRideStore } from "../../../store/rideStore";

export default function MessagesScreen({ navigation }: any) {
  const { supportMessages, fetchSupportMessages } = useAppStore();
  const { activeRide, fetchActiveRide } = useRideStore();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = async () => {
    try {
      await Promise.all([
        fetchSupportMessages(),
        fetchActiveRide()
      ]);
    } catch (err) {
      console.log("Load messages error:", err);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  // Build conversations list dynamically
  const conversations = [
    {
      id: "support",
      name: "Support Team",
      initials: "GR",
      lastMsg: supportMessages.length > 0
        ? supportMessages[supportMessages.length - 1].content
        : "How can we help you today?",
      time: supportMessages.length > 0
        ? supportMessages[supportMessages.length - 1].created_at?.slice(11, 16) ?? ""
        : "Now",
      unread: 0,
      online: true,
      avatarColor: Colors.primary,
      isSupport: true,
      rideId: undefined,
    },
  ];

  if (activeRide) {
    const initials = activeRide.rider_name
      ? activeRide.rider_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
      : "R";
    conversations.unshift({
      id: String(activeRide.id),
      name: activeRide.rider_name || "Rider Chat",
      initials: initials,
      lastMsg: "Tap to chat about this trip",
      time: activeRide.created_at ? activeRide.created_at.slice(11, 16) : "Now",
      unread: 0,
      online: true,
      avatarColor: Colors.info,
      isSupport: false,
      rideId: activeRide.id,
    });
  }

  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Messages</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="create-outline" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              navigation.navigate("ChatDetail", {
                contactId: item.id,
                rideId: item.rideId,
              })
            }
            activeOpacity={0.8}
          >
            {/* Avatar */}
            <View style={styles.avatarWrap}>
              <View style={[styles.avatar, { backgroundColor: item.avatarColor }]}>
                <Text style={styles.initials}>{item.initials}</Text>
              </View>
              {item.online && <View style={styles.onlineDot} />}
            </View>

            {/* Content */}
            <View style={styles.msgContent}>
              <View style={styles.msgTop}>
                <Text style={styles.contactName}>{item.name}</Text>
                <Text style={styles.msgTime}>{item.time}</Text>
              </View>
              <View style={styles.msgBottom}>
                <Text style={styles.lastMsg} numberOfLines={1}>{item.lastMsg}</Text>
                {item.unread > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  pageTitle: { fontSize: Typography.heading, fontWeight: "800", color: Colors.textPrimary },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surface,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: 14,
    paddingHorizontal: Spacing.md, height: 48,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: Typography.body, color: Colors.textPrimary },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: 4 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.surface, borderRadius: 16,
    padding: Spacing.md,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  initials: { color: Colors.white, fontWeight: "800", fontSize: 16 },
  onlineDot: {
    position: "absolute", bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.surface,
  },
  msgContent: { flex: 1 },
  msgTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  contactName: { fontSize: Typography.body, fontWeight: "700", color: Colors.textPrimary },
  msgTime: { fontSize: Typography.small, color: Colors.textMuted },
  msgBottom: { flexDirection: "row", alignItems: "center" },
  lastMsg: { flex: 1, fontSize: Typography.caption, color: Colors.textSecondary },
  badge: {
    backgroundColor: Colors.primary, borderRadius: 10,
    minWidth: 20, height: 20,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  badgeText: { color: Colors.white, fontSize: 11, fontWeight: "800" },
});
