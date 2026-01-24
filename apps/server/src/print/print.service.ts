import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { formatDateTimeCN } from '../common/datetime';
import { randomBytes } from 'crypto';
import { calcDiscount } from '../common/discount';

const MAX_PRINT_CONTENT_BYTES = 200000;
const PRINT_LINE_WIDTH = 48;
const PRINT_NAME_COL = 24;
const PRINT_PRICE_COL = 7;
const PRINT_QTY_COL = 5;
const PRINT_TOTAL_COL = 9;
const PRINT_NAME_CONTINUATION = '  ';
const PRINT_TAIL_LINES = 6;
const PRINT_KITCHEN_TAIL_LINES = 5;

@Injectable()
export class PrintService {
  constructor(private prisma: PrismaService) {}

  private formatAmount(amount: number) {
    return `¥${(amount / 100).toFixed(2)}`;
  }

  private formatAmountPlain(amount: number) {
    return (amount / 100).toFixed(2);
  }

  private textWidth(text: string) {
    let width = 0;
    for (const ch of String(text ?? '')) {
      const code = ch.codePointAt(0) ?? 0;
      width += code > 0xff ? 2 : 1;
    }
    return width;
  }

  private splitByWidth(text: string, maxWidth: number) {
    const value = String(text ?? '');
    let width = 0;
    let idx = 0;
    for (const ch of value) {
      const code = ch.codePointAt(0) ?? 0;
      const w = code > 0xff ? 2 : 1;
      if (width + w > maxWidth) break;
      width += w;
      idx += ch.length;
    }
    return { line: value.slice(0, idx), rest: value.slice(idx) };
  }

  private padRight(text: string, maxWidth: number, truncate = true) {
    const line = truncate ? this.splitByWidth(text, maxWidth).line : String(text ?? '');
    const pad = maxWidth - this.textWidth(line);
    return line + ' '.repeat(Math.max(0, pad));
  }

  private padLeft(text: string, maxWidth: number, truncate = true) {
    const line = truncate ? this.splitByWidth(text, maxWidth).line : String(text ?? '');
    const pad = maxWidth - this.textWidth(line);
    return ' '.repeat(Math.max(0, pad)) + line;
  }

  private wrapText(text: string, maxWidth: number, indent = '') {
    const lines: string[] = [];
    let remaining = String(text ?? '');
    let first = true;
    while (remaining.length > 0) {
      const prefix = first ? '' : indent;
      const available = maxWidth - this.textWidth(prefix);
      const { line, rest } = this.splitByWidth(remaining, Math.max(0, available));
      if (!line) break;
      lines.push(prefix + line);
      remaining = rest;
      first = false;
    }
    if (!lines.length) lines.push(indent ? indent : '');
    return lines;
  }

  private twoColumn(left: string, right: string) {
    const leftText = String(left ?? '');
    const rightText = String(right ?? '');
    const total = this.textWidth(leftText) + this.textWidth(rightText);
    if (total + 1 <= PRINT_LINE_WIDTH) {
      const spaces = PRINT_LINE_WIDTH - this.textWidth(leftText) - this.textWidth(rightText);
      return [leftText + ' '.repeat(spaces) + rightText];
    }
    return [leftText, rightText];
  }

  private lineWithValue(label: string, value: string) {
    return this.twoColumn(label, value);
  }

  private itemHeaderLine() {
    return (
      this.padRight('品名', PRINT_NAME_COL) +
      ' ' +
      this.padLeft('单价', PRINT_PRICE_COL) +
      ' ' +
      this.padLeft('数量', PRINT_QTY_COL) +
      ' ' +
      this.padLeft('小计', PRINT_TOTAL_COL)
    );
  }

  private buildItemLines(name: string, priceText: string, qtyText: string, totalText: string) {
    const { line: firstChunk, rest } = this.splitByWidth(name, PRINT_NAME_COL);
    const lines = [
      this.padRight(firstChunk, PRINT_NAME_COL) +
        ' ' +
        this.padLeft(priceText, PRINT_PRICE_COL, false) +
        ' ' +
        this.padLeft(qtyText, PRINT_QTY_COL, false) +
        ' ' +
        this.padLeft(totalText, PRINT_TOTAL_COL, false)
    ];
    let remaining = rest;
    while (remaining.length > 0) {
      const available = PRINT_LINE_WIDTH - this.textWidth(PRINT_NAME_CONTINUATION);
      const next = this.splitByWidth(remaining, Math.max(0, available));
      if (!next.line) break;
      lines.push(`${PRINT_NAME_CONTINUATION}${next.line}`);
      remaining = next.rest;
    }
    return lines;
  }

  private buildKitchenItemLines(name: string, qty: number) {
    const qtyText = `x${qty}`;
    const qtyWidth = this.textWidth(qtyText);
    const nameWidth = Math.max(0, PRINT_LINE_WIDTH - qtyWidth - 1);
    const { line: firstChunk, rest } = this.splitByWidth(name, nameWidth);
    const lines = [this.padRight(firstChunk, nameWidth) + ' ' + qtyText];
    let remaining = rest;
    while (remaining.length > 0) {
      const available = PRINT_LINE_WIDTH - this.textWidth(PRINT_NAME_CONTINUATION);
      const next = this.splitByWidth(remaining, Math.max(0, available));
      if (!next.line) break;
      lines.push(`${PRINT_NAME_CONTINUATION}${next.line}`);
      remaining = next.rest;
    }
    return lines;
  }

  private formatKitchenTableLine(tableName: string) {
    const esc = '\x1b';
    const gs = '\x1d';
    const boldOn = `${esc}E\x01`;
    const boldOff = `${esc}E\x00`;
    const sizeOn = `${gs}!\x11`;
    const sizeOff = `${gs}!\x00`;
    return `${boldOn}${sizeOn}桌号：${tableName}${sizeOff}${boldOff}`;
  }

  private assertPrintContentSize(content: string) {
    const size = Buffer.byteLength(content ?? '', 'utf8');
    if (size > MAX_PRINT_CONTENT_BYTES) {
      throw new BadRequestException('打印内容过长，请减少内容后重试');
    }
  }

  async createJob(data: Prisma.print_jobCreateInput) {
    this.assertPrintContentSize(String(data.content ?? ''));
    try {
      return await this.prisma.print_job.create({ data });
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2000') {
        throw new BadRequestException('打印内容过长，请减少内容后重试');
      }
      throw err;
    }
  }

  private buildLines(lines: string[], tailLines = 3) {
    return `${lines.join('\n')}\n${'\n'.repeat(Math.max(0, tailLines))}`;
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
    if (!session) throw new NotFoundException('会话不存在');
    if (!session.orders.length) throw new BadRequestException('该会话没有订单');
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

  private applyRefunds(
    mergedItems: Array<{ productId: string; nameSnapshot: string; priceSnapshot: number; totalQty: number; lineTotal: number }>,
    refunds: Array<{ productId: string; qty: number }>
  ) {
    const refundMap = new Map<string, number>();
    for (const r of refunds) {
      refundMap.set(r.productId, (refundMap.get(r.productId) ?? 0) + r.qty);
    }
    return mergedItems
      .map((it) => {
        const refunded = refundMap.get(it.productId) ?? 0;
        const totalQty = Math.max(0, it.totalQty - refunded);
        return {
          ...it,
          totalQty,
          lineTotal: it.priceSnapshot * totalQty
        };
      })
      .filter((it) => it.totalQty > 0);
  }

  async buildKitchenTicket(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { store: true, table: true, items: true }
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (!order.sessionId) throw new BadRequestException('缺少会话编号');
    const seqNo = await this.prisma.order.count({
      where: { sessionId: order.sessionId, createdAt: { lte: order.createdAt }, status: { not: 'CANCELLED' } }
    });
    const tableName = order.table?.name ?? order.tableId;
    const separator = '-'.repeat(PRINT_LINE_WIDTH);
    const lines = [
      this.formatKitchenTableLine(tableName),
      order.store?.name ?? '',
      '后厨单',
      separator,
      `人数：${order.dinersCount}`,
      `下单时间：${formatDateTimeCN(order.createdAt)}`,
      `第${seqNo}次下单`,
      separator
    ];
    for (const item of order.items) {
      lines.push(...this.buildKitchenItemLines(item.nameSnapshot, item.qty));
    }
    lines.push(separator);
    if (order.remark) lines.push(`备注：${order.remark}`);
    const spiceLabel = (order as any).spiceLabelSnapshot || (order as any).spiceKey || '';
    if (spiceLabel) lines.push(`辣度：${spiceLabel}`);
    return {
      content: this.buildLines(lines, PRINT_KITCHEN_TAIL_LINES),
      storeId: order.storeId,
      sessionId: order.sessionId
    };
  }

  private async buildSessionTicket(sessionId: string, title: string) {
    const session = await this.getSessionWithOrders(sessionId);
    const orders = session.orders;
    const firstOrderAt = orders[0]?.createdAt ?? session.createdAt;
    const lastOrderAt = orders[orders.length - 1]?.createdAt ?? firstOrderAt;
    const refunds = await this.prisma.session_item_refund.findMany({ where: { sessionId } });
    const mergedItems = this.applyRefunds(this.mergeItems(orders), refunds);
    const originalTotal = mergedItems.reduce((sum, it) => sum + it.lineTotal, 0);
    const { discountAmount, payableTotal } = calcDiscount(
      originalTotal,
      session.discountType as any,
      session.discountValue as any
    );
    const tableName = session.table?.name ?? session.tableId;
    const settledAt = session.closedAt ? formatDateTimeCN(session.closedAt) : '-';
    const separator = '-'.repeat(PRINT_LINE_WIDTH);
    const lines: string[] = [];
    lines.push(session.store?.name ?? '');
    lines.push(title);
    lines.push(separator);
    lines.push(...this.twoColumn(`桌台: ${tableName}`, `人数: ${session.dinersCount}`));
    lines.push(`订单次数: ${orders.length}`);
    lines.push(`下单时间: ${formatDateTimeCN(firstOrderAt)}`);
    lines.push(`最后加菜: ${formatDateTimeCN(lastOrderAt)}`);
    lines.push(`结账时间: ${settledAt}`);
    lines.push(separator);
    lines.push(this.itemHeaderLine());
    lines.push(separator);
    for (const item of mergedItems) {
      lines.push(
        ...this.buildItemLines(
          item.nameSnapshot,
          this.formatAmountPlain(item.priceSnapshot),
          String(item.totalQty),
          this.formatAmountPlain(item.lineTotal)
        )
      );
    }
    lines.push(separator);
    if (discountAmount > 0) {
      lines.push(...this.lineWithValue('订单折扣', `-${this.formatAmountPlain(discountAmount)}`));
      lines.push(separator);
      lines.push(...this.lineWithValue('原价合计:', this.formatAmountPlain(originalTotal)));
      lines.push(...this.lineWithValue('折扣金额:', `-${this.formatAmountPlain(discountAmount)}`));
      lines.push(...this.lineWithValue('应付合计:', this.formatAmountPlain(payableTotal)));
    } else {
      lines.push(...this.lineWithValue('合计:', this.formatAmountPlain(originalTotal)));
    }
    lines.push(separator);
    lines.push(`打印时间: ${formatDateTimeCN(new Date())}`);
    lines.push('谢谢惠顾，请核对金额');
    return {
      content: this.buildLines(lines, PRINT_TAIL_LINES),
      storeId: session.storeId,
      sessionId: session.id
    };
  }

  async buildBillTicket(sessionId: string) {
    return this.buildSessionTicket(sessionId, '预结账清单');
  }

  async buildReceiptTicket(sessionId: string) {
    return this.buildSessionTicket(sessionId, '结账清单');
  }

  async enqueueKitchen(orderId: string) {
    const result = await this.buildKitchenTicket(orderId);
    const printer = await this.getActivePrinter(result.storeId);
    if (!printer) return null;
    const key = `kitchen:${orderId}`;
    const existing = await this.prisma.print_job.findUnique({ where: { idempotencyKey: key } });
    if (existing) return existing;
    return this.createJob({
      store: { connect: { id: result.storeId } },
      printer: { connect: { id: printer.id } },
      session: { connect: { id: result.sessionId } },
      type: 'KITCHEN_TICKET',
      orderId,
      content: result.content,
      idempotencyKey: key
    });
  }

  async enqueueBill(sessionId: string, operatorAdminUserId?: string) {
    const result = await this.buildBillTicket(sessionId);
    const printer = await this.getActivePrinter(result.storeId);
    if (!printer) throw new BadRequestException('未配置打印机');
    return this.createJob({
      store: { connect: { id: result.storeId } },
      printer: { connect: { id: printer.id } },
      session: { connect: { id: result.sessionId } },
      type: 'BILL_TICKET',
      content: result.content,
      ...(operatorAdminUserId ? { operator: { connect: { id: operatorAdminUserId } } } : {})
    });
  }

  async enqueueReceipt(
    sessionId: string,
    operatorAdminUserId: string | undefined,
    operatorEmail: string | undefined,
    mode: 'auto' | 'manual'
  ) {
    const result = await this.buildReceiptTicket(sessionId);
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
    return this.createJob({
      store: { connect: { id: result.storeId } },
      printer: { connect: { id: printer.id } },
      session: { connect: { id: result.sessionId } },
      type: 'RECEIPT_TICKET',
      content: result.content,
      ...(operatorAdminUserId ? { operator: { connect: { id: operatorAdminUserId } } } : {}),
      ...(key ? { idempotencyKey: key } : {})
    });
  }

  async validateAgent(printerId: string, agentKey: string) {
    if (!agentKey) throw new UnauthorizedException('打印机校验失败');
    const printer = await this.prisma.printer.findFirst({
      where: { id: printerId, agentKey }
    });
    if (!printer || !printer.isActive) throw new UnauthorizedException('打印机校验失败');
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
    if (!job) throw new NotFoundException('打印任务不存在');
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
