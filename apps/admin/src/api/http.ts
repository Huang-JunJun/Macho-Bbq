import axios from 'axios';
import { useAuthStore } from '../stores/auth';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000
});

function normalizeMessage(raw: unknown) {
  const text = String(raw ?? '').trim();
  if (!text) return '';
  if (!/[A-Za-z]/.test(text)) return text;
  const lower = text.toLowerCase();
  if (lower.includes('forbidden')) return '没有权限执行该操作';
  if (lower.includes('unauthorized')) return '登录已失效，请重新登录';
  if (lower.includes('bad request')) return '请求参数有误';
  if (lower.includes('not found')) return '未找到相关数据';
  if (lower.includes('should not be empty') || lower.includes('must be longer')) return '请完整填写信息';
  if (lower.includes('must be a string') || lower.includes('must be a number') || lower.includes('must be a boolean')) {
    return '输入格式不正确';
  }
  if (lower.includes('invalid credentials')) return '账号或密码错误';
  if (lower.includes('account disabled')) return '账号已被禁用';
  return '操作失败，请稍后重试';
}

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
    if (error?.response?.data?.message) {
      const normalized = normalizeMessage(error.response.data.message);
      if (normalized) error.response.data.message = normalized;
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
