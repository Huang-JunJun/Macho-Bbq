import { defineStore } from 'pinia';

type JwtPayload = {
  sub?: string;
  storeId?: string;
  exp?: number;
};

function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  try {
    const json = atob(b64 + pad);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('bbq_admin_token') ?? '',
    storeId: localStorage.getItem('bbq_admin_store_id') ?? ''
  }),
  getters: {
    isAuthed: (s) => !!s.token
  },
  actions: {
    setToken(token: string) {
      this.token = token;
      localStorage.setItem('bbq_admin_token', token);
      const payload = decodeJwtPayload(token);
      const storeId = payload?.storeId ?? '';
      this.storeId = storeId;
      if (storeId) localStorage.setItem('bbq_admin_store_id', storeId);
    },
    logout() {
      this.token = '';
      this.storeId = '';
      localStorage.removeItem('bbq_admin_token');
      localStorage.removeItem('bbq_admin_store_id');
    }
  }
});

