import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentAdmin } from '../../auth/current-admin.decorator';
import { AdminJwtUser } from '../../auth/jwt.strategy';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { ConfigService } from '@nestjs/config';
import { signTable } from '../../common/crypto';
import * as QRCode from 'qrcode';

@UseGuards(JwtAuthGuard)
@Controller('admin/table')
export class AdminTableController {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService
  ) {}

  @Post()
  async create(@CurrentAdmin() admin: AdminJwtUser, @Body() dto: CreateTableDto) {
    const table = await this.prisma.table.create({
      data: { storeId: admin.storeId, name: dto.name, isActive: dto.isActive ?? true }
    });
    return { table };
  }

  @Get()
  async list(@CurrentAdmin() admin: AdminJwtUser) {
    const tables = await this.prisma.table.findMany({
      where: { storeId: admin.storeId, isDeleted: false },
      orderBy: { createdAt: 'desc' }
    });
    return { tables };
  }

  @Get(':id')
  async get(@CurrentAdmin() admin: AdminJwtUser, @Param('id') id: string) {
    const table = await this.prisma.table.findFirst({ where: { id, storeId: admin.storeId } });
    if (!table) throw new NotFoundException('table not found');
    return { table };
  }

  @Put(':id')
  async update(@CurrentAdmin() admin: AdminJwtUser, @Param('id') id: string, @Body() dto: UpdateTableDto) {
    const current = await this.prisma.table.findFirst({ where: { id, storeId: admin.storeId } });
    if (!current) throw new NotFoundException('table not found');

    const table = await this.prisma.table.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.isActive === undefined ? {} : { isActive: dto.isActive })
      }
    });
    return { table };
  }

  @Delete(':id')
  async remove(@CurrentAdmin() admin: AdminJwtUser, @Param('id') id: string) {
    const table = await this.prisma.table.findFirst({ where: { id, storeId: admin.storeId } });
    if (!table) throw new NotFoundException('table not found');
    if (table.isDeleted) return { ok: true };
    const activeOrders = await this.prisma.order.count({
      where: { storeId: admin.storeId, tableId: id, status: 'ORDERED' }
    });
    if (activeOrders > 0) throw new BadRequestException('该桌仍有未结账订单，无法删除');
    await this.prisma.table.update({
      where: { id },
      data: { isDeleted: true, isActive: false }
    });
    return { ok: true };
  }

  @Get(':id/qrcode')
  async qrcode(@CurrentAdmin() admin: AdminJwtUser, @Param('id') id: string) {
    const table = await this.prisma.table.findFirst({ where: { id, storeId: admin.storeId } });
    if (!table) throw new NotFoundException('table not found');
    if (table.isDeleted || !table.isActive) throw new BadRequestException('桌台已停用或已删除，无法生成二维码');

    const secret = String(this.config.get('TABLE_SIGN_SECRET') ?? 'change-me');
    const sign = signTable(admin.storeId, table.id, secret);
    const content = `pages/scan/index?storeId=${encodeURIComponent(admin.storeId)}&tableId=${encodeURIComponent(
      table.id
    )}&sign=${encodeURIComponent(sign)}`;
    const base64 = await QRCode.toDataURL(content, { type: 'image/png' });
    return { content, base64 };
  }
}
