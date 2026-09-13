import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { ExceptionRemediationService } from './ExceptionRemediationService';
import { ExceptionCenterService } from './ExceptionCenterService';
import { GeneralLedgerService } from '@/domains/ledger/GeneralLedgerService';
import { Money } from '@/lib/finance';

/**
 * Auto-Healing Suite — updated for production-truth remediation:
 * ticketing retries may only QUEUE issuing (no fabricated PNR/ISSUED/CONFIRMED),
 * and wallet refunds route through RefundDomainService with REF-101..107
 * invariants and deterministic per-exception idempotency.
 */
describe('ExceptionRemediationService - Auto-Healing Suite', () => {
  const suffix = `remed_${Date.now().toString(36)}_${randomBytes(3).toString('hex')}`;
  let userId = '';
  let operatorId = '';
  let booking1Id = '';
  let booking2Id = '';
  let exc1Id = '';
  let exc2Id = '';

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `pass_${suffix}@firuzo.com`,
        phone: `+98912${Math.floor(1000000 + Math.random() * 9000000)}`,
        name: 'مسافر تست',
      },
    });
    userId = user.id;

    const op = await prisma.user.create({
      data: {
        email: `op_${suffix}@firuzo.com`,
        name: 'اپراتور عملیات',
        role: 'OPS',
      },
    });
    operatorId = op.id;

    // Booking 1 for Retry Ticketing — HELD, never confirmed by a supplier.
    const b1 = await prisma.booking.create({
      data: {
        customerId: userId,
        reference: `BKG-TKT-${suffix}`,
        status: 'HELD',
        ticketStatus: 'NOT_ISSUED',
        totalAmount: 15_000_000,
        currency: 'IRR',
      },
    });
    booking1Id = b1.id;

    const e1 = await ExceptionCenterService.createException({
      type: 'TICKET_NOT_ISSUED',
      severity: 'CRITICAL',
      entityType: 'BOOKING',
      entityId: booking1Id,
      title: 'خطای تایم‌اوت وب‌سرویس در صدور بلیت پرواز',
    });
    exc1Id = e1.id;

    // Booking 2 for Immediate Wallet Refund — payment actually captured.
    await GeneralLedgerService.postGatewayPayment({
      groupId: `seed_gw_${suffix}`,
      userId,
      bookingId: `bkg_seed_${suffix}`,
      amount: new Money(30_000_000, 'IRR'),
      currency: 'IRR',
      gatewayReference: `gw_${suffix}`,
    });

    const b2 = await prisma.booking.create({
      data: {
        customerId: userId,
        reference: `BKG-REF-${suffix}`,
        status: 'CONFIRMED',
        paymentStatus: 'CAPTURED',
        ticketStatus: 'FAILED',
        totalAmount: 30_000_000,
        currency: 'IRR',
      },
    });
    booking2Id = b2.id;

    const e2 = await ExceptionCenterService.createException({
      type: 'SUPPLIER_TIMEOUT',
      severity: 'HIGH',
      entityType: 'BOOKING',
      entityId: booking2Id,
      title: 'عدم پاسخ تامین‌کننده پس از کسر وجه',
    });
    exc2Id = e2.id;
  });

  afterAll(async () => {
    try {
      if (exc1Id || exc2Id) {
        await prisma.auditLog.deleteMany({ where: { resourceId: { in: [exc1Id, exc2Id] } } });
        await prisma.operationalException.deleteMany({ where: { id: { in: [exc1Id, exc2Id] } } });
      }
      if (booking1Id || booking2Id) {
        await prisma.refund.deleteMany({ where: { bookingId: { in: [booking1Id, booking2Id] } } });
        await prisma.booking.deleteMany({ where: { id: { in: [booking1Id, booking2Id] } } });
      }
      if (userId || operatorId) {
        await prisma.user.deleteMany({ where: { id: { in: [userId, operatorId] } } });
      }
    } catch {
      // Best effort cleanup
    }
  });

  it('retry ticketing only queues issuing — no fabricated PNR, no ISSUED, no forced CONFIRMED', async () => {
    const res = await ExceptionRemediationService.retryTicketing(exc1Id, operatorId);
    expect(res.success).toBe(true);
    expect(res.exceptionStatus).toBe('IN_PROGRESS');

    const updatedBooking = await prisma.booking.findUnique({ where: { id: booking1Id } });
    expect(updatedBooking?.status).toBe('HELD'); // lifecycle untouched
    expect(updatedBooking?.ticketStatus).toBe('ISSUING'); // queued for issuing
    expect(updatedBooking?.externalPnr).toBeNull(); // never fabricate a PNR

    const updatedExc = await prisma.operationalException.findUnique({ where: { id: exc1Id } });
    expect(updatedExc?.status).toBe('IN_PROGRESS');
    expect(updatedExc?.resolution).toContain('درخواست صدور مجدد بلیت ثبت شد');

    // Repeat click is idempotent.
    const res2 = await ExceptionRemediationService.retryTicketing(exc1Id, operatorId);
    expect(res2.exceptionStatus).toBe('IN_PROGRESS');
  });

  it('executes immediate wallet refund via the refund domain service (capped, idempotent, balanced)', async () => {
    const res = await ExceptionRemediationService.immediateWalletRefund(
      exc2Id,
      operatorId,
      'استرداد فوری به علت لغو پرواز از سمت ایرلاین'
    );

    expect(res.success).toBe(true);
    expect(res.exceptionStatus).toBe('RESOLVED');

    const updatedBooking = await prisma.booking.findUnique({ where: { id: booking2Id } });
    expect(updatedBooking?.status).toBe('REFUNDED');
    expect(updatedBooking?.paymentStatus).toBe('REFUNDED');

    // Formal Refund record with the deterministic per-exception idempotency key.
    const refund = await prisma.refund.findFirst({ where: { bookingId: booking2Id } });
    expect(refund).toBeDefined();
    expect(refund?.idempotencyKey).toBe(`remediation_full_refund_${exc2Id}`);
    expect(Number(refund?.amount)).toBe(30_000_000);
    expect(refund?.status).toBe('SETTLED');

    const updatedExc = await prisma.operationalException.findUnique({ where: { id: exc2Id } });
    expect(updatedExc?.status).toBe('RESOLVED');
    expect(updatedExc?.resolution).toContain('استرداد کامل به مبلغ');
  });

  it('refuses a wallet refund when no authoritative captured payment exists', async () => {
    const user = await prisma.user.create({
      data: { email: `nopay_${suffix}@firuzo.com`, name: 'مسافر بدون پرداخت' },
    });
    const b3 = await prisma.booking.create({
      data: {
        customerId: user.id,
        reference: `BKG-NOPAY-${suffix}`,
        status: 'CONFIRMED',
        paymentStatus: 'INITIATED',
        totalAmount: 5_000_000,
        currency: 'IRR',
      },
    });
    const e3 = await ExceptionCenterService.createException({
      type: 'SUPPLIER_TIMEOUT',
      severity: 'MEDIUM',
      entityType: 'BOOKING',
      entityId: b3.id,
      title: 'رزرو بدون پرداخت ثبت‌شده',
    });

    const res = await ExceptionRemediationService.immediateWalletRefund(e3.id, operatorId);
    expect(res.success).toBe(false);
    expect(res.message).toContain('منبع مالی معتبر');

    const refunds = await prisma.refund.findMany({ where: { bookingId: b3.id } });
    expect(refunds).toHaveLength(0);

    await prisma.auditLog.deleteMany({ where: { resourceId: e3.id } });
    await prisma.operationalException.deleteMany({ where: { id: e3.id } });
    await prisma.booking.deleteMany({ where: { id: b3.id } });
    await prisma.user.deleteMany({ where: { id: user.id } });
  });
});
