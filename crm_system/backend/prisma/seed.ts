// ============================================
// backend/prisma/seed.ts
// ============================================

import { PrismaClient, UserRole, EntityStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@crm.com' },
    update: {},
    create: {
      email: 'admin@crm.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log('✅ Created admin user:', admin.email);

  // Create manager user
  const managerPassword = await bcrypt.hash('manager123', 12);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@crm.com' },
    update: {},
    create: {
      email: 'manager@crm.com',
      password: managerPassword,
      firstName: 'Manager',
      lastName: 'User',
      role: UserRole.MANAGER,
      isActive: true,
    },
  });

  console.log('✅ Created manager user:', manager.email);

  // Create sample companies
  const companies = [
    {
      companyName: 'Tech Solutions Inc.',
      taxNumber: '1234567890',
      country: 'Turkey',
      city: 'Istanbul',
      district: 'Kadıköy',
      address: 'Sample Address 1',
      themeColor: '#3B82F6',
      status: EntityStatus.ACTIVE,
      createdBy: admin.id,
    },
    {
      companyName: 'Food Industries Ltd.',
      taxNumber: '0987654321',
      country: 'Turkey',
      city: 'Ankara',
      district: 'Çankaya',
      address: 'Sample Address 2',
      themeColor: '#10B981',
      status: EntityStatus.ACTIVE,
      createdBy: admin.id,
    },
  ];

  for (const companyData of companies) {
    const company = await prisma.company.create({
      data: companyData,
    });
    console.log('✅ Created company:', company.companyName);

    // Create brands for each company
    for (let i = 1; i <= 2; i++) {
      const brand = await prisma.brand.create({
        data: {
          brandName: `${company.companyName} - Brand ${i}`,
          companyId: company.id,
          country: companyData.country,
          city: companyData.city,
          status: EntityStatus.ACTIVE,
          createdBy: admin.id,
        },
      });
      console.log('✅ Created brand:', brand.brandName);

      // Create branches for each brand
      for (let j = 1; j <= 3; j++) {
        const branch = await prisma.branch.create({
          data: {
            branchName: `${brand.brandName} - Branch ${j}`,
            brandId: brand.id,
            country: companyData.country,
            city: companyData.city,
            status: EntityStatus.ACTIVE,
            createdBy: admin.id,
          },
        });
        console.log('✅ Created branch:', branch.branchName);
      }
    }
  }

  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });