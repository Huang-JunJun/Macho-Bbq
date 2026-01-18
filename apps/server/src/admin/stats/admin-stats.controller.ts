import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { MenuPermission } from '../../auth/menu.decorator';
import { MenuGuard } from '../../auth/menu.guard';
import { CurrentAdmin } from '../../auth/current-admin.decorator';
import { AdminJwtUser } from '../../auth/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { calcDiscount } from '../../common/discount';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function dateKey(date: Date) {
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateValue(value?: string, endOfDay?: boolean) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}${endOfDay ? 'T23:59:59.999' : 'T00:00:00.000'}`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  }
  return parsed;
}

@UseGuards(JwtAuthGuard, RolesGuard, MenuGuard)
@MenuPermission('stats')
@Controller('admin/stats')
export class AdminStatsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async overview(
    @CurrentAdmin() admin: AdminJwtUser,
    @Query('startAt') startAt?: string,
    @Query('endAt') endAt?: string
  ) {
    const start = parseDateValue(startAt);
    const end = parseDateValue(endAt, true);
    if (start && end && start > end) throw new BadRequestException('开始时间不能晚于结束时间');

    const sessions = await this.prisma.dining_session.findMany({
      where: { storeId: admin.storeId, isDeleted: false },
      include: {
        table: true,
        orders: {
          where: { status: { not: 'CANCELLED' } },
          orderBy: { createdAt: 'asc' },
          include: { items: true }
        }
      }
    });

    const sessionIds = sessions.map((s) => s.id);
    const refundRows = sessionIds.length
      ? await this.prisma.session_item_refund.findMany({
          where: { sessionId: { in: sessionIds } },
          select: { sessionId: true, productId: true, qty: true }
        })
      : [];
    const refundMap = new Map<string, Map<string, number>>();
    for (const row of refundRows) {
      const map = refundMap.get(row.sessionId) ?? new Map<string, number>();
      map.set(row.productId, (map.get(row.productId) ?? 0) + row.qty);
      refundMap.set(row.sessionId, map);
    }

    const productTotals = new Map<string, { name: string; qty: number; revenue: number }>();
    const tableTotals = new Map<string, { tableId: string; tableName: string; count: number; revenue: number }>();
    const dayTotals = new Map<string, { revenue: number; original: number; discount: number; orderCount: number }>();
    const heatmapMap = new Map<string, { count: number; revenue: number }>();
    const tableIds = new Set<string>();

    let revenueTotal = 0;
    let originalTotal = 0;
    let discountTotal = 0;
    let orderCount = 0;

    for (const session of sessions) {
      const orders = session.orders;
      if (!orders.length) continue;
      const firstOrderAt = orders[0]?.createdAt ?? session.createdAt;
      if (start && firstOrderAt < start) continue;
      if (end && firstOrderAt > end) continue;

      const merged = new Map<
        string,
        { productId: string; nameSnapshot: string; priceSnapshot: number; totalQty: number; lineTotal: number }
      >();
      for (const o of orders) {
        for (const item of o.items) {
          const existing = merged.get(item.productId);
          if (existing) {
            existing.totalQty += item.qty;
            existing.lineTotal += item.priceSnapshot * item.qty;
          } else {
            merged.set(item.productId, {
              productId: item.productId,
              nameSnapshot: item.nameSnapshot,
              priceSnapshot: item.priceSnapshot,
              totalQty: item.qty,
              lineTotal: item.priceSnapshot * item.qty
            });
          }
        }
      }

      const refunds = refundMap.get(session.id);
      const mergedItems = Array.from(merged.values())
        .map((it) => {
          const refunded = refunds?.get(it.productId) ?? 0;
          const totalQty = Math.max(0, it.totalQty - refunded);
          return {
            ...it,
            totalQty,
            lineTotal: it.priceSnapshot * totalQty
          };
        })
        .filter((it) => it.totalQty > 0);

      const original = mergedItems.reduce((sum, it) => sum + it.lineTotal, 0);
      const { discountAmount, payableTotal } = calcDiscount(
        original,
        session.discountType as any,
        session.discountValue as any
      );
      const ratio = original > 0 ? payableTotal / original : 0;

      revenueTotal += payableTotal;
      originalTotal += original;
      discountTotal += discountAmount;
      orderCount += 1;
      tableIds.add(session.tableId);

      const key = dateKey(firstOrderAt);
      const day = dayTotals.get(key) ?? { revenue: 0, original: 0, discount: 0, orderCount: 0 };
      day.revenue += payableTotal;
      day.original += original;
      day.discount += discountAmount;
      day.orderCount += 1;
      dayTotals.set(key, day);

      const weekday = (firstOrderAt.getDay() + 6) % 7;
      const hour = firstOrderAt.getHours();
      const heatKey = `${weekday}-${hour}`;
      const heat = heatmapMap.get(heatKey) ?? { count: 0, revenue: 0 };
      heat.count += 1;
      heat.revenue += payableTotal;
      heatmapMap.set(heatKey, heat);

      const tableName = session.table?.name ?? session.tableId;
      const table = tableTotals.get(session.tableId) ?? {
        tableId: session.tableId,
        tableName,
        count: 0,
        revenue: 0
      };
      table.count += 1;
      table.revenue += payableTotal;
      tableTotals.set(session.tableId, table);

      for (const item of mergedItems) {
        const discountedLineTotal = Math.round(item.lineTotal * ratio);
        const product = productTotals.get(item.productId) ?? { name: item.nameSnapshot, qty: 0, revenue: 0 };
        product.qty += item.totalQty;
        product.revenue += discountedLineTotal;
        productTotals.set(item.productId, product);
      }
    }

    const productIds = Array.from(productTotals.keys());
    const productRows = productIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: productIds }, storeId: admin.storeId },
          select: { id: true, category: { select: { id: true, name: true } } }
        })
      : [];
    const productCategoryMap = new Map(productRows.map((p) => [p.id, p.category]));

    const categoryTotals = new Map<string, { categoryId: string; name: string; revenue: number }>();
    for (const [productId, total] of productTotals) {
      const category = productCategoryMap.get(productId);
      const categoryId = category?.id ?? 'unknown';
      const categoryName = category?.name ?? '未分类';
      const row = categoryTotals.get(categoryId) ?? { categoryId, name: categoryName, revenue: 0 };
      row.revenue += total.revenue;
      categoryTotals.set(categoryId, row);
    }

    const dates = Array.from(dayTotals.keys()).sort();
    const trend = {
      dates,
      revenue: dates.map((d) => dayTotals.get(d)?.revenue ?? 0),
      original: dates.map((d) => dayTotals.get(d)?.original ?? 0),
      discount: dates.map((d) => dayTotals.get(d)?.discount ?? 0),
      orderCount: dates.map((d) => dayTotals.get(d)?.orderCount ?? 0),
      avgOrder: dates.map((d) => {
        const row = dayTotals.get(d);
        if (!row || row.orderCount === 0) return 0;
        return Math.round(row.revenue / row.orderCount);
      })
    };

    const heatmap = Array.from(heatmapMap.entries()).map(([key, row]) => {
      const [weekday, hour] = key.split('-').map((v) => Number(v));
      return [weekday, hour, row.count];
    });

    const topTables = Array.from(tableTotals.values())
      .sort((a, b) => b.count - a.count || b.revenue - a.revenue)
      .slice(0, 10);

    const topProducts = Array.from(productTotals.entries())
      .map(([productId, total]) => ({ productId, name: total.name, qty: total.qty, revenue: total.revenue }))
      .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
      .slice(0, 10);

    const categoryPie = Array.from(categoryTotals.values()).sort((a, b) => b.revenue - a.revenue);

    return {
      summary: {
        revenue: revenueTotal,
        originalRevenue: originalTotal,
        discountTotal,
        orderCount,
        avgOrderAmount: orderCount ? Math.round(revenueTotal / orderCount) : 0,
        tableCount: tableIds.size
      },
      trend,
      heatmap,
      topTables,
      topProducts,
      categoryPie
    };
  }
}
