import { BadRequestException, Body, Controller, NotFoundException, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { CurrentAdmin } from '../../auth/current-admin.decorator';
import { AdminJwtUser } from '../../auth/jwt.strategy';
import { AdminSessionService } from './admin-session.service';
import { PrintService } from '../../print/print.service';
import { MoveTableDto } from './dto/move-table.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/session')
export class AdminSessionController {
  constructor(
    private sessionService: AdminSessionService,
    private print: PrintService
  ) {}

  @Put(':sessionId/settle')
  @Roles('OWNER', 'STAFF')
  async settle(@CurrentAdmin() admin: AdminJwtUser, @Param('sessionId') sessionId: string) {
    return this.sessionService.settleSession(admin, sessionId);
  }

  @Post(':sessionId/move-table')
  @Roles('OWNER')
  async moveTable(
    @CurrentAdmin() admin: AdminJwtUser,
    @Param('sessionId') sessionId: string,
    @Body() dto: MoveTableDto
  ) {
    return this.sessionService.moveTable(admin, sessionId, dto.fromTableId, dto.toTableId);
  }

  @Post(':sessionId/print/bill')
  @Roles('OWNER', 'STAFF')
  async printBill(@CurrentAdmin() admin: AdminJwtUser, @Param('sessionId') sessionId: string) {
    const session = await this.sessionService.getSession(admin.storeId, sessionId);
    if (session.status !== 'ACTIVE') throw new BadRequestException('session already closed');
    const table = await this.sessionService.getTable(admin.storeId, session.tableId);
    if (!table || table.currentSessionId !== sessionId) throw new BadRequestException('session invalid');
    await this.print.enqueueBill(sessionId, admin.adminUserId);
    return { ok: true };
  }

  @Post(':sessionId/print/receipt')
  @Roles('OWNER', 'STAFF')
  async printReceipt(@CurrentAdmin() admin: AdminJwtUser, @Param('sessionId') sessionId: string) {
    const session = await this.sessionService.getSession(admin.storeId, sessionId);
    if (session.status !== 'CLOSED') throw new BadRequestException('session not settled');
    if (!session.closedAt) throw new NotFoundException('settledAt missing');
    await this.print.enqueueReceipt(sessionId, admin.adminUserId, admin.email, 'manual');
    return { ok: true };
  }
}
