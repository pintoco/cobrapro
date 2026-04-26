import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedSuperAdmin() {
  const existing = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  if (existing) {
    console.log('ℹ️  Super Admin ya existe, omitiendo.');
    return;
  }

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

  console.log(`✅ Super Admin creado: ${superAdmin.email}`);
  console.log('   Contraseña: SuperAdmin123!  ← CAMBIAR EN PRODUCCIÓN');
}

async function seedSubscriptionPlans() {
  const plans = [
    {
      name: 'Básico',
      priceCLP: 9990,
      maxUsers: 3,
      maxClients: 100,
      maxInvoicesPerMonth: 50,
      allowWhatsApp: false,
      allowExcelImport: false,
      allowAdvancedReports: false,
    },
    {
      name: 'Pro',
      priceCLP: 19990,
      maxUsers: 10,
      maxClients: 500,
      maxInvoicesPerMonth: 200,
      allowWhatsApp: false,
      allowExcelImport: true,
      allowAdvancedReports: true,
    },
    {
      name: 'Empresa',
      priceCLP: 49990,
      maxUsers: 50,
      maxClients: 5000,
      maxInvoicesPerMonth: 1000,
      allowWhatsApp: true,
      allowExcelImport: true,
      allowAdvancedReports: true,
    },
  ];

  let created = 0;
  for (const plan of plans) {
    const existing = await prisma.subscriptionPlan.findUnique({ where: { name: plan.name } });
    if (!existing) {
      await prisma.subscriptionPlan.create({ data: plan });
      created++;
    }
  }

  if (created > 0) {
    console.log(`✅ ${created} planes SaaS creados (Básico $9.990, Pro $19.990, Empresa $49.990)`);
  } else {
    console.log('ℹ️  Planes ya existen, omitiendo.');
  }
}

async function main() {
  console.log('🌱 Iniciando seed de base de datos...');

  await seedSuperAdmin();
  await seedSubscriptionPlans();

  console.log('✅ Seed completo');
}

main()
  .catch((e) => {
    console.error('❌ Seed falló:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
