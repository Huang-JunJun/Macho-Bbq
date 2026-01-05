import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('store')
export class MiniStoreController {
  constructor(private prisma: PrismaService) {}

  @Get(':storeId/info')
  async info(@Param('storeId') storeId: string) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('门店不存在');
    const rawOptions = (store as any).spiceOptions ?? [];
    const options = Array.isArray(rawOptions)
      ? rawOptions
          .map((o: any, idx: number) => ({
            key: String(o?.key ?? '').trim(),
            label: String(o?.label ?? '').trim(),
            sort: Number(o?.sort ?? idx + 1),
            enabled: o?.enabled !== false
          }))
          .filter((o: any) => o.key && o.label && o.enabled)
          .sort((a: any, b: any) => a.sort - b.sort)
      : [];
    return { store: { ...store, spiceOptions: options } as any };
  }
}
