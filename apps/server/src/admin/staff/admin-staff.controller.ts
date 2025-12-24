import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Put, UseGuards } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { CurrentAdmin } from '../../auth/current-admin.decorator';
import { AdminJwtUser } from '../../auth/jwt.strategy';
import { CreateStaffDto } from './dto/create-staff.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
@Controller('admin/staff')
export class AdminStaffController {
  constructor(private prisma: PrismaService) {}

  @Get('list')
  async list(@CurrentAdmin() admin: AdminJwtUser) {
    const staff = await this.prisma.admin_user.findMany({
      where: { storeId: admin.storeId },
      orderBy: { createdAt: 'desc' }
    });
    return { staff };
  }

  @Post('create')
  async create(@CurrentAdmin() admin: AdminJwtUser, @Body() dto: CreateStaffDto) {
    const existing = await this.prisma.admin_user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('账号已存在');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const staff = await this.prisma.admin_user.create({
      data: {
        email: dto.email,
        passwordHash,
        storeId: admin.storeId,
        role: 'STAFF',
        isActive: true
      }
    });
    return { staff };
  }

  @Put(':id/disable')
  async disable(@CurrentAdmin() admin: AdminJwtUser, @Param('id') id: string) {
    if (admin.adminUserId === id) throw new BadRequestException('不能禁用当前账号');
    const user = await this.prisma.admin_user.findFirst({ where: { id, storeId: admin.storeId } });
    if (!user) throw new NotFoundException('账号不存在');
    if (user.role === 'OWNER') throw new BadRequestException('不能禁用店长账号');
    const staff = await this.prisma.admin_user.update({
      where: { id },
      data: { isActive: false }
    });
    return { staff };
  }

  @Put(':id/enable')
  async enable(@CurrentAdmin() admin: AdminJwtUser, @Param('id') id: string) {
    const user = await this.prisma.admin_user.findFirst({ where: { id, storeId: admin.storeId } });
    if (!user) throw new NotFoundException('账号不存在');
    if (user.role === 'OWNER') throw new BadRequestException('不能修改店长账号');
    const staff = await this.prisma.admin_user.update({
      where: { id },
      data: { isActive: true }
    });
    return { staff };
  }

  @Put(':id/reset-password')
  async resetPassword(
    @CurrentAdmin() admin: AdminJwtUser,
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto
  ) {
    const user = await this.prisma.admin_user.findFirst({ where: { id, storeId: admin.storeId } });
    if (!user) throw new NotFoundException('账号不存在');
    if (user.role === 'OWNER') throw new BadRequestException('不能修改店长账号');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const staff = await this.prisma.admin_user.update({
      where: { id },
      data: { passwordHash }
    });
    return { staff };
  }
}
