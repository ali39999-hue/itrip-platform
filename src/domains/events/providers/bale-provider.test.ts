import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductionBaleProvider } from './ProductionBaleProvider';
import { ConsoleNotificationProvider } from '../NotificationProvider';
import { otpRequestSchema } from '@/lib/validations';

describe('Bale Messenger Provider & Auth Channel Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fails closed when BALE_BOT_TOKEN is not configured', async () => {
    const provider = new ProductionBaleProvider('');
    const res = await provider.sendMessage('test_user', 'Your code is 123456');

    expect(res.success).toBe(false);
    expect(res.error).toContain('FAIL-CLOSED: BALE_BOT_TOKEN is not configured');
  });

  it('rejects empty or whitespace chat ID', async () => {
    const provider = new ProductionBaleProvider('fake-token-123');
    const res = await provider.sendMessage('   ', 'Your code is 123456');

    expect(res.success).toBe(false);
    expect(res.error).toContain('Invalid Bale chat ID');
  });

  it('dispatches HTTP POST to official Bale Bot API and returns messageId on success', async () => {
    const fakeToken = '123456789:abcdefABCDEF';
    const provider = new ProductionBaleProvider(fakeToken);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        result: {
          message_id: 987654,
        },
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await provider.sendMessage('@bale_customer', 'کد تایید ورود: 54321');

    expect(mockFetch).toHaveBeenCalledWith(
      `https://tapi.bale.ai/bot${fakeToken}/sendMessage`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: 'bale_customer',
          text: 'کد تایید ورود: 54321',
        }),
      })
    );
    expect(res.success).toBe(true);
    expect(res.messageId).toBe('987654');
    expect(res.provider).toBe('bale-bot-api');
  });

  it('ConsoleNotificationProvider simulates Bale delivery in dev/test', async () => {
    const consoleProvider = new ConsoleNotificationProvider();
    const res = await consoleProvider.sendBale('09123456789', 'کد: 12345');

    expect(res.success).toBe(true);
    expect(res.provider).toBe('console-simulator');
    expect(res.messageId).toContain('sim-bale-');
  });

  it('otpRequestSchema validates "bale" as a canonical channel', () => {
    const validRequest = otpRequestSchema.parse({
      identifier: '@traveler_bale',
      channel: 'bale',
    });

    expect(validRequest.channel).toBe('bale');
    expect(validRequest.identifier).toBe('@traveler_bale');
  });
});
