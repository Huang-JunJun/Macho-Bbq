import { BadRequestException, Body, Controller, Get, NotFoundException, Put, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { CurrentAdmin } from '../../auth/current-admin.decorator';
import { AdminJwtUser } from '../../auth/jwt.strategy';
import { UpdateStoreDto } from './dto/update-store.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
@Controller('admin/store')
export class AdminStoreController {
  constructor(private prisma: PrismaService) {}

  private sanitizeSpiceOptions(input?: Array<{ key: string; label: string; sort: number; enabled: boolean }>) {
    if (input === undefined) return undefined;
    if (!Array.isArray(input)) throw new BadRequestException('辣度配置格式不正确');
    const seen = new Set<string>();
    const list = input.map((raw, idx) => {
      const key = String((raw as any)?.key ?? '').trim();
      const label = String((raw as any)?.label ?? '').trim();
      if (!key) throw new BadRequestException('辣度 key 不能为空');
      if (!label) throw new BadRequestException('辣度名称不能为空');
      if (seen.has(key)) throw new BadRequestException('辣度 key 重复');
      seen.add(key);
      const sort = Number((raw as any)?.sort ?? idx + 1);
      if (!Number.isFinite(sort)) throw new BadRequestException('辣度排序必须为数字');
      const enabled = (raw as any)?.enabled === false ? false : true;
      return { key, label, sort, enabled };
    });
    if (!list.some((o) => o.enabled)) throw new BadRequestException('至少启用一个辣度');
    return list.sort((a, b) => a.sort - b.sort);
  }

  @Get()
  async get(@CurrentAdmin() admin: AdminJwtUser) {
    const store = await this.prisma.store.findUnique({ where: { id: admin.storeId } });
    if (!store) throw new NotFoundException('store not found');
    return { store };
  }

  @Put()
  async update(@CurrentAdmin() admin: AdminJwtUser, @Body() dto: UpdateStoreDto) {
    const spiceOptions = this.sanitizeSpiceOptions(dto.spiceOptions);
    const data: Record<string, unknown> = {
      name: dto.name,
      address: dto.address ?? null,
      businessHours: dto.businessHours ?? null,
      phone: dto.phone ?? null
    };
    if (dto.autoPrintReceiptOnSettle !== undefined) {
      data.autoPrintReceiptOnSettle = dto.autoPrintReceiptOnSettle;
    }
    if (spiceOptions) data.spiceOptions = spiceOptions;
    const store = await this.prisma.store.update({
      where: { id: admin.storeId },
      data
    });
    return { store };
  }
}
