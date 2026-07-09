import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../api/axios";
import { API_ENDPOINTS } from "../api/endpoints";

export interface DriverProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  is_online: boolean;
  is_approved: boolean;
  profile_completed: boolean;
  date_of_birth?: string | null;
  residential_address?: string | null;
  avatar?: string;
  rating: number;
  balance: number;
  latitude?: number | null;
  longitude?: number | null;
  documents?: {
    license_number?: string;
    license_state?: string;
    license_expiry?: string;
    vehicle_number?: string;
    vehicle_plate_number?: string;
    vehicle_model?: string;
    vehicle_year?: number;
    vehicle_type?: string;
    vehicle_color?: string;
    vehicle_vin?: string;
    insurance_policy?: string;
    insurance_expiry?: string;
    license_image?: string;
    license_back_image?: string;
    vehicle_image?: string;
    vehicle_registration_image?: string;
    vehicle_inspection_image?: string;
    insurance_image?: string;
    w9_form_image?: string;
    avatar_image?: string;
    criminal_bg_status?: string;
    driving_record_status?: string;
    identity_verification_status?: string;
    bank_name?: string;
    account_number?: string;
    routing_number?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    preferred_language?: string;
    tax_id?: string;
  } | null;
}

interface AuthState {
  token: string | null;
  driver: DriverProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (payload: any) => Promise<boolean>;
  sendOtp: (phone: string) => Promise<any>;
  verifyOtp: (phone: string, otp: string) => Promise<boolean>;
  fetchProfile: () => Promise<void>;
  updateProfile: (payload: any) => Promise<boolean>;
  toggleOnline: () => Promise<void>;
  updateDocuments: (formData: any) => Promise<boolean>;
  uploadDocumentFile: (type: string, fileData: any) => Promise<string | null>;
  removeAvatar: () => Promise<boolean>;
  logout: () => Promise<void>;
  setError: (msg: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  driver: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,

  initialize: async () => {
    try {
      set({ isLoading: true });
      const token = await AsyncStorage.getItem("authToken");
      if (token) {
        set({ token, isAuthenticated: true });
        await get().fetchProfile();
      }
    } catch (err) {
      console.log("Initialize Auth Error:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.post(API_ENDPOINTS.LOGIN, { email, password });
      const { access_token } = response.data;
      
      await AsyncStorage.setItem("authToken", access_token);
      set({ token: access_token, isAuthenticated: true, driver: null });
      
      await get().fetchProfile();
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Invalid email or password" });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (payload) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.post(API_ENDPOINTS.REGISTER, payload);
      const { access_token } = response.data;

      await AsyncStorage.setItem("authToken", access_token);
      set({ token: access_token, isAuthenticated: true, driver: null });

      await get().fetchProfile();
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Registration failed" });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  sendOtp: async (phone) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.post(API_ENDPOINTS.OTP_REQUEST, { phone });
      return response.data;
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "OTP request failed" });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  verifyOtp: async (phone, otp) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.post(API_ENDPOINTS.OTP_VERIFY, { phone, otp });
      const { access_token } = response.data;
      
      await AsyncStorage.setItem("authToken", access_token);
      set({
        token: access_token,
        isAuthenticated: true,
        driver: response.data,
      });
      
      await get().fetchProfile();
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Invalid OTP code" });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProfile: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.DRIVER_PROFILE);
      set({ driver: response.data, isAuthenticated: true });
    } catch (err: any) {
      console.log("Fetch profile error:", err);
      // Only auto-logout if unauthorized (401), not on network errors
      if (err?.response?.status === 401) {
        await get().logout();
      }
    }
  },

  updateProfile: async (payload) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.put("/driver/profile", payload);
      set({ driver: response.data });
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Profile update failed" });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  toggleOnline: async () => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.DRIVER_TOGGLE_ONLINE);
      set((state) => ({
        driver: state.driver ? { ...state.driver, is_online: response.data.is_online } : null
      }));
    } catch (err) {
      console.log("Toggle online status error:", err);
    }
  },

  updateDocuments: async (formData) => {
    try {
      set({ isLoading: true, error: null });
      // documents PUT takes multipart form data or form-url-encoded
      const body = new FormData();
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== undefined && formData[key] !== null) {
          body.append(key, String(formData[key]));
        }
      });
      await apiClient.put(API_ENDPOINTS.DRIVER_DOCUMENTS, body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Failed to save document metadata" });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  uploadDocumentFile: async (type, fileData) => {
    try {
      set({ isLoading: true, error: null });
      const body = new FormData();
      body.append("document_type", type);
      body.append("file", fileData);

      const response = await apiClient.post(API_ENDPOINTS.DRIVER_UPLOAD_DOCUMENT, body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (type === "avatar") {
        set((state) => ({
          driver: state.driver ? { ...state.driver, avatar: response.data.url } : null
        }));
      }
      return response.data.url;
    } catch (err: any) {
      set({ error: err.response?.data?.detail || `Failed to upload ${type} document image` });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  removeAvatar: async () => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.DRIVER_REMOVE_AVATAR);
      if (response.data.status === "success") {
        set((state) => ({
          driver: state.driver ? { ...state.driver, avatar: undefined } : null
        }));
        return true;
      }
      return false;
    } catch (err: any) {
      console.log("Remove avatar error:", err);
      return false;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem("authToken");
    set({ token: null, driver: null, isAuthenticated: false, error: null });
  },

  setError: (msg) => set({ error: msg }),
}));
