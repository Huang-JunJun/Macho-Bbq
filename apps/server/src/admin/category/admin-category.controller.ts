import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentAdmin } from '../../auth/current-admin.decorator';
import { AdminJwtUser } from '../../auth/jwt.strategy';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@UseGuards(JwtAuthGuard)
@Controller('admin/category')
export class AdminCategoryController {
  constructor(private prisma: PrismaService) {}

  @Post()
  async create(@CurrentAdmin() admin: AdminJwtUser, @Body() dto: CreateCategoryDto) {
    const category = await this.prisma.category.create({
      data: { storeId: admin.storeId, name: dto.name, sort: dto.sort ?? 0 }
    });
    return { category };
  }

  @Get()
  async list(@CurrentAdmin() admin: AdminJwtUser) {
    const categories = await this.prisma.category.findMany({
      where: { storeId: admin.storeId },
      orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }]
    });
    return { categories };
  }

  @Get(':id')
  async get(@CurrentAdmin() admin: AdminJwtUser, @Param('id') id: string) {
    const category = await this.prisma.category.findFirst({ where: { id, storeId: admin.storeId } });
    if (!category) throw new NotFoundException('category not found');
    return { category };
  }

  @Put(':id')
  async update(@CurrentAdmin() admin: AdminJwtUser, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    const current = await this.prisma.category.findFirst({ where: { id, storeId: admin.storeId } });
    if (!current) throw new NotFoundException('category not found');

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.sort === undefined ? {} : { sort: dto.sort })
      }
    });
    return { category };
  }

  @Delete(':id')
  async remove(@CurrentAdmin() admin: AdminJwtUser, @Param('id') id: string) {
    const category = await this.prisma.category.findFirst({ where: { id, storeId: admin.storeId } });
    if (!category) throw new NotFoundException('category not found');
    await this.prisma.category.delete({ where: { id } });
    return { ok: true };
  }
}
