export const API_ENDPOINTS = {
  LOGIN: "/user/auth/login",
  REGISTER: "/user/auth/register",
  OTP_REQUEST: "/user/auth/otp-request",
  OTP_VERIFY: "/user/auth/otp-verify",
  PROFILE: "/user/profile",
  WALLET: "/user/wallet",
  WALLET_TOP_UP: "/user/wallet/top-up",
  RIDE_OPTIONS: "/user/rides/options",
  RIDE_BOOK: "/user/rides/book",
  RIDE_ACTIVE: "/user/rides/active",
  RIDE_HISTORY: "/user/rides/history",
  RIDE_DETAIL: (rideId: number | string) => `/user/rides/${rideId}`,
  RIDE_CANCEL: (rideId: number | string) => `/user/rides/${rideId}/cancel`,
  COUPON_VALIDATE: "/user/coupons/validate",
  UPDATE_PROFILE: "/user/profile",
  UPLOAD_AVATAR: "/user/profile/upload-avatar",
  REMOVE_AVATAR: "/user/profile/remove-avatar",

  // Messages
  MESSAGES_RIDE: (rideId: number | string) => `/messages/ride/${rideId}`,
  MESSAGES_SEND: "/messages",
  MESSAGES_SUPPORT: "/messages/support",
};
