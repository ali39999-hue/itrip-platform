import { describe, it, expect, afterAll } from 'vitest';
import { BookingStateMachine } from '@/domains/booking/state-machine';
import { PaymentDomainService } from '@/domains/payments/PaymentDomainService';
import { GeneralLedgerService } from '@/domains/ledger/GeneralLedgerService';
import { prisma } from '@/lib/prisma';

const createdIds: { bookings: string[]; payments: string[]; accounts: string[] } = {
  bookings: [],
  payments: [],
  accounts: [],
};

afterAll(async () => {
  // Best-effort cleanup of test data.
  await prisma.payment.deleteMany({ where: { id: { in: createdIds.payments } } });
  await prisma.booking.deleteMany({ where: { id: { in: createdIds.bookings } } });
  await prisma.ledgerEntry.deleteMany({ where: { accountId: { in: createdIds.accounts } } });
  await prisma.account.deleteMany({ where: { id: { in: createdIds.accounts } } });
  await prisma.$disconnect();
});

describe('Security: booking state machine hardening', () => {
  it('allows HELD bookings to be paid (regression: inventory-backed funnel)', () => {
    expect(BookingStateMachine.canTransition('HELD', 'PAYMENT_CONFIRMED')).toBe(true);
  });

  it('rejects paying an already CONFIRMED booking (double-pay guard)', () => {
    expect(BookingStateMachine.canTransition('CONFIRMED', 'PAYMENT_CONFIRMED')).toBe(false);
  });

  it('rejects same-state transitions (no silent re-confirmation)', () => {
    expect(BookingStateMachine.canTransition('CONFIRMED', 'CONFIRMED')).toBe(false);
    expect(BookingStateMachine.canTransition('HELD', 'HELD')).toBe(false);
  });
});

describe('Security: payment idempotency is booking-scoped', () => {
  it('rejects replaying a successful payment key for a different booking', async () => {
    const suffix = Date.now().toString(36);
    const user = await prisma.user.create({
      data: { id: `sec_test_user_${suffix}`, email: `sec_test_${suffix}@firuzo.test`, name: 'Sec Test' },
    });

    const bookingA = await prisma.booking.create({
      data: { reference: `SEC-A-${suffix}`, customerId: user.id, status: 'DRAFT', totalAmount: 1000, currency: 'IRR' },
    });
    const bookingB = await prisma.booking.create({
      data: { reference: `SEC-B-${suffix}`, customerId: user.id, status: 'DRAFT', totalAmount: 1000, currency: 'IRR' },
    });
    createdIds.bookings.push(bookingA.id, bookingB.id);

    const key = `sec_idem_${suffix}`;
    // gateway_shetab payments start as PENDING (awaiting PSP callback), so
    // the first call returns success=false, status=PENDING. Use wallet_irr
    // for the idempotency test since it settles immediately.
    const first = await PaymentDomainService.processPayment({ bookingId: bookingA.id, idempotencyKey: key, method: 'wallet_irr', amount: 1000 });
    expect(first.success).toBe(true);
    createdIds.payments.push(first.paymentId!);

    const replay = await PaymentDomainService.processPayment({ bookingId: bookingB.id, idempotencyKey: key, method: 'wallet_irr', amount: 1000 });
    expect(replay.success).toBe(false);
    expect(replay.error).toMatch(/different booking/i);

    // Same booking replay stays idempotent (returns the same payment).
    const sameBooking = await PaymentDomainService.processPayment({ bookingId: bookingA.id, idempotencyKey: key, method: 'wallet_irr', amount: 1000 });
    expect(sameBooking.success).toBe(true);
    expect(sameBooking.paymentId).toBe(first.paymentId);
  });
});

describe('Security: ledger balance guards', () => {
  it('rejects wallet payments above the recorded balance', async () => {
    const suffix = Date.now().toString(36);
    const user = await prisma.user.create({
      data: { id: `sec_ledger_user_${suffix}`, email: `sec_ledger_${suffix}@firuzo.test`, name: 'Ledger Test' },
    });

    // User wallet starts empty: payment must fail.
    await expect(
      GeneralLedgerService.postWalletPayment({ groupId: `sec_${suffix}_1`, userId: user.id, amount: 100, currency: 'IRR' })
    ).rejects.toThrow(/Insufficient wallet balance/i);

    // Top up, then the payment goes through and the balance drops.
    await GeneralLedgerService.postTopUp({ groupId: `sec_${suffix}_2`, userId: user.id, amount: 500, currency: 'IRR' });
    await expect(
      GeneralLedgerService.postWalletPayment({ groupId: `sec_${suffix}_3`, userId: user.id, amount: 400, currency: 'IRR' })
    ).resolves.toBeUndefined();

    const acc = await prisma.account.findFirstOrThrow({ where: { ownerType: 'USER', ownerId: user.id, currency: 'IRR' } });
    createdIds.accounts.push(acc.id);

    const [credits, debits] = await Promise.all([
      prisma.ledgerEntry.aggregate({ where: { accountId: acc.id, direction: 'CREDIT' }, _sum: { amount: true } }),
      prisma.ledgerEntry.aggregate({ where: { accountId: acc.id, direction: 'DEBIT' }, _sum: { amount: true } }),
    ]);
    expect((Number(credits._sum.amount) || 0) - (Number(debits._sum.amount) || 0)).toBe(100);

    // Clean up created ledger entries for this test to keep test runs pure
    await prisma.ledgerEntry.deleteMany({
      where: { groupId: { in: [`sec_${suffix}_1`, `sec_${suffix}_2`, `sec_${suffix}_3`] } }
    });
    await prisma.user.delete({ where: { id: user.id } });
  });

  it('keeps account identity unique (upsert does not duplicate platform accounts)', async () => {
    const escrow1 = await prisma.account.upsert({
      where: { ownerType_ownerId_currency: { ownerType: 'PLATFORM_ESCROW', ownerId: '#platform', currency: 'IRR' } },
      update: {},
      create: { ownerType: 'PLATFORM_ESCROW', ownerId: '#platform', currency: 'IRR' },
    });
    const escrow2 = await prisma.account.upsert({
      where: { ownerType_ownerId_currency: { ownerType: 'PLATFORM_ESCROW', ownerId: '#platform', currency: 'IRR' } },
      update: {},
      create: { ownerType: 'PLATFORM_ESCROW', ownerId: '#platform', currency: 'IRR' },
    });
    expect(escrow1.id).toBe(escrow2.id);
  });
});
