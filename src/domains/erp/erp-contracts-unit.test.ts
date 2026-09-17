import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => {
  const client = {
    operationalException: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    booking: { findUnique: vi.fn(), update: vi.fn() },
    trip: { update: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() },
    payment: { findMany: vi.fn() },
    invoice: { findMany: vi.fn() },
    auditLog: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
  };
  return { prisma: { ...client, $transaction: vi.fn(async (fn) => fn(client)) } };
});
vi.mock('@/domains/refund/RefundDomainService', () => ({
  RefundDomainService: { processRefund: vi.fn() },
  RefundAmountInvariantViolationError: class extends Error {},
}));

import { prisma } from '@/lib/prisma';
import { ExceptionCenterService } from './ExceptionCenterService';
import { ExceptionRemediationService } from './ExceptionRemediationService';
import { TravelFileDomainService } from './TravelFileDomainService';
import { TravelFileService } from './TravelFileService';

describe('ERP lifecycle contracts (database-free)', () => {
  beforeEach(() => { vi.resetAllMocks(); });
  afterEach(() => { vi.useRealTimers(); });

  it('queues a first retry after assignment has already moved the exception to IN_PROGRESS', async () => {
    vi.mocked(prisma.operationalException.findUnique).mockResolvedValue({
      id: 'exception-1', entityType: 'BOOKING', entityId: 'booking-1', status: 'IN_PROGRESS',
    } as never);
    vi.mocked(prisma.booking.findUnique).mockResolvedValue({ id: 'booking-1', ticketStatus: 'NOT_ISSUED' } as never);
    vi.mocked(prisma.auditLog.findFirst).mockResolvedValue(null);
    const result = await ExceptionRemediationService.retryTicketing('exception-1', 'operator-1');
    expect(result.exceptionStatus).toBe('IN_PROGRESS');
    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' }, data: { ticketStatus: 'ISSUING' },
    });
  });

  it('queues a retry when previous ticket status was FAILED', async () => {
    vi.mocked(prisma.operationalException.findUnique).mockResolvedValue({
      id: 'exception-1', entityType: 'BOOKING', entityId: 'booking-1', status: 'IN_PROGRESS',
    } as never);
    vi.mocked(prisma.booking.findUnique).mockResolvedValue({ id: 'booking-1', ticketStatus: 'FAILED' } as never);
    vi.mocked(prisma.auditLog.findFirst).mockResolvedValue(null);
    const result = await ExceptionRemediationService.retryTicketing('exception-1', 'operator-1');
    expect(result.exceptionStatus).toBe('IN_PROGRESS');
    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' }, data: { ticketStatus: 'ISSUING' },
    });
  });

  it('does not enqueue an already recorded retry a second time', async () => {
    vi.mocked(prisma.operationalException.findUnique).mockResolvedValue({
      id: 'exception-1', entityId: 'booking-1', status: 'IN_PROGRESS',
    } as never);
    vi.mocked(prisma.booking.findUnique).mockResolvedValue({ id: 'booking-1', ticketStatus: 'ISSUING' } as never);
    vi.mocked(prisma.auditLog.findFirst).mockResolvedValue({ id: 'audit-1' } as never);
    await ExceptionRemediationService.retryTicketing('exception-1', 'operator-1');
    expect(prisma.booking.update).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('does not mark an SLA breached before its actual deadline', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-17T12:00:00Z'));
    expect(ExceptionCenterService.getSlaCountdown({
      status: 'OPEN', slaDueAt: new Date(Date.now() + 10_000),
    })).toMatchObject({ isBreached: false, status: 'APPROACHING_BREACH' });
  });

  it('counts an SLA breach exactly at the deadline consistently with the countdown', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-17T12:00:00Z'));
    vi.mocked(prisma.operationalException.findMany).mockResolvedValue([{
      id: 'exception-1', type: 'TICKET_NOT_ISSUED', severity: 'HIGH', status: 'OPEN', slaDueAt: new Date(),
    }] as never);
    expect((await ExceptionCenterService.getExceptionStats()).breachedSlaCount).toBe(1);
  });

  it('uses the same active and resolved SLA countdown in the TravelFile workspace', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-17T12:00:00Z'));
    vi.mocked(prisma.trip.findUnique).mockResolvedValue({
      id: 'trip-1', reference: 'TRP-1', user: { id: 'user-1', name: 'Test', travelerProfiles: [] },
      bookings: [], createdAt: new Date(), updatedAt: new Date(),
    } as never);
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
    vi.mocked(prisma.operationalException.findMany).mockResolvedValue([
      { id: 'active', type: 'TICKET_NOT_ISSUED', status: 'OPEN', slaDueAt: new Date(Date.now() + 10_000), detectedAt: new Date() },
      { id: 'resolved', type: 'TICKET_NOT_ISSUED', status: 'RESOLVED', slaDueAt: new Date(Date.now() - 60_000), detectedAt: new Date() },
    ] as never);
    const view = await TravelFileService.getTravelFile('trip-1');
    expect(view.summary.hasBreachedSla).toBe(false);
    expect(view.exceptions[0].slaStatus).toBe('APPROACHING_BREACH');
    expect(view.exceptions[1]).toMatchObject({ slaStatus: 'ON_TRACK', slaRemainingMinutes: 0 });
  });

  it('only advances PLANNING trips, without reopening terminal or regressing in-progress trips', async () => {
    vi.mocked(prisma.booking.findUnique).mockResolvedValue({ tripId: 'trip-1' } as never);
    await TravelFileDomainService.onBookingConfirmed('booking-1');
    expect(prisma.trip.updateMany).toHaveBeenCalledWith({
      where: { id: 'trip-1', status: 'PLANNING' }, data: { status: 'BOOKED' },
    });
  });
});
