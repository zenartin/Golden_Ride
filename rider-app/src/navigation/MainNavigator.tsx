import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';

// Home flow
import HomeScreen from '../screens/home/HomeScreen';
import AddressSearchScreen from '../screens/home/AddressSearchScreen';
import BookingConfirmScreen from '../screens/home/BookingConfirmScreen';
import ActiveRideScreen from '../screens/home/ActiveRideScreen';
import RideCompletedScreen from '../screens/home/RideCompletedScreen';

// Trips
import TripsScreen from '../screens/trips/TripsScreen';
import TripDetailScreen from '../screens/trips/TripDetailScreen';

// Profile
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import AddressesScreen from '../screens/profile/AddressesScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';

// Payments
import PaymentsScreen from '../screens/payments/PaymentsScreen';
import AddCardScreen from '../screens/payments/AddCardScreen';

// Safety
import SafetyHubScreen from '../screens/safety/SafetyHubScreen';

// Notifications
import NotificationsScreen from '../screens/notifications/NotificationsScreen';

// Family
import FamilyScreen from '../screens/family/FamilyScreen';

// Gift Cards
import GiftCardsScreen from '../screens/giftcards/GiftCardsScreen';
import BuyGiftCardScreen from '../screens/giftcards/BuyGiftCardScreen';

// Help
import HelpScreen from '../screens/help/HelpScreen';
import TicketScreen from '../screens/help/TicketScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const TripsStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

function HomeStackNav() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="AddressSearch" component={AddressSearchScreen} />
      <HomeStack.Screen name="BookingConfirm" component={BookingConfirmScreen} />
      <HomeStack.Screen name="ActiveRide" component={ActiveRideScreen} />
      <HomeStack.Screen name="RideCompleted" component={RideCompletedScreen} />
      <HomeStack.Screen name="SafetyHub" component={SafetyHubScreen} />
      <HomeStack.Screen name="Notifications" component={NotificationsScreen} />
    </HomeStack.Navigator>
  );
}

function TripsStackNav() {
  return (
    <TripsStack.Navigator screenOptions={{ headerShown: false }}>
      <TripsStack.Screen name="Trips" component={TripsScreen} />
      <TripsStack.Screen name="TripDetail" component={TripDetailScreen} />
    </TripsStack.Navigator>
  );
}

function ProfileStackNav() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
      <ProfileStack.Screen name="Addresses" component={AddressesScreen} />
      <ProfileStack.Screen name="Payments" component={PaymentsScreen} />
      <ProfileStack.Screen name="AddCard" component={AddCardScreen} />
      <ProfileStack.Screen name="Family" component={FamilyScreen} />
      <ProfileStack.Screen name="GiftCards" component={GiftCardsScreen} />
      <ProfileStack.Screen name="BuyGiftCard" component={BuyGiftCardScreen} />
      <ProfileStack.Screen name="Help" component={HelpScreen} />
      <ProfileStack.Screen name="Ticket" component={TicketScreen} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
    </ProfileStack.Navigator>
  );
}

function TabIcon({ name, focused, label }: { name: string; focused: boolean; label: string }) {
  return (
    <View style={styles.tabItem}>
      <Ionicons
        name={name as any}
        size={22}
        color={focused ? Colors.primary : 'rgba(255,255,255,0.4)'}
      />
      <Text style={[styles.tabLabel, { color: focused ? Colors.primary : 'rgba(255,255,255,0.4)' }]}>
        {label}
      </Text>
    </View>
  );
}

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNav}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} label="Home" />,
        }}
      />
      <Tab.Screen
        name="TripsTab"
        component={TripsStackNav}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'car' : 'car-outline'} focused={focused} label="Trips" />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNav}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} label="Profile" />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    height: 70,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});
