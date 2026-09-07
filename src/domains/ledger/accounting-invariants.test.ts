import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { Money } from '@/lib/finance';
import { GeneralLedgerService, ImmutableLedgerError } from './GeneralLedgerService';
import { JournalService, ImmutableJournalError } from './JournalService';

describe('Wave 9: Accounting Integration & Invariants Suite (FIN-101 to FIN-109)', () => {
  const suffix = `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  let testUserId = '';
  let testSupplierId = '';
  let testBookingId = '';
  const testCurrency = 'IRR';

  beforeAll(async () => {
    // 1. Create test user
    const user = await prisma.user.create({
      data: {
        id: `usr_${suffix}`,
        email: `accounting_${suffix}@itrip.test`,
        name: 'Accounting Tester',
      },
    });
    testUserId = user.id;

    // 2. Create test supplier
    const supplier = await prisma.supplier.create({
      data: {
        id: `sup_${suffix}`,
        name: `Supplier ${suffix}`,
        type: 'AIRLINE',
      },
    });
    testSupplierId = supplier.id;

    // 3. Create test booking with PriceSnapshot
    const booking = await prisma.booking.create({
      data: {
        id: `bkg_${suffix}`,
        reference: `ITR-ACC-${suffix.toUpperCase()}`,
        customerId: testUserId,
        supplierId: testSupplierId,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'INITIATED',
        totalAmount: 10_000_000,
        currency: testCurrency,
        priceSnapshots: {
          create: {
            sellPrice: 10_000_000,
            baseAmount: 8_000_000, // supplier cost
            taxAmount: 900_000,     // VAT
            markupAmount: 800_000,  // profit
            serviceFee: 300_000,    // fee
            currency: testCurrency,
          },
        },
      },
    });
    testBookingId = booking.id;
  });

  afterAll(async () => {
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
      const accounts = await prisma.account.findMany({
        where: {
          OR: [
            { ownerId: testUserId },
            { ownerId: testSupplierId },
          ],
        },
      });
      await prisma.account.deleteMany({
        where: { id: { in: accounts.map((a) => a.id) } },
      });
      await prisma.priceSnapshot.deleteMany({ where: { bookingId: testBookingId } });
      await prisma.booking.deleteMany({ where: { id: testBookingId } });
      await prisma.supplier.deleteMany({ where: { id: testSupplierId } });
      await prisma.user.deleteMany({ where: { id: testUserId } });
    } catch (e) {
      console.error('Accounting test cleanup error:', e);
    }
  });

  it('FIN-101: Canonical Journal/Ledger relationship mirrors double-entry journal entries for ledger postings', async () => {
    const groupId = `grp_rel_${suffix}`;
    const amount = new Money(5_000_000, testCurrency);

    await GeneralLedgerService.postTopUp({
      groupId,
      userId: testUserId,
      amount,
      currency: testCurrency,
      memo: 'User wallet deposit',
    });

    // Verify LedgerEntry created
    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: { groupId },
    });
    expect(ledgerEntries.length).toBe(2);

    // Verify canonical JournalEntry created with lines
    const journalEntry = await prisma.journalEntry.findUnique({
      where: { entryNumber: `JE-${groupId}` },
      include: { lines: { include: { account: true } } },
    });

    expect(journalEntry).not.toBeNull();
    expect(journalEntry?.lines.length).toBe(2);

    const verification = await JournalService.verifyJournalBalance(journalEntry!.id);
    expect(verification.isBalanced).toBe(true);
    expect(verification.variance.isZero()).toBe(true);
  });

  it('FIN-102: Source/posting uniqueness prevents double posting for same referenceType and referenceId', async () => {
    const groupId1 = `grp_src_1_${suffix}`;
    const groupId2 = `grp_src_2_${suffix}`;
    const referenceId = `ref_unique_${suffix}`;

    // First posting for this source reference ('BOOKING' + referenceId)
    await GeneralLedgerService.postGatewayPayment({
      groupId: groupId1,
      amount: new Money(3_000_000, testCurrency),
      currency: testCurrency,
      referenceId,
    });

    // Attempt second posting with same referenceType and referenceId but different groupId
    await GeneralLedgerService.postGatewayPayment({
      groupId: groupId2,
      amount: new Money(3_000_000, testCurrency),
      currency: testCurrency,
      referenceId,
    });

    // Assert that second group was rejected / not posted
    const entriesGroup2 = await prisma.ledgerEntry.findMany({
      where: { groupId: groupId2 },
    });
    expect(entriesGroup2.length).toBe(0);

    // First group exists exactly once
    const entriesGroup1 = await prisma.ledgerEntry.findMany({
      where: { groupId: groupId1 },
    });
    expect(entriesGroup1.length).toBe(2);
  });

  it('FIN-103: Enforces immutable posted journals and ledger entries', async () => {
    await expect(JournalService.updateJournalEntry()).rejects.toThrow(ImmutableJournalError);
    await expect(JournalService.deleteJournalEntry()).rejects.toThrow(ImmutableJournalError);
    await expect(GeneralLedgerService.updateLedgerEntry()).rejects.toThrow(ImmutableLedgerError);
    await expect(GeneralLedgerService.deleteLedgerEntry()).rejects.toThrow(ImmutableLedgerError);
  });

  it('FIN-104: Creates reversal/corrective entry that inverts debits and credits and balances to zero', async () => {
    const groupId = `grp_rev_test_${suffix}`;

    await GeneralLedgerService.postTopUp({
      groupId,
      userId: testUserId,
      amount: new Money(2_000_000, testCurrency),
      currency: testCurrency,
      memo: 'Deposit to be reversed',
    });

    // Execute reversal
    await GeneralLedgerService.createReversalEntry(groupId, 'Accidental duplicate deposit');

    // Verify reversal ledger group created
    const revEntries = await prisma.ledgerEntry.findMany({
      where: { groupId: `REV-${groupId}` },
    });
    expect(revEntries.length).toBe(2);

    // Verify reversal journal entry created
    const originalJe = await prisma.journalEntry.findUniqueOrThrow({
      where: { entryNumber: `JE-${groupId}` },
    });

    const revJe = await prisma.journalEntry.findUnique({
      where: { entryNumber: `JE-REV-JE-${groupId}` },
      include: { lines: true },
    });
    expect(revJe).not.toBeNull();
    expect(revJe?.referenceType).toBe('REVERSAL');
    expect(revJe?.referenceId).toBe(originalJe.id);

    const verification = await JournalService.verifyJournalBalance(revJe!.id);
    expect(verification.isBalanced).toBe(true);
  });

  it('FIN-105: Ledger balance methods return Money objects instead of numbers', async () => {
    const userAcc = await prisma.account.findFirstOrThrow({
      where: { ownerType: 'USER', ownerId: testUserId, currency: testCurrency },
    });

    const balance = await GeneralLedgerService.getAccountBalance(userAcc.id, testCurrency);
    expect(balance instanceof Money).toBe(true);
    expect(balance.currency).toBe(testCurrency);
    expect(typeof balance.toNumber()).toBe('number');
    expect(balance.toDecimal()).toBeDefined();

    const userBalances = await GeneralLedgerService.getUserBalances(testUserId);
    expect(userBalances.IRR instanceof Money).toBe(true);
    expect(userBalances.USDT instanceof Money).toBe(true);
    expect(userBalances.AED instanceof Money).toBe(true);
  });

  it('FIN-107, FIN-108: Wires revenue, tax, and supplier liability derived from PriceSnapshot on confirmation', async () => {
    await GeneralLedgerService.wireBookingConfirmationToLedger(testBookingId);

    // Verify Revenue Realization group created
    const revGroup = `rev_conf_${testBookingId}`;
    const allEntries = await prisma.ledgerEntry.findMany({
      where: {
        groupId: { in: [revGroup, `${revGroup}_payable`, `${revGroup}_tax`, `${revGroup}_fee`] },
      },
    });

    // 4 legs (Escrow->Revenue, Revenue->Supplier, Revenue->Tax, Revenue->Fee) = 8 entries
    expect(allEntries.length).toBe(8);

    // Verify Supplier Payable account exists and has credit
    const supplierAcc = await prisma.account.findFirst({
      where: { ownerType: 'SUPPLIER_PAYABLE', ownerId: testSupplierId, currency: testCurrency },
    });
    expect(supplierAcc).not.toBeNull();

    const supplierBalance = await GeneralLedgerService.getAccountBalance(supplierAcc!.id, testCurrency);
    expect(supplierBalance.toNumber()).toBe(8_000_000); // Net cost accrued
  });

  it('FIN-109: Accounting Invariant Suite verifies Debit = Credit on all operations', async () => {
    // Unbalanced journal creation fails closed
    await expect(
      JournalService.createJournalEntry({
        entryNumber: `JE_UNBAL_${suffix}`,
        description: 'Unbalanced journal test',
        currency: 'IRR',
        lines: [
          {
            chartAccountCode: '1010',
            chartAccountName: 'Cash',
            category: 'ASSET',
            direction: 'DEBIT',
            amount: new Money(1_000_000, 'IRR'),
          },
          {
            chartAccountCode: '4010',
            chartAccountName: 'Revenue',
            category: 'REVENUE',
            direction: 'CREDIT',
            amount: new Money(500_000, 'IRR'), // Mismatch!
          },
        ],
      })
    ).rejects.toThrow(/Accounting Invariant Violation/i);
  });
});
