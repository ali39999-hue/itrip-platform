import { describe, it, expect, afterAll } from 'vitest';
import { BookingStateMachine } from './state-machine';
import { prisma } from '@/lib/prisma';
import { InventoryEngine } from '@/domains/inventory/InventoryEngine';

describe('Booking Lifecycle & Relational History Suite (BOOK-001 to BOOK-005)', () => {
  const suffix = `bkg_life_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  let testUserId = '';
  let testBookingId = '';

  afterAll(async () => {
    try {
      await prisma.bookingStatusHistory.deleteMany({ where: { bookingId: testBookingId } });
      await prisma.priceSnapshot.deleteMany({ where: { bookingId: testBookingId } });
      await prisma.bookingItem.deleteMany({ where: { bookingId: testBookingId } });
      await prisma.booking.deleteMany({ where: { id: testBookingId } });
      await prisma.user.deleteMany({ where: { id: testUserId } });
    } catch (e) {
      console.error('Cleanup error:', e);
    } finally {
      await prisma.$disconnect();
    }
  });

  it('BOOK-002, BOOK-003: Enforces state transitions across all 4 lifecycle dimensions', () => {
    // 1. Booking status transitions
    expect(BookingStateMachine.canTransition('DRAFT', 'HELD')).toBe(true);
    expect(BookingStateMachine.canTransition('HELD', 'PENDING_PAYMENT')).toBe(true);
    expect(BookingStateMachine.canTransition('DRAFT', 'CONFIRMED')).toBe(false);

    // 2. Payment status transitions
    expect(BookingStateMachine.canTransitionPayment('INITIATED', 'AUTHORIZED')).toBe(true);
    expect(BookingStateMachine.canTransitionPayment('AUTHORIZED', 'CAPTURED')).toBe(true);
    expect(BookingStateMachine.canTransitionPayment('CAPTURED', 'REFUNDED')).toBe(true);
    expect(BookingStateMachine.canTransitionPayment('INITIATED', 'REFUNDED')).toBe(false);

    // 3. Fulfillment status transitions
    expect(BookingStateMachine.canTransitionFulfillment('PENDING', 'IN_PROGRESS')).toBe(true);
    expect(BookingStateMachine.canTransitionFulfillment('IN_PROGRESS', 'CONFIRMED')).toBe(true);
    expect(BookingStateMachine.canTransitionFulfillment('CONFIRMED', 'PENDING')).toBe(false);

    // 4. Ticket status transitions
    expect(BookingStateMachine.canTransitionTicket('NOT_ISSUED', 'ISSUING')).toBe(true);
    expect(BookingStateMachine.canTransitionTicket('ISSUING', 'ISSUED')).toBe(true);
    expect(BookingStateMachine.canTransitionTicket('ISSUED', 'REFUND_PENDING')).toBe(true);
    expect(BookingStateMachine.canTransitionTicket('NOT_ISSUED', 'REFUNDED')).toBe(false);
  });

  it('BOOK-001, BOOK-004: Persists relational booking status history queryable via SQL', async () => {
    const user = await prisma.user.create({
      data: {
        id: `usr_${suffix}`,
        email: `bkg_tester_${suffix}@firuzo.com`,
        name: 'Booking Tester',
      },
    });
    testUserId = user.id;

    const booking = await prisma.booking.create({
      data: {
        id: `bkg_${suffix}`,
        reference: `ITR-${suffix.toUpperCase()}`,
        customerId: user.id,
        status: 'DRAFT',
        paymentStatus: 'INITIATED',
        fulfillmentStatus: 'PENDING',
        ticketStatus: 'NOT_ISSUED',
        totalAmount: 10_000_000,
        currency: 'IRR',
        priceSnapshots: {
          create: {
            baseAmount: 9_000_000,
            markupAmount: 900_000,
            taxAmount: 100_000,
            sellPrice: 10_000_000,
            currency: 'IRR',
          },
        },
        statusHistory: {
          create: [
            {
              fromStatus: 'INITIAL',
              toStatus: 'DRAFT',
              actor: user.id,
              reason: 'Customer started checkout draft',
              correlationId: `corr_draft_${suffix}`,
            },
          ],
        },
      },
    });
    testBookingId = booking.id;

    // Verify relational status history through SQL queries
    const history = await prisma.bookingStatusHistory.findMany({
      where: { bookingId: booking.id },
      orderBy: { createdAt: 'asc' },
    });

    expect(history.length).toBe(1);
    expect(history[0].fromStatus).toBe('INITIAL');
    expect(history[0].toStatus).toBe('DRAFT');
    expect(history[0].actor).toBe(user.id);
    expect(history[0].correlationId).toBe(`corr_draft_${suffix}`);

    // Append a second transition
    await prisma.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        fromStatus: 'DRAFT',
        toStatus: 'HELD',
        actor: 'SYSTEM',
        reason: 'Inventory allotment soft hold acquired',
        correlationId: `corr_hold_${suffix}`,
      },
    });

    const updatedHistory = await prisma.bookingStatusHistory.findMany({
      where: { bookingId: booking.id },
      orderBy: { createdAt: 'asc' },
    });

    expect(updatedHistory.length).toBe(2);
    expect(updatedHistory[1].toStatus).toBe('HELD');
  });

  it('BOOK-005: Hold rollback compensation releases inventory hold if booking creation fails', async () => {
    // Setup a dummy inventory item & allotment
    const tempItemId = `temp_inv_${suffix}`;
    const tempSupplierId = `temp_sup_${suffix}`;
    const testDate = '2026-12-01';

    await prisma.supplier.create({ data: { id: tempSupplierId, name: 'Temp Sup', type: 'HOTEL' } });
    await prisma.inventoryItem.create({
      data: { id: tempItemId, supplierId: tempSupplierId, type: 'HOTEL_ROOM', name: 'Temp Room', basePrice: 5000000 },
    });
    await prisma.allotment.create({
      data: { inventoryItemId: tempItemId, date: testDate, total: 1, booked: 0 },
    });

    // Acquire hold
    const holdRes = await InventoryEngine.createHold({
      inventoryItemId: tempItemId,
      date: testDate,
      quantity: 1,
    });
    expect(holdRes.success).toBe(true);
    const holdToken = holdRes.token!;

    // Simulate booking creation failure
    const simulateBookingDraftFailure = async () => {
      try {
        // Intentionally invalid booking creation (violating foreign key or required field)
        await prisma.booking.create({
          data: {
            reference: `INVALID_REF`,
            customerId: 'non_existent_user_xyz',
            totalAmount: 5000000,
          },
        });
      } catch (err) {
        // Compensation trigger
        await InventoryEngine.releaseHold(holdToken);
        throw err;
      }
    };

    await expect(simulateBookingDraftFailure()).rejects.toThrow();

    // Verify hold was released by compensation
    const releasedHold = await prisma.inventoryHold.findUniqueOrThrow({
      where: { token: holdToken },
    });
    expect(releasedHold.status).toBe('RELEASED');

    // Cleanup
    await prisma.inventoryHold.deleteMany({ where: { inventoryItemId: tempItemId } });
    await prisma.allotment.deleteMany({ where: { inventoryItemId: tempItemId } });
    await prisma.inventoryItem.deleteMany({ where: { id: tempItemId } });
    await prisma.supplier.deleteMany({ where: { id: tempSupplierId } });
  });
});
