import axios from 'axios';

const BASE_URL = "http://10.233.162.121:8000/api";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

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
