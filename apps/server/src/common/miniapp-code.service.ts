import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type AccessTokenCache = {
  value: string;
  expiresAt: number;
};

type AccessTokenResponse = {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
};

type WxCodeError = {
  errcode?: number;
  errmsg?: string;
};

@Injectable()
export class MiniappCodeService {
  private cache: AccessTokenCache | null = null;

  constructor(private readonly config: ConfigService) {}

  private getEnvVersion() {
    const raw = String(this.config.get('WX_ENV_VERSION') ?? 'release').toLowerCase();
    if (raw === 'trial' || raw === 'develop' || raw === 'release') return raw;
    return 'release';
  }

  private async getAccessToken() {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt - now > 60_000) return this.cache.value;

    const appid = String(this.config.get('WX_APPID') ?? '');
    const secret = String(this.config.get('WX_SECRET') ?? '');
    if (!appid || !secret) throw new BadRequestException('未配置微信登录参数');

    const url =
      'https://api.weixin.qq.com/cgi-bin/token' +
      `?grant_type=client_credential&appid=${encodeURIComponent(appid)}&secret=${encodeURIComponent(secret)}`;

    let res: Response;
    try {
      res = await fetch(url, { method: 'GET' });
    } catch {
      throw new BadRequestException('获取微信凭证失败，请检查网络');
    }
    const json = (await res.json()) as AccessTokenResponse;
    if (!res.ok || json.errcode) {
      throw new BadRequestException(`获取微信凭证失败${json.errcode ? `，错误码：${json.errcode}` : ''}`);
    }

    const token = String(json.access_token ?? '');
    const expiresIn = Number(json.expires_in ?? 0);
    if (!token || !expiresIn) throw new BadRequestException('获取微信凭证失败');

    this.cache = { value: token, expiresAt: now + expiresIn * 1000 };
    return token;
  }

  async getWxacode(path: string) {
    const normalized = path.trim();
    if (!normalized) throw new BadRequestException('小程序码参数为空');
    if (normalized.length > 128) throw new BadRequestException('小程序码参数过长，请缩短');

    const accessToken = await this.getAccessToken();
    const envVersion = this.getEnvVersion();
    const url = `https://api.weixin.qq.com/wxa/getwxacode?access_token=${encodeURIComponent(accessToken)}`;
    const body = { path: normalized, env_version: envVersion };

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch {
      throw new BadRequestException('获取小程序码失败，请检查网络');
    }

    const contentType = String(res.headers.get('content-type') ?? '');
    if (contentType.includes('application/json')) {
      const err = (await res.json()) as WxCodeError;
      if (err?.errcode) {
        throw new BadRequestException(`获取小程序码失败，错误码：${err.errcode}`);
      }
      throw new BadRequestException('获取小程序码失败');
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) throw new BadRequestException('获取小程序码失败');
    return `data:image/png;base64,${buf.toString('base64')}`;
  }
}
