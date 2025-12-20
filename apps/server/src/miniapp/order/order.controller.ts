import { Body, Controller, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderListQueryDto } from './dto/order-list-query.dto';

@Controller('order')
export class MiniOrderController {
  constructor(private prisma: PrismaService) {}

  @Post('create')
  async create(@Body() dto: CreateOrderDto) {
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, storeId: dto.storeId, isOnSale: true, isSoldOut: false }
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const orderItems = dto.items.map((i) => {
      const p = productMap.get(i.productId);
      if (!p) throw new NotFoundException(`product not found: ${i.productId}`);
      return {
        productId: p.id,
        nameSnapshot: p.name,
        priceSnapshot: p.price,
        qty: i.qty
      };
    });

    const amount = orderItems.reduce((sum, it) => sum + it.priceSnapshot * it.qty, 0);

    const order = await this.prisma.order.create({
      data: {
        storeId: dto.storeId,
        tableId: dto.tableId,
        spiceLevel: dto.spiceLevel,
        remark: dto.remark ?? null,
        amount,
        status: 'ORDERED',
        items: { create: orderItems }
      }
    });

    return { orderId: order.id };
  }

  @Get('list')
  async list(@Query() q: OrderListQueryDto) {
    const orders = await this.prisma.order.findMany({
      where: { storeId: q.storeId, tableId: q.tableId, status: { in: ['ORDERED', 'SETTLED'] } },
      orderBy: { createdAt: 'desc' },
      include: { items: true }
    });
    return { orders };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, status: { in: ['ORDERED', 'SETTLED'] } },
      include: { items: true }
    });
    if (!order) throw new NotFoundException('order not found');
    return { order };
  }
}

