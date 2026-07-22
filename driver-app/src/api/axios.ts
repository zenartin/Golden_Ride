import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Production URL from EAS build env, falls back to localtunnel
export const BASE_URL = "http://98.93.224.64:8001/api";

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const customUrl = await AsyncStorage.getItem("CUSTOM_API_URL");
    if (customUrl) {
      config.baseURL = customUrl;
    }
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
