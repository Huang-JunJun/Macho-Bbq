import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { MenuPermission } from '../../auth/menu.decorator';
import { MenuGuard } from '../../auth/menu.guard';
import { CurrentAdmin } from '../../auth/current-admin.decorator';
import { AdminJwtUser } from '../../auth/jwt.strategy';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { ConfigService } from '@nestjs/config';
import { signTable } from '../../common/crypto';
import { MiniappCodeService } from '../../common/miniapp-code.service';

@UseGuards(JwtAuthGuard, RolesGuard, MenuGuard)
@MenuPermission('tables')
@Controller('admin/table')
export class AdminTableController {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private miniappCode: MiniappCodeService
  ) {}

  @Post()
  async create(@CurrentAdmin() admin: AdminJwtUser, @Body() dto: CreateTableDto) {
    const tableCode = await this.getNextTableCode(admin.storeId);
    const table = await this.prisma.table.create({
      data: { storeId: admin.storeId, name: dto.name, isActive: dto.isActive ?? true, tableCode }
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

  @Get('dashboard')
  @MenuPermission('table-dashboard')
  async dashboard(@CurrentAdmin() admin: AdminJwtUser) {
    const tables = await this.prisma.table.findMany({
      where: { storeId: admin.storeId, isDeleted: false },
      select: { id: true, name: true, isActive: true, currentSessionId: true }
    });
    const sessionIds = tables.map((t) => t.currentSessionId).filter((id): id is string => Boolean(id));
    const sessions = sessionIds.length
      ? await this.prisma.dining_session.findMany({
          where: { id: { in: sessionIds }, storeId: admin.storeId, status: 'ACTIVE', isDeleted: false },
          include: {
            orders: {
              where: { status: { not: 'CANCELLED' } },
              select: { amount: true, createdAt: true },
              orderBy: { createdAt: 'asc' }
            },
            table: true
          }
        })
      : [];
    const refundRows = sessionIds.length
      ? await this.prisma.session_item_refund.findMany({
          where: { sessionId: { in: sessionIds } },
          select: { sessionId: true, priceSnapshot: true, qty: true }
        })
      : [];
    const refundAmountMap = new Map<string, number>();
    for (const row of refundRows) {
      refundAmountMap.set(row.sessionId, (refundAmountMap.get(row.sessionId) ?? 0) + row.priceSnapshot * row.qty);
    }
    const sessionMap = new Map(sessions.map((s) => [s.id, s]));
    const rows = tables.map((t) => {
      const session = t.currentSessionId ? sessionMap.get(t.currentSessionId) : null;
      if (!session) {
        return {
          tableId: t.id,
          tableName: t.name,
          isEnabled: t.isActive,
          status: 'IDLE'
        };
      }
      const orders = session.orders;
      const orderCount = orders.length;
      const rawTotal = orders.reduce((sum, o) => sum + o.amount, 0);
      const refundAmount = refundAmountMap.get(session.id) ?? 0;
      const totalAmount = Math.max(0, rawTotal - refundAmount);
      const firstOrderAt = orders[0]?.createdAt ?? session.createdAt;
      const lastOrderAt = orders[orders.length - 1]?.createdAt ?? firstOrderAt;
      const status = orderCount > 0 ? 'WAIT_SETTLE' : 'DINING';
      return {
        tableId: t.id,
        tableName: t.name,
        isEnabled: t.isActive,
        status,
        sessionId: session.id,
        dinersCount: session.dinersCount,
        orderCount,
        totalAmount,
        firstOrderAt,
        lastOrderAt
      };
    });
    return { tables: rows };
  }

  @Get(':id')
  async get(@CurrentAdmin() admin: AdminJwtUser, @Param('id') id: string) {
    const table = await this.prisma.table.findFirst({ where: { id, storeId: admin.storeId } });
    if (!table) throw new NotFoundException('桌台不存在');
    return { table };
  }

  @Put(':id')
  async update(@CurrentAdmin() admin: AdminJwtUser, @Param('id') id: string, @Body() dto: UpdateTableDto) {
    const current = await this.prisma.table.findFirst({ where: { id, storeId: admin.storeId } });
    if (!current) throw new NotFoundException('桌台不存在');

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
    if (!table) throw new NotFoundException('桌台不存在');
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
    await this.ensureTableCodes(admin.storeId);
    const table = await this.prisma.table.findFirst({ where: { id, storeId: admin.storeId } });
    if (!table) throw new NotFoundException('桌台不存在');
    if (table.isDeleted || !table.isActive) throw new BadRequestException('桌台已停用或已删除，无法生成二维码');
    if (!table.tableCode) throw new BadRequestException('桌台短码生成失败，请稍后重试');

    const secret = String(this.config.get('TABLE_SIGN_SECRET') ?? 'change-me');
    const sign = signTable(admin.storeId, String(table.tableCode), secret);
    const content = `pages/scan/index?s=${encodeURIComponent(admin.storeId)}&t=${encodeURIComponent(
      String(table.tableCode)
    )}&k=${encodeURIComponent(sign)}`;
    const base64 = await this.miniappCode.getWxacode(content);
    return { content, base64 };
  }

  private async getNextTableCode(storeId: string) {
    const rows = await this.prisma.table.findMany({
      where: { storeId },
      select: { tableCode: true }
    });
    const used = new Set<number>();
    for (const row of rows) {
      if (row.tableCode !== null && row.tableCode !== undefined) used.add(row.tableCode);
    }
    let code = 1;
    while (used.has(code)) code += 1;
    if (code > 10000) throw new BadRequestException('桌台短码已达上限');
    return code;
  }

  private async ensureTableCodes(storeId: string) {
    const tables = await this.prisma.table.findMany({
      where: { storeId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, tableCode: true }
    });
    const used = new Set<number>();
    for (const t of tables) {
      if (t.tableCode !== null && t.tableCode !== undefined) used.add(t.tableCode);
    }
    let next = 1;
    const updates: Prisma.PrismaPromise<unknown>[] = [];
    for (const t of tables) {
      if (t.tableCode !== null && t.tableCode !== undefined) continue;
      while (used.has(next)) next += 1;
      if (next > 10000) throw new BadRequestException('桌台短码已达上限');
      updates.push(this.prisma.table.update({ where: { id: t.id }, data: { tableCode: next } }));
      used.add(next);
      next += 1;
    }
    if (updates.length) await this.prisma.$transaction(updates);
  }
}
