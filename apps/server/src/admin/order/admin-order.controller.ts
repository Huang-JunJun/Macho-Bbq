import { BadRequestException, Controller, Delete, Get, NotFoundException, Param, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { CurrentAdmin } from '../../auth/current-admin.decorator';
import { AdminJwtUser } from '../../auth/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminOrderListQueryDto } from './dto/admin-order-list-query.dto';
import { formatDateTimeCN } from '../../common/datetime';
import { AdminSessionService } from '../session/admin-session.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'STAFF')
@Controller('admin/order')
export class AdminOrderController {
  constructor(private prisma: PrismaService, private sessionService: AdminSessionService) {}

  @Get('list')
  async list(@CurrentAdmin() admin: AdminJwtUser, @Query() q: AdminOrderListQueryDto) {
    const sessions = await this.prisma.dining_session.findMany({
      where: { storeId: admin.storeId, ...(q.status ? { status: q.status } : {}) },
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
          createdAt: formatDateTimeCN(firstOrderAt),
          lastOrderAt: formatDateTimeCN(lastOrderAt),
          settledAt: s.closedAt ? formatDateTimeCN(s.closedAt) : null,
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
    if (!sessionId) throw new BadRequestException('sessionId required');
    const session = await this.prisma.dining_session.findFirst({
      where: { id: sessionId, storeId: admin.storeId },
      include: {
        table: true,
        orders: {
          where: { status: { not: 'CANCELLED' } },
          orderBy: { createdAt: 'asc' },
          include: { items: true }
        }
      }
    });
    if (!session) throw new NotFoundException('session not found');
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
      createdAt: formatDateTimeCN(o.createdAt),
      amount: o.amount,
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
        createdAt: formatDateTimeCN(firstOrderAt),
        lastOrderAt: formatDateTimeCN(lastOrderAt),
        settledAt: session.closedAt ? formatDateTimeCN(session.closedAt) : null,
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
    if (!order) throw new NotFoundException('order not found');
    return {
      order: {
        ...order,
        createdAt: formatDateTimeCN(order.createdAt),
        updatedAt: formatDateTimeCN(order.updatedAt),
        settledAt: order.settledAt ? formatDateTimeCN(order.settledAt) : null
      }
    };
  }

  @Put(':id/settle')
  async settle(@CurrentAdmin() admin: AdminJwtUser, @Param('id') id: string) {
    const order = await this.prisma.order.findFirst({ where: { id, storeId: admin.storeId } });
    if (!order) throw new NotFoundException('order not found');
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
    if (!order) throw new NotFoundException('order not found');
    await this.prisma.$transaction([
      this.prisma.order_item.deleteMany({ where: { orderId: id } }),
      this.prisma.order.delete({ where: { id } })
    ]);
    return { ok: true };
  }
}
