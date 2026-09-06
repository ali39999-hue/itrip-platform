import { describe, it, expect, afterAll } from 'vitest';
import { randomBytes } from 'crypto';
import { PaymentDomainService } from './payments/PaymentDomainService';
import { BookingDomainService } from './booking/BookingDomainService';
import { OperationalExceptionService, ExceptionSeverity } from './finance/three-way-reconciliation';
import { prisma } from '@/lib/prisma';

/**
 * Hardening continuations suite: webhook per-booking capture idempotency and
 * terminal-state guard (PAY-010), abandoned-booking lifecycle sweeper (BOOK-002
 * companion), and Exception Center dedupe (ERP-009).
 */
describe('Hardening continuations (PAY-010, booking lifecycle, ERP-009)', () => {
  const suffix = `hrd_${Date.now().toString(36)}_${randomBytes(3).toString('hex')}`;
  let userId = '';
  let capturedBookingId = '';
  let terminalBookingId = '';
  let staleHeldBookingId = '';
  let paidBookingId = '';
  const amount = 2_500_000;

  afterAll(async () => {
    try {
      await prisma.webhookEvent.deleteMany({
        where: { eventId: { contains: suffix } },
      });
      for (const bookingId of [capturedBookingId, terminalBookingId, staleHeldBookingId, paidBookingId]) {
        if (!bookingId) continue;
        await prisma.auditLog.deleteMany({ where: { resource: 'Payment', resourceId: { contains: '' }, newData: { contains: bookingId } } });
        await prisma.payment.deleteMany({ where: { bookingId } });
        await prisma.bookingStatusHistory.deleteMany({ where: { bookingId } });
        await prisma.booking.deleteMany({ where: { id: bookingId } });
      }
      if (userId) await prisma.user.deleteMany({ where: { id: userId } });
      await prisma.operationalException.deleteMany({
        where: { type: 'HARDENING_DEDUPE_TEST', entityId: suffix },
      });
    } catch (e) {
      console.error('Hardening continuations cleanup error:', e);
    } finally {
      await prisma.$disconnect();
    }
  });

  it('sets up shared user and bookings', async () => {
    const user = await prisma.user.create({
      data: { id: `usr_${suffix}`, email: `hrd_${suffix}@firuzo.test`, name: 'Hardening Tester' },
    });
    userId = user.id;

    const captured = await prisma.booking.create({
      data: {
        id: `bkg_${suffix}_cap`,
        reference: `ITR-HRD-CAP-${suffix}`,
        customerId: userId,
        status: 'CONFIRMED',
        paymentStatus: 'CAPTURED',
        totalAmount: amount,
        currency: 'IRR',
      },
    });
    capturedBookingId = captured.id;

    await prisma.payment.create({
      data: {
        bookingId: capturedBookingId,
        idempotencyKey: `pay_original_${suffix}`,
        amount,
        currency: 'IRR',
        method: 'gateway_shetab',
        status: 'SUCCESS',
      },
    });

    const terminal = await prisma.booking.create({
      data: {
        id: `bkg_${suffix}_trm`,
        reference: `ITR-HRD-TRM-${suffix}`,
        customerId: userId,
        status: 'EXPIRED',
        totalAmount: amount,
        currency: 'IRR',
      },
    });
    terminalBookingId = terminal.id;
  });

  it('PAY-010: a valid fresh-eventId webhook for an already-captured booking collapses into DUPLICATE', async () => {
    const oldEnv = process.env.DEMO_MODE;
    process.env.DEMO_MODE = 'true';

    const paymentsBefore = await prisma.payment.count({ where: { bookingId: capturedBookingId } });

    const res = await PaymentDomainService.processWebhook({
      gatewayName: 'SHETAB_GATEWAY',
      eventId: `evt_dup_${suffix}`,
      eventType: 'payment.captured',
      bookingId: capturedBookingId,
      gatewayRef: `ref_dup_${suffix}`,
      settledAmount: amount,
      settledCurrency: 'IRR',
      timestamp: Date.now(),
    });

    expect(res.processed).toBe(false);
    expect(res.status).toBe('DUPLICATE');
    expect(res.reason).toMatch(/already captured/i);

    const paymentsAfter = await prisma.payment.count({ where: { bookingId: capturedBookingId } });
    expect(paymentsAfter).toBe(paymentsBefore); // no second Payment minted

    process.env.DEMO_MODE = oldEnv;
  });

  it('PAY-010: a webhook against a terminal-state booking is rejected (no resurrection)', async () => {
    const oldEnv = process.env.DEMO_MODE;
    process.env.DEMO_MODE = 'true';

    await expect(
      PaymentDomainService.processWebhook({
        gatewayName: 'SHETAB_GATEWAY',
        eventId: `evt_trm_${suffix}`,
        eventType: 'payment.captured',
        bookingId: terminalBookingId,
        gatewayRef: `ref_trm_${suffix}`,
        settledAmount: amount,
        settledCurrency: 'IRR',
        timestamp: Date.now(),
      })
    ).rejects.toThrow(/terminal state/i);

    const untouched = await prisma.booking.findUniqueOrThrow({ where: { id: terminalBookingId } });
    expect(untouched.status).toBe('EXPIRED');

    process.env.DEMO_MODE = oldEnv;
  });

  it('Lifecycle sweeper expires abandoned HELD/PENDING_PAYMENT bookings but never paid ones', async () => {
    const stale = await prisma.booking.create({
      data: {
        id: `bkg_${suffix}_stale`,
        reference: `ITR-HRD-STALE-${suffix}`,
        customerId: userId,
        status: 'PENDING_PAYMENT',
        totalAmount: 500_000,
        currency: 'IRR',
        createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1h old
      },
    });
    staleHeldBookingId = stale.id;

    const paid = await prisma.booking.create({
      data: {
        id: `bkg_${suffix}_paid`,
        reference: `ITR-HRD-PAID-${suffix}`,
        customerId: userId,
        status: 'PENDING_PAYMENT',
        totalAmount: 500_000,
        currency: 'IRR',
        createdAt: new Date(Date.now() - 60 * 60 * 1000),
      },
    });
    paidBookingId = paid.id;
    await prisma.payment.create({
      data: {
        bookingId: paidBookingId,
        idempotencyKey: `pay_paid_${suffix}`,
        amount: 500_000,
        currency: 'IRR',
        method: 'wallet_irr',
        status: 'SUCCESS',
      },
    });

    const expiredCount = await BookingDomainService.expireStaleBookings(30);
    expect(expiredCount).toBeGreaterThanOrEqual(1);

    const staleAfter = await prisma.booking.findUniqueOrThrow({ where: { id: staleHeldBookingId } });
    expect(staleAfter.status).toBe('EXPIRED');

    const paidAfter = await prisma.booking.findUniqueOrThrow({ where: { id: paidBookingId } });
    expect(paidAfter.status).toBe('PENDING_PAYMENT'); // successful payment protects it

    const history = await prisma.bookingStatusHistory.findFirst({
      where: { bookingId: staleHeldBookingId, toStatus: 'EXPIRED', actor: 'LIFECYCLE_SWEEPER' },
    });
    expect(history).not.toBeNull();
  });

  it('ERP-009: repeated exception detections dedupe onto the open record, resolution re-opens fresh', async () => {
    const first = await OperationalExceptionService.raiseException({
      type: 'HARDENING_DEDUPE_TEST',
      severity: ExceptionSeverity.MEDIUM,
      entityType: 'TEST',
      entityId: suffix,
      description: 'first detection',
      slaMinutes: 60,
    });
    const second = await OperationalExceptionService.raiseException({
      type: 'HARDENING_DEDUPE_TEST',
      severity: ExceptionSeverity.MEDIUM,
      entityType: 'TEST',
      entityId: suffix,
      description: 'second detection',
      slaMinutes: 60,
    });
    expect(second).toBe(first); // deduped onto the open exception

    const refreshed = await prisma.operationalException.findUniqueOrThrow({ where: { id: first } });
    expect(refreshed.description).toBe('second detection');
    expect(refreshed.status).toBe('OPEN');

    await OperationalExceptionService.resolveException(first, 'fixed in hardening run');

    const third = await OperationalExceptionService.raiseException({
      type: 'HARDENING_DEDUPE_TEST',
      severity: ExceptionSeverity.MEDIUM,
      entityType: 'TEST',
      entityId: suffix,
      description: 'third detection after resolution',
      slaMinutes: 60,
    });
    expect(third).not.toBe(first); // resolved record no longer absorbs new detections
  });
});
