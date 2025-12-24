import axios from 'axios';
import { useAuthStore } from '../stores/auth';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000
});

http.interceptors.request.use((config) => {
  const auth = useAuthStore();
  const token = auth.token || localStorage.getItem('bbq_admin_token') || '';
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const msg = error?.response?.data?.message;
    if (Array.isArray(msg)) {
      error.response.data.message = msg.map((item) => String(item)).join('；');
    }
    const status = error?.response?.status;
    if (status === 401) {
      const auth = useAuthStore();
      auth.logout();
      if (location.pathname !== '/login') location.href = '/login';
    }
    return Promise.reject(error);
  }
);
