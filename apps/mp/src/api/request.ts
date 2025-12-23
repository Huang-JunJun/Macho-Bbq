export type ApiError = {
  statusCode?: number;
  message?: string;
};

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
  try {
    const fromStorage = uni.getStorageSync('BBQ_API_BASE_URL');
    if (fromStorage) return String(fromStorage);
  } catch {}
  return (import.meta.env as any).VITE_API_BASE_URL || 'http://localhost:3000';
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
        const message =
          Array.isArray(msg) ? msg.map((x) => String(x)).join('；') : msg ? String(msg) : 'request error';
        reject({ statusCode, message } satisfies ApiError);
      },
      fail: (err) => {
        reject({ statusCode: 0, message: err?.errMsg ?? 'network error' } satisfies ApiError);
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
