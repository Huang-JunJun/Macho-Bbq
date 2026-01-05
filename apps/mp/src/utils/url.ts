import { PUBLIC_BASE_URL } from '../config/env';

const PUBLIC_ORIGIN = PUBLIC_BASE_URL.replace(/\/+$/, '');

export function normalizeImageUrl(raw?: string | null) {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  if (/^(data:|wxfile:|file:)/i.test(value)) return value;
  if (/^https:\/\//i.test(value)) return value;
  if (/^http:\/\//i.test(value)) {
    const withoutScheme = value.replace(/^http:\/\//i, '');
    const slashIndex = withoutScheme.indexOf('/');
    const path = slashIndex >= 0 ? withoutScheme.slice(slashIndex) : '/';
    return `${PUBLIC_ORIGIN}${path}`;
  }
  if (value.startsWith('/')) return `${PUBLIC_ORIGIN}${value}`;
  return `${PUBLIC_ORIGIN}/${value}`;
}
