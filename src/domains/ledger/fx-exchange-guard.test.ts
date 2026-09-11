import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { GeneralLedgerService } from './GeneralLedgerService';
import { Money } from '@/lib/finance';

/**
 * BUG-002 / BUG-012 regression tests.
 *
 * postFXConversion must row-lock the user's source account and re-check the
 * balance under the lock (WAL-001 pattern), refusing an overdraw instead of
 * silently posting it — and must realize the FX spread as platform revenue.
 *
 * The exchange action must also pass a per-exchange referenceId: the ledger's
 * FIN-102 dedupe keys on (referenceType, referenceId) globally, so a constant
 * referenceId made every exchange after the first one a silent no-op.
 */
describe('FX exchange guard (BUG-002) & spread revenue leg (BUG-012)', () => {
  const runId = Date.now().toString(36);
  const userId = `fx_guard_test_${runId}`;
  const groupId = `fx_guard_grp_${runId}`;

  afterAll(async () => {
    // Remove this test's journal groups by groupId so BOTH legs of every
    // balanced group are deleted together. Deleting by account id would strip
    // the user-side leg and orphan the platform-side leg (FX_POOL/TOPUP are
    // shared '#platform' accounts), leaving unbalanced groups behind.
    await prisma.ledgerEntry.deleteMany({
      where: { groupId: { contains: groupId } },
    });
    await prisma.account.deleteMany({
      where: { ownerType: 'USER', ownerId: userId },
    });
  });

  it('refuses an exchange larger than the locked wallet balance', async () => {
    // Fund the wallet with 1,000,000 IRR through the real ledger template.
    await GeneralLedgerService.postTopUp({
      groupId: `${groupId}_setup`,
      userId,
      amount: new Money(1_000_000, 'IRR'),
      currency: 'IRR',
      referenceId: `fx-guard-setup-${runId}`,
    });

    await expect(
      GeneralLedgerService.postFXConversion({
        groupId: `${groupId}_overdraft`,
        userId,
        fromCurrency: 'IRR',
        toCurrency: 'USDT',
        fromAmount: new Money(2_000_000, 'IRR'),
        toAmount: new Money(40, 'USDT'),
        spreadAmount: new Money(0.2, 'USDT'),
        referenceId: `${groupId}_overdraft`,
      })
    ).rejects.toThrow(/Insufficient wallet balance/);
  });

  it('posts a balanced conversion with the spread realized as revenue', async () => {
    // Wallet currently holds 1,000,000 IRR from the setup posting.
    await GeneralLedgerService.postFXConversion({
      groupId,
      userId,
      fromCurrency: 'IRR',
      toCurrency: 'USDT',
      fromAmount: new Money(1_000_000, 'IRR'),
      toAmount: new Money(20, 'USDT'),
      spreadAmount: new Money(0.1, 'USDT'),
      referenceId: groupId,
    });

    // Source wallet is fully (and only once) debited.
    const irrAccounts = await prisma.account.findMany({
      where: { ownerType: 'USER', ownerId: userId, currency: 'IRR' },
    });
    expect(irrAccounts).toHaveLength(1);
    const irrBalance = await GeneralLedgerService.getAccountBalance(irrAccounts[0].id, 'IRR');
    expect(irrBalance.amount.toNumber()).toBe(0);

    // Target wallet received the full converted amount (user never pays the spread).
    const usdtAccounts = await prisma.account.findMany({
      where: { ownerType: 'USER', ownerId: userId, currency: 'USDT' },
    });
    expect(usdtAccounts).toHaveLength(1);
    const usdtBalance = await GeneralLedgerService.getAccountBalance(usdtAccounts[0].id, 'USDT');
    expect(usdtBalance.amount.toNumber()).toBe(20);

    // The spread journal group exists and is balanced (revenue leg is real).
    const spreadEntries = await prisma.ledgerEntry.findMany({
      where: { groupId: `${groupId}_fx_spread` },
    });
    expect(spreadEntries).toHaveLength(2);
    const debit = spreadEntries.filter((e) => e.direction === 'DEBIT').reduce((s, e) => s + Number(e.amount), 0);
    const credit = spreadEntries.filter((e) => e.direction === 'CREDIT').reduce((s, e) => s + Number(e.amount), 0);
    expect(debit).toBe(0.1);
    expect(credit).toBe(0.1);
  });

  it('posts two consecutive exchanges — a constant referenceId used to no-op the second one', async () => {
    // Fund 2,000,000 IRR, then exchange 1,000,000 twice with distinct referenceIds.
    await GeneralLedgerService.postTopUp({
      groupId: `${groupId}_setup2`,
      userId,
      amount: new Money(2_000_000, 'IRR'),
      currency: 'IRR',
      referenceId: `fx-guard-setup2-${runId}`,
    });

    for (let i = 0; i < 2; i++) {
      await GeneralLedgerService.postFXConversion({
        groupId: `${groupId}_dup_${i}`,
        userId,
        fromCurrency: 'IRR',
        toCurrency: 'USDT',
        fromAmount: new Money(1_000_000, 'IRR'),
        toAmount: new Money(10, 'USDT'),
        spreadAmount: new Money(0.05, 'USDT'),
        referenceId: `${groupId}_dup_${i}`,
      });
    }

    // Both exchanges actually moved money: 2M IRR debited in total.
    const irrAccount = await prisma.account.findFirst({
      where: { ownerType: 'USER', ownerId: userId, currency: 'IRR' },
    });
    const irrBalance = await GeneralLedgerService.getAccountBalance(irrAccount!.id, 'IRR');
    expect(irrBalance.amount.toNumber()).toBe(0);

    const usdtAccount = await prisma.account.findFirst({
      where: { ownerType: 'USER', ownerId: userId, currency: 'USDT' },
    });
    const usdtBalance = await GeneralLedgerService.getAccountBalance(usdtAccount!.id, 'USDT');
    expect(usdtBalance.amount.toNumber()).toBe(20 + 10 + 10); // 20 from test 2 + 10 + 10
  });
});
