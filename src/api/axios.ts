import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// API base URL: AWS EC2 production backend
export const BASE_URL = process.env.EXPO_PUBLIC_DRIVER_API_URL || "http://54.197.9.181/api";

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    "Bypass-Tunnel-Reminder": "true",
    "ngrok-skip-browser-warning": "true",
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    // Ensure we always clear any legacy cached CUSTOM_API_URL override
    await AsyncStorage.removeItem("CUSTOM_API_URL");
    const token = await AsyncStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      import("../store/authStore").then((store) => {
        store.useAuthStore.getState().logout();
      });
    }
    return Promise.reject(error);
  }
);

export default apiClient;
