import { Controller, Get, Param, NotFoundException, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { CurrentAdmin } from '../../auth/current-admin.decorator';
import { AdminJwtUser } from '../../auth/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { formatDateTimeCN } from '../../common/datetime';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
@Controller('admin/feedback')
export class AdminFeedbackController {
  constructor(private prisma: PrismaService) {}

  @Get('list')
  async list(@CurrentAdmin() admin: AdminJwtUser, @Query('limit') limit?: string) {
    const take = Math.min(Math.max(Number(limit ?? 100) || 100, 1), 200);
    const rows = await this.prisma.feedback.findMany({
      where: { storeId: admin.storeId },
      orderBy: { createdAt: 'desc' },
      take,
      include: { table: true }
    });
    return {
      feedbacks: rows.map((f) => ({
        ...f,
        createdAt: formatDateTimeCN(f.createdAt),
        images: (f.images as any) ?? null
      }))
    };
  }

  @Get(':id')
  async get(@CurrentAdmin() admin: AdminJwtUser, @Param('id') id: string) {
    const row = await this.prisma.feedback.findFirst({
      where: { id, storeId: admin.storeId },
      include: { table: true }
    });
    if (!row) throw new NotFoundException('feedback not found');
    return {
      feedback: { ...row, createdAt: formatDateTimeCN(row.createdAt), images: (row.images as any) ?? null }
    };
  }
}
