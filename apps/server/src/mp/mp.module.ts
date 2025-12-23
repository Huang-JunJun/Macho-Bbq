import { Module } from '@nestjs/common';
import { MpAuthModule } from './mp-auth/mp-auth.module';

@Module({
  imports: [MpAuthModule]
})
export class MpModule {}

