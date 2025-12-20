import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const store = await prisma.store.upsert({
    where: { id: 'store_demo' },
    update: { name: '猛男烧烤', address: 'Demo Street' },
    create: { id: 'store_demo', name: '猛男烧烤', address: 'Demo Street' }
  });

  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.admin_user.upsert({
    where: { email: 'admin@example.com' },
    update: { passwordHash, storeId: store.id },
    create: { email: 'admin@example.com', passwordHash, storeId: store.id }
  });

  const tableA1 = await prisma.table.upsert({
    where: { storeId_name: { storeId: store.id, name: 'A1' } },
    update: { isActive: true },
    create: { storeId: store.id, name: 'A1', isActive: true }
  });

  await prisma.table.upsert({
    where: { storeId_name: { storeId: store.id, name: 'A2' } },
    update: { isActive: true },
    create: { storeId: store.id, name: 'A2', isActive: true }
  });

  const categoryMeat = await prisma.category.upsert({
    where: { storeId_name: { storeId: store.id, name: 'Meat' } },
    update: { sort: 1 },
    create: { storeId: store.id, name: 'Meat', sort: 1 }
  });

  const categoryVeg = await prisma.category.upsert({
    where: { storeId_name: { storeId: store.id, name: 'Vegetable' } },
    update: { sort: 2 },
    create: { storeId: store.id, name: 'Vegetable', sort: 2 }
  });

  await prisma.product.upsert({
    where: { id: 'prod_beef_1' },
    update: {
      name: 'Beef Skewer',
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
      name: 'Beef Skewer',
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
      name: 'Corn',
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
      name: 'Corn',
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
