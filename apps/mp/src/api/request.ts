import { API_BASE_URL } from '../config/env';

export type ApiError = {
  statusCode?: number;
  message?: string;
};

function normalizeMessage(raw: unknown, fallback: string) {
  const text = String(raw ?? '').trim();
  if (!text) return fallback;
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
  if (lower.includes('network error')) return '网络异常，请检查网络';
  return fallback;
}

function getToken() {
  try {
    const raw = uni.getStorageSync('bbq_mp_user_v1');
    if (!raw) return '';
    const parsed = JSON.parse(String(raw)) as { token?: string };
    return String(parsed.token ?? '');
  } catch {
    return '';
  }
}

export function getBaseUrl() {
  return API_BASE_URL;
}

export async function request<T>(opts: {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: Record<string, any>;
  data?: any;
  header?: Record<string, string>;
}) {
  const baseUrl = getBaseUrl().replace(/\/+$/, '');
  const path = opts.path.startsWith('/') ? opts.path : `/${opts.path}`;
  const url = `${baseUrl}${path}`;

  const query = opts.query ?? {};
  const hasQuery = Object.keys(query).length > 0;
  const finalUrl = hasQuery ? `${url}?${encodeQuery(query)}` : url;

  return await new Promise<T>((resolve, reject) => {
    const token = getToken();
    const header = { 'content-type': 'application/json', ...(opts.header ?? {}) } as Record<string, string>;
    if (token && !header.Authorization) header.Authorization = `Bearer ${token}`;
    uni.request({
      url: finalUrl,
      method: opts.method ?? 'GET',
      data: opts.data ?? undefined,
      header,
      success: (res) => {
        const statusCode = res.statusCode ?? 0;
        if (statusCode >= 200 && statusCode < 300) {
          resolve(res.data as T);
          return;
        }
        const msg = (res.data as any)?.message;
        const rawMessage = Array.isArray(msg) ? msg.map((x) => String(x)).join('；') : msg ? String(msg) : '';
        const message = normalizeMessage(rawMessage, '请求失败，请稍后重试');
        reject({ statusCode, message } satisfies ApiError);
      },
      fail: (err) => {
        const message = normalizeMessage(err?.errMsg, '网络异常，请检查网络');
        reject({ statusCode: 0, message } satisfies ApiError);
      }
    });
  });
}

export function encodeQuery(q: Record<string, any>) {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null || v === '') continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.join('&');
}
