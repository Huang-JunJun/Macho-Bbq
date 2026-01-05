import { PrismaService } from '../../prisma/prisma.service';
import { AdminJwtUser } from '../../auth/jwt.strategy';
import { ALL_MENU_KEYS } from './menu.def';

export const DEFAULT_STAFF_KEYS = ['orders', 'table-dashboard'];

export async function resolveMenuKeys(prisma: PrismaService, admin: AdminJwtUser) {
  if (admin.role === 'OWNER') return new Set(ALL_MENU_KEYS);
  const staff = await prisma.admin_user.findFirst({
    where: { id: admin.adminUserId, storeId: admin.storeId },
    select: {
      role: true,
      roleRef: { select: { menuKeys: true } }
    }
  });
  if (staff?.role === 'OWNER') return new Set(ALL_MENU_KEYS);
  const rawKeys = Array.isArray(staff?.roleRef?.menuKeys)
    ? staff?.roleRef?.menuKeys
    : staff?.role === 'STAFF'
      ? DEFAULT_STAFF_KEYS
      : [];
  const allowed = new Set<string>();
  for (const key of rawKeys) {
    const value = String(key ?? '').trim();
    if (value && ALL_MENU_KEYS.has(value)) allowed.add(value);
  }
  return allowed;
}
