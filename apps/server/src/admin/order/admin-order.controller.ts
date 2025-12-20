import { Controller, Get, NotFoundException, Param, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentAdmin } from '../../auth/current-admin.decorator';
import { AdminJwtUser } from '../../auth/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminOrderListQueryDto } from './dto/admin-order-list-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('admin/order')
export class AdminOrderController {
  constructor(private prisma: PrismaService) {}

  @Get('list')
  async list(@CurrentAdmin() admin: AdminJwtUser, @Query() q: AdminOrderListQueryDto) {
    const status = q.status ?? 'ORDERED';
    const orders = await this.prisma.order.findMany({
      where: { storeId: admin.storeId, status },
      orderBy: { createdAt: 'desc' },
      include: { items: true }
    });
    return { orders };
  }

  @Get(':id')
  async get(@CurrentAdmin() admin: AdminJwtUser, @Param('id') id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, storeId: admin.storeId },
      include: { items: true }
    });
    if (!order) throw new NotFoundException('order not found');
    return { order };
  }

  @Put(':id/settle')
  async settle(@CurrentAdmin() admin: AdminJwtUser, @Param('id') id: string) {
    const order = await this.prisma.order.findFirst({ where: { id, storeId: admin.storeId } });
    if (!order) throw new NotFoundException('order not found');
    await this.prisma.order.update({
      where: { id },
      data: { status: 'SETTLED' }
    });
    return { ok: true };
  }
}
