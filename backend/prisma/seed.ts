import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const existingSuperAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
  });

  if (!existingSuperAdmin) {
    const hashed = await bcrypt.hash('SuperAdmin123!', 12);

    const superAdmin = await prisma.user.create({
      data: {
        email: 'superadmin@cobrapro.com',
        password: hashed,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });

    console.log(`✅ Super Admin created: ${superAdmin.email}`);
    console.log('   Password: SuperAdmin123!  ← CHANGE IN PRODUCTION');
  } else {
    console.log('ℹ️  Super Admin already exists, skipping.');
  }

  console.log('✅ Seed complete');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
