import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminLoginDto } from './dto/admin-login.dto';

@Controller('admin')
export class AdminAuthController {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService
  ) {}

  @Post('login')
  async login(@Body() dto: AdminLoginDto) {
    const user = await this.prisma.admin_user.findUnique({
      where: { email: dto.email }
    });
    if (!user) throw new UnauthorizedException('账号或密码错误');
    if (!user.isActive) throw new UnauthorizedException('账号已被禁用');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('账号或密码错误');

    const accessToken = await this.jwt.signAsync({ sub: user.id, storeId: user.storeId, role: user.role, email: user.email });
    return { accessToken };
  }
}
