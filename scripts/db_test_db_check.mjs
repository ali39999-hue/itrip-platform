// Check the itrip_test database (used by vitest) exists and authenticates.
import { PrismaClient } from '@prisma/client';

const url = (process.env.DATABASE_URL || 'postgresql://postgres:1280@127.0.0.1:5432/itrip?schema=public')
  .replace(/\/itrip(\?|$)/, '/itrip_test$1');
console.log('Testing URL:', url.replace(/:[^:@/]+@/, ':****@'));

const prisma = new PrismaClient({ datasources: { db: { url } } });
try {
  const rows = await prisma.$queryRawUnsafe('SELECT current_database() AS db, count(*)::int AS tables FROM information_schema.tables WHERE table_schema=\'public\'');
  console.log('itrip_test OK:', JSON.stringify(rows));
  process.exit(0);
} catch (e) {
  console.error('itrip_test FAIL:', e.message.split('\n').slice(0, 3).join(' | '));
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
