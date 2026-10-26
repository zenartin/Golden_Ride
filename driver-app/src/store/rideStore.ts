import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../api/axios";
import { API_ENDPOINTS } from "../api/endpoints";

export function matchesDriverPreferences(ride: { ride_class?: string }): boolean {
  try {
    const { useAuthStore } = require("./authStore");
    const accepted: string = useAuthStore.getState().driver?.accepted_ride_classes || "";
    const list = accepted.split(",").map((c: string) => c.trim().toLowerCase()).filter(Boolean);
    if (list.length === 0 || !ride.ride_class) return true;
    return list.includes(String(ride.ride_class).trim().toLowerCase());
  } catch {
    return true;
  }
}

export interface Ride {
  ride_class?: string;
  id: number;
  driver_id?: number;
  rider_name: string;
  rider_phone?: string;
  rider_avatar?: string;
  rider_rating: number;
  rider_trips: number;
  from_location: string;
  to_location: string;
  distance: string;
  duration: string;
  fare: string;
  fare_amount: number;
  payment_method: string;
  pickup_eta: string;
  status: "pending" | "accepted" | "arrived" | "started" | "awaiting_payment" | "completed" | "declined" | "cancelled";
  latitude?: number;
  longitude?: number;
  pickup_latitude?: number;
  pickup_longitude?: number;
  dropoff_latitude?: number;
  dropoff_longitude?: number;
  driver_latitude?: number;
  driver_longitude?: number;
  created_at: string;
}

export interface ChatMessage {
  id: number;
  ride_id?: number;
  is_support: boolean;
  sender: "rider" | "driver" | "support" | "system";
  content: string;
  created_at: string;
}

interface RideState {
  incomingRequests: Ride[];
  activeRide: Ride | null;
  history: Ride[];
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;

  clearActiveRide: () => void;
  fetchIncomingRequests: () => Promise<void>;
  fetchActiveRide: () => Promise<void>;
  acceptRide: (rideId: number) => Promise<boolean>;
  declineRide: (rideId: number) => Promise<boolean>;
  updateRideStatus: (rideId: number, status: "arrived" | "started" | "completed" | "cancelled") => Promise<boolean>;
  verifyRidePin: (rideId: number, pin: string) => Promise<boolean>;
  fetchRideHistory: () => Promise<void>;
  updateLocation: (latitude: number, longitude: number) => Promise<void>;
  fetchMessages: (rideId: number) => Promise<void>;
  sendMessage: (rideId: number, content: string) => Promise<boolean>;
  addIncomingRequest: (ride: Ride) => void;
  removeIncomingRequest: (rideId: number) => void;
  setActiveRide: (ride: Ride | null) => void;
}

export const useRideStore = create<RideState>()(
  persist(
    (set, get) => ({
  incomingRequests: [],
  activeRide: null,
  history: [],
  messages: [],
  isLoading: false,
  error: null,

  addIncomingRequest: (ride) => {
    if (!matchesDriverPreferences(ride)) return;
    set((state) => {
      if (state.incomingRequests.some((r) => String(r.id) === String(ride.id))) {
        return state;
      }
      return { incomingRequests: [ride, ...state.incomingRequests] };
    });
  },

  removeIncomingRequest: (rideId) => {
    set((state) => ({
      incomingRequests: state.incomingRequests.filter((r) => r.id !== rideId),
    }));
  },

  setActiveRide: (ride) => {
    set({ activeRide: ride });
  },

  clearActiveRide: () => {
    set({ activeRide: null });
  },

  fetchIncomingRequests: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.RIDES_REQUESTS);
      const requests = (response.data as Ride[]).filter(matchesDriverPreferences);
      const prevIds = get().incomingRequests.map((r) => r.id).sort().join(",");
      const nextIds = requests.map((r) => r.id).sort().join(",");
      const changed = prevIds !== nextIds;
      // Only touch state when something actually changed (avoids re-rendering every poll)
      if (changed) set({ incomingRequests: requests });

      // Pop the request screen only for a changed list and when not already showing it
      if (changed && requests.length > 0) {
        const hadNew = requests.some((r) => !prevIds.split(",").includes(String(r.id)));
        if (hadNew) {
          import("../navigation/navigationRef").then(({ navigate, navigationRef }) => {
            if (navigationRef.isReady() && navigationRef.getCurrentRoute()?.name !== "RideRequest") {
              navigate("RideRequest", { rideId: requests[0].id });
            }
          });
        }
      }
    } catch (err: any) {
      console.log("Fetch requests error:", err);
    }
  },

  fetchActiveRide: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.RIDES_ACTIVE);
      set({ activeRide: response.data || null });
    } catch (err: any) {
      console.log("Fetch active ride error:", err);
    }
  },

  acceptRide: async (rideId) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.post(API_ENDPOINTS.RIDES_ACCEPT(rideId));
      set({ activeRide: response.data });
      // Remove from incoming requests list
      set((state) => ({
        incomingRequests: state.incomingRequests.filter((r) => r.id !== rideId),
      }));
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Failed to accept ride request" });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  declineRide: async (rideId) => {
    try {
      await apiClient.post(API_ENDPOINTS.RIDES_DECLINE(rideId));
      set((state) => ({
        incomingRequests: state.incomingRequests.filter((r) => r.id !== rideId),
      }));
      return true;
    } catch (err: any) {
      console.log("Decline ride error:", err);
      return false;
    }
  },

  updateRideStatus: async (rideId, statusName) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.post(API_ENDPOINTS.RIDES_STATUS(rideId), {
        status: statusName,
      });
      if (statusName === "completed" || statusName === "cancelled") {
        set({ activeRide: response.data });
        await get().fetchRideHistory();
      } else {
        set({ activeRide: response.data });
      }
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.detail || `Failed to update status to ${statusName}` });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  verifyRidePin: async (rideId, pin) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.post(API_ENDPOINTS.RIDES_VERIFY_PIN(rideId), { pin });
      set({ activeRide: response.data });
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Failed to verify PIN" });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchRideHistory: async () => {
    try {
      set({ isLoading: true });
      const response = await apiClient.get(API_ENDPOINTS.RIDES_HISTORY);
      set({ history: response.data });
    } catch (err: any) {
      console.log("Fetch history error:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  updateLocation: async (latitude, longitude) => {
    try {
      await apiClient.post(API_ENDPOINTS.RIDES_UPDATE_LOCATION, { latitude, longitude });
    } catch (err) {
      console.log("Telemetry location update failure:", err);
    }
  },

  fetchMessages: async (rideId) => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.MESSAGES_RIDE(rideId));
      set({ messages: response.data });
    } catch (err) {
      console.log("Fetch messages error:", err);
    }
  },

  sendMessage: async (rideId, content) => {
    if (!content.trim()) return false;
    try {
      const response = await apiClient.post(API_ENDPOINTS.MESSAGES_SEND, {
        ride_id: rideId,
        is_support: false,
        content: content.trim(),
      });
      // Append new message
      set((state) => ({
        messages: [...state.messages, response.data],
      }));
      return true;
    } catch (err) {
      console.log("Send message error:", err);
      return false;
    }
  },
    }),
    {
      name: "driver-ride-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ activeRide: state.activeRide }),
    }
  )
);
