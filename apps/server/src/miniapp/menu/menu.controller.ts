import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MenuQueryDto } from './dto/menu-query.dto';

@Controller()
export class MiniMenuController {
  constructor(private prisma: PrismaService) {}

  @Get('menu')
  async menu(@Query() q: MenuQueryDto) {
    const categories = await this.prisma.category.findMany({
      where: { storeId: q.storeId },
      orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
      include: {
        products: {
          where: { storeId: q.storeId, isOnSale: true, isSoldOut: false },
          orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }]
        }
      }
    });
    return { categories };
  }
}
