import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CancellationEligibilityService } from './CancellationEligibilityService';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    booking: {
      findUniqueOrThrow: vi.fn(),
    },
  },
}));

describe('CancellationEligibilityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('evaluates cancellation with 20% penalty when travel date is between 24 and 72 hours away', async () => {
    const travelDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours away
    (prisma.booking.findUniqueOrThrow as any).mockResolvedValue({
      id: 'b-cancel-1',
      reference: 'ITR-778899',
      status: 'CONFIRMED',
      totalAmount: 10_000_000,
      currency: 'IRR',
      travelDate,
      items: [{ type: 'HOTEL' }],
    });

    const result = await CancellationEligibilityService.evaluateEligibility('b-cancel-1');

    expect(result.eligible).toBe(true);
    expect(result.penalty.amount.toString()).toBe('2000000'); // 20% of 10M
    expect(result.refundable.amount.toString()).toBe('8000000'); // 80% of 10M
    expect(result.version).toBeDefined();
    expect(CancellationEligibilityService.validateVersionToken(result.version)).toBe(true);
  });

  it('marks flight booking as requiring supplier review', async () => {
    const travelDate = new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString(); // 96 hours away
    (prisma.booking.findUniqueOrThrow as any).mockResolvedValue({
      id: 'b-cancel-2',
      reference: 'ITR-778890',
      status: 'CONFIRMED',
      totalAmount: 20_000_000,
      currency: 'IRR',
      travelDate,
      items: [{ type: 'FLIGHT' }],
    });

    const result = await CancellationEligibilityService.evaluateEligibility('b-cancel-2');

    expect(result.requiresSupplierReview).toBe(true);
    expect(result.policySummary).toContain('GDS');
  });

  it('throws error if booking is already in a terminal state', async () => {
    (prisma.booking.findUniqueOrThrow as any).mockResolvedValue({
      id: 'b-cancel-3',
      status: 'CANCELLED',
      totalAmount: 10_000_000,
      currency: 'IRR',
      items: [],
    });

    await expect(
      CancellationEligibilityService.evaluateEligibility('b-cancel-3')
    ).rejects.toThrow(/terminal state/);
  });
});
