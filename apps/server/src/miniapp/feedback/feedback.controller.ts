import { Body, Controller, Post, Req } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Controller('feedback')
export class MiniFeedbackController {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService
  ) {}

  private tryGetMpUserId(req: any) {
    const raw = String(req?.headers?.authorization ?? '');
    const m = raw.match(/^Bearer\s+(.+)$/i);
    if (!m) return null;
    try {
      const payload: any = this.jwt.verify(m[1]);
      if (payload?.typ === 'mp' && payload?.sub) return String(payload.sub);
    } catch {}
    return null;
  }

  @Post('create')
  async create(@Req() req: any, @Body() dto: CreateFeedbackDto) {
    const mpUserId = this.tryGetMpUserId(req);
    const feedback = await this.prisma.feedback.create({
      data: {
        storeId: dto.storeId,
        tableId: dto.tableId ?? null,
        contact: dto.contact ?? null,
        type: dto.type as any,
        content: dto.content,
        images: dto.images ? (dto.images as any) : null,
        mpUserId: mpUserId ?? null
      }
    });
    return { ok: true, id: feedback.id };
  }
}

