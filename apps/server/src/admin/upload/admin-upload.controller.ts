import { Controller, Post, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('admin/upload')
export class AdminUploadController {
  constructor(private config: ConfigService) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (_req, file, cb) => {
          const name = `${randomUUID()}${extname(file.originalname)}`;
          cb(null, name);
        }
      })
    })
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const publicUrl = String(this.config.get('UPLOAD_PUBLIC_URL') ?? '').replace(/\/+$/, '');
    const path = `/uploads/${file.filename}`;
    const url = publicUrl ? `${publicUrl}${path}` : path;
    return { url };
  }
}
