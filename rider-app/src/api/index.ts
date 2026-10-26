import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URL = 'http://54.197.9.181/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
    'ngrok-skip-browser-warning': 'true',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('riderToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      AsyncStorage.removeItem('riderToken');
    }
    return Promise.reject(err);
  }
);

export const ENDPOINTS = {
  // Auth
  REGISTER: '/user/auth/register',
  LOGIN: '/user/auth/login',
  OTP_REQUEST: '/user/auth/otp-request',
  OTP_VERIFY: '/user/auth/otp-verify',
  FORGOT_PASSWORD: '/user/auth/forgot-password',
  RESET_PASSWORD: '/user/auth/reset-password',

  // Profile
  PROFILE: '/user/profile',
  PROFILE_CARD: '/user/profile/card',
  PROFILE_AVATAR: '/user/profile/upload-avatar',

  // Rides
  RIDE_OPTIONS: '/user/rides/options',
  RIDE_BOOK: '/user/rides/book',
  RIDE_ACTIVE: '/user/rides/active',
  RIDE_HISTORY: '/user/rides/history',
  RIDE_DETAIL: (id: number) => `/user/rides/${id}`,
  RIDE_CANCEL: (id: number) => `/user/rides/${id}/cancel`,
  RIDE_RATE: (id: number) => `/rider/rides/${id}/rate`,

  // Wallet
  WALLET: '/user/wallet',
  WALLET_TOPUP: '/user/wallet/top-up',

  // Coupons
  COUPON_VALIDATE: '/user/coupons/validate',

  // Rider Safety
  RIDER_SOS: '/rider/safety/sos',
  TRUSTED_CONTACTS: '/rider/safety/trusted-contacts',
  RIDER_SHARE_TRIP: '/rider/safety/share-trip',

  // Addresses
  ADDRESSES: '/rider/addresses',
  ADDRESS_DETAIL: (id: number) => `/rider/addresses/${id}`,

  // Notifications
  NOTIFICATIONS: '/rider/notifications',
  NOTIFICATION_READ: (id: number) => `/rider/notifications/${id}/read`,
  NOTIFICATIONS_READ_ALL: '/rider/notifications/read-all',

  // Family
  FAMILY: '/rider/family',
  FAMILY_MEMBER: (id: number) => `/rider/family/${id}`,

  // Gift Cards
  GIFT_CARDS: '/rider/gift-cards',
  GIFT_CARD_PURCHASE: '/rider/gift-cards/purchase',
  GIFT_CARD_REDEEM: '/rider/gift-cards/redeem',
  GIFT_CARD_BALANCE: (code: string) => `/rider/gift-cards/balance/${code}`,

  // Support
  SUPPORT_FAQS: '/rider/support/faqs',
  SUPPORT_TICKETS: '/rider/support/tickets',
  SUPPORT_TICKET_CREATE: '/rider/support/ticket',

  // Payments
  PAYMENTS_CUSTOMER: '/payments/create-customer',
  PAYMENTS_INTENT: '/payments/create-payment-intent',
  PAYMENTS_CONFIRM: '/payments/confirm-payment',
};

export default api;
