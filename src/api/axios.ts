import AsyncStorage from "@react-native-async-storage/async-storage";

// API base URL: AWS EC2 production backend
export const BASE_URL = process.env.EXPO_PUBLIC_DRIVER_API_URL || "https://54-197-9-181.nip.io/api";

interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  params?: Record<string, any>;
}

interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: any;
}

export class ApiError extends Error {
  response?: {
    data: any;
    status: number;
    headers: any;
  };
  constructor(message: string, response?: { data: any; status: number; headers: any }) {
    super(message);
    this.name = "ApiError";
    this.response = response;
  }
}

async function request<T = any>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: any,
  config: RequestConfig = {}
): Promise<ApiResponse<T>> {
  // Ensure we always clear any legacy cached CUSTOM_API_URL override
  await AsyncStorage.removeItem("CUSTOM_API_URL").catch(() => {});

  // Build full URL
  let fullUrl = endpoint.startsWith("http")
    ? endpoint
    : `${BASE_URL.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`;

  if (config.params) {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(config.params)) {
      if (v !== undefined && v !== null) query.append(k, String(v));
    }
    const qStr = query.toString();
    if (qStr) {
      fullUrl += (fullUrl.includes("?") ? "&" : "?") + qStr;
    }
  }

  // Retrieve token
  const token = await AsyncStorage.getItem("authToken");

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...config.headers,
  };

  if (token && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Handle FormData vs JSON
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (!isFormData && body !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const timeoutMs = config.timeout || 30000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const fetchResponse = await fetch(fullUrl, {
      method,
      headers,
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
      signal: controller.signal,
    });

    clearTimeout(timer);

    const contentType = fetchResponse.headers.get("content-type") || "";
    let data: any = null;
    if (contentType.includes("application/json")) {
      data = await fetchResponse.json().catch(() => null);
    } else {
      const text = await fetchResponse.text().catch(() => "");
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!fetchResponse.ok) {
      if (fetchResponse.status === 401) {
        import("../store/authStore").then((store) => {
          store.useAuthStore.getState().logout();
        }).catch(() => {});
      }

      const message =
        (data && typeof data === "object" && (data.detail || data.message)) ||
        `Request failed with status ${fetchResponse.status}`;

      throw new ApiError(message, {
        data,
        status: fetchResponse.status,
        headers: fetchResponse.headers,
      });
    }

    return {
      data,
      status: fetchResponse.status,
      statusText: fetchResponse.statusText,
      headers: fetchResponse.headers,
    };
  } catch (err: any) {
    clearTimeout(timer);
    if (err instanceof ApiError) {
      throw err;
    }
    if (err.name === "AbortError") {
      throw new ApiError("Request timeout", {
        data: { detail: "Request timed out. Please check your connection." },
        status: 408,
        headers: {},
      });
    }
    throw new ApiError(err.message || "Network Error", {
      data: { detail: err.message || "Network connection failed" },
      status: 0,
      headers: {},
    });
  }
}

const apiClient = {
  get: <T = any>(url: string, config?: RequestConfig) => request<T>(url, "GET", undefined, config),
  post: <T = any>(url: string, data?: any, config?: RequestConfig) => request<T>(url, "POST", data, config),
  put: <T = any>(url: string, data?: any, config?: RequestConfig) => request<T>(url, "PUT", data, config),
  delete: <T = any>(url: string, config?: RequestConfig) => request<T>(url, "DELETE", undefined, config),
  request: <T = any>(config: RequestConfig & { url: string; method?: "GET" | "POST" | "PUT" | "DELETE"; data?: any }) =>
    request<T>(config.url, config.method || "GET", config.data, config),
  defaults: {
    baseURL: BASE_URL,
    headers: {
      common: {},
    },
  },
  interceptors: {
    request: { use: () => {} },
    response: { use: () => {} },
  },
};

export default apiClient;
