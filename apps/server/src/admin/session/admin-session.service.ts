import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WsService } from '../../ws/ws.service';
import { AdminJwtUser } from '../../auth/jwt.strategy';
import { PrintService } from '../../print/print.service';

@Injectable()
export class AdminSessionService {
  constructor(
    private prisma: PrismaService,
    private ws: WsService,
    private print: PrintService
  ) {}

  async getSession(storeId: string, sessionId: string) {
    const session = await this.prisma.dining_session.findFirst({ where: { id: sessionId, storeId, isDeleted: false } });
    if (!session) throw new NotFoundException('会话不存在');
    return session;
  }

  async getTable(storeId: string, tableId: string) {
    return this.prisma.table.findFirst({ where: { id: tableId, storeId } });
  }

  async settleSession(admin: AdminJwtUser, sessionId: string) {
    const storeId = admin.storeId;
    const session = await this.getSession(storeId, sessionId);
    if (session.status !== 'ACTIVE') throw new BadRequestException('该会话已结账');
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.order.updateMany({
        where: { sessionId, storeId, status: 'ORDERED' },
        data: { status: 'SETTLED', settledAt: now }
      }),
      this.prisma.dining_session.update({
        where: { id: sessionId },
        data: { status: 'CLOSED', closedAt: now, cartVersion: { increment: 1 } }
      }),
      this.prisma.table.updateMany({
        where: { id: session.tableId, storeId },
        data: { currentSessionId: null }
      }),
      this.prisma.cart_item.deleteMany({ where: { sessionId } })
    ]);
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { autoPrintReceiptOnSettle: true }
    });
    if (store?.autoPrintReceiptOnSettle) {
      try {
        await this.print.enqueueReceipt(sessionId, admin.adminUserId, admin.email, 'auto');
      } catch {}
    }
    await this.ws.emitAdmin(storeId, {
      type: 'session.settled',
      sessionId,
      storeId,
      tableId: session.tableId,
      settledAt: now
    });
    await this.ws.emitMp(sessionId, {
      type: 'session.settled',
      sessionId,
      storeId,
      tableId: session.tableId,
      settledAt: now,
      message: '本桌已结账，请重新扫码开桌'
    });
    return { ok: true };
  }

  async moveTable(admin: AdminJwtUser, sessionId: string, fromTableId: string, toTableId: string) {
    const session = await this.prisma.dining_session.findFirst({
      where: { id: sessionId, storeId: admin.storeId, isDeleted: false },
      include: { table: true }
    });
    if (!session) throw new NotFoundException('会话不存在');
    if (session.status !== 'ACTIVE') throw new BadRequestException('该会话已结账');

    const currentTableId = session.tableId;
    const targetId = String(toTableId ?? '');
    if (!targetId) throw new BadRequestException('缺少目标桌台');

    if (currentTableId !== fromTableId && currentTableId !== targetId) throw new BadRequestException('会话桌台不匹配');
    if (currentTableId === targetId) {
      return { ok: true, sessionId, fromTableId: currentTableId, toTableId: targetId };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const target = await tx.table.findFirst({ where: { id: targetId, storeId: admin.storeId } });
      if (!target || target.isDeleted || !target.isActive) throw new BadRequestException('目标桌台不可用');
      if (target.currentSessionId && target.currentSessionId !== sessionId) {
        throw new BadRequestException('目标桌台已有进行中的会话，无法换桌');
      }

      await tx.table.updateMany({
        where: { id: currentTableId, storeId: admin.storeId, currentSessionId: sessionId },
        data: { currentSessionId: null }
      });
      await tx.table.update({
        where: { id: targetId },
        data: { currentSessionId: sessionId }
      });
      await tx.dining_session.update({
        where: { id: sessionId },
        data: { tableId: targetId }
      });
      await tx.table_move_log.create({
        data: {
          storeId: admin.storeId,
          sessionId,
          fromTableId: currentTableId,
          toTableId: targetId,
          operator: admin.email ?? admin.adminUserId,
          adminUserId: admin.adminUserId
        }
      });

      return {
        fromTableName: session.table?.name ?? '',
        toTableName: target.name,
        toTableId: targetId
      };
    });

    await this.ws.emitAdmin(admin.storeId, {
      type: 'session.moved',
      sessionId,
      storeId: admin.storeId,
      fromTableId: currentTableId,
      fromTableName: result.fromTableName,
      toTableId: result.toTableId,
      toTableName: result.toTableName,
      movedAt: new Date()
    });
    await this.ws.emitMp(sessionId, {
      type: 'session.moved',
      sessionId,
      storeId: admin.storeId,
      fromTableId: currentTableId,
      fromTableName: result.fromTableName,
      toTableId: result.toTableId,
      toTableName: result.toTableName,
      movedAt: new Date()
    });

    return { ok: true, sessionId, fromTableId: currentTableId, toTableId: result.toTableId };
  }

  async addOrder(admin: AdminJwtUser, sessionId: string, items: Array<{ productId: string; qty: number }>) {
    const storeId = admin.storeId;
    const session = await this.prisma.dining_session.findFirst({
      where: { id: sessionId, storeId, isDeleted: false },
      include: { table: true }
    });
    if (!session) throw new NotFoundException('会话不存在');
    if (session.status !== 'ACTIVE') throw new BadRequestException('该会话已结账');

    const table = await this.prisma.table.findFirst({ where: { id: session.tableId, storeId } });
    if (!table || table.isDeleted || !table.isActive || table.currentSessionId !== sessionId) {
      throw new BadRequestException('会话无效');
    }

    const merged = new Map<string, number>();
    for (const item of items ?? []) {
      const productId = String(item.productId ?? '').trim();
      const qty = Math.max(0, Math.floor(Number(item.qty ?? 0)));
      if (!productId || qty <= 0) continue;
      merged.set(productId, (merged.get(productId) ?? 0) + qty);
    }
    const normalized = Array.from(merged.entries()).map(([productId, qty]) => ({ productId, qty }));
    if (normalized.length === 0) throw new BadRequestException('请先选择菜品');

    const productIds = normalized.map((it) => it.productId);
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds }, storeId } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const invalidNames: string[] = [];
    for (const item of normalized) {
      const product = productMap.get(item.productId);
      if (!product || !product.isOnSale || product.isSoldOut) {
        invalidNames.push(product?.name ?? item.productId);
      }
    }
    if (invalidNames.length) {
      throw new BadRequestException(`以下商品已下架或售罄：${invalidNames.join('、')}`);
    }

    const orderItems = normalized.map((item) => {
      const product = productMap.get(item.productId)!;
      return {
        productId: item.productId,
        nameSnapshot: product.name,
        priceSnapshot: product.price,
        unitSnapshot: product.unit ?? '',
        qty: item.qty
      };
    });
    const amount = orderItems.reduce((sum, it) => sum + it.priceSnapshot * it.qty, 0);
    const order = await this.prisma.order.create({
      data: {
        storeId,
        tableId: session.tableId,
        sessionId: session.id,
        dinersCount: session.dinersCount,
        amount,
        items: { create: orderItems }
      }
    });

    await this.ws.emitAdmin(storeId, {
      type: 'order.created',
      sessionId: session.id,
      storeId,
      tableId: session.tableId,
      createdAt: order.createdAt
    });
    await this.print.enqueueKitchen(order.id);
    return { ok: true, orderId: order.id };
  }

  async refundItem(admin: AdminJwtUser, sessionId: string, productId: string, qty: number) {
    const storeId = admin.storeId;
    const session = await this.prisma.dining_session.findFirst({
      where: { id: sessionId, storeId, isDeleted: false },
      include: { table: true }
    });
    if (!session) throw new NotFoundException('会话不存在');
    if (session.status !== 'ACTIVE') throw new BadRequestException('该会话已结账');

    const table = await this.prisma.table.findFirst({ where: { id: session.tableId, storeId } });
    if (!table || table.isDeleted || !table.isActive || table.currentSessionId !== sessionId) {
      throw new BadRequestException('会话无效');
    }

    const targetProductId = String(productId ?? '').trim();
    const targetQty = Math.max(0, Math.floor(Number(qty ?? 0)));
    if (!targetProductId || targetQty <= 0) throw new BadRequestException('退菜数量无效');

    const orders = await this.prisma.order.findMany({
      where: { sessionId, storeId, status: { not: 'CANCELLED' } },
      include: { items: true },
      orderBy: { createdAt: 'asc' }
    });
    if (orders.length === 0) throw new BadRequestException('该会话没有订单');

    const mergedMap = new Map<
      string,
      { productId: string; nameSnapshot: string; priceSnapshot: number; totalQty: number }
    >();
    for (const o of orders) {
      for (const item of o.items) {
        const existing = mergedMap.get(item.productId);
        if (existing) {
          existing.totalQty += item.qty;
        } else {
          mergedMap.set(item.productId, {
            productId: item.productId,
            nameSnapshot: item.nameSnapshot,
            priceSnapshot: item.priceSnapshot,
            totalQty: item.qty
          });
        }
      }
    }

    const target = mergedMap.get(targetProductId);
    if (!target) throw new BadRequestException('该菜品不在合并清单中');

    const refundRows = await this.prisma.session_item_refund.findMany({ where: { sessionId } });
    const refundedQty = refundRows
      .filter((r) => r.productId === targetProductId)
      .reduce((sum, r) => sum + r.qty, 0);
    const availableQty = target.totalQty - refundedQty;
    if (availableQty <= 0) throw new BadRequestException('该菜品已全部退完');
    if (targetQty > availableQty) throw new BadRequestException('退菜数量超过可退数量');

    await this.prisma.session_item_refund.create({
      data: {
        storeId,
        sessionId,
        productId: targetProductId,
        nameSnapshot: target.nameSnapshot,
        priceSnapshot: target.priceSnapshot,
        qty: targetQty,
        adminUserId: admin.adminUserId
      }
    });

    await this.ws.emitAdmin(storeId, {
      type: 'session.refunded',
      sessionId,
      storeId,
      tableId: session.tableId
    });

    return { ok: true };
  }

  async batchDeleteSessions(admin: AdminJwtUser, sessionIds: string[]) {
    const storeId = admin.storeId;
    const ids = Array.from(new Set(sessionIds.map((id) => String(id).trim()).filter(Boolean)));
    if (ids.length === 0) throw new BadRequestException('缺少会话编号');
    const sessions = await this.prisma.dining_session.findMany({
      where: { id: { in: ids }, storeId, isDeleted: false }
    });
    if (sessions.length !== ids.length) throw new NotFoundException('会话不存在');
    if (sessions.some((s) => s.status !== 'CLOSED')) {
      throw new BadRequestException('存在未结账会话，无法删除');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const orders = await tx.order.findMany({
        where: { sessionId: { in: ids }, storeId },
        select: { id: true }
      });
      const orderIds = orders.map((o) => o.id);
      if (orderIds.length) {
        await tx.order_item.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.order.deleteMany({ where: { id: { in: orderIds } } });
      }
      await tx.cart_item.deleteMany({ where: { sessionId: { in: ids } } });
      await tx.print_job.deleteMany({ where: { sessionId: { in: ids } } });
      await tx.table_move_log.deleteMany({ where: { sessionId: { in: ids }, storeId } });
      await tx.table.updateMany({ where: { storeId, currentSessionId: { in: ids } }, data: { currentSessionId: null } });
      const updated = await tx.dining_session.updateMany({
        where: { id: { in: ids }, storeId, isDeleted: false },
        data: { isDeleted: true }
      });
      return updated.count;
    });

    return { ok: true, deletedCount: result };
  }
}
