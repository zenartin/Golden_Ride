import { create } from 'zustand';
import api, { ENDPOINTS } from '../api';

export interface RideOption {
  id: string;
  title: string;
  subtitle: string;
  seats: number;
  eta: string;
  price: number;
  distance: string;
  duration: string;
}

export interface ActiveRide {
  id: number;
  status: string;
  ride_class: string;
  from_location: string;
  to_location: string;
  fare: string;
  fare_amount: number;
  distance: string;
  duration: string;
  pickup_eta: string;
  verification_pin?: string;
  driver_name?: string;
  driver_avatar?: string;
  driver_phone?: string;
  driver_latitude?: number;
  driver_longitude?: number;
  driver_vehicle_model?: string;
  driver_vehicle_type?: string;
  driver_vehicle_number?: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  dropoff_latitude?: number;
  dropoff_longitude?: number;
  created_at: string;
  payment_method: string;
}

interface RideState {
  rideOptions: RideOption[];
  activeRide: ActiveRide | null;
  rideHistory: ActiveRide[];
  isBooking: boolean;
  isFetchingOptions: boolean;
  
  // Booking flow state
  pickup: string;
  dropoff: string;
  pickupLat: number | null;
  pickupLng: number | null;
  dropoffLat: number | null;
  dropoffLng: number | null;
  selectedVehicle: RideOption | null;
  
  fetchRideOptions: (pickup: string, dropoff: string, pLat?: number, pLng?: number, dLat?: number, dLng?: number) => Promise<void>;
  bookRide: (paymentMethod: string, couponCode?: string) => Promise<ActiveRide>;
  fetchActiveRide: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  cancelRide: (rideId: number) => Promise<void>;
  rateRide: (rideId: number, rating: number, comment?: string) => Promise<void>;
  setPickup: (address: string, lat?: number, lng?: number) => void;
  setDropoff: (address: string, lat?: number, lng?: number) => void;
  setSelectedVehicle: (v: RideOption) => void;
  clearBookingState: () => void;
}

export const useRideStore = create<RideState>((set, get) => ({
  rideOptions: [],
  activeRide: null,
  rideHistory: [],
  isBooking: false,
  isFetchingOptions: false,
  pickup: '',
  dropoff: '',
  pickupLat: null,
  pickupLng: null,
  dropoffLat: null,
  dropoffLng: null,
  selectedVehicle: null,

  fetchRideOptions: async (pickup, dropoff, pLat, pLng, dLat, dLng) => {
    set({ isFetchingOptions: true, pickup, dropoff });
    try {
      const res = await api.post(ENDPOINTS.RIDE_OPTIONS, {
        pickup, dropoff,
        pickup_latitude: pLat, pickup_longitude: pLng,
        dropoff_latitude: dLat, dropoff_longitude: dLng,
      });
      set({ rideOptions: res.data.options, isFetchingOptions: false });
    } catch {
      set({ isFetchingOptions: false });
      throw new Error('Could not fetch ride options');
    }
  },

  bookRide: async (paymentMethod, couponCode) => {
    const { pickup, dropoff, pickupLat, pickupLng, dropoffLat, dropoffLng, selectedVehicle } = get();
    set({ isBooking: true });
    try {
      const res = await api.post(ENDPOINTS.RIDE_BOOK, {
        pickup, dropoff,
        ride_class: selectedVehicle?.id || 'Golden Ride Economy',
        payment_method: paymentMethod,
        pickup_latitude: pickupLat,
        pickup_longitude: pickupLng,
        dropoff_latitude: dropoffLat,
        dropoff_longitude: dropoffLng,
        coupon_code: couponCode || null,
      });
      set({ activeRide: res.data, isBooking: false });
      return res.data;
    } catch (e) {
      set({ isBooking: false });
      throw e;
    }
  },

  fetchActiveRide: async () => {
    try {
      const res = await api.get(ENDPOINTS.RIDE_ACTIVE);
      set({ activeRide: res.data });
    } catch { set({ activeRide: null }); }
  },

  fetchHistory: async () => {
    try {
      const res = await api.get(ENDPOINTS.RIDE_HISTORY);
      set({ rideHistory: res.data });
    } catch {}
  },

  cancelRide: async (rideId) => {
    await api.post(ENDPOINTS.RIDE_CANCEL(rideId));
    set({ activeRide: null });
  },

  rateRide: async (rideId, rating, comment) => {
    await api.post(ENDPOINTS.RIDE_RATE(rideId), { rating, comment });
  },

  setPickup: (address, lat, lng) => set({ pickup: address, pickupLat: lat ?? null, pickupLng: lng ?? null }),
  setDropoff: (address, lat, lng) => set({ dropoff: address, dropoffLat: lat ?? null, dropoffLng: lng ?? null }),
  setSelectedVehicle: (v) => set({ selectedVehicle: v }),
  clearBookingState: () => set({ pickup: '', dropoff: '', pickupLat: null, pickupLng: null, dropoffLat: null, dropoffLng: null, selectedVehicle: null, rideOptions: [] }),
}));
