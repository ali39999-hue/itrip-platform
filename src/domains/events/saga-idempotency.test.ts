import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { BookingSagaCoordinator } from '@/domains/booking/saga/BookingSagaCoordinator';
import { GeneralLedgerService } from '@/domains/ledger/GeneralLedgerService';
import { Money } from '@/lib/finance';

describe('Durable Saga, Idempotency & Compensation Suite (SAGA-101 to SAGA-106)', () => {
  const suffix = `saga_tst_${Date.now().toString(36)}`;
  let testUser: { id: string };

  beforeEach(async () => {
    testUser = await prisma.user.create({
      data: {
        id: `usr_${suffix}_${Math.random().toString(36).slice(2, 7)}`,
        email: `saga_usr_${Math.random().toString(36).slice(2, 7)}@firuzo.com`,
        phone: `+98912${Math.floor(1000000 + Math.random() * 9000000)}`,
        name: 'Saga Test User',
        role: 'CUSTOMER',
      },
    });

    // Top up user wallet in ledger with sufficient funds
    await GeneralLedgerService.postTopUp({
      groupId: `topup_saga_${suffix}_${Math.random().toString(36).slice(2, 7)}`,
      userId: testUser.id,
      amount: new Money(100_000_000, 'IRR'),
      currency: 'IRR',
    });
  });

  it('SAGA-101 & SAGA-102: Pre-persists saga steps in SagaStep and succeeds completely', async () => {
    const booking = await prisma.booking.create({
      data: {
        reference: `ITR-SAGA-${Math.floor(100000 + Math.random() * 900000)}`,
        customerId: testUser.id,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'INITIATED',
        totalAmount: new Prisma.Decimal(10_000_000),
        currency: 'IRR',
        items: {
          create: [
            {
              type: 'FLIGHT',
              sellPrice: new Prisma.Decimal(10_000_000),
              netCost: new Prisma.Decimal(9_000_000),
              markup: new Prisma.Decimal(0),
              taxAmount: new Prisma.Decimal(900_000),
              feeAmount: new Prisma.Decimal(100_000),
              details: JSON.stringify({ flightNumber: 'FZ-101' }),
            },
          ],
        },
      },
    });

    const result = await BookingSagaCoordinator.executeBookingConfirmation({
      bookingId: booking.id,
      idempotencyKey: `idemp_saga_ok_${Date.now()}`,
      paymentMethod: 'wallet_irr',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('SUCCEEDED');

    // Verify SagaExecution and SagaStep rows
    const saga = await prisma.sagaExecution.findUnique({
      where: { id: result.sagaId },
      include: { steps: true },
    });

    expect(saga).not.toBeNull();
    expect(saga?.status).toBe('SUCCEEDED');
    expect(saga?.steps.length).toBeGreaterThanOrEqual(4);

    // Verify every step was pre-persisted and succeeded with startedAt and finishedAt
    for (const step of saga!.steps) {
      expect(step.status).toBe('SUCCEEDED');
      expect(step.startedAt).not.toBeNull();
      expect(step.finishedAt).not.toBeNull();
    }

    // Verify Booking reached CONFIRMED
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
    });
    expect(updatedBooking?.status).toBe('CONFIRMED');
    expect(updatedBooking?.paymentStatus).toBe('CAPTURED');
  });

  it('SAGA-103 & SAGA-106: Idempotent duplicate execution reuses resultSnapshot without duplicate charging', async () => {
    const booking = await prisma.booking.create({
      data: {
        reference: `ITR-DUP-${Math.floor(100000 + Math.random() * 900000)}`,
        customerId: testUser.id,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'INITIATED',
        totalAmount: new Prisma.Decimal(5_000_000),
        currency: 'IRR',
        items: {
          create: [
            {
              type: 'HOTEL',
              sellPrice: new Prisma.Decimal(5_000_000),
              netCost: new Prisma.Decimal(4_500_000),
              markup: new Prisma.Decimal(0),
              details: '{}',
            },
          ],
        },
      },
    });

    const idempotencyKey = `idemp_dup_key_${Date.now()}`;

    // Execution 1
    const res1 = await BookingSagaCoordinator.executeBookingConfirmation({
      bookingId: booking.id,
      idempotencyKey,
      paymentMethod: 'wallet_irr',
    });
    expect(res1.success).toBe(true);

    // Initial balance after 1st execution
    const userAccount = await prisma.account.findUnique({
      where: { ownerType_ownerId_currency: { ownerType: 'USER', ownerId: testUser.id, currency: 'IRR' } },
    });
    const balanceAfter1 = await GeneralLedgerService.getAccountBalance(userAccount!.id, 'IRR');

    // Execution 2 with duplicate request
    const res2 = await BookingSagaCoordinator.executeBookingConfirmation({
      bookingId: booking.id,
      idempotencyKey,
      paymentMethod: 'wallet_irr',
    });
    expect(res2.success).toBe(true);

    // Balance must NOT have been debited twice!
    const balanceAfter2 = await GeneralLedgerService.getAccountBalance(userAccount!.id, 'IRR');
    expect(balanceAfter2.toNumber()).toBe(balanceAfter1.toNumber());
  });

  it('SAGA-104: Failure mid-saga triggers reverse-order compensations (refunds payment, transitions to FAILED)', async () => {
    const booking = await prisma.booking.create({
      data: {
        reference: `ITR-FAIL-${Math.floor(100000 + Math.random() * 900000)}`,
        customerId: testUser.id,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'INITIATED',
        totalAmount: new Prisma.Decimal(7_000_000),
        currency: 'IRR',
        items: {
          create: [
            {
              type: 'FLIGHT',
              sellPrice: new Prisma.Decimal(7_000_000),
              netCost: new Prisma.Decimal(6_000_000),
              markup: new Prisma.Decimal(0),
              details: '{}',
            },
          ],
        },
      },
    });

    const userAccount = await prisma.account.findUnique({
      where: { ownerType_ownerId_currency: { ownerType: 'USER', ownerId: testUser.id, currency: 'IRR' } },
    });
    const initialBalance = await GeneralLedgerService.getAccountBalance(userAccount!.id, 'IRR');

    // Simulate external supplier call failing after payment capture
    const result = await BookingSagaCoordinator.executeBookingConfirmation({
      bookingId: booking.id,
      idempotencyKey: `idemp_fail_${Date.now()}`,
      paymentMethod: 'wallet_irr',
      supplierCallFn: async () => {
        throw new Error('GDS_SEATS_UNAVAILABLE: Airline returned status NO_INVENTORY');
      },
    });

    // Saga should report failure and compensated status
    expect(result.success).toBe(false);
    expect(result.status).toBe('COMPENSATED');
    expect(result.error).toContain('GDS_SEATS_UNAVAILABLE');

    // Booking status should be transitioned to FAILED
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
    });
    expect(updatedBooking?.status).toBe('FAILED');
    expect(updatedBooking?.paymentStatus).toBe('FAILED');

    // Payment compensation: user's wallet must have received the refund back
    const finalBalance = await GeneralLedgerService.getAccountBalance(userAccount!.id, 'IRR');
    expect(finalBalance.toNumber()).toBe(initialBalance.toNumber());
  });
});
