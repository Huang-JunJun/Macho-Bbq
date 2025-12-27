import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { formatDateTimeCN } from '../common/datetime';
import { randomBytes } from 'crypto';

@Injectable()
export class PrintService {
  constructor(private prisma: PrismaService) {}

  private formatAmount(amount: number) {
    return `¥${(amount / 100).toFixed(2)}`;
  }

  private buildLines(lines: string[]) {
    return `${lines.join('\n')}\n\n\n`;
  }

  private async getActivePrinter(storeId: string) {
    return this.prisma.printer.findFirst({
      where: { storeId, isActive: true },
      orderBy: { createdAt: 'asc' }
    });
  }

  private async getSessionWithOrders(sessionId: string) {
    const session = await this.prisma.dining_session.findFirst({
      where: { id: sessionId },
      include: {
        store: true,
        table: true,
        orders: {
          where: { status: { not: 'CANCELLED' } },
          orderBy: { createdAt: 'asc' },
          include: { items: true }
        }
      }
    });
    if (!session) throw new NotFoundException('session not found');
    if (!session.orders.length) throw new BadRequestException('session has no orders');
    return session;
  }

  private mergeItems(orders: Array<{ items: Array<{ productId: string; nameSnapshot: string; priceSnapshot: number; qty: number }> }>) {
    const map = new Map<
      string,
      { productId: string; nameSnapshot: string; priceSnapshot: number; totalQty: number; lineTotal: number }
    >();
    for (const o of orders) {
      for (const it of o.items) {
        const existing = map.get(it.productId);
        if (existing) {
          existing.totalQty += it.qty;
          existing.lineTotal += it.priceSnapshot * it.qty;
        } else {
          map.set(it.productId, {
            productId: it.productId,
            nameSnapshot: it.nameSnapshot,
            priceSnapshot: it.priceSnapshot,
            totalQty: it.qty,
            lineTotal: it.priceSnapshot * it.qty
          });
        }
      }
    }
    return Array.from(map.values());
  }

  async buildKitchenTicket(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { store: true, table: true, items: true }
    });
    if (!order) throw new NotFoundException('order not found');
    if (!order.sessionId) throw new BadRequestException('missing sessionId');
    const seqNo = await this.prisma.order.count({
      where: { sessionId: order.sessionId, createdAt: { lte: order.createdAt }, status: { not: 'CANCELLED' } }
    });
    const lines = [
      order.store?.name ?? '',
      '后厨单',
      '-------------------------------',
      `桌号：${order.table?.name ?? order.tableId}`,
      `人数：${order.dinersCount}`,
      `下单时间：${formatDateTimeCN(order.createdAt)}`,
      `第${seqNo}次下单`,
      '-------------------------------'
    ];
    for (const item of order.items) {
      lines.push(`${item.nameSnapshot}  x${item.qty}`);
    }
    lines.push('-------------------------------');
    lines.push(`本次合计：${this.formatAmount(order.amount)}`);
    if (order.remark) lines.push(`备注：${order.remark}`);
    const spiceLabel = (order as any).spiceLabelSnapshot || (order as any).spiceKey || '';
    if (spiceLabel) lines.push(`辣度：${spiceLabel}`);
    return { content: this.buildLines(lines), storeId: order.storeId, sessionId: order.sessionId };
  }

  async buildBillTicket(sessionId: string) {
    const session = await this.getSessionWithOrders(sessionId);
    const orders = session.orders;
    const firstOrderAt = orders[0]?.createdAt ?? session.createdAt;
    const lastOrderAt = orders[orders.length - 1]?.createdAt ?? firstOrderAt;
    const mergedItems = this.mergeItems(orders);
    const totalAmount = orders.reduce((sum, o) => sum + o.amount, 0);
    const lines = [
      session.store?.name ?? '',
      '预结账清单',
      '-------------------------------',
      `桌号：${session.table?.name ?? session.tableId}`,
      `人数：${session.dinersCount}`,
      `首单时间：${formatDateTimeCN(firstOrderAt)}`,
      `末单时间：${formatDateTimeCN(lastOrderAt)}`,
      '-------------------------------'
    ];
    for (const item of mergedItems) {
      lines.push(`${item.nameSnapshot}  x${item.totalQty}  ${this.formatAmount(item.lineTotal)}`);
    }
    lines.push('-------------------------------');
    lines.push(`合计：${this.formatAmount(totalAmount)}`);
    return { content: this.buildLines(lines), storeId: session.storeId, sessionId: session.id };
  }

  async buildReceiptTicket(sessionId: string, operatorEmail?: string) {
    const session = await this.getSessionWithOrders(sessionId);
    const orders = session.orders;
    const firstOrderAt = orders[0]?.createdAt ?? session.createdAt;
    const lastOrderAt = orders[orders.length - 1]?.createdAt ?? firstOrderAt;
    const mergedItems = this.mergeItems(orders);
    const totalAmount = orders.reduce((sum, o) => sum + o.amount, 0);
    const settledAt = session.closedAt ? formatDateTimeCN(session.closedAt) : '-';
    const lines = [
      session.store?.name ?? '',
      '结账凭证',
      '-------------------------------',
      `桌号：${session.table?.name ?? session.tableId}`,
      `人数：${session.dinersCount}`,
      `首单时间：${formatDateTimeCN(firstOrderAt)}`,
      `末单时间：${formatDateTimeCN(lastOrderAt)}`,
      `结账时间：${settledAt}`,
      `收银员：${operatorEmail ?? '-'}`,
      '-------------------------------'
    ];
    for (const item of mergedItems) {
      lines.push(`${item.nameSnapshot}  x${item.totalQty}  ${this.formatAmount(item.lineTotal)}`);
    }
    lines.push('-------------------------------');
    lines.push(`合计：${this.formatAmount(totalAmount)}`);
    return { content: this.buildLines(lines), storeId: session.storeId, sessionId: session.id };
  }

  async enqueueKitchen(orderId: string) {
    const result = await this.buildKitchenTicket(orderId);
    const printer = await this.getActivePrinter(result.storeId);
    if (!printer) return null;
    const key = `kitchen:${orderId}`;
    const existing = await this.prisma.print_job.findUnique({ where: { idempotencyKey: key } });
    if (existing) return existing;
    return this.prisma.print_job.create({
      data: {
        storeId: result.storeId,
        printerId: printer.id,
        type: 'KITCHEN_TICKET',
        sessionId: result.sessionId,
        orderId,
        content: result.content,
        idempotencyKey: key
      }
    });
  }

  async enqueueBill(sessionId: string, operatorAdminUserId?: string) {
    const result = await this.buildBillTicket(sessionId);
    const printer = await this.getActivePrinter(result.storeId);
    if (!printer) throw new BadRequestException('未配置打印机');
    return this.prisma.print_job.create({
      data: {
        storeId: result.storeId,
        printerId: printer.id,
        type: 'BILL_TICKET',
        sessionId: result.sessionId,
        content: result.content,
        operatorAdminUserId
      }
    });
  }

  async enqueueReceipt(
    sessionId: string,
    operatorAdminUserId: string | undefined,
    operatorEmail: string | undefined,
    mode: 'auto' | 'manual'
  ) {
    const result = await this.buildReceiptTicket(sessionId, operatorEmail);
    const printer = await this.getActivePrinter(result.storeId);
    if (!printer) {
      if (mode === 'auto') return null;
      throw new BadRequestException('未配置打印机');
    }
    const key = mode === 'auto' ? `receipt:${sessionId}` : undefined;
    if (key) {
      const existing = await this.prisma.print_job.findUnique({ where: { idempotencyKey: key } });
      if (existing) return existing;
    }
    return this.prisma.print_job.create({
      data: {
        storeId: result.storeId,
        printerId: printer.id,
        type: 'RECEIPT_TICKET',
        sessionId: result.sessionId,
        content: result.content,
        operatorAdminUserId,
        ...(key ? { idempotencyKey: key } : {})
      }
    });
  }

  async validateAgent(printerId: string, agentKey: string) {
    if (!agentKey) throw new UnauthorizedException('invalid agent');
    const printer = await this.prisma.printer.findFirst({
      where: { id: printerId, agentKey }
    });
    if (!printer || !printer.isActive) throw new UnauthorizedException('invalid agent');
    return printer;
  }

  async pullJobs(printerId: string, max: number) {
    return this.prisma.$transaction(async (tx) => {
      const jobs = await tx.print_job.findMany({
        where: { printerId, status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: max
      });
      if (!jobs.length) return [];
      await tx.print_job.updateMany({
        where: { id: { in: jobs.map((j) => j.id) } },
        data: { status: 'PICKED' }
      });
      return jobs;
    });
  }

  async reportJob(printerId: string, jobId: string, ok: boolean, errorMessage?: string) {
    const job = await this.prisma.print_job.findFirst({ where: { id: jobId, printerId } });
    if (!job) throw new NotFoundException('job not found');
    await this.prisma.print_job.update({
      where: { id: jobId },
      data: {
        status: ok ? 'SENT' : 'FAILED',
        errorMessage: ok ? null : errorMessage ?? '打印失败'
      }
    });
    return { ok: true };
  }

  generateAgentKey() {
    return randomBytes(16).toString('hex');
  }
}
