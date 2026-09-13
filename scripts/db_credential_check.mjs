// Quick DB credential check (read-only): does the .env credential still authenticate?
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
try {
  const rows = await prisma.$queryRawUnsafe('SELECT current_database() AS db, current_user AS usr, now() AS ts');
  console.log('DB OK:', JSON.stringify(rows));
  const flights = await prisma.flightOfferCache.count();
  console.log('flightOfferCache rows:', flights);
  process.exit(0);
} catch (e) {
  console.error('DB FAIL:', e.message.split('\n').slice(0, 4).join(' | '));
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
