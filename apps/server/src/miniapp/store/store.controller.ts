import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('store')
export class MiniStoreController {
  constructor(private prisma: PrismaService) {}

  @Get(':storeId/info')
  async info(@Param('storeId') storeId: string) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('store not found');
    const spiceLabels =
      (store as any).spiceLabels ??
      ({ NONE: '不辣', MILD: '微辣', MEDIUM: '中辣', HOT: '特辣' } as any);
    return { store: { ...store, spiceLabels } as any };
  }
}
