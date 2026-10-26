import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { ENDPOINTS } from '../api';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  rating: number;
  wallet_balance: number;
  country: string;
  card_number?: string;
  card_expiry?: string;
  card_holder?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginOtp: (phone: string, otp: string) => Promise<void>;
  register: (data: { name: string; email: string; phone: string; password: string; country?: string }) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const res = await api.post(ENDPOINTS.LOGIN, { email, password });
    const { access_token, ...userData } = res.data;
    await AsyncStorage.setItem('riderToken', access_token);
    set({ token: access_token, user: userData, isAuthenticated: true });
  },

  loginOtp: async (phone, otp) => {
    const res = await api.post(ENDPOINTS.OTP_VERIFY, { phone, otp });
    const { access_token, ...userData } = res.data;
    await AsyncStorage.setItem('riderToken', access_token);
    set({ token: access_token, user: userData, isAuthenticated: true });
  },

  register: async (data) => {
    const res = await api.post(ENDPOINTS.REGISTER, { ...data, country: data.country || 'USA' });
    const { access_token, ...userData } = res.data;
    await AsyncStorage.setItem('riderToken', access_token);
    set({ token: access_token, user: userData, isAuthenticated: true });
  },

  logout: async () => {
    await AsyncStorage.removeItem('riderToken');
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadUser: async () => {
    set({ isLoading: true });
    try {
      const token = await AsyncStorage.getItem('riderToken');
      if (!token) { set({ isLoading: false, isAuthenticated: false }); return; }
      set({ token });
      const res = await api.get(ENDPOINTS.PROFILE);
      set({ user: res.data, isAuthenticated: true, isLoading: false });
    } catch {
      await AsyncStorage.removeItem('riderToken');
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  refreshProfile: async () => {
    try {
      const res = await api.get(ENDPOINTS.PROFILE);
      set({ user: res.data });
    } catch {}
  },

  updateProfile: (data) => {
    const current = get().user;
    if (current) set({ user: { ...current, ...data } });
  },
}));
