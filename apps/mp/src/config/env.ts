const env = (import.meta as any)?.env ?? {};
const rawApi = String(env.VITE_API_BASE_URL ?? '').trim();
const rawPublic = String(env.VITE_PUBLIC_BASE_URL ?? '').trim();
const rawWs = String(env.VITE_WS_BASE_URL ?? env.VITE_WS_URL ?? '').trim();

function stripSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function toWsBase(value: string) {
  if (!value) return '';
  if (value.startsWith('wss://') || value.startsWith('ws://')) return stripSlash(value);
  if (value.startsWith('https://')) return stripSlash(`wss://${value.slice('https://'.length)}`);
  if (value.startsWith('http://')) return stripSlash(`ws://${value.slice('http://'.length)}`);
  return stripSlash(value);
}

const apiBase = stripSlash(rawApi || rawPublic);
const publicBase = stripSlash(rawPublic || rawApi);
const wsBase = rawWs ? stripSlash(rawWs) : toWsBase(apiBase);

export const API_BASE_URL = apiBase;
export const PUBLIC_BASE_URL = publicBase;
export const WS_BASE_URL = wsBase;
