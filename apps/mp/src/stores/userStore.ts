import { defineStore } from 'pinia';

export type MpUser = {
  id?: string;
  openid: string;
  nickname?: string | null;
  avatarUrl?: string | null;
};

export type UserState = {
  token: string;
  user: MpUser | null;
};

export const USER_KEY = 'bbq_mp_user_v1';

function load(): UserState {
  try {
    const raw = uni.getStorageSync(USER_KEY);
    if (!raw) return { token: '', user: null };
    const parsed = JSON.parse(String(raw)) as Partial<UserState>;
    return { token: String(parsed.token ?? ''), user: (parsed.user as any) ?? null };
  } catch {
    return { token: '', user: null };
  }
}

function persist(s: UserState) {
  uni.setStorageSync(USER_KEY, JSON.stringify(s));
}

export const useUserStore = defineStore('user', {
  state: (): UserState => load(),
  getters: {
    loggedIn: (s) => !!s.token,
    displayName: (s) => {
      const u = s.user;
      if (!u) return '未登录';
      const name = String(u.nickname ?? '').trim();
      if (name) return name;
      const oid = String(u.openid ?? '');
      if (!oid) return '已登录';
      return `用户_${oid.slice(-6)}`;
    },
    avatar: (s) => {
      const u = s.user;
      const a = String(u?.avatarUrl ?? '').trim();
      return a || '';
    }
  },
  actions: {
    setSession(payload: { token: string; user: MpUser }) {
      this.token = payload.token;
      this.user = payload.user;
      persist({ token: this.token, user: this.user });
    },
    clear() {
      this.token = '';
      this.user = null;
      persist({ token: '', user: null });
    }
  }
});

