import { Controller, Post, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { MenuPermission } from '../../auth/menu.decorator';
import { MenuGuard } from '../../auth/menu.guard';

@UseGuards(JwtAuthGuard, RolesGuard, MenuGuard)
@MenuPermission('products')
@Controller('admin/upload')
export class AdminUploadController {
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
    const path = `/uploads/${file.filename}`;
    return { url: path };
  }
}
