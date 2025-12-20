import { BadRequestException, Controller, Get, NotFoundException, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { verifyTableSign } from '../../common/crypto';
import { ResolveTableDto } from './dto/resolve-table.dto';

@Controller('table')
export class MiniTableController {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService
  ) {}

  @Get('resolve')
  async resolve(@Query() q: ResolveTableDto) {
    const secret = String(this.config.get('TABLE_SIGN_SECRET') ?? 'change-me');
    const ok = verifyTableSign(q.storeId, q.tableId, secret, q.sign);
    if (!ok) throw new BadRequestException('invalid sign');

    const table = await this.prisma.table.findFirst({
      where: { id: q.tableId, storeId: q.storeId, isActive: true }
    });
    if (!table) throw new NotFoundException('table not found');
    return { ok: true, table };
  }
}

