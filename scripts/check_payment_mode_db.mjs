import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const KEY = 'admin:payment_gateway_mode';

async function main() {
  const row = await prisma.siteContent.findUnique({ where: { key: KEY } });
  console.log('current:', row ? row.payload : '(not set — falls back to env/dev default)');
}

main()
  .catch((e) => {
    console.error('DB error:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
