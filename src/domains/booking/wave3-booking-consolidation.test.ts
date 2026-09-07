import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { BookingApplicationService } from './BookingApplicationService';
import { BookingStateMachine } from './state-machine';
import { PolicySnapshotDomainService } from './policy-snapshot';
import { TimelineTaxonomyService } from './timeline-taxonomy';

describe('Wave 3: Booking Consolidation Suite (BOOK-101 to BOOK-108)', () => {
  const suffix = `w3_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  let testUserId = '';
  let otherUserId = '';
  const createdBookingIds: string[] = [];

  beforeAll(async () => {
    const user1 = await prisma.user.create({
      data: {
        id: `usr_w3_a_${suffix}`,
        email: `w3_a_${suffix}@firuzo.test`,
        name: 'Wave3 User A',
      },
    });
    testUserId = user1.id;

    const user2 = await prisma.user.create({
      data: {
        id: `usr_w3_b_${suffix}`,
        email: `w3_b_${suffix}@firuzo.test`,
        name: 'Wave3 User B',
      },
    });
    otherUserId = user2.id;
  });

  afterAll(async () => {
    try {
      await prisma.priceSnapshot.deleteMany({ where: { bookingId: { in: createdBookingIds } } });
      await prisma.bookingStatusHistory.deleteMany({ where: { bookingId: { in: createdBookingIds } } });
      await prisma.payment.deleteMany({ where: { bookingId: { in: createdBookingIds } } });
      await prisma.refund.deleteMany({ where: { bookingId: { in: createdBookingIds } } });
      await prisma.bookingItem.deleteMany({ where: { bookingId: { in: createdBookingIds } } });
      await prisma.booking.deleteMany({ where: { id: { in: createdBookingIds } } });
      await prisma.user.deleteMany({ where: { id: { in: [testUserId, otherUserId] } } });
      await prisma.$disconnect();
    } catch {
      // Best effort cleanup
    }
  });

  it('BOOK-101 & BOOK-103: createDraft creates canonical booking with relational status history and NO legacy stateHistory', async () => {
    const draft = await BookingApplicationService.createDraft({
      actorId: testUserId,
      type: 'HOTEL',
      itemId: 'h1',
      itemTitle: 'Espinas Palace Tehran',
      count: 1,
      nights: 2,
      travelDate: '2026-10-01',
    });

    expect(draft.success).toBe(true);
    expect(draft.bookingId).toBeDefined();
    createdBookingIds.push(draft.bookingId);

    // Verify DB record
    const record = await prisma.booking.findUnique({
      where: { id: draft.bookingId },
      include: { statusHistory: true, priceSnapshots: true },
    });

    expect(record).not.toBeNull();
    // BOOK-103: stateHistory legacy column is NOT written
    expect(record?.stateHistory).toBeNull();
    // Relational status history is the sole source of truth
    expect(record?.statusHistory.length).toBeGreaterThan(0);
    expect(record?.statusHistory[0].toStatus).toBe(record?.status);

    // BOOK-104: Policy snapshot is serialized in canonical format
    expect(record?.policySnapshot).not.toBeNull();
    const policy = PolicySnapshotDomainService.parseOrMigrate(record?.policySnapshot);
    expect(policy.version).toBe('2.0');
    expect(policy.cancellationRules.length).toBeGreaterThan(0);
  });

  it('BOOK-104: PolicySnapshotDomainService migrates legacy policy structures to v2.0', () => {
    // Legacy snapshot with simple boolean
    const legacyJson = JSON.stringify({ refundable: true });
    const migrated = PolicySnapshotDomainService.parseOrMigrate(legacyJson, 'FLIGHT');

    expect(migrated.version).toBe('2.0');
    expect(migrated.isRefundable).toBe(true);
    expect(migrated.cancellationRules.length).toBeGreaterThan(0);
    expect(migrated.rulesHash).toBeDefined();

    // Default for null
    const emptyPolicy = PolicySnapshotDomainService.parseOrMigrate(null, 'VISA');
    expect(emptyPolicy.version).toBe('2.0');
    expect(emptyPolicy.isRefundable).toBe(false);
  });

  it('BOOK-105: Transitions are strictly asserted and illegal mutations fail', async () => {
    const draft = await BookingApplicationService.createDraft({
      actorId: testUserId,
      type: 'FLIGHT',
      itemId: 'f1',
      count: 1,
    });
    createdBookingIds.push(draft.bookingId);

    // DRAFT -> CONFIRMED directly without payment must throw
    expect(() => BookingStateMachine.assertTransition('DRAFT', 'CONFIRMED')).toThrow(/Invalid state transition/i);

    // EXPIRED -> CONFIRMED must throw
    expect(() => BookingStateMachine.assertTransition('EXPIRED', 'CONFIRMED')).toThrow(/Invalid state transition/i);
  });

  it('BOOK-106: Command-level authorization rejects unauthorized actors and cross-tenant access', async () => {
    const draft = await BookingApplicationService.createDraft({
      actorId: testUserId,
      type: 'HOTEL',
      itemId: 'h1',
    });
    createdBookingIds.push(draft.bookingId);

    // Other user cannot cancel or reprice User A's booking
    await expect(
      BookingApplicationService.cancelBooking({
        actorId: otherUserId,
        bookingId: draft.bookingId,
        reason: 'Malicious cancellation attempt',
      })
    ).rejects.toThrow(/Forbidden|Access denied/i);

    await expect(
      BookingApplicationService.repriceBooking({
        actorId: otherUserId,
        bookingId: draft.bookingId,
      })
    ).rejects.toThrow(/Forbidden|Access denied/i);
  });

  it('BOOK-107: Booking state consistency rules catch and reject illegal multi-dimensional combinations', () => {
    // 1. DRAFT cannot have CAPTURED payment
    const invalidDraft = BookingStateMachine.isConsistent({
      status: 'DRAFT',
      paymentStatus: 'CAPTURED',
      ticketStatus: 'NOT_ISSUED',
    });
    expect(invalidDraft.consistent).toBe(false);
    expect(invalidDraft.violation).toContain('DRAFT booking cannot have CAPTURED payment');

    // 2. CONFIRMED requires CAPTURED or AUTHORIZED payment
    const invalidConfirmed = BookingStateMachine.isConsistent({
      status: 'CONFIRMED',
      paymentStatus: 'INITIATED',
    });
    expect(invalidConfirmed.consistent).toBe(false);
    expect(invalidConfirmed.violation).toContain('CONFIRMED booking requires CAPTURED or AUTHORIZED');

    // 3. CANCELLED cannot retain ISSUED ticket
    const invalidCancelled = BookingStateMachine.isConsistent({
      status: 'CANCELLED',
      paymentStatus: 'CAPTURED',
      ticketStatus: 'ISSUED',
    });
    expect(invalidCancelled.consistent).toBe(false);
    expect(invalidCancelled.violation).toContain('CANCELLED booking cannot retain ISSUED ticket');

    // 4. EXPIRED cannot have CAPTURED payment
    const invalidExpired = BookingStateMachine.isConsistent({
      status: 'EXPIRED',
      paymentStatus: 'CAPTURED',
    });
    expect(invalidExpired.consistent).toBe(false);

    // 5. Valid consistent combinations pass
    const valid = BookingStateMachine.isConsistent({
      status: 'CONFIRMED',
      paymentStatus: 'CAPTURED',
      fulfillmentStatus: 'CONFIRMED',
      ticketStatus: 'ISSUED',
    });
    expect(valid.consistent).toBe(true);

    expect(() =>
      BookingStateMachine.assertConsistency({
        status: 'DRAFT',
        paymentStatus: 'CAPTURED',
      })
    ).toThrow(/Booking State Consistency Violation/i);
  });

  it('BOOK-108: Timeline event taxonomy and versioning', () => {
    const event = TimelineTaxonomyService.createEvent({
      id: `evt_${suffix}_1`,
      category: 'LIFECYCLE',
      eventType: 'BOOKING_CREATED',
      title: 'Booking Draft Initiated',
      actor: testUserId,
      severity: 'INFO',
      metadata: { productType: 'HOTEL', nights: 2 },
    });

    expect(event.version).toBe('2.0');
    expect(event.category).toBe('LIFECYCLE');
    expect(event.severity).toBe('INFO');
    expect(event.metadata?.productType).toBe('HOTEL');
  });

  it('MONEY-109 & MONEY-110: Authoritative reprice and price change acceptance', async () => {
    const draft = await BookingApplicationService.createDraft({
      actorId: testUserId,
      type: 'HOTEL',
      itemId: 'h1',
      nights: 1,
    });
    createdBookingIds.push(draft.bookingId);

    // Reprice without price change succeeds immediately
    const repriceSame = await BookingApplicationService.repriceBooking({
      actorId: testUserId,
      bookingId: draft.bookingId,
    });
    expect(repriceSame.success).toBe(true);
    expect(repriceSame.priceChanged).toBe(false);

    // If price increased and not accepted, requires acceptance
    // Simulate manual booking total modification to test price change detection
    await prisma.booking.update({
      where: { id: draft.bookingId },
      data: { totalAmount: 1_000 }, // artificially lower to trigger price increase
    });

    const repriceIncreased = await BookingApplicationService.repriceBooking({
      actorId: testUserId,
      bookingId: draft.bookingId,
      acceptPriceChange: false,
    });

    expect(repriceIncreased.success).toBe(false);
    expect(repriceIncreased.requiresCustomerAcceptance).toBe(true);
    expect(repriceIncreased.priceDifference).toBeGreaterThan(0);

    // Customer accepts the new price
    const repriceAccepted = await BookingApplicationService.repriceBooking({
      actorId: testUserId,
      bookingId: draft.bookingId,
      acceptPriceChange: true,
    });

    expect(repriceAccepted.success).toBe(true);
    expect(repriceAccepted.priceChanged).toBe(true);
  });
});
