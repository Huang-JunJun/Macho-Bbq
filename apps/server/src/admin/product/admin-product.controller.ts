import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { MenuPermission } from '../../auth/menu.decorator';
import { MenuGuard } from '../../auth/menu.guard';
import { CurrentAdmin } from '../../auth/current-admin.decorator';
import { AdminJwtUser } from '../../auth/jwt.strategy';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

function normalizeImagePath(raw?: string | null) {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  if (value.startsWith('/')) return value;
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const pathname = url.pathname || '/';
      const uploadsIndex = pathname.indexOf('/uploads/');
      if (uploadsIndex >= 0) return pathname.slice(uploadsIndex);
      if (pathname === '/uploads') return '/uploads';
      return pathname;
    } catch {
      return value;
    }
  }
  return `/${value}`;
}

@UseGuards(JwtAuthGuard, RolesGuard, MenuGuard)
@MenuPermission('products')
@Controller('admin/product')
export class AdminProductController {
  constructor(private prisma: PrismaService) {}

  @Post()
  async create(@CurrentAdmin() admin: AdminJwtUser, @Body() dto: CreateProductDto) {
    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, storeId: admin.storeId },
      select: { id: true }
    });
    if (!category) throw new NotFoundException('类目不存在');

    const product = await this.prisma.product.create({
      data: {
        storeId: admin.storeId,
        categoryId: dto.categoryId,
        name: dto.name,
        price: dto.price,
        unit: dto.unit ?? '',
        imageUrl: normalizeImagePath(dto.imageUrl),
        isOnSale: dto.isOnSale ?? true,
        isSoldOut: dto.isSoldOut ?? false,
        sort: dto.sort ?? 0
      }
    });
    return { product };
  }

  @Get()
  async list(@CurrentAdmin() admin: AdminJwtUser) {
    const products = await this.prisma.product.findMany({
      where: { storeId: admin.storeId },
      orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }]
    });
    return { products };
  }

  @Get(':id')
  async get(@CurrentAdmin() admin: AdminJwtUser, @Param('id') id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, storeId: admin.storeId } });
    if (!product) throw new NotFoundException('商品不存在');
    return { product };
  }

  @Put(':id')
  async update(@CurrentAdmin() admin: AdminJwtUser, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    const current = await this.prisma.product.findFirst({ where: { id, storeId: admin.storeId } });
    if (!current) throw new NotFoundException('商品不存在');

    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, storeId: admin.storeId },
        select: { id: true }
      });
      if (!category) throw new NotFoundException('类目不存在');
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.price === undefined ? {} : { price: dto.price }),
        ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
        ...(dto.imageUrl === undefined ? {} : { imageUrl: normalizeImagePath(dto.imageUrl) }),
        ...(dto.unit === undefined ? {} : { unit: dto.unit ?? '' }),
        ...(dto.isOnSale === undefined ? {} : { isOnSale: dto.isOnSale }),
        ...(dto.isSoldOut === undefined ? {} : { isSoldOut: dto.isSoldOut }),
        ...(dto.sort === undefined ? {} : { sort: dto.sort })
      }
    });
    return { product };
  }

  @Delete(':id')
  async remove(@CurrentAdmin() admin: AdminJwtUser, @Param('id') id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, storeId: admin.storeId } });
    if (!product) throw new NotFoundException('商品不存在');
    await this.prisma.product.delete({ where: { id } });
    return { ok: true };
  }
}
