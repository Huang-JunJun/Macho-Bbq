import { BadRequestException, Body, Controller, Delete, NotFoundException, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { MenuPermission } from '../../auth/menu.decorator';
import { MenuGuard } from '../../auth/menu.guard';
import { CurrentAdmin } from '../../auth/current-admin.decorator';
import { AdminJwtUser } from '../../auth/jwt.strategy';
import { AdminSessionService } from './admin-session.service';
import { PrintService } from '../../print/print.service';
import { MoveTableDto } from './dto/move-table.dto';
import { BatchDeleteSessionDto } from './dto/batch-delete.dto';
import { AddSessionItemsDto } from './dto/add-items.dto';
import { RefundItemDto } from './dto/refund-item.dto';
import { SessionDiscountDto } from './dto/discount.dto';

@UseGuards(JwtAuthGuard, RolesGuard, MenuGuard)
@MenuPermission('orders')
@Controller('admin/session')
export class AdminSessionController {
  constructor(
    private sessionService: AdminSessionService,
    private print: PrintService
  ) {}

  @Put(':sessionId/settle')
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
  async printBill(@CurrentAdmin() admin: AdminJwtUser, @Param('sessionId') sessionId: string) {
    const session = await this.sessionService.getSession(admin.storeId, sessionId);
    if (session.status !== 'ACTIVE') throw new BadRequestException('该会话已结账');
    const table = await this.sessionService.getTable(admin.storeId, session.tableId);
    if (!table || table.currentSessionId !== sessionId) throw new BadRequestException('会话无效');
    await this.print.enqueueBill(sessionId, admin.adminUserId);
    return { ok: true };
  }

  @Post(':sessionId/print/receipt')
  async printReceipt(@CurrentAdmin() admin: AdminJwtUser, @Param('sessionId') sessionId: string) {
    const session = await this.sessionService.getSession(admin.storeId, sessionId);
    if (session.status !== 'CLOSED') throw new BadRequestException('会话尚未结账');
    if (!session.closedAt) throw new NotFoundException('结账时间缺失');
    await this.print.enqueueReceipt(sessionId, admin.adminUserId, admin.email, 'manual');
    return { ok: true };
  }

  @Post(':sessionId/add-order')
  async addOrder(
    @CurrentAdmin() admin: AdminJwtUser,
    @Param('sessionId') sessionId: string,
    @Body() dto: AddSessionItemsDto
  ) {
    return this.sessionService.addOrder(admin, sessionId, dto.items);
  }

  @Post(':sessionId/refund-item')
  async refundItem(
    @CurrentAdmin() admin: AdminJwtUser,
    @Param('sessionId') sessionId: string,
    @Body() dto: RefundItemDto
  ) {
    return this.sessionService.refundItem(admin, sessionId, dto.productId, dto.qty);
  }

  @Put(':sessionId/discount')
  async setDiscount(
    @CurrentAdmin() admin: AdminJwtUser,
    @Param('sessionId') sessionId: string,
    @Body() dto: SessionDiscountDto
  ) {
    return this.sessionService.setDiscount(admin, sessionId, dto.type, dto.value);
  }

  @Delete(':sessionId/discount')
  async clearDiscount(@CurrentAdmin() admin: AdminJwtUser, @Param('sessionId') sessionId: string) {
    return this.sessionService.clearDiscount(admin, sessionId);
  }

  @Post('batch-delete')
  @Roles('OWNER')
  async batchDelete(@CurrentAdmin() admin: AdminJwtUser, @Body() dto: BatchDeleteSessionDto) {
    return this.sessionService.batchDeleteSessions(admin, dto.sessionIds);
  }
}
