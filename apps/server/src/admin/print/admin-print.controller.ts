import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { CurrentAdmin } from '../../auth/current-admin.decorator';
import { AdminJwtUser } from '../../auth/jwt.strategy';
import { PrintService } from '../../print/print.service';
import { CreatePrinterDto } from './dto/create-printer.dto';
import { UpdatePrinterDto } from './dto/update-printer.dto';
import { PrintJobQueryDto } from './dto/print-job-query.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
@Controller('admin/print')
export class AdminPrintController {
  constructor(
    private prisma: PrismaService,
    private print: PrintService
  ) {}

  @Get('printers')
  async listPrinters(@CurrentAdmin() admin: AdminJwtUser) {
    const printers = await this.prisma.printer.findMany({
      where: { storeId: admin.storeId },
      orderBy: { createdAt: 'desc' }
    });
    return { printers };
  }

  @Post('printers')
  async createPrinter(@CurrentAdmin() admin: AdminJwtUser, @Body() dto: CreatePrinterDto) {
    const printer = await this.prisma.printer.create({
      data: {
        storeId: admin.storeId,
        name: dto.name,
        provider: 'USB_AGENT',
        agentKey: this.print.generateAgentKey(),
        isActive: true
      }
    });
    return { printer };
  }

  @Put('printers/:id')
  async updatePrinter(@CurrentAdmin() admin: AdminJwtUser, @Param('id') id: string, @Body() dto: UpdatePrinterDto) {
    const printer = await this.prisma.printer.findFirst({ where: { id, storeId: admin.storeId } });
    if (!printer) throw new NotFoundException('printer not found');
    const updated = await this.prisma.printer.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.isActive === undefined ? {} : { isActive: dto.isActive })
      }
    });
    return { printer: updated };
  }

  @Get('jobs')
  async listJobs(@CurrentAdmin() admin: AdminJwtUser, @Query() q: PrintJobQueryDto) {
    const where: any = { storeId: admin.storeId };
    if (q.type) where.type = q.type;
    if (q.status) where.status = q.status;
    const startAt = q.startAt ? new Date(q.startAt) : null;
    const endAt = q.endAt ? new Date(q.endAt) : null;
    if (startAt || endAt) {
      where.createdAt = {};
      if (startAt) where.createdAt.gte = startAt;
      if (endAt) where.createdAt.lte = endAt;
    }
    if (q.keyword) {
      const tables = await this.prisma.table.findMany({
        where: { storeId: admin.storeId, name: { contains: q.keyword } },
        select: { id: true }
      });
      const tableIds = tables.map((t) => t.id);
      const sessions = tableIds.length
        ? await this.prisma.dining_session.findMany({
            where: { storeId: admin.storeId, tableId: { in: tableIds } },
            select: { id: true }
          })
        : [];
      const sessionIds = sessions.map((s) => s.id);
      where.OR = [
        { sessionId: { contains: q.keyword } },
        { orderId: { contains: q.keyword } },
        sessionIds.length ? { sessionId: { in: sessionIds } } : undefined
      ].filter(Boolean);
    }
    const jobs = await this.prisma.print_job.findMany({
      where,
      include: {
        printer: true,
        operator: true,
        session: { include: { table: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return {
      jobs: jobs.map((j) => ({
        id: j.id,
        type: j.type,
        status: j.status,
        sessionId: j.sessionId,
        orderId: j.orderId,
        printerName: j.printer?.name ?? '',
        tableName: j.session?.table?.name ?? '',
        operatorEmail: j.operator?.email ?? '',
        errorMessage: j.errorMessage,
        createdAt: j.createdAt,
        updatedAt: j.updatedAt
      }))
    };
  }

  @Post('jobs/:id/retry')
  async retryJob(@CurrentAdmin() admin: AdminJwtUser, @Param('id') id: string) {
    const job = await this.prisma.print_job.findFirst({ where: { id, storeId: admin.storeId } });
    if (!job) throw new NotFoundException('job not found');
    if (job.status !== 'FAILED') throw new BadRequestException('仅失败任务可重试');
    const printer = await this.prisma.printer.findFirst({ where: { id: job.printerId, storeId: admin.storeId } });
    if (!printer) throw new NotFoundException('printer not found');
    const newJob = await this.prisma.print_job.create({
      data: {
        storeId: admin.storeId,
        printerId: printer.id,
        type: job.type,
        sessionId: job.sessionId,
        orderId: job.orderId,
        content: job.content,
        operatorAdminUserId: admin.adminUserId
      }
    });
    return { job: newJob };
  }
}
