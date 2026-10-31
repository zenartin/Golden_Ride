import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || "http://54.197.9.181:8001/api";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    "Bypass-Tunnel-Reminder": "true",
  },
});

// ─── Request Interceptor: attach token ───────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response Interceptor: handle 401 auto-logout ────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_role');
      localStorage.removeItem('admin_name');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const loginAdmin = async (credentials: { email: string; password: string }) => {
  const { data } = await apiClient.post('/admin/auth/login', credentials);
  return data;
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const getDashboardStats = async () => {
  const { data } = await apiClient.get('/admin/stats');
  return data;
};

export const getChartData = async () => {
  const { data } = await apiClient.get('/admin/chart-data');
  return data;
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const getUsers = async () => {
  const { data } = await apiClient.get('/admin/users');
  return data;
};

export const getUserDetails = async (id: string | number) => {
  const { data } = await apiClient.get(`/admin/users/${id}`);
  return data;
};

export const banUser = async (id: string | number) => {
  const { data } = await apiClient.post(`/admin/users/${id}/ban`);
  return data;
};

export const unbanUser = async (id: string | number) => {
  const { data } = await apiClient.post(`/admin/users/${id}/unban`);
  return data;
};

// ─── Drivers ──────────────────────────────────────────────────────────────────
export const getDrivers = async () => {
  const { data } = await apiClient.get('/admin/drivers');
  return data;
};

export const getDriverDetails = async (id: string | number) => {
  const { data } = await apiClient.get(`/admin/drivers/${id}/details`);
  return data;
};

export const approveDriver = async (id: string | number) => {
  const { data } = await apiClient.post(`/admin/drivers/${id}/approve`);
  return data;
};

export const rejectDriver = async (id: string | number) => {
  const { data } = await apiClient.post(`/admin/drivers/${id}/reject`);
  return data;
};

export const payoutDriver = async (id: string | number, body: { amount?: number; method?: string; reference?: string; note?: string }) => {
  const { data } = await apiClient.post(`/admin/drivers/${id}/payout`, body);
  return data;
};

export const getPayouts = async () => {
  const { data } = await apiClient.get('/admin/payouts');
  return data;
};

export const getPayoutHistory = async () => {
  const { data } = await apiClient.get('/admin/payouts/history');
  return data;
};

// ─── Rides ────────────────────────────────────────────────────────────────────
export const getRides = async () => {
  const { data } = await apiClient.get('/admin/rides');
  return data;
};

// ─── Stripe ───────────────────────────────────────────────────────────────────
export const getStripeDashboard = async () => {
  const { data } = await apiClient.get('/admin/stripe-dashboard');
  return data;
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export const getReports = async (period: string) => {
  const { data } = await apiClient.get('/admin/reports', { params: { period } });
  return data;
};

// ─── Settings ─────────────────────────────────────────────────────────────────
export const getSettings = async () => {
  const { data } = await apiClient.get('/admin/settings');
  return data;
};

export const updateSettings = async (payload: Record<string, any>) => {
  const { data } = await apiClient.put('/admin/settings', payload);
  return data;
};

// ─── Coupons ──────────────────────────────────────────────────────────────────
export const getCoupons = async () => {
  const { data } = await apiClient.get('/admin/coupons');
  return data;
};

export const createCoupon = async (payload: Record<string, any>) => {
  const { data } = await apiClient.post('/admin/coupons', payload);
  return data;
};

export const updateCoupon = async (id: number, payload: Record<string, any>) => {
  const { data } = await apiClient.put(`/admin/coupons/${id}`, payload);
  return data;
};

export const deleteCoupon = async (id: number) => {
  const { data } = await apiClient.delete(`/admin/coupons/${id}`);
  return data;
};

export const getSafetyAlerts = async () => {
  const { data } = await apiClient.get('/admin/safety-alerts');
  return data;
};

export const resolveSafetyAlert = async (id: number) => {
  const { data } = await apiClient.post(`/admin/safety-alerts/${id}/resolve`);
  return data;
};

export const getRecordings = async () => {
  const { data } = await apiClient.get('/recordings/admin');
  return data;
};
