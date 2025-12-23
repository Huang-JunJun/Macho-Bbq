import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const store = await prisma.store.upsert({
    where: { id: 'store_demo' },
    update: {
      name: '猛男烧烤',
      address: '美兰区琼东北街附近',
      businessHours: '18:00-次日 01:45',
      phone: '15595767778',
      spiceLabels: { NONE: '不辣', MILD: '微辣', MEDIUM: '中辣', HOT: '特辣' } as any
    },
    create: {
      id: 'store_demo',
      name: '猛男烧烤',
      address: '美兰区琼东北街附近',
      businessHours: '18:00-次日 01:45',
      phone: '15595767778',
      spiceLabels: { NONE: '不辣', MILD: '微辣', MEDIUM: '中辣', HOT: '特辣' } as any
    }
  });

  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.admin_user.upsert({
    where: { email: 'admin@example.com' },
    update: { passwordHash, storeId: store.id, role: 'OWNER' },
    create: { email: 'admin@example.com', passwordHash, storeId: store.id, role: 'OWNER' }
  });

  const desiredA1Id = 'table_demo_a1';
  const desiredA2Id = 'table_demo_a2';

  const existingA1 = await prisma.table.findFirst({ where: { storeId: store.id, name: 'A1' } });
  if (existingA1 && existingA1.id !== desiredA1Id) {
    await prisma.table.delete({ where: { id: existingA1.id } });
  }

  const tableA1 = await prisma.table.upsert({
    where: { id: desiredA1Id },
    update: { name: '1号桌', storeId: store.id, isActive: true, isDeleted: false },
    create: { id: desiredA1Id, storeId: store.id, name: '1号桌', isActive: true, isDeleted: false }
  });

  const existingA2 = await prisma.table.findFirst({ where: { storeId: store.id, name: 'A2' } });
  if (existingA2 && existingA2.id !== desiredA2Id) {
    await prisma.table.delete({ where: { id: existingA2.id } });
  }

  await prisma.table.upsert({
    where: { id: desiredA2Id },
    update: { name: '2号桌', storeId: store.id, isActive: true, isDeleted: false },
    create: { id: desiredA2Id, storeId: store.id, name: '2号桌', isActive: true, isDeleted: false }
  });

  const categoryMeat = await prisma.category.upsert({
    where: { storeId_name: { storeId: store.id, name: '烤肉系列' } },
    update: { sort: 1 },
    create: { storeId: store.id, name: '烤肉系列', sort: 1 }
  });

  const categoryVeg = await prisma.category.upsert({
    where: { storeId_name: { storeId: store.id, name: '烤蔬菜系列' } },
    update: { sort: 2 },
    create: { storeId: store.id, name: '烤蔬菜系列', sort: 2 }
  });

  await prisma.product.upsert({
    where: { id: 'prod_beef_1' },
    update: {
      name: '牛肉串',
      price: 1200,
      imageUrl: null,
      isOnSale: true,
      isSoldOut: false,
      sort: 1,
      storeId: store.id,
      categoryId: categoryMeat.id
    },
    create: {
      id: 'prod_beef_1',
      name: '牛肉串',
      price: 1200,
      imageUrl: null,
      isOnSale: true,
      isSoldOut: false,
      sort: 1,
      storeId: store.id,
      categoryId: categoryMeat.id
    }
  });

  await prisma.product.upsert({
    where: { id: 'prod_corn_1' },
    update: {
      name: '玉米',
      price: 600,
      imageUrl: null,
      isOnSale: true,
      isSoldOut: false,
      sort: 1,
      storeId: store.id,
      categoryId: categoryVeg.id
    },
    create: {
      id: 'prod_corn_1',
      name: '玉米',
      price: 600,
      imageUrl: null,
      isOnSale: true,
      isSoldOut: false,
      sort: 1,
      storeId: store.id,
      categoryId: categoryVeg.id
    }
  });

  await prisma.order.deleteMany({ where: { storeId: store.id, tableId: tableA1.id, status: 'ORDERED' } });

  console.log(`storeId=${store.id}`);
  console.log(`tableId=${tableA1.id}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
