import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { MiniappModule } from './miniapp/miniapp.module';
import { MpModule } from './mp/mp.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    MiniappModule,
    MpModule,
    AdminModule
  ]
})
export class AppModule {}
