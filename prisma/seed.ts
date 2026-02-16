import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // 1. Clear existing data (to avoid duplicates)
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create the Flash Sale Product
  const product = await prisma.product.create({
    data: {
      name: 'Air Jordan 1 - Lost & Found',
      price: 15000.00, // ₹15,000
      stock: 100,      // 👈 The magic number
      version: 0       // Optimistic locking version
    },
  });

  console.log(`✅ Database seeded! Created: ${product.name} with ${product.stock} items.`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });