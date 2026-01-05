import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

type JsCode2SessionResponse = {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
};

@Injectable()
export class MpAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  private async jsCode2Session(code: string) {
    const appid = String(this.config.get('WX_APPID') ?? '');
    const secret = String(this.config.get('WX_SECRET') ?? '');
    if (!appid || !secret) {
      throw new BadRequestException('未配置微信登录参数');
    }

    const url =
      'https://api.weixin.qq.com/sns/jscode2session' +
      `?appid=${encodeURIComponent(appid)}` +
      `&secret=${encodeURIComponent(secret)}` +
      `&js_code=${encodeURIComponent(code)}` +
      `&grant_type=authorization_code`;

    let res: Response;
    try {
      res = await fetch(url, { method: 'GET' });
    } catch {
      throw new BadRequestException('微信登录失败，请检查网络');
    }
    const json = (await res.json()) as JsCode2SessionResponse;
    if (!res.ok) throw new BadRequestException('微信登录失败');
    if (json.errcode) {
      throw new BadRequestException(`微信登录失败，错误码：${json.errcode}`);
    }
    const openid = String(json.openid ?? '');
    if (!openid) throw new BadRequestException('微信登录失败');
    return { openid };
  }

  async loginWithCode(code: string) {
    const { openid } = await this.jsCode2Session(code);

    const user = await this.prisma.mp_user.upsert({
      where: { openid },
      update: {},
      create: { openid }
    });

    const token = await this.jwt.signAsync({ sub: user.id, openid, typ: 'mp' });
    return {
      token,
      user: { id: user.id, openid: user.openid, nickname: user.nickname, avatarUrl: user.avatarUrl }
    };
  }
}
