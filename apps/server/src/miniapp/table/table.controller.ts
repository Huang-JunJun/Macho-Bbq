import { BadRequestException, Body, Controller, Get, NotFoundException, Post, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { verifyTableSign } from '../../common/crypto';
import { ResolveTableDto } from './dto/resolve-table.dto';
import { StartTableSessionDto } from './dto/start-session.dto';

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
    if (!ok) throw new BadRequestException('桌贴无效/已过期，请联系店员');

    const table = await this.prisma.table.findFirst({
      where: { id: q.tableId, storeId: q.storeId, isActive: true, isDeleted: false }
    });
    if (!table) throw new BadRequestException('桌号无效或已停用');
    const store = await this.prisma.store.findUnique({ where: { id: q.storeId } });
    return { ok: true, table, store, tableName: table.name, storeName: store?.name ?? '' };
  }

  @Post('session/start')
  async startSession(@Body() dto: StartTableSessionDto) {
    const secret = String(this.config.get('TABLE_SIGN_SECRET') ?? 'change-me');
    const ok = verifyTableSign(dto.storeId, dto.tableId, secret, dto.sign);
    if (!ok) throw new BadRequestException('桌贴无效/已过期，请联系店员');

    const table = await this.prisma.table.findFirst({
      where: { id: dto.tableId, storeId: dto.storeId, isActive: true, isDeleted: false }
    });
    if (!table) throw new BadRequestException('桌号无效或已停用');

    const store = await this.prisma.store.findUnique({ where: { id: dto.storeId } });
    if (!store) throw new NotFoundException('store not found');

    const existing = await this.prisma.dining_session.findFirst({
      where: { storeId: dto.storeId, tableId: dto.tableId, status: 'ACTIVE', isDeleted: false },
      orderBy: { createdAt: 'desc' }
    });

    const session = existing
      ? await this.prisma.dining_session.update({
          where: { id: existing.id },
          data: { dinersCount: dto.dinersCount }
        })
      : await this.prisma.dining_session.create({
          data: { storeId: dto.storeId, tableId: dto.tableId, status: 'ACTIVE', dinersCount: dto.dinersCount }
        });

    await this.prisma.table.update({
      where: { id: table.id },
      data: { currentSessionId: session.id }
    });

    return {
      sessionId: session.id,
      storeId: dto.storeId,
      tableId: dto.tableId,
      storeName: store.name,
      tableName: table.name,
      dinersCount: session.dinersCount
    };
  }

  @Get('session/check')
  async checkSession(@Query('storeId') storeId: string, @Query('tableId') tableId: string, @Query('sessionId') sessionId: string) {
    const sid = String(sessionId ?? '');
    const stid = String(storeId ?? '');
    const tid = String(tableId ?? '');
    if (!stid || !tid || !sid) throw new BadRequestException('参数缺失');

    const table = await this.prisma.table.findFirst({
      where: { id: tid, storeId: stid, isActive: true, isDeleted: false, currentSessionId: sid }
    });
    if (!table) return { valid: false };

    const session = await this.prisma.dining_session.findFirst({ where: { id: sid, storeId: stid, tableId: tid, status: 'ACTIVE', isDeleted: false } });
    if (!session) return { valid: false };
    return { valid: true };
  }
}
