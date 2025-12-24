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
    const session = await this.prisma.dining_session.findFirst({ where: { id: sessionId, storeId } });
    if (!session) throw new NotFoundException('session not found');
    return session;
  }

  async getTable(storeId: string, tableId: string) {
    return this.prisma.table.findFirst({ where: { id: tableId, storeId } });
  }

  async settleSession(admin: AdminJwtUser, sessionId: string) {
    const storeId = admin.storeId;
    const session = await this.getSession(storeId, sessionId);
    if (session.status !== 'ACTIVE') throw new BadRequestException('session already closed');
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
      where: { id: sessionId, storeId: admin.storeId },
      include: { table: true }
    });
    if (!session) throw new NotFoundException('session not found');
    if (session.status !== 'ACTIVE') throw new BadRequestException('session already closed');

    const currentTableId = session.tableId;
    const targetId = String(toTableId ?? '');
    if (!targetId) throw new BadRequestException('toTableId required');

    if (currentTableId !== fromTableId && currentTableId !== targetId) throw new BadRequestException('session table mismatch');
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
}
