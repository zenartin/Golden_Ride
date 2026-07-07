import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "../api/client";
import { API_ENDPOINTS } from "../api/endpoints";

type RideClass = "hatchback" | "sedan" | "xuv";
export type RideStatus = "searching" | "confirmed" | "arriving" | "on_trip" | "completed" | "cancelled";

export interface RideOption {
  id: RideClass;
  title: string;
  subtitle: string;
  eta: string;
  seats: number;
  price: number;
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
  bookRide: (paymentMethod?: string) => Promise<Trip | null>;
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

const rideMeta: Record<RideClass, { title: string; subtitle: string; seats: number; multiplier: number; icon: string }> = {
  hatchback: { title: "Hatchback", subtitle: "Budget compact AC hatchback", seats: 4, multiplier: 1.0, icon: "car-outline" },
  sedan:     { title: "Sedan",     subtitle: "Comfortable AC car for daily rides", seats: 4, multiplier: 1.4,   icon: "car-sport-outline" },
  xuv:       { title: "XUV",       subtitle: "Spacious SUV for groups & luggage",  seats: 6, multiplier: 1.85,  icon: "car-outline" },
};

const estimateDistance = (pickup: string, dropoff: string) => {
  const seed = pickup.length + dropoff.length;
  return Math.max(2.1, Math.min(24, (seed % 21) + 2.3));
};

const createOptions = (pickup: string, dropoff: string): RideOption[] => {
  const distance = estimateDistance(pickup, dropoff);
  const etaBase = Math.max(4, Math.round(distance / 2));
  const base = 42 + distance * 12;

  return (Object.keys(rideMeta) as RideClass[]).map((rideClass, index) => {
    const meta = rideMeta[rideClass];
    return {
      id: rideClass,
      title: meta.title,
      subtitle: meta.subtitle,
      seats: meta.seats,
      eta: `${etaBase + index * 3} min`,
      price: Math.round(base * meta.multiplier),
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
  driver_latitude?: number | null;
  driver_longitude?: number | null;
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
  const meta = rideMeta[ride.ride_class] ?? rideMeta.sedan;
  
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
    pickupLatitude: ride.pickup_latitude ?? undefined,
    pickupLongitude: ride.pickup_longitude ?? undefined,
    dropoffLatitude: ride.dropoff_latitude ?? undefined,
    dropoffLongitude: ride.dropoff_longitude ?? undefined,
    driverLatitude: ride.driver_latitude ?? undefined,
    driverLongitude: ride.driver_longitude ?? undefined,
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
      selectedRideClass: "sedan",
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
          });
          const rideOptions = response.options;
          set({ rideOptions, selectedRideClass: rideOptions[1]?.id ?? rideOptions[0]?.id ?? "sedan", appliedCoupon: null, couponDiscount: 0 });
          return rideOptions;
        } catch (err: any) {
          // Fallback: calculate fare locally if server is unreachable
          const rideOptions = createOptions(pickup, dropoff);
          set({ rideOptions, selectedRideClass: rideOptions[1]?.id ?? "sedan", appliedCoupon: null, couponDiscount: 0 });
          return rideOptions;
        }
      },
      bookRide: async (paymentMethod = "Cash") => {
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
        set((state) => ({
          activeTrip: ["confirmed", "arriving", "on_trip"].includes(trip.status) ? trip : state.activeTrip,
          history:
            trip.status === "completed" || trip.status === "cancelled"
              ? [trip, ...state.history.filter((item) => item.id !== trip.id)]
              : state.history,
        }));
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
          set((state) => ({
            walletBalance: response.wallet_balance,
            transactions: [
              { id: `tx-${Date.now()}`, title: "Wallet top-up", amount, type: "credit", date: new Date().toISOString() },
              ...state.transactions,
            ],
          }));
          return;
        } catch {
          // Fall back to local state for offline UI demos.
        }
        set((state) => ({
          walletBalance: state.walletBalance + amount,
          transactions: [
            { id: `tx-${Date.now()}`, title: "Wallet top-up", amount, type: "credit", date: new Date().toISOString() },
            ...state.transactions,
          ],
        }));
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
          
          if (status === "completed" || status === "cancelled") {
            return {
              activeTrip: null,
              history: [updated, ...state.history]
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
    }
  )
);
