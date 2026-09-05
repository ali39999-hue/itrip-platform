import { describe, it, expect, afterAll } from 'vitest';
import { RefundDomainService } from './RefundDomainService';
import { GeneralLedgerService } from '../ledger/GeneralLedgerService';
import { prisma } from '@/lib/prisma';

describe('Unit & Integration Tests: RefundDomainService (REF-001, REF-002, REF-003)', () => {
  const suffix = `rfd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  let userId: string;
  let bookingId: string;
  let refundLedgerGroupId: string;

  afterAll(async () => {
    try {
      if (refundLedgerGroupId) {
        await prisma.ledgerEntry.deleteMany({ where: { groupId: refundLedgerGroupId } });
      }
      await prisma.refundItem.deleteMany({ where: { refund: { bookingId } } });
      await prisma.refund.deleteMany({ where: { bookingId } });
      await prisma.bookingItem.deleteMany({ where: { bookingId } });
      await prisma.booking.deleteMany({ where: { id: bookingId } });
      await prisma.ledgerEntry.deleteMany({ where: { referenceId: { in: [bookingId] } } });
      await prisma.user.deleteMany({ where: { id: userId } });
    } catch (e) {
      console.error('Cleanup error:', e);
    } finally {
      await prisma.$disconnect();
    }
  });

  it('calculates refund penalty and processes idempotent ledger credit back to customer', async () => {
    // 1. Create test user and booking
    const user = await prisma.user.create({
      data: {
        id: `usr_${suffix}`,
        email: `refund_${suffix}@firuzo.test`,
        name: 'Refund Test User',
      },
    });
    userId = user.id;

    // Seed escrow account with initial funds to cover refund (REF requirement)
    const escrowAcc = await prisma.account.upsert({
      where: { ownerType_ownerId_currency: { ownerType: 'PLATFORM_ESCROW', ownerId: '#platform', currency: 'IRR' } },
      update: {},
      create: { ownerType: 'PLATFORM_ESCROW', ownerId: '#platform', currency: 'IRR' },
    });

    // Credit escrow account with 2,000,000 IRR using balanced double-entry
    const settlementAcc = await prisma.account.upsert({
      where: { ownerType_ownerId_currency: { ownerType: 'GATEWAY_SETTLEMENT', ownerId: '#platform', currency: 'IRR' } },
      update: {},
      create: { ownerType: 'GATEWAY_SETTLEMENT', ownerId: '#platform', currency: 'IRR' },
    });

    await prisma.ledgerEntry.createMany({
      data: [
        {
          groupId: `seed_escrow_${suffix}`,
          accountId: settlementAcc.id,
          direction: 'DEBIT',
          amount: 2_000_000,
          currency: 'IRR',
          referenceType: 'TOPUP',
        },
        {
          groupId: `seed_escrow_${suffix}`,
          accountId: escrowAcc.id,
          direction: 'CREDIT',
          amount: 2_000_000,
          currency: 'IRR',
          referenceType: 'TOPUP',
        },
      ],
    });

    const booking = await prisma.booking.create({
      data: {
        id: `bkg_${suffix}`,
        reference: `ITR-RFD-${suffix}`,
        customerId: user.id,
        status: 'CONFIRMED',
        totalAmount: 1_000_000,
        currency: 'IRR',
        items: {
          create: [
            {
              type: 'HOTEL',
              netCost: 800_000,
              markup: 200_000,
              sellPrice: 1_000_000,
            },
          ],
        },
      },
      include: { items: true },
    });
    bookingId = booking.id;

    // 2. Process Refund with 10% penalty fee (penalty = 100,000, net = 900,000)
    const refundKey = `idem_rfd_${suffix}`;
    const result = await RefundDomainService.processRefund({
      bookingId: booking.id,
      idempotencyKey: refundKey,
      penaltyPercentage: 0.10,
      reason: 'User cancelled flight before cutoff',
    });

    expect(result.success).toBe(true);
    expect(result.grossAmount).toBe(1_000_000);
    expect(result.penaltyAmount).toBe(100_000);
    expect(result.netRefundAmount).toBe(900_000);
    expect(result.status).toBe('SETTLED');
    refundLedgerGroupId = `rfd_grp_${result.refundId}`;

    // 3. Verify Booking status transitioned to REFUNDED
    const updatedBooking = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(updatedBooking.status).toBe('REFUNDED');

    // 4. Verify Idempotency: Replaying exact same request returns identical refund without double credit
    const replay = await RefundDomainService.processRefund({
      bookingId: booking.id,
      idempotencyKey: refundKey,
      penaltyPercentage: 0.10,
    });

    expect(replay.success).toBe(true);
    expect(replay.refundId).toBe(result.refundId);
    expect(replay.netRefundAmount).toBe(900_000);

    // 5. Verify customer account received exactly 1 credit of 900,000
    const customerAcc = await prisma.account.findFirstOrThrow({
      where: { ownerType: 'USER', ownerId: user.id, currency: 'IRR' },
    });

    const balance = await GeneralLedgerService.getAccountBalance(customerAcc.id, 'IRR');
    expect(balance).toBe(900_000);

    // 6. Verify immutable policy snapshot, approval trail and execution attempt (REF-004..006)
    const snapshot = await prisma.refundPolicySnapshot.findUniqueOrThrow({
      where: { refundId: result.refundId },
    });
    expect(snapshot.bookingId).toBe(booking.id);
    expect(snapshot.bookingStatusAtRequest).toBe('CONFIRMED');
    expect(Number(snapshot.penaltyPercentage)).toBe(0.10);
    expect(JSON.parse(snapshot.rulesJson).netRefundAmount).toBe(900_000);

    const approvals = await prisma.refundApproval.findMany({
      where: { refundId: result.refundId },
    });
    expect(approvals).toHaveLength(1);
    expect(approvals[0].decision).toBe('APPROVED');

    const attempts = await prisma.refundAttempt.findMany({
      where: { refundId: result.refundId },
    });
    expect(attempts).toHaveLength(1);
    expect(attempts[0].status).toBe('SUCCESS');
    expect(attempts[0].channel).toBe('WALLET');
    expect(Number(attempts[0].amount)).toBe(900_000);
  });
});
