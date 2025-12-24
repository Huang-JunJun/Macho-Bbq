import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { MiniappModule } from './miniapp/miniapp.module';
import { MpModule } from './mp/mp.module';
import { WsModule } from './ws/ws.module';
import { PrintModule } from './print/print.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    WsModule,
    PrintModule,
    AuthModule,
    MiniappModule,
    MpModule,
    AdminModule
  ]
})
export class AppModule {}
