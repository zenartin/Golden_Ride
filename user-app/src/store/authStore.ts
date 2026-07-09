import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { apiRequest, BASE_URL } from "../api/client";
import { API_ENDPOINTS } from "../api/endpoints";

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  country: string;
  avatar?: string;
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (payload: { email: string; password: string }) => Promise<boolean>;
  register: (payload: { name: string; email: string; phone: string; password: string; country: string }) => Promise<boolean>;
  requestOtp: (phone: string) => Promise<string | null>;
  verifyOtp: (payload: { phone: string; otp: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (name: string, email: string, phone: string) => Promise<boolean>;
  uploadAvatar: (uri: string) => Promise<boolean>;
  removeAvatar: () => Promise<boolean>;
}

type AuthResponse = {
  access_token: string;
  id: number;
  name: string;
  email: string;
  phone: string;
  country: string;
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
              country: profile.country,
              avatar: profile.avatar,
            },
            isAuthenticated: true,
            error: null,
          });
        } catch (error) {
          if (error instanceof Error && error.message === "UNAUTHORIZED") {
            set({ isAuthenticated: false, token: null, user: null });
          } else {
            const token = await AsyncStorage.getItem("userToken");
            set({ isAuthenticated: Boolean(token) });
          }
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
            user: { id: response.id, name: response.name, email: response.email, phone: response.phone, country: (response as any).country || "USA" },
            isAuthenticated: true,
            error: null,
          });
          return true;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "Login failed" });
          return false;
        }
      },
      register: async ({ name, email, phone, password, country }) => {
        if (!name.trim() || !email.trim() || !phone.trim() || !password.trim() || !country) {
          set({ error: "Complete all registration fields" });
          return false;
        }
        try {
          const response = await apiRequest<AuthResponse>(API_ENDPOINTS.REGISTER, {
            method: "POST",
            auth: false,
            body: { name, email, phone, password, country },
          });
          await AsyncStorage.setItem("userToken", response.access_token);
          set({
            token: response.access_token,
            user: { id: response.id, name: response.name, email: response.email, phone: response.phone, country: (response as any).country || "USA" },
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
            user: { id: response.id, name: response.name, email: response.email, phone: response.phone, country: (response as any).country || "USA" },
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
              country: profile.country,
              avatar: profile.avatar,
            },
          });
        } catch (error) {
          console.log("Fetch profile error:", error);
          if (error instanceof Error && error.message === "UNAUTHORIZED") {
            set({ isAuthenticated: false, token: null, user: null });
          }
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
              country: updated.country,
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
      uploadAvatar: async (uri: string) => {
        try {
          const formData = new FormData();
          formData.append("file", { uri, type: "image/jpeg", name: "avatar.jpg" } as any);
          
          const token = await AsyncStorage.getItem("userToken");
          
          const response = await fetch(`${BASE_URL}${API_ENDPOINTS.UPLOAD_AVATAR}`, {
            method: "POST",
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
          });
          
          if (response.ok) {
            const data = await response.json();
            set((state) => ({
              user: state.user ? { ...state.user, avatar: data.avatar_url } : null
            }));
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
      removeAvatar: async () => {
        try {
          const response = await apiRequest<{ status: string }>(API_ENDPOINTS.REMOVE_AVATAR, {
            method: "POST"
          });
          if (response.status === "success") {
            set((state) => ({
              user: state.user ? { ...state.user, avatar: undefined } : null
            }));
            return true;
          }
          return false;
        } catch {
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
