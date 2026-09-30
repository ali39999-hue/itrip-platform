import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TravelWalletCaptureService } from './TravelWalletCaptureService';
import { Money } from '@/lib/finance';
import { prisma } from '@/lib/prisma';
import { GeneralLedgerService } from '../ledger/GeneralLedgerService';

vi.mock('@/lib/prisma', () => {
  const mockTx = {
    payment: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    booking: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    account: {
      upsert: vi.fn(),
    },
    $queryRaw: vi.fn(),
  };

  return {
    prisma: {
      $transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockTx)),
      payment: mockTx.payment,
      booking: mockTx.booking,
      account: mockTx.account,
      _mockTx: mockTx,
    },
  };
});

vi.mock('../ledger/GeneralLedgerService', () => ({
  GeneralLedgerService: {
    getAccountBalance: vi.fn(),
    postWalletPayment: vi.fn(),
  },
}));

describe('TravelWalletCaptureService', () => {
  const mockTx = (prisma as unknown as { _mockTx: typeof mockTx })._mockTx;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects capture when price slippage is detected', async () => {
    mockTx.payment.findUnique.mockResolvedValue(null);
    mockTx.booking.findUniqueOrThrow.mockResolvedValue({
      id: 'b-1',
      totalAmount: 15_000_000,
      currency: 'IRR',
    });

    const expectedTotal = new Money('14000000', 'IRR'); // user expects 14M, but booking is 15M

    await expect(
      TravelWalletCaptureService.captureWalletPayment({
        bookingId: 'b-1',
        userId: 'usr-1',
        expectedTotal,
        idempotencyKey: 'idem-1',
      })
    ).rejects.toThrow(/PRICE_SLIPPAGE_DETECTED/);
  });

  it('returns HTTP 402 insufficient funds payload when balance is low', async () => {
    mockTx.payment.findUnique.mockResolvedValue(null);
    mockTx.booking.findUniqueOrThrow.mockResolvedValue({
      id: 'b-1',
      reference: 'ITR-10023',
      totalAmount: 15_000_000,
      currency: 'IRR',
    });
    mockTx.account.upsert.mockResolvedValue({ id: 'acc-1' });

    // User only has 10M IRR in balance
    vi.mocked(GeneralLedgerService.getAccountBalance).mockResolvedValue(new Money('10000000', 'IRR'));

    const result = await TravelWalletCaptureService.captureWalletPayment({
      bookingId: 'b-1',
      userId: 'usr-1',
      expectedTotal: new Money('15000000', 'IRR'),
      idempotencyKey: 'idem-2',
    });

    expect(result.success).toBe(false);
    expect(result.orderStatus).toBe('INSUFFICIENT_FUNDS');
    expect(result.shortfall).toBeDefined();
    expect(result.shortfall?.shortfallAmount.amount.toString()).toBe('5000000');
    expect(result.shortfall?.nextAction.type).toBe('wallet_top_up');
  });

  it('successfully captures payment and posts double-entry ledger when balance suffices', async () => {
    mockTx.payment.findUnique.mockResolvedValue(null);
    mockTx.booking.findUniqueOrThrow.mockResolvedValue({
      id: 'b-1',
      reference: 'ITR-10023',
      totalAmount: 15_000_000,
      currency: 'IRR',
    });
    mockTx.account.upsert.mockResolvedValue({ id: 'acc-1' });
    mockTx.payment.create.mockResolvedValue({ id: 'pay-1' });
    mockTx.booking.update.mockResolvedValue({});

    vi.mocked(GeneralLedgerService.getAccountBalance).mockResolvedValue(new Money('25000000', 'IRR'));

    const result = await TravelWalletCaptureService.captureWalletPayment({
      bookingId: 'b-1',
      userId: 'usr-1',
      expectedTotal: new Money('15000000', 'IRR'),
      idempotencyKey: 'idem-3',
    });

    expect(result.success).toBe(true);
    expect(result.orderStatus).toBe('CONFIRMED');
    expect(result.paymentId).toBe('pay-1');
    expect(GeneralLedgerService.postWalletPayment).toHaveBeenCalledOnce();
  });
});
