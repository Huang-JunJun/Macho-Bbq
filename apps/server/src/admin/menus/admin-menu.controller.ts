import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { CurrentAdmin } from '../../auth/current-admin.decorator';
import { AdminJwtUser } from '../../auth/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { filterMenuGroups } from './menu.def';
import { resolveMenuKeys } from './menu.helper';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/menus')
export class AdminMenuController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@CurrentAdmin() admin: AdminJwtUser) {
    const allowed = await resolveMenuKeys(this.prisma, admin);
    const groups = filterMenuGroups(allowed);
    return { groups };
  }
}
