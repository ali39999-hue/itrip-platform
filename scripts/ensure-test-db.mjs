// Creates the isolated unit-test database if it does not exist yet.
import { PrismaClient } from '@prisma/client';

const admin = new PrismaClient({
  datasources: { db: { url: process.env.ADMIN_DATABASE_URL } },
});

await admin.$executeRawUnsafe(`CREATE DATABASE "itrip_test"`);
console.log('itrip_test created');
await admin.$disconnect();
