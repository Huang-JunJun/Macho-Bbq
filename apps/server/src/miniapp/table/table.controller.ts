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

  private parseTableCode(raw?: string) {
    if (!raw) return null;
    const num = Math.floor(Number(raw));
    if (!Number.isFinite(num) || num <= 0) throw new BadRequestException('桌台短码无效');
    return num;
  }

  @Get('resolve')
  async resolve(@Query() q: ResolveTableDto) {
    const secret = String(this.config.get('TABLE_SIGN_SECRET') ?? 'change-me');
    const tableCode = this.parseTableCode(q.tableCode);
    const tableKey = tableCode ? String(tableCode) : String(q.tableId ?? '');
    if (!q.storeId || !tableKey || !q.sign) throw new BadRequestException('参数缺失');
    const ok = verifyTableSign(q.storeId, tableKey, secret, q.sign);
    if (!ok) throw new BadRequestException('桌贴无效/已过期，请联系店员');

    const table = tableCode
      ? await this.prisma.table.findFirst({
          where: { storeId: q.storeId, tableCode, isActive: true, isDeleted: false }
        })
      : await this.prisma.table.findFirst({
          where: { id: q.tableId, storeId: q.storeId, isActive: true, isDeleted: false }
        });
    if (!table) throw new BadRequestException('桌号无效或已停用');
    const store = await this.prisma.store.findUnique({ where: { id: q.storeId } });
    return { ok: true, table, store, tableName: table.name, storeName: store?.name ?? '' };
  }

  @Post('session/start')
  async startSession(@Body() dto: StartTableSessionDto) {
    const secret = String(this.config.get('TABLE_SIGN_SECRET') ?? 'change-me');
    const tableCode = this.parseTableCode(dto.tableCode);
    const tableKey = tableCode ? String(tableCode) : String(dto.tableId ?? '');
    if (!dto.storeId || !tableKey || !dto.sign) throw new BadRequestException('参数缺失');
    const ok = verifyTableSign(dto.storeId, tableKey, secret, dto.sign);
    if (!ok) throw new BadRequestException('桌贴无效/已过期，请联系店员');

    const table = tableCode
      ? await this.prisma.table.findFirst({
          where: { storeId: dto.storeId, tableCode, isActive: true, isDeleted: false }
        })
      : await this.prisma.table.findFirst({
          where: { id: dto.tableId, storeId: dto.storeId, isActive: true, isDeleted: false }
        });
    if (!table) throw new BadRequestException('桌号无效或已停用');

    const store = await this.prisma.store.findUnique({ where: { id: dto.storeId } });
    if (!store) throw new NotFoundException('门店不存在');

    const existing = await this.prisma.dining_session.findFirst({
      where: { storeId: dto.storeId, tableId: table.id, status: 'ACTIVE', isDeleted: false },
      orderBy: { createdAt: 'desc' }
    });

    const session = existing
      ? await this.prisma.dining_session.update({
          where: { id: existing.id },
          data: { dinersCount: dto.dinersCount }
        })
      : await this.prisma.dining_session.create({
          data: { storeId: dto.storeId, tableId: table.id, status: 'ACTIVE', dinersCount: dto.dinersCount }
        });

    await this.prisma.table.update({
      where: { id: table.id },
      data: { currentSessionId: session.id }
    });

    return {
      sessionId: session.id,
      storeId: dto.storeId,
      tableId: table.id,
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
