import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import api, { ENDPOINTS } from '../../api';
import { useAuthStore } from '../../store/authStore';

const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { user, logout, refreshProfile } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        await refreshProfile();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleAvatarUpload = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission required', 'You need to grant permission to access the photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      try {
        setLoading(true);
        const formData = new FormData();
        formData.append('avatar', {
          uri: asset.uri,
          name: 'avatar.jpg',
          type: 'image/jpeg',
        } as any);
        await api.post(ENDPOINTS.PROFILE_AVATAR, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        await refreshProfile();
      } catch (error) {
        Alert.alert('Upload Failed', 'There was an error uploading your avatar.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  if (loading && !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= Math.round(rating || 0) ? 'star' : 'star-outline'}
          size={16}
          color={Colors.primary}
        />
      );
    }
    return stars;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Wallet Balance Card */}
        <LinearGradient
          colors={['#FFDF00', '#D4AF37']}
          style={styles.walletCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View>
            <Text style={styles.walletLabel}>Wallet Balance</Text>
            <Text style={styles.walletAmount}>${(user?.wallet_balance || 0).toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={styles.addFundsBtn}
            onPress={() => navigation.navigate('Payments')}
          >
            <Text style={styles.addFundsText}>Add Funds</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Profile Info */}
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={handleAvatarUpload} style={styles.avatarContainer}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarEmoji}>👤</Text>
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={16} color={Colors.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.userName}>{user?.name || 'Guest User'}</Text>
          <Text style={styles.userInfo}>{user?.email || 'No email'}</Text>
          <Text style={styles.userInfo}>{user?.phone || 'No phone'}</Text>

          <View style={styles.ratingRow}>
            {renderStars(user?.rating || 0)}
            <Text style={styles.ratingText}>{(user?.rating || 0).toFixed(1)}</Text>
          </View>
          <Text style={styles.memberSince}>Member since 2024</Text>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {[
            { icon: 'person', title: 'Edit Profile', route: 'EditProfile' },
            { icon: 'location', title: 'Saved Addresses', route: 'Addresses' },
            { icon: 'card', title: 'Payment Methods', route: 'Payments' },
            { icon: 'time', title: 'Trip History', route: 'Trips' },
            { icon: 'people', title: 'Family', route: 'Family' },
            { icon: 'gift', title: 'Gift Cards', route: 'GiftCards' },
          ].map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => navigation.navigate(item.route)}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name={item.icon as any} size={20} color={Colors.primary} />
              </View>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={Colors.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.m,
  },
  walletCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.l,
    borderRadius: Radius.l,
    marginBottom: Spacing.xl,
    ...Shadow.medium,
  },
  walletLabel: {
    fontSize: Typography.bodySmall,
    color: '#554400',
    marginBottom: Spacing.xs,
  },
  walletAmount: {
    fontSize: Typography.h2,
    color: '#222222',
    fontWeight: 'bold',
  },
  addFundsBtn: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingVertical: Spacing.s,
    paddingHorizontal: Spacing.m,
    borderRadius: Radius.m,
  },
  addFundsText: {
    fontSize: Typography.button,
    color: '#222222',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing.m,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: {
    fontSize: 40,
  },
  cameraIcon: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: Colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  userName: {
    fontSize: Typography.h3,
    color: Colors.text,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  userInfo: {
    fontSize: Typography.bodyMedium,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.s,
    marginBottom: Spacing.xs,
  },
  ratingText: {
    fontSize: Typography.bodyMedium,
    color: Colors.text,
    marginLeft: Spacing.xs,
    fontWeight: 'bold',
  },
  memberSince: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
  },
  menuContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.l,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.m,
  },
  menuTitle: {
    flex: 1,
    fontSize: Typography.bodyLarge,
    color: Colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.m,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: Radius.l,
    marginBottom: Spacing.xl,
  },
  logoutText: {
    fontSize: Typography.button,
    color: Colors.error,
    marginLeft: Spacing.s,
  },
});

export default ProfileScreen;
