import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@Firuzo2026!';
  const userPassword = process.env.USER_PASSWORD || 'User@Firuzo2026!';

  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  const userPasswordHash = await bcrypt.hash(userPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@firuzo.com' },
    update: {
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
    create: {
      id: 'clr_admin_123',
      email: 'admin@firuzo.com',
      name: 'Firuzo Admin',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@firuzo.com' },
    update: {
      passwordHash: userPasswordHash,
      role: 'CUSTOMER',
      isActive: true,
    },
    create: {
      id: 'clr_mock_user_123',
      email: 'user@firuzo.com',
      name: 'Firuzo User',
      passwordHash: userPasswordHash,
      role: 'CUSTOMER',
      isActive: true,
    },
  });

  console.log('Seed completed successfully:', {
    admin: admin.email,
    user: user.email,
  });
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
