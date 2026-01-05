import { BadRequestException, Controller, Delete, Get, NotFoundException, Param, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { MenuPermission } from '../../auth/menu.decorator';
import { MenuGuard } from '../../auth/menu.guard';
import { CurrentAdmin } from '../../auth/current-admin.decorator';
import { AdminJwtUser } from '../../auth/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminOrderListQueryDto } from './dto/admin-order-list-query.dto';
import { AdminSessionService } from '../session/admin-session.service';

@UseGuards(JwtAuthGuard, RolesGuard, MenuGuard)
@MenuPermission('orders')
@Controller('admin/order')
export class AdminOrderController {
  constructor(private prisma: PrismaService, private sessionService: AdminSessionService) {}

  @Get('list')
  async list(@CurrentAdmin() admin: AdminJwtUser, @Query() q: AdminOrderListQueryDto) {
    const sessions = await this.prisma.dining_session.findMany({
      where: { storeId: admin.storeId, isDeleted: false, ...(q.status ? { status: q.status } : {}) },
      include: {
        table: true,
        orders: {
          where: { status: { not: 'CANCELLED' } },
          select: { id: true, amount: true, createdAt: true },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    const startAt = q.startAt ? new Date(q.startAt) : null;
    const endAt = q.endAt ? new Date(q.endAt) : null;
    const rows = sessions
      .map((s) => {
        const orders = s.orders;
        if (!orders.length) return null;
        const firstOrderAt = orders[0]?.createdAt ?? s.createdAt;
        const lastOrderAt = orders[orders.length - 1]?.createdAt ?? firstOrderAt;
        const totalAmount = orders.reduce((sum, o) => sum + o.amount, 0);
        return {
          sessionId: s.id,
          tableId: s.tableId,
          tableName: s.table?.name ?? null,
          dinersCount: s.dinersCount,
          status: s.status,
          orderCount: orders.length,
          totalAmount,
          createdAt: firstOrderAt,
          lastOrderAt: lastOrderAt,
          settledAt: s.closedAt ?? null,
          _createdAt: firstOrderAt,
          _lastOrderAt: lastOrderAt
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .filter((row) => {
        if (startAt && row._createdAt < startAt) return false;
        if (endAt && row._createdAt > endAt) return false;
        return true;
      })
      .sort((a, b) => b._lastOrderAt.getTime() - a._lastOrderAt.getTime())
      .map(({ _createdAt, _lastOrderAt, ...rest }) => rest);
    return { orders: rows };
  }

  @Get('detail')
  async detail(@CurrentAdmin() admin: AdminJwtUser, @Query('sessionId') sessionId: string) {
    if (!sessionId) throw new BadRequestException('缺少会话编号');
    const session = await this.prisma.dining_session.findFirst({
      where: { id: sessionId, storeId: admin.storeId, isDeleted: false },
      include: {
        table: true,
        orders: {
          where: { status: { not: 'CANCELLED' } },
          orderBy: { createdAt: 'asc' },
          include: { items: true }
        }
      }
    });
    if (!session) throw new NotFoundException('会话不存在');
    const store = await this.prisma.store.findUnique({ where: { id: admin.storeId } });
    const rawOptions = (store as any)?.spiceOptions ?? [];
    const spiceOptions = Array.isArray(rawOptions)
      ? rawOptions
          .map((o: any, idx: number) => ({
            key: String(o?.key ?? '').trim(),
            label: String(o?.label ?? '').trim(),
            sort: Number(o?.sort ?? idx + 1),
            enabled: o?.enabled !== false
          }))
          .filter((o: any) => o.key && o.label)
      : [];
    const spiceMap = new Map(spiceOptions.map((o) => [o.key, o.label]));
    const orders = session.orders;
    const firstOrderAt = orders[0]?.createdAt ?? session.createdAt;
    const lastOrderAt = orders[orders.length - 1]?.createdAt ?? firstOrderAt;
    const mergedMap = new Map<
      string,
      {
        productId: string;
        nameSnapshot: string;
        priceSnapshot: number;
        totalQty: number;
        lineTotal: number;
      }
    >();
    for (const o of orders) {
      for (const item of o.items) {
        const existing = mergedMap.get(item.productId);
        if (existing) {
          existing.totalQty += item.qty;
          existing.lineTotal += item.priceSnapshot * item.qty;
        } else {
          mergedMap.set(item.productId, {
            productId: item.productId,
            nameSnapshot: item.nameSnapshot,
            priceSnapshot: item.priceSnapshot,
            totalQty: item.qty,
            lineTotal: item.priceSnapshot * item.qty
          });
        }
      }
    }
    const mergedItems = Array.from(mergedMap.values());
    const totalAmount = orders.reduce((sum, o) => sum + o.amount, 0);
    const detailOrders = orders.map((o, index) => ({
      orderId: o.id,
      seqNo: index + 1,
      createdAt: o.createdAt,
      amount: o.amount,
      spiceLabel: o.spiceLabelSnapshot || (o.spiceKey ? spiceMap.get(o.spiceKey) : '') || o.spiceKey || '',
      remark: o.remark ?? '',
      items: o.items.map((it) => ({
        productId: it.productId,
        nameSnapshot: it.nameSnapshot,
        priceSnapshot: it.priceSnapshot,
        qty: it.qty,
        lineTotal: it.priceSnapshot * it.qty
      }))
    }));
    return {
      session: {
        sessionId: session.id,
        tableId: session.tableId,
        tableName: session.table?.name ?? null,
        dinersCount: session.dinersCount,
        status: session.status,
        createdAt: firstOrderAt,
        lastOrderAt: lastOrderAt,
        settledAt: session.closedAt ?? null,
        orderCount: orders.length
      },
      totalAmount,
      mergedItems,
      orders: detailOrders
    };
  }

  @Get(':id')
  async get(@CurrentAdmin() admin: AdminJwtUser, @Param('id') id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, storeId: admin.storeId },
      include: { items: true, table: true }
    });
    if (!order) throw new NotFoundException('订单不存在');
    return {
      order: {
        ...order,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        settledAt: order.settledAt ?? null
      }
    };
  }

  @Put(':id/settle')
  async settle(@CurrentAdmin() admin: AdminJwtUser, @Param('id') id: string) {
    const order = await this.prisma.order.findFirst({ where: { id, storeId: admin.storeId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.sessionId) {
      return this.sessionService.settleSession(admin, order.sessionId);
    }
    const now = new Date();
    await this.prisma.order.update({
      where: { id },
      data: { status: 'SETTLED', settledAt: now }
    });
    await this.prisma.table.updateMany({ where: { id: order.tableId, storeId: admin.storeId }, data: { currentSessionId: null } });
    return { ok: true };
  }

  @Delete(':id')
  @Roles('OWNER')
  async remove(@CurrentAdmin() admin: AdminJwtUser, @Param('id') id: string) {
    const order = await this.prisma.order.findFirst({ where: { id, storeId: admin.storeId } });
    if (!order) throw new NotFoundException('订单不存在');
    await this.prisma.$transaction([
      this.prisma.order_item.deleteMany({ where: { orderId: id } }),
      this.prisma.order.delete({ where: { id } })
    ]);
    return { ok: true };
  }
}
