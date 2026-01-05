import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { MenuGuard } from '../../auth/menu.guard';
import { CurrentAdmin } from '../../auth/current-admin.decorator';
import { AdminJwtUser } from '../../auth/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { MenuPermission } from '../../auth/menu.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateRoleMenusDto } from './dto/update-role-menus.dto';
import { ALL_MENU_KEYS } from '../menus/menu.def';

@UseGuards(JwtAuthGuard, RolesGuard, MenuGuard)
@Roles('OWNER')
@MenuPermission('roles')
@Controller('admin/role')
export class AdminRoleController {
  constructor(private prisma: PrismaService) {}

  @Get('list')
  async list(@CurrentAdmin() admin: AdminJwtUser) {
    const roles = await this.prisma.role.findMany({
      where: { storeId: admin.storeId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { admins: true } } }
    });
    return { roles };
  }

  @Post('create')
  async create(@CurrentAdmin() admin: AdminJwtUser, @Body() dto: CreateRoleDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('角色名不能为空');
    const key = dto.key?.trim() || null;
    const existing = await this.prisma.role.findFirst({
      where: {
        storeId: admin.storeId,
        OR: [{ name }, ...(key ? [{ key }] : [])]
      }
    });
    if (existing) throw new BadRequestException('角色名或标识已存在');
    const role = await this.prisma.role.create({
      data: {
        storeId: admin.storeId,
        name,
        key,
        menuKeys: []
      }
    });
    return { role };
  }

  @Put(':id/update')
  async update(@CurrentAdmin() admin: AdminJwtUser, @Param('id') id: string, @Body() dto: UpdateRoleDto) {
    const role = await this.prisma.role.findFirst({ where: { id, storeId: admin.storeId } });
    if (!role) throw new NotFoundException('角色不存在');
    const name = dto.name?.trim();
    const key = dto.key?.trim();
    if (name) {
      const exists = await this.prisma.role.findFirst({ where: { storeId: admin.storeId, name, id: { not: id } } });
      if (exists) throw new BadRequestException('角色名已存在');
    }
    if (key) {
      const exists = await this.prisma.role.findFirst({ where: { storeId: admin.storeId, key, id: { not: id } } });
      if (exists) throw new BadRequestException('角色标识已存在');
    }
    const updated = await this.prisma.role.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(dto.key !== undefined ? { key: key || null } : {})
      }
    });
    return { role: updated };
  }

  @Put(':id/menus')
  async updateMenus(@CurrentAdmin() admin: AdminJwtUser, @Param('id') id: string, @Body() dto: UpdateRoleMenusDto) {
    const role = await this.prisma.role.findFirst({ where: { id, storeId: admin.storeId } });
    if (!role) throw new NotFoundException('角色不存在');
    const raw = Array.isArray(dto.menuKeys) ? dto.menuKeys : [];
    const next: string[] = [];
    for (const item of raw) {
      const value = String(item ?? '').trim();
      if (value && ALL_MENU_KEYS.has(value) && !next.includes(value)) next.push(value);
    }
    const updated = await this.prisma.role.update({
      where: { id },
      data: { menuKeys: next }
    });
    return { role: updated };
  }

  @Delete(':id')
  async remove(@CurrentAdmin() admin: AdminJwtUser, @Param('id') id: string) {
    const role = await this.prisma.role.findFirst({ where: { id, storeId: admin.storeId } });
    if (!role) throw new NotFoundException('角色不存在');
    if (role.key === 'OWNER' || role.key === 'STAFF') {
      throw new BadRequestException('内置角色不能删除');
    }
    const used = await this.prisma.admin_user.count({ where: { storeId: admin.storeId, roleId: id } });
    if (used > 0) throw new BadRequestException('角色正在使用，无法删除');
    await this.prisma.role.delete({ where: { id } });
    return { ok: true };
  }
}
