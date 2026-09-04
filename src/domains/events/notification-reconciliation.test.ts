import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
});
