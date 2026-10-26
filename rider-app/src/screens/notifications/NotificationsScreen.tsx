import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import api, { ENDPOINTS } from '../../api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Types
interface Notification {
  id: string;
  type: 'trip' | 'payment' | 'promo' | 'system';
  title: string;
  body: string;
  created_at: string;
  is_read: boolean;
}

const timeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
};

export const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      // @ts-ignore
      const response = await api.get(ENDPOINTS.NOTIFICATIONS);
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      // @ts-ignore
      await api.post(ENDPOINTS.NOTIFICATIONS_READ_ALL);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleRead = async (id: string) => {
    try {
      // @ts-ignore
      await api.post(ENDPOINTS.NOTIFICATION_READ(id));
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error('Error reading notification:', error);
    }
  };

  const getIconConfig = (type: Notification['type']) => {
    switch (type) {
      case 'trip': return { name: 'car', color: '#1e3a5f' };
      case 'payment': return { name: 'cash', color: '#1a3a2a' };
      case 'promo': return { name: 'megaphone', color: '#3a2a0e' };
      case 'system': return { name: 'settings', color: '#2a2a3a' };
      default: return { name: 'notifications', color: '#2a2a3a' };
    }
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const config = getIconConfig(item.type);
    
    return (
      <TouchableOpacity 
        style={[styles.notificationItem, !item.is_read && styles.unreadItem]}
        onPress={() => handleRead(item.id)}
      >
        <View style={[styles.iconContainer, { backgroundColor: config.color }]}>
          {/* @ts-ignore */}
          <Ionicons name={config.name as any} size={24} color="#fff" />
        </View>
        <View style={styles.contentContainer}>
          <Text style={[styles.title, !item.is_read && styles.unreadTitle]}>{item.title}</Text>
          <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={handleMarkAllRead}>
          <Text style={styles.markAllText}>Mark all</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary || '#D4AF37'} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary || '#D4AF37'} />
          }
          contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔔</Text>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyDesc}>We'll notify you when something happens</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background || '#000' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.m || 16,
    paddingVertical: Spacing.s || 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text || '#fff',
  },
  markAllText: {
    color: Colors.primary || '#D4AF37',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: Spacing.s || 12,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: Spacing.m || 16,
    marginBottom: Spacing.s || 12,
    borderRadius: Radius.m || 12,
    backgroundColor: '#111',
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  unreadItem: {
    backgroundColor: Colors.surface || '#1a1a1a',
    borderLeftColor: Colors.primary || '#D4AF37',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.m || 16,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: Colors.text || '#fff',
    fontSize: 16,
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: 'bold',
  },
  body: {
    color: Colors.textSecondary || '#aaa',
    fontSize: 14,
    marginBottom: 4,
  },
  time: {
    color: Colors.textSecondary || '#aaa',
    fontSize: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text || '#fff',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: Colors.textSecondary || '#aaa',
    textAlign: 'center',
  },
});

export default NotificationsScreen;
