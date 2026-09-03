/**
 * One-off data migration: normalizes ledger accounts before the
 * @@unique([ownerType, ownerId, currency]) constraint is applied.
 *
 * - Platform-owned accounts (ownerId = null) are assigned the '#platform'
 *   sentinel so the unique rule covers them (SQLite treats NULLs as distinct).
 * - Duplicate (ownerType, ownerId, currency) accounts are merged: their ledger
 *   entries are re-pointed to the oldest account, then the duplicates removed.
 *
 * Run with: npx tsx scripts/normalize-accounts.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PLATFORM_SENTINEL = '#platform';

async function main() {
  // 1. Assign the platform sentinel to null-owner accounts.
  const platformAccounts = await prisma.account.findMany({
    where: { ownerId: null },
  });
  for (const acc of platformAccounts) {
    await prisma.account.update({
      where: { id: acc.id },
      data: { ownerId: PLATFORM_SENTINEL },
    });
  }
  console.log(`Assigned platform sentinel to ${platformAccounts.length} accounts.`);

  // 2. Merge duplicates per (ownerType, ownerId, currency), keeping the oldest.
  const accounts = await prisma.account.findMany({
    orderBy: { id: 'asc' },
  });
  const seen = new Map<string, string>();
  let merged = 0;
  for (const acc of accounts) {
    const key = `${acc.ownerType}|${acc.ownerId ?? ''}|${acc.currency}`;
    const keeperId = seen.get(key);
    if (!keeperId) {
      seen.set(key, acc.id);
      continue;
    }
    await prisma.ledgerEntry.updateMany({
      where: { accountId: acc.id },
      data: { accountId: keeperId },
    });
    await prisma.account.delete({ where: { id: acc.id } });
    merged++;
  }
  console.log(`Merged ${merged} duplicate accounts.`);
}

main()
  .catch((e) => {
    console.error('normalize-accounts failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
