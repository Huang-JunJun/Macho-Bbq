import { Body, Controller, Put, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentAdmin } from '../../auth/current-admin.decorator';
import { AdminJwtUser } from '../../auth/jwt.strategy';
import { UpdateStoreDto } from './dto/update-store.dto';

@UseGuards(JwtAuthGuard)
@Controller('admin/store')
export class AdminStoreController {
  constructor(private prisma: PrismaService) {}

  @Put()
  async update(@CurrentAdmin() admin: AdminJwtUser, @Body() dto: UpdateStoreDto) {
    const store = await this.prisma.store.update({
      where: { id: admin.storeId },
      data: { name: dto.name, address: dto.address ?? null }
    });
    return { store };
  }
}

