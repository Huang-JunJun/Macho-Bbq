import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WsService } from './ws.service';

@Module({
  imports: [AuthModule],
  providers: [WsService],
  exports: [WsService]
})
export class WsModule {}
