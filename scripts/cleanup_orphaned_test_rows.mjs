import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
await prisma.$executeRawUnsafe(`DELETE FROM "JournalLine" WHERE "postingGroupId" = 'wh_topup_grp_ecardo_FZPIPEMTY6J3'`);
await prisma.$executeRawUnsafe(`DELETE FROM "OutboxEvent" WHERE "aggregateId" IN ('test_async_106', 'test_sys') OR "status" = 'DEAD_LETTER'`);
await prisma.$disconnect();
console.log('Cleaned up orphaned test rows successfully!');
