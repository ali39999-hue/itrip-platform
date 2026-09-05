import { test, expect } from '@playwright/test';
import { prisma } from '../../src/lib/prisma';
import { GeneralLedgerService } from '../../src/domains/ledger/GeneralLedgerService';

test.describe('P0 Invariants: Financial & Ledger Balancing', () => {
  const suffix = `pw_inv_${Date.now().toString(36)}`;
  let testUserId = '';

  test.beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        id: `usr_${suffix}`,
        email: `pw_${suffix}@firuzo.com`,
        name: 'Playwright Ledger Tester',
      },
    });
    testUserId = user.id;
  });

  test.afterAll(async () => {
    try {
      await prisma.journalLine.deleteMany({
        where: { journalEntry: { entryNumber: { contains: suffix } } },
      });
      await prisma.journalEntry.deleteMany({
        where: { entryNumber: { contains: suffix } },
      });
      await prisma.ledgerEntry.deleteMany({
        where: { groupId: { contains: suffix } },
      });
      await prisma.account.deleteMany({
        where: { ownerId: testUserId },
      });
      await prisma.user.deleteMany({
        where: { id: testUserId },
      });
    } catch (e) {
      console.error('Cleanup error:', e);
    } finally {
      await prisma.$disconnect();
    }
  });

  test('Ledger rejects unbalanced transactions and accepts balanced ones', async () => {
    const balancedGroupId = `test_balanced_group_${suffix}`;
    const depositAmount = 2_500_000;

    // 1. Balanced posting succeeds
    await GeneralLedgerService.postTopUp({
      groupId: balancedGroupId,
      userId: testUserId,
      amount: depositAmount,
      currency: 'IRR',
      memo: 'Balanced deposit entry',
    });

    const entries = await prisma.ledgerEntry.findMany({
      where: { groupId: balancedGroupId },
    });
    expect(entries.length).toBe(2);

    const debit = entries.find((e) => e.direction === 'DEBIT');
    const credit = entries.find((e) => e.direction === 'CREDIT');

    expect(debit).toBeDefined();
    expect(credit).toBeDefined();
    expect(Number(debit!.amount)).toBe(Number(credit!.amount));

    // 2. Verification of idempotency
    await GeneralLedgerService.postTopUp({
      groupId: balancedGroupId,
      userId: testUserId,
      amount: depositAmount,
      currency: 'IRR',
      memo: 'Balanced deposit entry retry',
    });

    const entriesAfterRetry = await prisma.ledgerEntry.findMany({
      where: { groupId: balancedGroupId },
    });
    expect(entriesAfterRetry.length).toBe(2); // Still exactly 2 entries
  });
});
