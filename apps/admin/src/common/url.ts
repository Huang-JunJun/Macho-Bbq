const env = (import.meta as any)?.env ?? {};
const rawPublicBase = String(env.VITE_PUBLIC_BASE_URL ?? '').trim();
const apiBase = String(env.VITE_API_BASE_URL ?? '').trim();
const proxyBase = String(env.VITE_API_PROXY_TARGET ?? '').trim();
const fallbackBase = rawPublicBase || (apiBase.startsWith('http') ? apiBase : '') || proxyBase;
const PUBLIC_BASE_URL = fallbackBase.replace(/\/+$/, '');

export function resolvePublicUrl(raw?: string | null) {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  if (!PUBLIC_BASE_URL) return value;
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const path = url.pathname || '/';
      return `${PUBLIC_BASE_URL}${path}`;
    } catch {
      return `${PUBLIC_BASE_URL}/${value.replace(/^\/+/, '')}`;
    }
  }
  if (value.startsWith('/')) return `${PUBLIC_BASE_URL}${value}`;
  return `${PUBLIC_BASE_URL}/${value}`;
}

export function resolvePublicUrls(list?: Array<string | null | undefined>) {
  return (list ?? []).map((item) => resolvePublicUrl(item)).filter(Boolean);
}
