import { defineStore } from 'pinia';

type JwtPayload = {
  sub?: string;
  storeId?: string;
  email?: string;
  role?: string;
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
    storeId: localStorage.getItem('bbq_admin_store_id') ?? '',
    email: localStorage.getItem('bbq_admin_email') ?? '',
    role: localStorage.getItem('bbq_admin_role') ?? ''
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
      const email = payload?.email ?? '';
      const role = payload?.role ?? '';
      this.email = email;
      this.role = role;
      if (email) localStorage.setItem('bbq_admin_email', email);
      if (role) localStorage.setItem('bbq_admin_role', role);
    },
    logout() {
      this.token = '';
      this.storeId = '';
      this.email = '';
      this.role = '';
      localStorage.removeItem('bbq_admin_token');
      localStorage.removeItem('bbq_admin_store_id');
      localStorage.removeItem('bbq_admin_email');
      localStorage.removeItem('bbq_admin_role');
    }
  }
});
