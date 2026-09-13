import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { ExceptionRemediationService } from './ExceptionRemediationService';

/**
 * Exception Remediation safety (P0 — production truth rules):
 * - No remediation path may fabricate a PNR, ticket number or supplier confirmation.
 * - Ticketing remediation can only QUEUE issuing; booking status is never
 *   flipped to CONFIRMED without a provider.
 * - Wallet refund remediation requires authoritative captured payment evidence,
 *   routes through RefundDomainService (REF-101..107) and is idempotent per
 *   exception.
 * - Payment sync only aligns with webhook-verified SUCCESS payment evidence.
 */
describe('ExceptionRemediationService safety (no fabricated state)', () => {
  const runId = Date.now().toString(36);
  const refPrefix = `RMSAFE-${runId}`;
  let operatorId = '';

  beforeAll(async () => {
    // AuditLog.userId is FK-constrained — use a real operator user.
    const operator = await prisma.user.create({ data: { name: `rm-safe-op-${runId}` } });
    operatorId = operator.id;
  });

  async function makeFixture(opts: {
    bookingStatus?: string;
    paymentStatus?: string;
    externalPnr?: string | null;
    ticketStatus?: string;
    withSuccessPayment?: boolean;
  }) {
    const user = await prisma.user.create({
      data: { name: `rm-safe-${runId}` },
    });
    const booking = await prisma.booking.create({
      data: {
        reference: `${refPrefix}-${prismaBookingCounter++}`,
        customerId: user.id,
        status: opts.bookingStatus ?? 'CONFIRMED',
        paymentStatus: opts.paymentStatus ?? 'CAPTURED',
        ticketStatus: opts.ticketStatus ?? 'NOT_ISSUED',
        fulfillmentStatus: 'CONFIRMED',
        totalAmount: 1_000_000,
        currency: 'IRR',
        externalPnr: opts.externalPnr ?? null,
      },
    });
    if (opts.withSuccessPayment) {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          idempotencyKey: `rm-safe-pay-${runId}-${prismaBookingCounter}`,
          method: 'wallet_irr',
          amount: 1_000_000,
          currency: 'IRR',
          status: 'SUCCESS',
        },
      });
    }
    const exception = await prisma.operationalException.create({
      data: {
        type: 'TICKET_NOT_ISSUED',
        severity: 'HIGH',
        entityType: 'BOOKING',
        entityId: booking.id,
        title: 'تست ایمنی رفع استثنا',
      },
    });
    return { user, booking, exception };
  }

  let prismaBookingCounter = 1;

  afterAll(async () => {
    // Non-ledger fixtures only: ledger/account rows stay behind as balanced
    // residue (deleting account-side legs would orphan shared platform legs).
    const users = await prisma.user.findMany({ where: { name: `rm-safe-${runId}` }, select: { id: true } });
    const userIds = users.map((u) => u.id);
    const bookings = await prisma.booking.findMany({ where: { customerId: { in: userIds } }, select: { id: true } });
    const bookingIds = bookings.map((b) => b.id);
    if (bookingIds.length > 0) {
      const exceptions = await prisma.operationalException.findMany({
        where: { entityId: { in: bookingIds } },
        select: { id: true },
      });
      const exceptionIds = exceptions.map((e) => e.id);
      await prisma.auditLog.deleteMany({
        where: { OR: [{ resourceId: { in: [...bookingIds, ...exceptionIds] } }, { userId: operatorId }] },
      });
      await prisma.operationalException.deleteMany({ where: { entityId: { in: bookingIds } } });
      await prisma.refund.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await prisma.payment.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await prisma.bookingItem.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
    }
    await prisma.user.deleteMany({ where: { OR: [{ id: { in: userIds } }, { id: operatorId }] } });
  });

  it('retryTicketing queues issuing but never fabricates a PNR or flips booking to CONFIRMED', async () => {
    const { booking, exception } = await makeFixture({
      bookingStatus: 'CONFIRMED',
      ticketStatus: 'NOT_ISSUED',
      externalPnr: null,
    });

    const res = await ExceptionRemediationService.retryTicketing(exception.id, operatorId);

    expect(res.success).toBe(true);
    expect(res.exceptionStatus).toBe('IN_PROGRESS');

    const after = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(after!.externalPnr).toBeNull(); // no fabricated PNR
    expect(after!.ticketStatus).toBe('ISSUING'); // queued, not ISSUED
    expect(after!.status).toBe('CONFIRMED'); // unchanged — was already confirmed by the saga

    // Repeat click is idempotent: stays IN_PROGRESS, same message semantics.
    const res2 = await ExceptionRemediationService.retryTicketing(exception.id, operatorId);
    expect(res2.exceptionStatus).toBe('IN_PROGRESS');
    const exceptionAfter = await prisma.operationalException.findUnique({ where: { id: exception.id } });
    expect(exceptionAfter!.status).toBe('IN_PROGRESS');
  });

  it('retryTicketing never advances a non-confirmed booking lifecycle', async () => {
    const { booking } = await makeFixture({ bookingStatus: 'PENDING_PAYMENT' });

    const exception = await prisma.operationalException.create({
      data: {
        type: 'SUPPLIER_TIMEOUT',
        severity: 'HIGH',
        entityType: 'BOOKING',
        entityId: booking.id,
        title: 'تست عدم پیشروی چرخه',
      },
    });

    await ExceptionRemediationService.retryTicketing(exception.id, operatorId);
    const after = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(after!.status).toBe('PENDING_PAYMENT'); // lifecycle untouched
    expect(after!.externalPnr).toBeNull();
  });

  it('pollSupplierPnr fails closed without a supplier adapter and never mutates the booking', async () => {
    const { booking, exception } = await makeFixture({
      bookingStatus: 'CONFIRMED',
      ticketStatus: 'ISSUING',
      externalPnr: null,
    });

    const res = await ExceptionRemediationService.pollSupplierPnr(exception.id, operatorId);

    expect(res.success).toBe(false);
    expect(res.message).toContain('آداپتور تامین‌کننده پیکربندی نشده');

    const after = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(after!.externalPnr).toBeNull();
    expect(after!.ticketStatus).toBe('ISSUING');
    expect(after!.status).toBe('CONFIRMED');
    const exceptionAfter = await prisma.operationalException.findUnique({ where: { id: exception.id } });
    expect(exceptionAfter!.status).toBe('IN_PROGRESS');
  });

  it('immediateWalletRefund refuses without authoritative captured payment evidence', async () => {
    const { booking, exception } = await makeFixture({ paymentStatus: 'INITIATED' });

    const res = await ExceptionRemediationService.immediateWalletRefund(exception.id, operatorId);

    expect(res.success).toBe(false);
    expect(res.message).toContain('منبع مالی معتبر');
    const exceptionAfter = await prisma.operationalException.findUnique({ where: { id: exception.id } });
    expect(exceptionAfter!.status).toBe('OPEN'); // untouched
    const refunds = await prisma.refund.findMany({ where: { bookingId: booking.id } });
    expect(refunds).toHaveLength(0); // no money moved
  });

  it('immediateWalletRefund routes through the domain service and is idempotent per exception', async () => {
    const { booking, exception } = await makeFixture({
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'CAPTURED',
    });

    const res = await ExceptionRemediationService.immediateWalletRefund(exception.id, operatorId);
    expect(res.success).toBe(true);
    expect(res.exceptionStatus).toBe('RESOLVED');

    const refunds = await prisma.refund.findMany({ where: { bookingId: booking.id } });
    expect(refunds).toHaveLength(1);
    expect(refunds[0].idempotencyKey).toBe(`remediation_full_refund_${exception.id}`);
    expect(Number(refunds[0].netRefundAmount)).toBe(1_000_000); // full, capped by REF-103

    const bookingAfter = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(bookingAfter!.status).toBe('REFUNDED');

    // Idempotent replay: the resolved exception returns early — no second refund.
    const res2 = await ExceptionRemediationService.immediateWalletRefund(exception.id, operatorId);
    expect(res2.exceptionStatus).toBe('RESOLVED');
    const refundsAfterReplay = await prisma.refund.findMany({ where: { bookingId: booking.id } });
    expect(refundsAfterReplay).toHaveLength(1);
  });

  it('syncPaymentStatus only aligns with webhook-verified SUCCESS payment evidence', async () => {
    const noEvidence = await makeFixture({ paymentStatus: 'INITIATED' });
    const resFail = await ExceptionRemediationService.syncPaymentStatus(noEvidence.exception.id, operatorId);
    expect(resFail.success).toBe(false);
    const bookingFail = await prisma.booking.findUnique({ where: { id: noEvidence.booking.id } });
    expect(bookingFail!.paymentStatus).toBe('INITIATED'); // no fabricated capture

    const withEvidence = await makeFixture({ paymentStatus: 'INITIATED', withSuccessPayment: true });
    const resOk = await ExceptionRemediationService.syncPaymentStatus(withEvidence.exception.id, operatorId);
    expect(resOk.success).toBe(true);
    expect(resOk.exceptionStatus).toBe('RESOLVED');
    const bookingOk = await prisma.booking.findUnique({ where: { id: withEvidence.booking.id } });
    expect(bookingOk!.paymentStatus).toBe('CAPTURED');
    // Lifecycle is NOT jumped to CONFIRMED without the normal fulfillment path.
    expect(bookingOk!.status).toBe('CONFIRMED'); // fixture was CONFIRMED already
  });
});
