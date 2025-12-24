import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { useContainer } from 'class-validator';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { WsService } from './ws/ws.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const env = String(config.get('NODE_ENV') ?? '').toLowerCase();
      if (!env || env === 'development') return cb(null, true);
      const allowed = new Set([
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174'
      ]);
      return cb(null, allowed.has(origin));
    }
  });

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true
    })
  );

  const uploadDir = join(process.cwd(), 'uploads');
  mkdirSync(uploadDir, { recursive: true });
  app.useStaticAssets(uploadDir, { prefix: '/uploads' });

  const port = Number(config.get('PORT') ?? 3000);
  await app.listen(port, '0.0.0.0');
  const wsService = app.get(WsService);
  wsService.init(app.getHttpServer());
}

bootstrap();
