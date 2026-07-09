import { create } from "zustand";
import apiClient from "../api/axios";
import { API_ENDPOINTS } from "../api/endpoints";

export interface Ride {
  id: number;
  driver_id?: number;
  rider_name: string;
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
  status: "pending" | "accepted" | "arrived" | "started" | "completed" | "declined" | "cancelled";
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

  fetchIncomingRequests: () => Promise<void>;
  fetchActiveRide: () => Promise<void>;
  acceptRide: (rideId: number) => Promise<boolean>;
  declineRide: (rideId: number) => Promise<boolean>;
  updateRideStatus: (rideId: number, status: "arrived" | "started" | "completed") => Promise<boolean>;
  fetchRideHistory: () => Promise<void>;
  updateLocation: (latitude: number, longitude: number) => Promise<void>;
  fetchMessages: (rideId: number) => Promise<void>;
  sendMessage: (rideId: number, content: string) => Promise<boolean>;
  addIncomingRequest: (ride: Ride) => void;
  removeIncomingRequest: (rideId: number) => void;
  setActiveRide: (ride: Ride | null) => void;
}

export const useRideStore = create<RideState>((set, get) => ({
  incomingRequests: [],
  activeRide: null,
  history: [],
  messages: [],
  isLoading: false,
  error: null,

  addIncomingRequest: (ride) => {
    set((state) => {
      if (state.incomingRequests.some((r) => r.id === ride.id)) {
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

  fetchIncomingRequests: async () => {
    try {
      set({ isLoading: true });
      const response = await apiClient.get(API_ENDPOINTS.RIDES_REQUESTS);
      set({ incomingRequests: response.data });
    } catch (err: any) {
      console.log("Fetch requests error:", err);
    } finally {
      set({ isLoading: false });
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
      if (statusName === "completed") {
        set({ activeRide: null });
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
}));
