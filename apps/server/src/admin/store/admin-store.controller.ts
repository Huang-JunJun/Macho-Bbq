import { Body, Controller, Put, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentAdmin } from '../../auth/current-admin.decorator';
import { AdminJwtUser } from '../../auth/jwt.strategy';
import { UpdateStoreDto } from './dto/update-store.dto';

@UseGuards(JwtAuthGuard)
@Controller('admin/store')
export class AdminStoreController {
  constructor(private prisma: PrismaService) {}

  private sanitizeSpiceLabels(input?: Record<string, string>) {
    if (!input) return undefined;
    const pick = (k: string) => {
      const v = input[k];
      if (typeof v !== 'string') return undefined;
      const s = v.trim();
      return s ? s : undefined;
    };
    const res = {
      NONE: pick('NONE'),
      MILD: pick('MILD'),
      MEDIUM: pick('MEDIUM'),
      HOT: pick('HOT')
    };
    const hasAny = Object.values(res).some(Boolean);
    if (!hasAny) return null;
    return res;
  }

  @Put()
  async update(@CurrentAdmin() admin: AdminJwtUser, @Body() dto: UpdateStoreDto) {
    const spiceLabels = this.sanitizeSpiceLabels(dto.spiceLabels);
    const data: Record<string, unknown> = {
      name: dto.name,
      address: dto.address ?? null,
      businessHours: dto.businessHours ?? null,
      phone: dto.phone ?? null
    };
    if (spiceLabels === null) data.spiceLabels = Prisma.DbNull;
    if (spiceLabels && typeof spiceLabels === 'object') data.spiceLabels = spiceLabels;
    const store = await this.prisma.store.update({
      where: { id: admin.storeId },
      data
    });
    return { store };
  }
}
