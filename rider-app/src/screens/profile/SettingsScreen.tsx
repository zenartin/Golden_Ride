import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import api, { ENDPOINTS } from '../../api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../store/authStore';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const logout = useAuthStore(state => state.logout);

  const [toggles, setToggles] = useState({
    setting_push_notif: true,
    setting_email_notif: true,
    setting_trip_reminder: true,
    setting_location: true,
    setting_profile_vis: true,
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const keys = Object.keys(toggles);
        const stores = await AsyncStorage.multiGet(keys);
        const newToggles = { ...toggles };
        stores.forEach(([key, value]) => {
          if (value !== null) {
            (newToggles as any)[key] = value === 'true';
          }
        });
        setToggles(newToggles);
      } catch (error) {
        console.error('Failed to load settings', error);
      }
    };
    loadSettings();
  }, []);

  const saveToggle = async (key: string, value: boolean) => {
    try {
      setToggles(prev => ({ ...prev, [key]: value }));
      await AsyncStorage.setItem(key, value.toString());
    } catch (error) {
      console.error('Failed to save setting', error);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(ENDPOINTS.PROFILE);
              await logout();
              navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  const renderRow = (icon: any, title: string, rightElement: React.ReactNode, onPress?: () => void) => {
    const Wrapper = onPress ? TouchableOpacity : View;
    return (
      <Wrapper style={styles.row} onPress={onPress}>
        <View style={styles.rowLeft}>
          <Ionicons name={icon} size={22} color={Colors.text} style={styles.rowIcon} />
          <Text style={styles.rowTitle}>{title}</Text>
        </View>
        {rightElement}
      </Wrapper>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
          </View>
          <View style={styles.card}>
            {renderRow('chatbubble-outline', 'Push Notifications', 
              <Switch 
                value={toggles.setting_push_notif} 
                onValueChange={(val) => saveToggle('setting_push_notif', val)}
                trackColor={{ true: Colors.primary }}
              />
            )}
            <View style={styles.divider} />
            {renderRow('mail-outline', 'Email Notifications', 
              <Switch 
                value={toggles.setting_email_notif} 
                onValueChange={(val) => saveToggle('setting_email_notif', val)}
                trackColor={{ true: Colors.primary }}
              />
            )}
            <View style={styles.divider} />
            {renderRow('car-outline', 'Trip Reminders', 
              <Switch 
                value={toggles.setting_trip_reminder} 
                onValueChange={(val) => saveToggle('setting_trip_reminder', val)}
                trackColor={{ true: Colors.primary }}
              />
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.sectionTitle}>ACCOUNT</Text>
          </View>
          <View style={styles.card}>
            {renderRow('lock-closed-outline', 'Change Password', 
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />,
              () => Alert.alert('Feature coming soon')
            )}
            <View style={styles.divider} />
            {renderRow('call-outline', 'Change Phone', 
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />,
              () => Alert.alert('Feature coming soon')
            )}
            <View style={styles.divider} />
            {renderRow('globe-outline', 'Language', 
              <Text style={styles.rowValue}>English</Text>,
              () => Alert.alert('More languages coming soon')
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.sectionTitle}>PRIVACY</Text>
          </View>
          <View style={styles.card}>
            {renderRow('location-outline', 'Location Sharing', 
              <Switch 
                value={toggles.setting_location} 
                onValueChange={(val) => saveToggle('setting_location', val)}
                trackColor={{ true: Colors.primary }}
              />
            )}
            <View style={styles.divider} />
            {renderRow('eye-outline', 'Profile Visibility', 
              <Switch 
                value={toggles.setting_profile_vis} 
                onValueChange={(val) => saveToggle('setting_profile_vis', val)}
                trackColor={{ true: Colors.primary }}
              />
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="warning-outline" size={16} color="#E74C3C" />
            <Text style={[styles.sectionTitle, { color: '#E74C3C' }]}>DANGER ZONE</Text>
          </View>
          <View style={styles.card}>
            <TouchableOpacity style={styles.dangerRow} onPress={handleDeleteAccount}>
              <Ionicons name="trash-outline" size={22} color="#E74C3C" style={styles.rowIcon} />
              <Text style={styles.dangerTitle}>Delete Account</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.h3,
    color: Colors.text,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: Spacing.l,
    paddingHorizontal: Spacing.m,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.s,
    paddingHorizontal: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.textMuted,
    marginLeft: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.m,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.m,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: {
    marginRight: Spacing.m,
  },
  rowTitle: {
    fontSize: Typography.body,
    color: Colors.text,
  },
  rowValue: {
    fontSize: Typography.body,
    color: Colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 46,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.m,
  },
  dangerTitle: {
    fontSize: Typography.body,
    color: '#E74C3C',
    fontWeight: 'bold',
  },
});
