import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "../api/client";
import { API_ENDPOINTS } from "../api/endpoints";

type RideClass = "Golden Ride Economy" | "Golden Ride Comfort" | "Golden Ride Premium" | string;
export type RideStatus = "searching" | "confirmed" | "arriving" | "on_trip" | "completed" | "cancelled";

export interface RideOption {
  id: RideClass;
  title: string;
  subtitle: string;
  eta: string;
  seats: number;
  price: number;
  distance?: string;
}

export interface Trip {
  id: string;
  pickup: string;
  dropoff: string;
  rideClass: RideClass;
  rideTitle: string;
  driver: string;
  car: string;
  plate: string;
  price: number;
  distance: string;
  duration: string;
  paymentMethod: string;
  status: RideStatus;
  createdAt: string;
  driverPhone?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  dropoffLatitude?: number;
  dropoffLongitude?: number;
  driverLatitude?: number;
  driverLongitude?: number;
  driverUpiId?: string;
  driverAvatar?: string;
  verificationPin?: string;
}

export interface ChatMessage {
  id: number;
  ride_id?: number;
  is_support: boolean;
  sender: "driver" | "rider" | "support" | "system";
  content: string;
  created_at: string;
}

interface WalletTransaction {
  id: string;
  title: string;
  amount: number;
  type: "debit" | "credit";
  date: string;
}

interface RideState {
  pickup: string;
  dropoff: string;
  pickupCoords: { lat: number; lon: number } | null;
  dropoffCoords: { lat: number; lon: number } | null;
  rideOptions: RideOption[];
  selectedRideClass: RideClass;
  activeTrip: Trip | null;
  history: Trip[];
  walletBalance: number;
  transactions: WalletTransaction[];
  chatMessages: ChatMessage[];
  appliedCoupon: string | null;
  couponDiscount: number;
  applyCoupon: (code: string, fare: number) => Promise<boolean>;
  removeCoupon: () => void;
  setPickup: (value: string, coords?: { lat: number; lon: number }) => void;
  setDropoff: (value: string, coords?: { lat: number; lon: number }) => void;
  setSelectedRideClass: (value: RideClass) => void;
  searchRides: () => Promise<RideOption[]>;
  bookRide: (paymentMethod?: string, scheduledTime?: string) => Promise<Trip | null>;
  refreshActiveTrip: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  fetchTripDetail: (tripId: string) => Promise<Trip | null>;
  refreshWallet: () => Promise<void>;
  fetchMessages: (rideId: number) => Promise<void>;
  sendMessage: (rideId: number, content: string) => Promise<boolean>;
  advanceActiveTrip: () => void;
  cancelActiveTrip: () => Promise<void>;
  topUpWallet: (amount: number) => Promise<void>;
  setActiveTripStatus: (status: RideStatus, driverData?: any) => void;
}

const rideMeta: Record<string, { title: string; subtitle: string; seats: number; multiplier: number; icon: string }> = {
  "Golden Ride Sedan": { title: "Golden Ride Sedan", subtitle: "Comfortable AC sedan", seats: 4, multiplier: 1.0, icon: "car-outline" },
  "Golden Ride SUV": { title: "Golden Ride SUV", subtitle: "Spacious AC SUV", seats: 6, multiplier: 1.5, icon: "car-sport-outline" },
  "Golden Ride Van": { title: "Golden Ride Van", subtitle: "Large group & luggage", seats: 8, multiplier: 2.0, icon: "car-outline" },
  "Golden RideX": { title: "Golden RideX", subtitle: "Everyday rides", seats: 4, multiplier: 1.2, icon: "car-sport-outline" },
  "Golden RideXL": { title: "Golden RideXL", subtitle: "Premium luxury SUV", seats: 6, multiplier: 2.5, icon: "car-outline" },
  "Golden Ride Pet": { title: "Golden Ride Pet", subtitle: "Ride with your pet", seats: 4, multiplier: 1.3, icon: "car-sport-outline" },
};

import { useAuthStore } from "./authStore";

const estimateDistance = (pickup: string, dropoff: string, pickupCoords?: any, dropoffCoords?: any) => {
  if (pickupCoords?.lat && dropoffCoords?.lat) {
    const R = 6371; // km
    const dLat = (dropoffCoords.lat - pickupCoords.lat) * Math.PI / 180;
    const dLon = (dropoffCoords.lon - pickupCoords.lon) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(pickupCoords.lat * Math.PI / 180) * Math.cos(dropoffCoords.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return Math.max(1.0, distance * 1.3); // 1.3 multiplier for actual road distance
  }
  const seed = pickup.length + dropoff.length;
  return Math.max(2.1, Math.min(24, (seed % 21) + 2.3));
};

const createOptions = (pickup: string, dropoff: string, pickupCoords?: any, dropoffCoords?: any): RideOption[] => {
  const distanceMiles = estimateDistance(pickup, dropoff, pickupCoords, dropoffCoords) * 0.621371;
  const etaBase = Math.max(4, Math.round(distanceMiles * 2.5));
  
  const basePrice = Math.max(0.7, distanceMiles * 1.5);

  return (Object.keys(rideMeta) as RideClass[]).map((rideClass, index) => {
    const meta = rideMeta[rideClass];
    const finalPrice = basePrice * meta.multiplier;
    return {
      id: rideClass,
      title: meta.title,
      subtitle: meta.subtitle,
      seats: meta.seats,
      eta: `${etaBase + index * 3} min`,
      price: Number(finalPrice.toFixed(2)),
      distance: `${distanceMiles.toFixed(1)} mi`,
    };
  });
};

type ApiRide = {
  id: number;
  ride_class: RideClass;
  from_location: string;
  to_location: string;
  distance: string;
  duration: string;
  fare_amount: number;
  payment_method: string;
  status: RideStatus | "pending" | "accepted" | "arrived" | "started" | "declined";
  created_at?: string;
  driver_name?: string | null;
  driver_phone?: string | null;
  driver_vehicle_number?: string | null;
  driver_vehicle_model?: string | null;
  driver_vehicle_type?: string | null;
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
  dropoff_latitude?: number | null;
  dropoff_longitude?: number | null;
  driver_longitude?: number | null;
  driver_upi_id?: string | null;
  driver_avatar?: string | null;
  verification_pin?: string | null;
};

const mapApiStatus = (status: ApiRide["status"]): RideStatus => {
  if (status === "pending") return "searching";
  if (status === "accepted") return "confirmed";
  if (status === "arrived") return "arriving";
  if (status === "started") return "on_trip";
  if (status === "declined") return "cancelled";
  return status as RideStatus;
};

const mapApiRide = (ride: ApiRide): Trip => {
  const meta = rideMeta[ride.ride_class] ?? rideMeta["Golden RideX"];
  
  // Clean up driver vehicle type label
  const vehicleType = ride.driver_vehicle_type ? `[${ride.driver_vehicle_type}]` : "";
  const carDescription = ride.driver_vehicle_model 
    ? `${ride.driver_vehicle_model} ${vehicleType}`.trim()
    : meta.title + " cab";

  return {
    id: String(ride.id),
    pickup: ride.from_location,
    dropoff: ride.to_location,
    rideClass: ride.ride_class,
    rideTitle: meta.title,
    driver: ride.driver_name || "Finding a driver…",
    car: carDescription,
    plate: ride.driver_vehicle_number || "—",
    price: ride.fare_amount,
    distance: ride.distance,
    duration: ride.duration,
    paymentMethod: ride.payment_method,
    status: mapApiStatus(ride.status),
    createdAt: ride.created_at || new Date().toISOString(),
    driverPhone: ride.driver_phone || undefined,
    driverUpiId: ride.driver_upi_id || undefined,
    pickupLatitude: ride.pickup_latitude ?? undefined,
    pickupLongitude: ride.pickup_longitude ?? undefined,
    dropoffLatitude: ride.dropoff_latitude ?? undefined,
    dropoffLongitude: ride.dropoff_longitude ?? undefined,
    driverLatitude: ride.driver_latitude ?? undefined,
    driverLongitude: ride.driver_longitude ?? undefined,
    driverAvatar: ride.driver_avatar || undefined,
    verificationPin: ride.verification_pin || undefined,
  };
};

export const useRideStore = create<RideState>()(
  persist(
    (set, get) => ({
      appliedCoupon: null,
      couponDiscount: 0,
      pickup: "",
      dropoff: "",
      pickupCoords: null,
      dropoffCoords: null,
      rideOptions: [],
      selectedRideClass: "Golden RideX",
      activeTrip: null,
      history: [],
      walletBalance: 0,
      transactions: [],
      chatMessages: [],
      setPickup: (value, coords) => set({ pickup: value, pickupCoords: coords ?? null, rideOptions: [], appliedCoupon: null, couponDiscount: 0 }),
      setDropoff: (value, coords) => set({ dropoff: value, dropoffCoords: coords ?? null, rideOptions: [], appliedCoupon: null, couponDiscount: 0 }),
      setSelectedRideClass: (value) => set({ selectedRideClass: value }),
      searchRides: async () => {
        const { pickup, dropoff, pickupCoords, dropoffCoords } = get();
        if (!pickup.trim() || !dropoff.trim()) return [];
        try {
          const response = await apiRequest<{ options: RideOption[] }>(API_ENDPOINTS.RIDE_OPTIONS, {
            method: "POST",
            body: {
              pickup,
              dropoff,
              pickup_latitude: pickupCoords?.lat,
              pickup_longitude: pickupCoords?.lon,
              dropoff_latitude: dropoffCoords?.lat,
              dropoff_longitude: dropoffCoords?.lon,
            },
            timeout: 1500, // Short timeout so it falls back to local math instantly if backend is slow/unreachable
          });
          const rideOptions = response.options;
          set({ rideOptions, selectedRideClass: rideOptions[1]?.id ?? rideOptions[0]?.id ?? "Golden RideX", appliedCoupon: null, couponDiscount: 0 });
          return rideOptions;
        } catch (err: any) {
          // Fallback: calculate fare locally if server is unreachable
          const rideOptions = createOptions(pickup, dropoff, pickupCoords, dropoffCoords);
          set({ rideOptions, selectedRideClass: rideOptions[1]?.id ?? "Golden RideX", appliedCoupon: null, couponDiscount: 0 });
          return rideOptions;
        }
      },
      bookRide: async (paymentMethod = "Cash", scheduledTime?: string) => {
        const { pickup, dropoff, pickupCoords, dropoffCoords, rideOptions, selectedRideClass, appliedCoupon } = get();
        if (!pickup.trim() || !dropoff.trim()) throw new Error("Please enter pickup and dropoff locations.");

        const chosen = rideOptions.find((item) => item.id === selectedRideClass) ?? rideOptions[0];
        if (!chosen) throw new Error("Please tap 'Find rides' first to load ride options.");

        // Call real API — no mock fallback so dispatch actually fires
        const ride = await apiRequest<ApiRide>(API_ENDPOINTS.RIDE_BOOK, {
          method: "POST",
          body: {
            pickup,
            dropoff,
            ride_class: chosen.id,
            payment_method: paymentMethod,
            pickup_latitude: pickupCoords?.lat,
            pickup_longitude: pickupCoords?.lon,
            dropoff_latitude: dropoffCoords?.lat,
            dropoff_longitude: dropoffCoords?.lon,
            coupon_code: appliedCoupon || undefined,
            scheduled_time: scheduledTime,
          },
        });

        const trip = mapApiRide(ride);
        // Status after booking = "searching" (waiting for driver to accept)
        const tripSearching: Trip = { ...trip, status: "searching" };
        set({ activeTrip: tripSearching, appliedCoupon: null, couponDiscount: 0 });
        return tripSearching;
      },
      refreshActiveTrip: async () => {
        const ride = await apiRequest<ApiRide | null>(API_ENDPOINTS.RIDE_ACTIVE);
        set({ activeTrip: ride ? mapApiRide(ride) : null });
      },
      refreshHistory: async () => {
        const rides = await apiRequest<ApiRide[]>(API_ENDPOINTS.RIDE_HISTORY);
        set({ history: rides.map(mapApiRide) });
      },
      fetchTripDetail: async (tripId) => {
        const ride = await apiRequest<ApiRide>(API_ENDPOINTS.RIDE_DETAIL(tripId));
        const trip = mapApiRide(ride);
        set((state) => {
          if (trip.status === "cancelled") {
            return {
              activeTrip: null,
              history: [trip, ...state.history.filter((item) => item.id !== trip.id)],
            };
          }
          return {
            activeTrip: trip,
            history:
              trip.status === "completed"
                ? [trip, ...state.history.filter((item) => item.id !== trip.id)]
                : state.history,
          };
        });
        return trip;
      },
      refreshWallet: async () => {
        const wallet = await apiRequest<{
          wallet_balance: number;
          transactions: WalletTransaction[];
        }>(API_ENDPOINTS.WALLET);
        set({ walletBalance: wallet.wallet_balance, transactions: wallet.transactions });
      },
      fetchMessages: async (rideId) => {
        try {
          const response = await apiRequest<ChatMessage[]>(API_ENDPOINTS.MESSAGES_RIDE(rideId));
          set({ chatMessages: response });
        } catch (err) {
          console.log("Fetch chat messages error:", err);
        }
      },
      sendMessage: async (rideId, content) => {
        if (!content.trim()) return false;
        try {
          const response = await apiRequest<ChatMessage>(API_ENDPOINTS.MESSAGES_SEND, {
            method: "POST",
            body: { ride_id: rideId, is_support: false, content: content.trim() },
          });
          set((state) => ({ chatMessages: [...state.chatMessages, response] }));
          return true;
        } catch (err) {
          console.log("Send chat message error:", err);
          return false;
        }
      },
      advanceActiveTrip: () => {
        const activeTrip = get().activeTrip;
        if (!activeTrip) return;

        const nextStatus: Record<RideStatus, RideStatus> = {
          searching: "confirmed",
          confirmed: "arriving",
          arriving: "on_trip",
          on_trip: "completed",
          completed: "completed",
          cancelled: "cancelled",
        };

        const updated = { ...activeTrip, status: nextStatus[activeTrip.status] };
        set({ activeTrip: updated });
      },
      cancelActiveTrip: async () => {
        const activeTrip = get().activeTrip;
        if (!activeTrip) return;
        try {
          await apiRequest<ApiRide>(API_ENDPOINTS.RIDE_CANCEL(activeTrip.id), { method: "POST" });
        } catch {
          // Keep local UX responsive even when the dev API is offline.
        }
        set((state) => ({
          history: [{ ...activeTrip, status: "cancelled" }, ...state.history],
          activeTrip: null,
        }));
      },
      completeActiveTrip: () => {
        const activeTrip = get().activeTrip;
        if (!activeTrip) return;
        set((state) => ({
          history: [{ ...activeTrip, status: "completed" }, ...state.history],
          activeTrip: null,
        }));
      },
      topUpWallet: async (amount) => {
        if (amount <= 0) return;
        try {
          const response = await apiRequest<{ wallet_balance: number }>(API_ENDPOINTS.WALLET_TOP_UP, {
            method: "POST",
            body: { amount },
          });
          set({ walletBalance: response.wallet_balance });
          await get().refreshWallet();
        } catch (err) {
          console.log("Top-up failed", err);
          throw err;
        }
      },
      setActiveTripStatus: (status, driverData) => {
        set((state) => {
          if (!state.activeTrip) return state;
          const carDescription = driverData 
            ? `${driverData.vehicle_model} ${driverData.vehicle_type ? `[${driverData.vehicle_type}]` : ""}`.trim()
            : state.activeTrip.car;
          const updated = { 
            ...state.activeTrip, 
            status,
            driver: driverData ? driverData.name : state.activeTrip.driver,
            car: carDescription,
            plate: driverData ? driverData.vehicle_number : state.activeTrip.plate,
            driverPhone: driverData ? driverData.phone : state.activeTrip.driverPhone,
          };
          
          if (status === "cancelled") {
            return {
              activeTrip: null,
              history: [updated, ...state.history]
            };
          }
          
          if (status === "completed") {
            // Do NOT set activeTrip to null here. The PaymentScreen will handle 
            // setting it to null after the user finishes payment.
            return {
              activeTrip: updated,
              history: [updated, ...state.history.filter(h => h.id !== updated.id)]
            };
          }
          
          return { activeTrip: updated };
        });
      },
      applyCoupon: async (code, fare) => {
        const { pickupCoords } = get();
        try {
          const response = await apiRequest<{
            valid: boolean;
            code: string;
            discount_amount: number;
            discounted_fare: number;
            message: string;
          }>(API_ENDPOINTS.COUPON_VALIDATE, {
            method: "POST",
            body: {
              code,
              fare_amount: fare,
              latitude: pickupCoords?.lat,
              longitude: pickupCoords?.lon,
            },
          });
          if (response.valid) {
            set({ appliedCoupon: response.code, couponDiscount: response.discount_amount });
            return true;
          }
          return false;
        } catch (error: any) {
          set({ appliedCoupon: null, couponDiscount: 0 });
          throw error;
        }
      },
      removeCoupon: () => {
        set({ appliedCoupon: null, couponDiscount: 0 });
      },
    }),
    {
      name: "golden-ride-user-rides",
      storage: createJSONStorage(() => AsyncStorage),
      version: 3, // Bump to clear cache for 6 ride tiers
      migrate: (persistedState: any, version: number) => {
        if (version < 3) {
          persistedState.rideOptions = [];
          persistedState.selectedRideClass = "Golden RideX";
        }
        return persistedState;
      },
    }
  )
);
