import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

// Production AWS EC2 Backend
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://54-197-9-181.nip.io/api";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(async (config) => {
  // Ensure we clear any legacy cached CUSTOM_API_URL override
  await AsyncStorage.removeItem("CUSTOM_API_URL");
  const token = await AsyncStorage.getItem("userToken");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
  timeout?: number;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.auth === false ? null : await AsyncStorage.getItem("userToken");
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), options.timeout || 30000);

  let response;
  try {
    await AsyncStorage.removeItem("CUSTOM_API_URL");
    response = await fetch(`${BASE_URL}${path}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw err;
  } finally {
    clearTimeout(id);
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    if (response.status === 401) {
      // Clear token on 401
      await AsyncStorage.removeItem("userToken");
      throw new Error("UNAUTHORIZED");
    }
    const detail = data?.detail || "Request failed";
    throw new Error(Array.isArray(detail) ? detail.map((item) => item.msg).join(", ") : detail);
  }

  return data as T;
}
