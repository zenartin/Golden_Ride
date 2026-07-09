import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Typography } from "../../../theme";
import { useAppStore } from "../../../store/appStore";

const TYPE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; iconBg: string; iconColor: string }> = {
  earning:      { icon: "cash",             iconBg: Colors.successLight, iconColor: Colors.success },
  info:         { icon: "information-circle",iconBg: Colors.infoLight ?? "#EFF6FF", iconColor: Colors.info },
  announcement: { icon: "megaphone",         iconBg: "#F3E8FF",           iconColor: "#7C3AED" },
  alert:        { icon: "warning",           iconBg: Colors.warningLight,  iconColor: Colors.warning },
  default:      { icon: "notifications",     iconBg: Colors.primaryLight,  iconColor: Colors.primary },
};

export default function NotificationsScreen({ navigation }: any) {
  const { notifications, fetchNotifications, markNotificationRead, deleteNotification } = useAppStore();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Notifications</Text>
        <TouchableOpacity onPress={() => notifications.forEach((n) => markNotificationRead(n.id))}>
          <Text style={styles.markAllBtn}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {unread > 0 && (
        <View style={styles.unreadBanner}>
          <Ionicons name="ellipse" size={8} color={Colors.primary} />
          <Text style={styles.unreadText}>{unread} unread notifications</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {notifications.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        )}
        {notifications.map((notif) => {
          const conf = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.default;
          return (
            <TouchableOpacity
              key={String(notif.id)}
              style={[styles.card, !notif.is_read && styles.cardUnread]}
              activeOpacity={0.8}
              onPress={() => markNotificationRead(notif.id)}
              onLongPress={() => deleteNotification(notif.id)}
            >
              <View style={[styles.iconWrap, { backgroundColor: conf.iconBg }]}>
                <Ionicons name={conf.icon} size={20} color={conf.iconColor} />
              </View>
              <View style={styles.content}>
                <View style={styles.contentTop}>
                  <Text style={styles.notifTitle}>{notif.title}</Text>
                  <Text style={styles.notifTime}>{notif.created_at?.slice(11, 16)}</Text>
                </View>
                <Text style={styles.notifBody} numberOfLines={2}>{notif.message}</Text>
              </View>
              {!notif.is_read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          );
        })}
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
  markAllBtn: { fontSize: Typography.caption, color: Colors.primary, fontWeight: "700" },
  unreadBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.sm,
    backgroundColor: Colors.primaryLight, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, alignSelf: "flex-start",
  },
  unreadText: { fontSize: Typography.small, color: Colors.primaryDark, fontWeight: "600" },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 40, gap: 8 },
  card: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: Colors.surface, borderRadius: 18, padding: Spacing.md,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: Colors.primary },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  content: { flex: 1 },
  contentTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  notifTitle: { fontSize: Typography.caption, fontWeight: "700", color: Colors.textPrimary, flex: 1 },
  notifTime: { fontSize: Typography.small, color: Colors.textMuted, marginLeft: 8 },
  notifBody: { fontSize: Typography.small, color: Colors.textSecondary, lineHeight: 18 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 4,
  },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: Typography.body, color: Colors.textMuted },
});
