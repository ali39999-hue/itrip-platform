import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  ConsoleNotificationProvider,
  ProductionNotificationProvider,
  getNotificationProvider
} from './NotificationProvider';
import { ReconciliationService } from '@/domains/ledger/ReconciliationService';

describe('NotificationProvider Unit Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('ConsoleNotificationProvider simulates SMS delivery without errors', async () => {
    const provider = new ConsoleNotificationProvider();
    const res = await provider.sendSms('+989123456789', 'کد تایید ۱۲۳۴');
    expect(res.success).toBe(true);
    expect(res.provider).toBe('console-simulator');
    expect(res.messageId).toBeDefined();
  });

  it('ConsoleNotificationProvider simulates email delivery without errors', async () => {
    const provider = new ConsoleNotificationProvider();
    const res = await provider.sendEmail('test@firuzo.com', 'خوش‌آمدید', 'متن ایمیل آزمایشی');
    expect(res.success).toBe(true);
    expect(res.provider).toBe('console-simulator');
  });

  it('getNotificationProvider returns ConsoleNotificationProvider in test environment', () => {
    const provider = getNotificationProvider();
    expect(provider.name).toBe('console-simulator');
  });

  it('ProductionNotificationProvider gracefully falls back to console if API key is missing', async () => {
    delete process.env.RESEND_API_KEY;
    const prodProvider = new ProductionNotificationProvider('');
    const res = await prodProvider.sendSms('+989120000000', 'تست غیاب کلید');
    expect(res.success).toBe(true);
    expect(res.provider).toBe('console-simulator');

    const emailRes = await prodProvider.sendEmail('test@firuzo.com', 'تست غیاب کلید', 'متن آزمایشی');
    expect(emailRes.success).toBe(true);
    expect(emailRes.provider).toBe('console-simulator');
  });

  it('ProductionNotificationProvider sends email via Resend API when RESEND_API_KEY is present', async () => {
    process.env.RESEND_API_KEY = 're_test_123456789';
    process.env.EMAIL_FROM = 'Test App <test@firuzo.com>';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'email_msg_abc123' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const prodProvider = new ProductionNotificationProvider();
    const res = await prodProvider.sendEmail('customer@example.com', 'خوش‌آمدید', '<p>سلام</p>');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer re_test_123456789',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Test App <test@firuzo.com>',
        to: ['customer@example.com'],
        subject: 'خوش‌آمدید',
        html: '<p>سلام</p>',
      }),
    });

    expect(res).toEqual({
      success: true,
      messageId: 'email_msg_abc123',
      provider: 'resend',
    });

    vi.unstubAllGlobals();
  });

  it('ProductionNotificationProvider returns failure when Resend API returns non-ok response', async () => {
    process.env.RESEND_API_KEY = 're_test_123456789';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => 'Invalid from address',
    });
    vi.stubGlobal('fetch', mockFetch);

    const prodProvider = new ProductionNotificationProvider();
    const res = await prodProvider.sendEmail('customer@example.com', 'خوش‌آمدید', '<p>سلام</p>');

    expect(res.success).toBe(false);
    expect(res.provider).toBe('resend');
    expect(res.error).toContain('Resend API returned HTTP 422: Invalid from address');

    vi.unstubAllGlobals();
  });

  it('ProductionNotificationProvider returns failure when fetch throws network error', async () => {
    process.env.RESEND_API_KEY = 're_test_123456789';

    const mockFetch = vi.fn().mockRejectedValue(new Error('Network connection timeout'));
    vi.stubGlobal('fetch', mockFetch);

    const prodProvider = new ProductionNotificationProvider();
    const res = await prodProvider.sendEmail('customer@example.com', 'خوش‌آمدید', '<p>سلام</p>');

    expect(res.success).toBe(false);
    expect(res.provider).toBe('resend');
    expect(res.error).toBe('Network connection timeout');

    vi.unstubAllGlobals();
  });
});

describe('ReconciliationService Unit Tests', () => {
  it('generates a valid balance report for the current database ledger', async () => {
    const report = await ReconciliationService.reconcileLedger();
    expect(report).toBeDefined();
    expect(report.timestamp).toBeDefined();
    expect(typeof report.totalGroupsChecked).toBe('number');
    expect(typeof report.unbalancedGroupsCount).toBe('number');
    expect(Array.isArray(report.mismatches)).toBe(true);
    // Any properly posted double-entry group should have debit === credit
    expect(report.unbalancedGroupsCount).toBe(0);
    expect(report.isBalanced).toBe(true);
  });

  it('reconciles booking financials against payments and flags exceptions on mismatch (RECON-001, RECON-003)', async () => {
    const suffix = Date.now().toString(36);
    const user = await prisma.user.create({
      data: { id: `recon_user_${suffix}`, email: `recon_${suffix}@firuzo.test`, name: 'Recon Test' },
    });

    // 1. Matched booking: Total 300,000, Payment 300,000
    const matchedBooking = await prisma.booking.create({
      data: { reference: `REC-M-${suffix}`, customerId: user.id, status: 'CONFIRMED', totalAmount: 300_000, currency: 'IRR' },
    });
    await prisma.payment.create({
      data: {
        bookingId: matchedBooking.id,
        idempotencyKey: `pay_m_${suffix}`,
        amount: 300_000,
        currency: 'IRR',
        method: 'wallet_irr',
        status: 'SUCCESS',
      },
    });

    const matchRes = await ReconciliationService.reconcileBookingFinancials(matchedBooking.id);
    expect(matchRes.matched).toBe(true);
    expect(matchRes.status).toBe('MATCHED');
    expect(matchRes.confidenceScore).toBe(100);
    expect(matchRes.exceptionId).toBeUndefined();

    // 2. Mismatched booking: Total 500,000, Payment only 200,000
    const mismatchedBooking = await prisma.booking.create({
      data: { reference: `REC-MIS-${suffix}`, customerId: user.id, status: 'CONFIRMED', totalAmount: 500_000, currency: 'IRR' },
    });
    await prisma.payment.create({
      data: {
        bookingId: mismatchedBooking.id,
        idempotencyKey: `pay_mis_${suffix}`,
        amount: 200_000,
        currency: 'IRR',
        method: 'wallet_irr',
        status: 'SUCCESS',
      },
    });

    const mismatchRes = await ReconciliationService.reconcileBookingFinancials(mismatchedBooking.id);
    expect(mismatchRes.matched).toBe(false);
    expect(mismatchRes.status).toBe('MISMATCH');
    expect(mismatchRes.confidenceScore).toBeLessThan(80);
    expect(mismatchRes.exceptionId).toBeDefined();

    // Verify exception recorded in Exception Center
    const recordedException = await prisma.operationalException.findUniqueOrThrow({
      where: { id: mismatchRes.exceptionId },
    });
    expect(recordedException.type).toBe('PAYMENT_MISMATCH');
    expect(recordedException.severity).toBe('HIGH');
    expect(recordedException.status).toBe('OPEN');

    // Cleanup
    await prisma.operationalException.delete({ where: { id: mismatchRes.exceptionId } });
    await prisma.payment.deleteMany({ where: { bookingId: { in: [matchedBooking.id, mismatchedBooking.id] } } });
    await prisma.booking.deleteMany({ where: { id: { in: [matchedBooking.id, mismatchedBooking.id] } } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});
