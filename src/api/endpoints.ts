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
  UPDATE_CARD: "/user/profile/card",
  UPLOAD_AVATAR: "/user/profile/upload-avatar",
  REMOVE_AVATAR: "/user/profile/remove-avatar",

  // Stripe Payments
  STRIPE_CONFIG: "/stripe/config",
  STRIPE_PAYMENT_SHEET: "/stripe/payment-sheet",

  // PayPal Payments
  PAYPAL_CREATE_ORDER: "/paypal/create-order",
  PAYPAL_CAPTURE_ORDER: "/paypal/capture-order",


  // Messages
  MESSAGES_RIDE: (rideId: number | string) => `/messages/ride/${rideId}`,
  MESSAGES_SEND: "/messages",
  MESSAGES_SUPPORT: "/messages/support",
};

