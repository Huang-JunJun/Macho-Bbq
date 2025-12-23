import { Controller, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentAdmin } from '../../auth/current-admin.decorator';
import { AdminJwtUser } from '../../auth/jwt.strategy';
import { AdminSessionService } from './admin-session.service';

@UseGuards(JwtAuthGuard)
@Controller('admin/session')
export class AdminSessionController {
  constructor(private sessionService: AdminSessionService) {}

  @Put(':sessionId/settle')
  async settle(@CurrentAdmin() admin: AdminJwtUser, @Param('sessionId') sessionId: string) {
    return this.sessionService.settleSession(admin.storeId, sessionId);
  }
}
