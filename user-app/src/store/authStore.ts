import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { apiRequest } from "../api/client";
import { API_ENDPOINTS } from "../api/endpoints";

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (payload: { email: string; password: string }) => Promise<boolean>;
  register: (payload: { name: string; email: string; phone: string; password: string }) => Promise<boolean>;
  requestOtp: (phone: string) => Promise<string | null>;
  verifyOtp: (payload: { phone: string; otp: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (name: string, email: string, phone: string) => Promise<boolean>;
}

type AuthResponse = {
  access_token: string;
  id: number;
  name: string;
  email: string;
  phone: string;
};

type ProfileResponse = UserProfile & {
  id: number;
  wallet_balance: number;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      initialize: async () => {
        set({ isLoading: true });
        try {
          const profile = await apiRequest<ProfileResponse>(API_ENDPOINTS.PROFILE);
          set({
            user: {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              phone: profile.phone,
              avatar: profile.avatar,
            },
            isAuthenticated: true,
            error: null,
          });
        } catch {
          const token = await AsyncStorage.getItem("userToken");
          set({ isAuthenticated: Boolean(token) });
        } finally {
          set({ isLoading: false });
        }
      },
      login: async ({ email, password }) => {
        if (!email.trim() || !password.trim()) {
          set({ error: "Enter email and password" });
          return false;
        }
        try {
          const response = await apiRequest<AuthResponse>(API_ENDPOINTS.LOGIN, {
            method: "POST",
            auth: false,
            body: { email, password },
          });
          await AsyncStorage.setItem("userToken", response.access_token);
          set({
            token: response.access_token,
            user: { id: response.id, name: response.name, email: response.email, phone: response.phone },
            isAuthenticated: true,
            error: null,
          });
          return true;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Login failed" });
          return false;
        }
      },
      register: async ({ name, email, phone, password }) => {
        if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
          set({ error: "Complete all registration fields" });
          return false;
        }
        try {
          const response = await apiRequest<AuthResponse>(API_ENDPOINTS.REGISTER, {
            method: "POST",
            auth: false,
            body: { name, email, phone, password },
          });
          await AsyncStorage.setItem("userToken", response.access_token);
          set({
            token: response.access_token,
            user: { id: response.id, name: response.name, email: response.email, phone: response.phone },
            isAuthenticated: true,
            error: null,
          });
          return true;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Registration failed" });
          return false;
        }
      },
      requestOtp: async (phone) => {
        if (!phone.trim()) {
          set({ error: "Enter phone number" });
          return null;
        }
        try {
          const response = await apiRequest<{ otp?: string; message: string }>(API_ENDPOINTS.OTP_REQUEST, {
            method: "POST",
            auth: false,
            body: { phone },
          });
          set({ error: null });
          return response.otp || "1234";
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "OTP request failed" });
          return null;
        }
      },
      verifyOtp: async ({ phone, otp }) => {
        if (!phone.trim() || !otp.trim()) {
          set({ error: "Enter phone and OTP" });
          return false;
        }
        try {
          const response = await apiRequest<AuthResponse>(API_ENDPOINTS.OTP_VERIFY, {
            method: "POST",
            auth: false,
            body: { phone, otp },
          });
          await AsyncStorage.setItem("userToken", response.access_token);
          set({
            token: response.access_token,
            user: { id: response.id, name: response.name, email: response.email, phone: response.phone },
            isAuthenticated: true,
            error: null,
          });
          return true;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "OTP verification failed" });
          return false;
        }
      },
      logout: async () => {
        await AsyncStorage.removeItem("userToken");
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          error: null,
        });
      },
      fetchProfile: async () => {
        try {
          const profile = await apiRequest<ProfileResponse>(API_ENDPOINTS.PROFILE);
          set({
            user: {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              phone: profile.phone,
              avatar: profile.avatar,
            },
          });
        } catch (error) {
          console.log("Fetch profile error:", error);
        }
      },
      updateProfile: async (name, email, phone) => {
        try {
          const updated = await apiRequest<ProfileResponse>(API_ENDPOINTS.UPDATE_PROFILE, {
            method: "PUT",
            body: { name, email, phone },
          });
          set({
            user: {
              id: updated.id,
              name: updated.name,
              email: updated.email,
              phone: updated.phone,
              avatar: updated.avatar,
            },
            error: null,
          });
          return true;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Profile update failed" });
          return false;
        }
      },
    }),
    {
      name: "golden-ride-user-auth",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
