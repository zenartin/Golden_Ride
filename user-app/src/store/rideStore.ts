import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "../api/client";
import { API_ENDPOINTS } from "../api/endpoints";

type RideClass = "economy" | "comfort" | "premium";
type RideStatus = "searching" | "confirmed" | "arriving" | "on_trip" | "completed" | "cancelled";

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
  rideOptions: RideOption[];
  selectedRideClass: RideClass;
  activeTrip: Trip | null;
  history: Trip[];
  walletBalance: number;
  transactions: WalletTransaction[];
  setPickup: (value: string) => void;
  setDropoff: (value: string) => void;
  setSelectedRideClass: (value: RideClass) => void;
  searchRides: () => Promise<RideOption[]>;
  bookRide: (paymentMethod?: string) => Promise<Trip | null>;
  refreshActiveTrip: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  fetchTripDetail: (tripId: string) => Promise<Trip | null>;
  refreshWallet: () => Promise<void>;
  advanceActiveTrip: () => void;
  cancelActiveTrip: () => Promise<void>;
  completeActiveTrip: () => void;
  topUpWallet: (amount: number) => Promise<void>;
}

const rideMeta: Record<RideClass, { title: string; subtitle: string; seats: number; multiplier: number; icon: string }> = {
  economy: { title: "Ride Lite", subtitle: "Best for quick solo trips", seats: 3, multiplier: 1, icon: "car-outline" },
  comfort: { title: "Comfort", subtitle: "More space and quieter rides", seats: 4, multiplier: 1.35, icon: "car-sport-outline" },
  premium: { title: "Premier", subtitle: "Top-rated cars and drivers", seats: 4, multiplier: 1.8, icon: "diamond-outline" },
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
};

const mapApiStatus = (status: ApiRide["status"]): RideStatus => {
  if (status === "pending" || status === "accepted") return "confirmed";
  if (status === "arrived") return "arriving";
  if (status === "started") return "on_trip";
  if (status === "declined") return "cancelled";
  return status;
};

const mapApiRide = (ride: ApiRide): Trip => {
  const meta = rideMeta[ride.ride_class] ?? rideMeta.comfort;
  return {
    id: String(ride.id),
    pickup: ride.from_location,
    dropoff: ride.to_location,
    rideClass: ride.ride_class,
    rideTitle: meta.title,
    driver: "Assigned after driver accepts",
    car: ride.ride_class === "premium" ? "Premium cab" : ride.ride_class === "comfort" ? "Comfort cab" : "Ride Lite cab",
    plate: "Pending",
    price: ride.fare_amount,
    distance: ride.distance,
    duration: ride.duration,
    paymentMethod: ride.payment_method,
    status: mapApiStatus(ride.status),
    createdAt: ride.created_at || new Date().toISOString(),
  };
};

export const useRideStore = create<RideState>()(
  persist(
    (set, get) => ({
      pickup: "Your current location",
      dropoff: "MG Road, Bengaluru",
      rideOptions: [],
      selectedRideClass: "comfort",
      activeTrip: null,
      history: [
        {
          id: "trip-1",
          pickup: "Indiranagar",
          dropoff: "Koramangala",
          rideClass: "comfort",
          rideTitle: "Comfort",
          driver: "Raghav S.",
          car: "Hyundai Verna",
          plate: "KA-05-AR-1122",
          price: 248,
          distance: "6.4 km",
          duration: "24 min",
          paymentMethod: "UPI",
          status: "completed",
          createdAt: new Date().toISOString(),
        },
      ],
      walletBalance: 1780,
      transactions: [
        { id: "tx-1", title: "Ride to Koramangala", amount: 248, type: "debit", date: new Date().toISOString() },
        { id: "tx-2", title: "Wallet top-up", amount: 1000, type: "credit", date: new Date().toISOString() },
      ],
      setPickup: (value) => set({ pickup: value }),
      setDropoff: (value) => set({ dropoff: value }),
      setSelectedRideClass: (value) => set({ selectedRideClass: value }),
      searchRides: async () => {
        const { pickup, dropoff } = get();
        let rideOptions = createOptions(pickup, dropoff);
        try {
          const response = await apiRequest<{ options: RideOption[] }>(API_ENDPOINTS.RIDE_OPTIONS, {
            method: "POST",
            body: { pickup, dropoff },
          });
          rideOptions = response.options;
        } catch {
          rideOptions = createOptions(pickup, dropoff);
        }
        set({ rideOptions, selectedRideClass: rideOptions[1]?.id ?? rideOptions[0].id });
        return rideOptions;
      },
      bookRide: async (paymentMethod = "Wallet") => {
        const { pickup, dropoff, rideOptions, selectedRideClass } = get();
        const chosen = rideOptions.find((item) => item.id === selectedRideClass) ?? rideOptions[0] ?? createOptions(pickup, dropoff)[1];
        if (!chosen) return null;

        const distance = estimateDistance(pickup, dropoff);
        let trip: Trip = {
          id: `trip-${Date.now()}`,
          pickup,
          dropoff,
          rideClass: chosen.id,
          rideTitle: chosen.title,
          driver: "Aman Verma",
          car: chosen.id === "premium" ? "Toyota Camry" : chosen.id === "comfort" ? "Honda City" : "Maruti Dzire",
          plate: "KA-01-GR-2244",
          price: chosen.price,
          distance: `${distance.toFixed(1)} km`,
          duration: `${Math.max(10, Math.round(distance * 4))} min`,
          paymentMethod,
          status: "confirmed",
          createdAt: new Date().toISOString(),
        };

        try {
          const ride = await apiRequest<ApiRide>(API_ENDPOINTS.RIDE_BOOK, {
            method: "POST",
            body: {
              pickup,
              dropoff,
              ride_class: chosen.id,
              payment_method: paymentMethod,
            },
          });
          trip = mapApiRide(ride);
        } catch {
          trip = { ...trip, status: "confirmed" };
        }

        if (paymentMethod === "Wallet") {
          set((state) => ({
            walletBalance: Math.max(0, state.walletBalance - trip.price),
            transactions: [
              { id: `tx-${Date.now()}`, title: `${trip.rideTitle} ride`, amount: trip.price, type: "debit", date: new Date().toISOString() },
              ...state.transactions,
            ],
          }));
        }

        set({ activeTrip: trip });
        return trip;
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
    }),
    {
      name: "golden-ride-user-rides",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
