import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { AdminJwtUser } from './jwt.strategy';
import { MENU_KEY } from './menu.decorator';
import { resolveMenuKeys } from '../admin/menus/menu.helper';

@Injectable()
export class MenuGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const menuKey = this.reflector.getAllAndOverride<string>(MENU_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!menuKey) return true;
    const req = context.switchToHttp().getRequest();
    const user = req.user as AdminJwtUser | undefined;
    if (!user?.adminUserId || !user.storeId) return false;
    if (user.role === 'OWNER') return true;
    const allowed = await resolveMenuKeys(this.prisma, user);
    return allowed.has(menuKey);
  }
}
