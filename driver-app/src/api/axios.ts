import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Use EXPO_PUBLIC_DRIVER_API_URL if provided. Otherwise default to the driver backend port.
export const BASE_URL =
  process.env.EXPO_PUBLIC_DRIVER_API_URL ||
  "http://10.233.162.121:8001/api";

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  async (config) => {
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
