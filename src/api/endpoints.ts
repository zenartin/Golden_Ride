export const API_ENDPOINTS = {
  // Authentication
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  OTP_REQUEST: "/auth/otp-request",
  OTP_VERIFY: "/auth/otp-verify",

  // Driver details
  DRIVER_PROFILE: "/driver/profile",
  DRIVER_DOCUMENTS: "/driver/documents",
  DRIVER_UPLOAD_DOCUMENT: "/driver/upload-document",
  DRIVER_REMOVE_AVATAR: "/driver/profile/remove-avatar",
  DRIVER_DASHBOARD: "/driver/dashboard",
  DRIVER_TOGGLE_ONLINE: "/driver/toggle-online",
  DRIVER_EARNINGS: "/driver/earnings",
  DRIVER_WITHDRAW: "/driver/withdraw",
  DRIVER_SETTINGS: "/driver/settings",
  DRIVER_SUPPORT: "/driver/support",

  // Rides & Telemetry
  RIDES_REQUESTS: "/rides/requests",
  RIDES_ACTIVE: "/rides/active",
  RIDES_ACCEPT: (rideId: number | string) => `/rides/${rideId}/accept`,
  RIDES_DECLINE: (rideId: number | string) => `/rides/${rideId}/decline`,
  RIDES_STATUS: (rideId: number | string) => `/rides/${rideId}/status`,
  RIDES_HISTORY: "/rides/history",
  RIDES_DETAIL: (rideId: number | string) => `/rides/${rideId}`,
  RIDES_UPDATE_LOCATION: "/rides/update-location",

  // Messages & Support Chats
  MESSAGES_RIDE: (rideId: number | string) => `/messages/ride/${rideId}`,
  MESSAGES_SEND: "/messages",
  MESSAGES_SUPPORT: "/messages/support",

  // Notifications
  NOTIFICATIONS: "/notifications",
  NOTIFICATIONS_READ: (notifId: number | string) => `/notifications/${notifId}/read`,
  NOTIFICATIONS_DELETE: (notifId: number | string) => `/notifications/${notifId}`,
};
