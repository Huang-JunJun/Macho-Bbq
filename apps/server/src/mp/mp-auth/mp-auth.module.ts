import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { MpAuthController } from './mp-auth.controller';
import { MpAuthService } from './mp-auth.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MpAuthController],
  providers: [MpAuthService]
})
export class MpAuthModule {}

