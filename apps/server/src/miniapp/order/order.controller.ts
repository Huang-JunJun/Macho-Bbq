import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto, OrderChannel } from './dto/create-order.dto';
import { OrderListQueryDto } from './dto/order-list-query.dto';
import { formatDateTimeCN } from '../../common/datetime';
import { WsService } from '../../ws/ws.service';
import { PrintService } from '../../print/print.service';

@Controller('order')
export class MiniOrderController {
  constructor(
    private prisma: PrismaService,
    private ws: WsService,
    private print: PrintService
  ) {}

  private createOrderId(channel: OrderChannel) {
    const pad = (n: number) => String(n).padStart(2, '0');
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const mi = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    const prefix = channel === 'DELIVERY' ? 'WM' : channel === 'PICKUP' ? 'DB' : 'TS';
    return `${prefix}${yyyy}${mm}${dd}${hh}${mi}${ss}${rand}`;
  }

  @Post('create')
  async create(@Body() dto: CreateOrderDto) {
    const table = await this.prisma.table.findFirst({ where: { id: dto.tableId, storeId: dto.storeId, isActive: true, isDeleted: false } });
    if (!table) throw new BadRequestException('请先扫码桌贴开始点单');
    if (!table.currentSessionId || table.currentSessionId !== dto.sessionId) throw new BadRequestException('本桌已结账，请重新扫码开桌');

    const session = await this.prisma.dining_session.findFirst({
      where: { id: dto.sessionId, storeId: dto.storeId, tableId: dto.tableId, isDeleted: false }
    });
    if (!session) throw new BadRequestException('请先扫码桌贴开始点单');
    if (session.status !== 'ACTIVE') throw new BadRequestException('本桌已结账，请重新扫码开桌');

    const store = await this.prisma.store.findUnique({ where: { id: dto.storeId } });
    if (!store) throw new BadRequestException('门店不存在');
    const rawOptions = (store as any).spiceOptions ?? [];
    const options = Array.isArray(rawOptions)
      ? rawOptions
          .map((o: any, idx: number) => ({
            key: String(o?.key ?? '').trim(),
            label: String(o?.label ?? '').trim(),
            sort: Number(o?.sort ?? idx + 1),
            enabled: o?.enabled !== false
          }))
          .filter((o: any) => o.key && o.label)
      : [];
    const fallback = [
      { key: 'NONE', label: '不辣', sort: 1, enabled: true },
      { key: 'MILD', label: '微辣', sort: 2, enabled: true },
      { key: 'MEDIUM', label: '中辣', sort: 3, enabled: true },
      { key: 'HOT', label: '特辣', sort: 4, enabled: true }
    ];
    const spiceOptions = options.length ? options : fallback;
    const spiceKey = String((dto as any).spiceKey ?? (dto as any).spiceLevel ?? '').trim();
    if (!spiceKey) throw new BadRequestException('请选择辣度');
    const spiceOption = spiceOptions.find((o) => o.key === spiceKey && o.enabled);
    if (!spiceOption) throw new BadRequestException('辣度选项无效');

    const channel = dto.channel ?? OrderChannel.DINE_IN;
    const reqItems = dto.items && dto.items.length > 0 ? dto.items : null;
    let orderItems: Array<{ productId: string; nameSnapshot: string; priceSnapshot: number; unitSnapshot: string; qty: number }> = [];

    if (reqItems) {
      const productIds = reqItems.map((i) => i.productId);
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds }, storeId: dto.storeId }
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      orderItems = reqItems.map((i) => {
        const p = productMap.get(i.productId);
        if (!p) throw new BadRequestException('购物车中存在已售罄/已下架商品，请先移除后再下单');
        if (!p.isOnSale || p.isSoldOut) throw new BadRequestException('购物车中存在已售罄/已下架商品，请先移除后再下单');
        return {
          productId: p.id,
          nameSnapshot: p.name,
          priceSnapshot: p.price,
          unitSnapshot: p.unit ?? '',
          qty: i.qty
        };
      });
    } else {
      const cartItems = await this.prisma.cart_item.findMany({ where: { sessionId: dto.sessionId } });
      if (cartItems.length === 0) throw new BadRequestException('购物车为空');
      const productIds = cartItems.map((i) => i.productId);
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds }, storeId: dto.storeId }
      });
      const productMap = new Map(products.map((p) => [p.id, p]));
      for (const ci of cartItems) {
        const p = productMap.get(ci.productId);
        if (!p || !p.isOnSale || p.isSoldOut) throw new BadRequestException('购物车中存在已售罄/已下架商品，请先移除后再下单');
      }
      orderItems = cartItems.map((ci) => ({
        productId: ci.productId,
        nameSnapshot: ci.nameSnapshot,
        priceSnapshot: ci.priceSnapshot,
        unitSnapshot: productMap.get(ci.productId)?.unit ?? '',
        qty: ci.qty
      }));
    }

    const amount = orderItems.reduce((sum, it) => sum + it.priceSnapshot * it.qty, 0);

    const id = this.createOrderId(channel);
    const order = await this.prisma.order.create({
      data: {
        id,
        storeId: dto.storeId,
        tableId: dto.tableId,
        sessionId: dto.sessionId,
        dinersCount: dto.dinersCount,
        spiceKey,
        spiceLabelSnapshot: spiceOption.label,
        remark: dto.remark ?? null,
        amount,
        status: 'ORDERED',
        items: { create: orderItems }
      }
    });

    await this.prisma.$transaction([
      this.prisma.cart_item.deleteMany({ where: { sessionId: dto.sessionId } }),
      this.prisma.dining_session.update({
        where: { id: dto.sessionId },
        data: { cartVersion: { increment: 1 } }
      })
    ]);

    await this.ws.emitAdmin(dto.storeId, {
      type: 'order.created',
      sessionId: dto.sessionId,
      storeId: dto.storeId,
      tableId: dto.tableId,
      createdAt: order.createdAt
    });
    await this.ws.emitCartUpdated(dto.sessionId);
    try {
      await this.print.enqueueKitchen(order.id);
    } catch {}

    return { orderId: order.id };
  }

  @Get('list')
  async list(@Query() q: OrderListQueryDto) {
    const orders = await this.prisma.order.findMany({
      where: { sessionId: q.sessionId, status: 'ORDERED' },
      orderBy: { createdAt: 'desc' },
      include: { items: true }
    });
    return {
      orders: orders.map((o) => ({
        ...o,
        spiceLabel: o.spiceLabelSnapshot || o.spiceKey || '',
        createdAt: formatDateTimeCN(o.createdAt),
        updatedAt: formatDateTimeCN(o.updatedAt)
      }))
    };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, status: { in: ['ORDERED', 'SETTLED'] } },
      include: { items: true }
    });
    if (!order) throw new NotFoundException('订单不存在');
    return {
      order: {
        ...order,
        spiceLabel: order.spiceLabelSnapshot || order.spiceKey || '',
        createdAt: formatDateTimeCN(order.createdAt),
        updatedAt: formatDateTimeCN(order.updatedAt)
      }
    };
  }
}
