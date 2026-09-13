/**
 * Resets the seeded customer to a "fresh signup" KYC state so the account-page
 * banner + KYC completion wizard can be verified in the browser.
 * Usage: node scripts/reset-kyc-fixture.mjs
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const u = await prisma.user.update({
    where: { email: 'user@firuzo.com' },
    data: { nationalId: null, firstNameFa: null, lastNameFa: null, passportNo: null },
    select: { id: true, email: true, nationalId: true, firstNameFa: true },
  });
  console.log('KYC fixture reset:', JSON.stringify(u));
} catch (err) {
  console.error('reset failed:', err.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
