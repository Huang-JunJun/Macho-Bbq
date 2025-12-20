export type ApiError = {
  statusCode?: number;
  message?: string;
};

export function getBaseUrl() {
  const base = (import.meta as any)?.env?.VITE_API_BASE_URL;
  return (base as string) || 'http://localhost:3000';
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
    uni.request({
      url: finalUrl,
      method: opts.method ?? 'GET',
      data: opts.data ?? undefined,
      header: { 'content-type': 'application/json', ...(opts.header ?? {}) },
      success: (res) => {
        const statusCode = res.statusCode ?? 0;
        if (statusCode >= 200 && statusCode < 300) {
          resolve(res.data as T);
          return;
        }
        reject({ statusCode, message: (res.data as any)?.message ?? 'request error' } satisfies ApiError);
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
