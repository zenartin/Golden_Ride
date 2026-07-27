// ─── Auth Stack ───────────────────────────────────────────────────────────────
export type AuthStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Login: undefined;
  OTP: { phone?: string };
  PersonalInfo: undefined;
  License: undefined;
  Vehicle: undefined;
  Insurance: undefined;
  Photo: undefined;
  Review: undefined;
  DriverDashboard: undefined;
};

// ─── Driver Tab Navigator ─────────────────────────────────────────────────────
export type DriverTabParamList = {
  Home: undefined;
  Trips: undefined;
  Earnings: undefined;
  Messages: undefined;
  Profile: undefined;
};

// ─── Driver Stack (modal screens over tabs) ──────────────────────────────────
export type DriverStackParamList = {
  MainTabs: undefined;
  RideRequest: { rideId: string };
  ActiveRide: { rideId: string };
  TripDetail: { tripId: string };
  Notifications: undefined;
  Settings: undefined;
  Support: undefined;
  EditProfile: undefined;
};
