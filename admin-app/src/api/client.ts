import axios from 'axios';

const BASE_URL = "https://api-production-e0cf.up.railway.app/api";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    "Bypass-Tunnel-Reminder": "true",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const loginAdmin = async (credentials: any) => {
  const { data } = await apiClient.post('/admin/auth/login', credentials);
  return data;
};

export const getDashboardStats = async () => {
  const { data } = await apiClient.get('/admin/stats');
  return data;
};

export const getUsers = async () => {
  const { data } = await apiClient.get('/admin/users');
  return data;
};

export const getDrivers = async () => {
  const { data } = await apiClient.get('/admin/drivers');
  return data;
};

export const getRides = async () => {
  const { data } = await apiClient.get('/admin/rides');
  return data;
};

export const getChartData = async () => {
  const { data } = await apiClient.get('/admin/chart-data');
  return data;
};

export const getDriverDetails = async (id: string | number) => {
  const { data } = await apiClient.get(`/admin/drivers/${id}/details`);
  return data;
};
