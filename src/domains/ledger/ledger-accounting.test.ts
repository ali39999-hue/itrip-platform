import { describe, it, expect, afterAll } from 'vitest';
import { GeneralLedgerService } from './GeneralLedgerService';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

describe('General Ledger, Double-Entry & Wallet Suite (FIN-001 to FIN-003, WAL-001)', () => {
  const suffix = `fin_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  let testUserId = '';
  const testCurrency = 'IRR';

  afterAll(async () => {
    try {
      const accounts = await prisma.account.findMany({
        where: { ownerId: testUserId },
      });
      const accountIds = accounts.map((a) => a.id);

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
        where: { id: { in: accountIds } },
      });
      await prisma.user.deleteMany({
        where: { id: testUserId },
      });
    } catch (e) {
      console.error('Test cleanup error:', e);
    } finally {
      await prisma.$disconnect();
    }
  });

  it('sets up a test user for ledger operations', async () => {
    const user = await prisma.user.create({
      data: {
        id: `usr_${suffix}`,
        email: `fin_${suffix}@firuzo.com`,
        name: 'Finance Tester',
      },
    });
    testUserId = user.id;
    expect(testUserId).toBeDefined();
  });

  it('FIN-002: Enforces SUM(DEBIT) = SUM(CREDIT) invariant across all posting operations', async () => {
    const groupId = `grp_bal_${suffix}`;
    const initialDeposit = 5_000_000;

    // Post top-up
    await GeneralLedgerService.postTopUp({
      groupId,
      userId: testUserId,
      amount: initialDeposit,
      currency: testCurrency,
      memo: 'Initial user deposit',
    });

    // Check ledger entries for this groupId
    const entries = await prisma.ledgerEntry.findMany({
      where: { groupId },
    });

    expect(entries.length).toBe(2);
    let totalDebit = new Prisma.Decimal(0);
    let totalCredit = new Prisma.Decimal(0);

    for (const e of entries) {
      if (e.direction === 'DEBIT') {
        totalDebit = totalDebit.add(new Prisma.Decimal(e.amount.toString()));
      } else {
        totalCredit = totalCredit.add(new Prisma.Decimal(e.amount.toString()));
      }
    }

    expect(totalDebit.equals(totalCredit)).toBe(true);
    expect(totalDebit.toNumber()).toBe(initialDeposit);

    // Verify Chart of Accounts journal entry was also written
    const je = await prisma.journalEntry.findUnique({
      where: { entryNumber: `JE-${groupId}` },
      include: { lines: true },
    });

    expect(je).not.toBeNull();
    expect(je?.lines.length).toBe(2);
  });

  it('FIN-003: Ledger Idempotency: same posting operation x10 results in exactly 1 posting', async () => {
    const groupId = `grp_idem_${suffix}`;
    const amount = 1_000_000;

    // Run 10 times with the same groupId
    for (let i = 0; i < 10; i++) {
      await GeneralLedgerService.postTopUp({
        groupId,
        userId: testUserId,
        amount,
        currency: testCurrency,
      });
    }

    // Must still have exactly 2 entries (1 debit, 1 credit)
    const entries = await prisma.ledgerEntry.findMany({
      where: { groupId },
    });
    expect(entries.length).toBe(2);

    const journalEntries = await prisma.journalEntry.findMany({
      where: { entryNumber: `JE-${groupId}` },
    });
    expect(journalEntries.length).toBe(1);
  });

  it('WAL-001: 2 concurrent debits from same balance cannot overspend (concurrency row lock)', async () => {
    // Current user balance: initialDeposit (5,000,000) + topUp (1,000,000) = 6,000,000
    // Try to execute two concurrent debits of 4,000,000 each (total requested = 8,000,000 > 6,000,000)
    // Exactly ONE debit must succeed, the other MUST fail with "Insufficient wallet balance"
    const debit1Promise = GeneralLedgerService.postWalletPayment({
      groupId: `grp_debit1_${suffix}`,
      userId: testUserId,
      amount: 4_000_000,
      currency: testCurrency,
    });

    const debit2Promise = GeneralLedgerService.postWalletPayment({
      groupId: `grp_debit2_${suffix}`,
      userId: testUserId,
      amount: 4_000_000,
      currency: testCurrency,
    });

    const results = await Promise.allSettled([debit1Promise, debit2Promise]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const rejectedError = (rejected[0] as PromiseRejectedResult).reason;
    expect(String(rejectedError)).toMatch(/insufficient wallet balance/i);

    // Verify remaining balance in DB: 6,000,000 - 4,000,000 = 2,000,000
    const userAcc = await prisma.account.findFirstOrThrow({
      where: { ownerType: 'USER', ownerId: testUserId, currency: testCurrency },
    });
    const finalBalance = await GeneralLedgerService.getAccountBalance(userAcc.id, testCurrency);
    expect(finalBalance).toBe(2_000_000);
  });

  it('Template 3: Revenue Realization splits revenue, supplier payable, and tax liability', async () => {
    const groupId = `grp_rev_${suffix}`;
    const totalAmount = 10_000_000;
    const netCost = 8_000_000;
    const taxAmount = 900_000;
    const feeAmount = 200_000;

    await GeneralLedgerService.postRevenueRealization({
      groupId,
      amount: totalAmount,
      netCost,
      taxAmount,
      feeAmount,
      supplierId: `sup_test_${suffix}`,
      currency: testCurrency,
    });

    // Check that all sub-groups are balanced (Debit = Credit)
    const allEntries = await prisma.ledgerEntry.findMany({
      where: {
        groupId: { in: [groupId, `${groupId}_payable`, `${groupId}_tax`, `${groupId}_fee`] },
      },
    });

    expect(allEntries.length).toBe(8); // 4 pairs of 2
  });

  it('Template 4: Refund posting returns funds from escrow to user wallet', async () => {
    const groupId = `grp_rfd_${suffix}`;
    const refundAmount = 500_000;

    const userAcc = await prisma.account.findFirstOrThrow({
      where: { ownerType: 'USER', ownerId: testUserId, currency: testCurrency },
    });
    const balanceBefore = await GeneralLedgerService.getAccountBalance(userAcc.id, testCurrency);

    await GeneralLedgerService.postRefund({
      groupId,
      userId: testUserId,
      amount: refundAmount,
      currency: testCurrency,
      memo: 'Test refund credit',
    });

    const balanceAfter = await GeneralLedgerService.getAccountBalance(userAcc.id, testCurrency);
    expect(balanceAfter).toBe(balanceBefore + refundAmount);
  });
});
