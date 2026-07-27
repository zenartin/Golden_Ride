import { create } from "zustand";
import apiClient from "../api/axios";
import { API_ENDPOINTS } from "../api/endpoints";
import { ChatMessage } from "./rideStore";

export interface AppNotification {
  id: number;
  driver_id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface AppSettings {
  push_notifications: boolean;
  dark_mode: boolean;
  navigation_provider: string;
}

interface AppState {
  notifications: AppNotification[];
  settings: AppSettings | null;
  supportMessages: ChatMessage[];
  isLoading: boolean;
  error: string | null;

  fetchNotifications: () => Promise<void>;
  markNotificationRead: (id: number) => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateSettings: (payload: Partial<AppSettings>) => Promise<void>;
  submitSupportTicket: (category: string, subject: string, description: string) => Promise<string | null>;
  fetchSupportMessages: () => Promise<void>;
  sendSupportMessage: (content: string) => Promise<boolean>;
}

export const useAppStore = create<AppState>((set, get) => ({
  notifications: [],
  settings: null,
  supportMessages: [],
  isLoading: false,
  error: null,

  fetchNotifications: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS);
      set({ notifications: response.data });
    } catch (err) {
      console.log("Fetch notifications error:", err);
    }
  },

  markNotificationRead: async (id) => {
    try {
      await apiClient.post(API_ENDPOINTS.NOTIFICATIONS_READ(id));
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n
        ),
      }));
    } catch (err) {
      console.log("Mark read error:", err);
    }
  },

  deleteNotification: async (id) => {
    try {
      await apiClient.delete(API_ENDPOINTS.NOTIFICATIONS_DELETE(id));
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    } catch (err) {
      console.log("Delete notification error:", err);
    }
  },

  fetchSettings: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.DRIVER_SETTINGS);
      set({ settings: response.data });
    } catch (err) {
      console.log("Fetch settings error:", err);
    }
  },

  updateSettings: async (payload) => {
    try {
      const response = await apiClient.put(API_ENDPOINTS.DRIVER_SETTINGS, payload);
      set({ settings: response.data });
    } catch (err) {
      console.log("Update settings error:", err);
    }
  },

  submitSupportTicket: async (category, subject, description) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.post(API_ENDPOINTS.DRIVER_SUPPORT, {
        category,
        subject,
        description,
      });
      // Clear support messages so they refresh from the newly created ticket status
      await get().fetchSupportMessages();
      return response.data.ticket_id;
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Failed to submit support ticket" });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchSupportMessages: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.MESSAGES_SUPPORT);
      set({ supportMessages: response.data });
    } catch (err) {
      console.log("Fetch support messages error:", err);
    }
  },

  sendSupportMessage: async (content) => {
    if (!content.trim()) return false;
    try {
      const response = await apiClient.post(API_ENDPOINTS.MESSAGES_SEND, {
        is_support: true,
        content: content.trim(),
      });
      set((state) => ({
        supportMessages: [...state.supportMessages, response.data],
      }));
      return true;
    } catch (err) {
      console.log("Send support message error:", err);
      return false;
    }
  },
}));
