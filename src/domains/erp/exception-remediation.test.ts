import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { ExceptionRemediationService } from './ExceptionRemediationService';
import { ExceptionCenterService } from './ExceptionCenterService';
import { GeneralLedgerService } from '@/domains/ledger/GeneralLedgerService';
import { Money } from '@/lib/finance';

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

    // Booking 1 for Retry Ticketing
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

    // Booking 2 for Immediate Wallet Refund
    // Seed initial ledger accounts so postRefund balances properly
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

  it('retries ticketing successfully and transitions exception to RESOLVED', async () => {
    const res = await ExceptionRemediationService.retryTicketing(exc1Id, operatorId);
    expect(res.success).toBe(true);
    expect(res.exceptionStatus).toBe('RESOLVED');

    const updatedBooking = await prisma.booking.findUnique({ where: { id: booking1Id } });
    expect(updatedBooking?.status).toBe('CONFIRMED');
    expect(updatedBooking?.ticketStatus).toBe('ISSUED');
    expect(updatedBooking?.externalPnr).toMatch(/^FZ-/);

    const updatedExc = await prisma.operationalException.findUnique({ where: { id: exc1Id } });
    expect(updatedExc?.status).toBe('RESOLVED');
    expect(updatedExc?.resolution).toContain('صدور مجدد بلیت با موفقیت انجام شد');
  });

  it('executes immediate wallet refund and records balanced ledger entry', async () => {
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

    // Verify formal Refund record created
    const refund = await prisma.refund.findFirst({ where: { bookingId: booking2Id } });
    expect(refund).toBeDefined();
    expect(Number(refund?.amount)).toBe(30_000_000);

    const updatedExc = await prisma.operationalException.findUnique({ where: { id: exc2Id } });
    expect(updatedExc?.status).toBe('RESOLVED');
    expect(updatedExc?.resolution).toContain('استرداد آنی به مبلغ');
  });
});
