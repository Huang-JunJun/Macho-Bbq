import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Put, UseGuards } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { MenuPermission } from '../../auth/menu.decorator';
import { MenuGuard } from '../../auth/menu.guard';
import { CurrentAdmin } from '../../auth/current-admin.decorator';
import { AdminJwtUser } from '../../auth/jwt.strategy';
import { CreateStaffDto } from './dto/create-staff.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateStaffAccountDto } from './dto/update-staff-account.dto';
import { UpdateStaffRoleDto } from './dto/update-staff-role.dto';
import { DEFAULT_STAFF_KEYS } from '../menus/menu.helper';

@UseGuards(JwtAuthGuard, RolesGuard, MenuGuard)
@Roles('OWNER')
@MenuPermission('staff')
@Controller('admin/staff')
export class AdminStaffController {
  constructor(private prisma: PrismaService) {}

  private async resolveRoleId(storeId: string, roleId?: string | null) {
    if (roleId) {
      const role = await this.prisma.role.findFirst({ where: { id: roleId, storeId } });
      if (!role) throw new BadRequestException('角色不存在');
      return role.id;
    }
    const fallback = await this.prisma.role.findFirst({ where: { storeId, key: 'STAFF' } });
    if (fallback) return fallback.id;
    const created = await this.prisma.role.create({
      data: {
        storeId,
        name: '员工',
        key: 'STAFF',
        menuKeys: DEFAULT_STAFF_KEYS as any
      }
    });
    return created.id;
  }

  private async logAction(admin: AdminJwtUser, action: string, targetId?: string | null, meta?: Record<string, any>) {
    await this.prisma.admin_action_log.create({
      data: {
        storeId: admin.storeId,
        operatorAdminUserId: admin.adminUserId,
        targetAdminUserId: targetId ?? null,
        action,
        meta: meta ?? undefined
      }
    });
  }

  @Get('list')
  async list(@CurrentAdmin() admin: AdminJwtUser) {
    const staff = await this.prisma.admin_user.findMany({
      where: { storeId: admin.storeId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        roleId: true,
        isActive: true,
        storeId: true,
        createdAt: true,
        updatedAt: true,
        roleRef: { select: { id: true, name: true, key: true } }
      }
    });
    return {
      staff: staff.map((s) => ({
        ...s,
        roleName: s.roleRef?.name ?? (s.role === 'OWNER' ? '店长' : '员工'),
        roleKey: s.roleRef?.key ?? s.role
      }))
    };
  }

  @Post('create')
  async create(@CurrentAdmin() admin: AdminJwtUser, @Body() dto: CreateStaffDto) {
    const existing = await this.prisma.admin_user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('账号已存在');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const roleId = await this.resolveRoleId(admin.storeId, dto.roleId);
    const staff = await this.prisma.admin_user.create({
      data: {
        email: dto.email,
        passwordHash,
        storeId: admin.storeId,
        role: 'STAFF',
        roleId,
        isActive: true
      }
    });
    await this.logAction(admin, 'STAFF_CREATE', staff.id, { email: staff.email, roleId });
    return { staff };
  }

  @Put(':id/update-account')
  async updateAccount(
    @CurrentAdmin() admin: AdminJwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateStaffAccountDto
  ) {
    const user = await this.prisma.admin_user.findFirst({ where: { id, storeId: admin.storeId } });
    if (!user) throw new NotFoundException('账号不存在');
    const email = dto.email.trim();
    if (!email) throw new BadRequestException('账号不能为空');
    const existing = await this.prisma.admin_user.findFirst({
      where: { storeId: admin.storeId, email, id: { not: id } }
    });
    if (existing) throw new BadRequestException('账号已存在');
    const staff = await this.prisma.admin_user.update({ where: { id }, data: { email } });
    await this.logAction(admin, 'STAFF_UPDATE_ACCOUNT', staff.id, { from: user.email, to: email });
    return { staff };
  }

  @Put(':id/update-role')
  async updateRole(@CurrentAdmin() admin: AdminJwtUser, @Param('id') id: string, @Body() dto: UpdateStaffRoleDto) {
    const user = await this.prisma.admin_user.findFirst({ where: { id, storeId: admin.storeId } });
    if (!user) throw new NotFoundException('账号不存在');
    const roleId = await this.resolveRoleId(admin.storeId, dto.roleId);
    if (user.role === 'OWNER') {
      const ownerRole = await this.prisma.role.findFirst({ where: { storeId: admin.storeId, key: 'OWNER' } });
      if (ownerRole && ownerRole.id !== roleId) throw new BadRequestException('店长账号不能变更角色');
    }
    const staff = await this.prisma.admin_user.update({ where: { id }, data: { roleId } });
    await this.logAction(admin, 'STAFF_UPDATE_ROLE', staff.id, { roleId });
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
    await this.logAction(admin, 'STAFF_DISABLE', staff.id);
    return { staff };
  }

  @Put(':id/enable')
  async enable(@CurrentAdmin() admin: AdminJwtUser, @Param('id') id: string) {
    const user = await this.prisma.admin_user.findFirst({ where: { id, storeId: admin.storeId } });
    if (!user) throw new NotFoundException('账号不存在');
    const staff = await this.prisma.admin_user.update({
      where: { id },
      data: { isActive: true }
    });
    await this.logAction(admin, 'STAFF_ENABLE', staff.id);
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
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const staff = await this.prisma.admin_user.update({
      where: { id },
      data: { passwordHash }
    });
    await this.logAction(admin, 'STAFF_RESET_PASSWORD', staff.id);
    return { staff };
  }
}
