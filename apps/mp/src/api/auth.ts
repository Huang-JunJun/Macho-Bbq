import { request } from './request';

export type MpLoginResponse = {
  token: string;
  user: { id?: string; openid: string; nickname?: string | null; avatarUrl?: string | null };
};

export const authApi = {
  loginWithWeixin(code: string) {
    return request<MpLoginResponse>({ path: '/mp/auth/login', method: 'POST', data: { code } });
  }
};

