import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: String(config.get('JWT_SECRET') ?? 'change-me'),
        signOptions: { expiresIn: '7d' }
      })
    })
  ],
  providers: [JwtStrategy, RolesGuard],
  exports: [JwtModule, RolesGuard]
})
export class AuthModule {}
