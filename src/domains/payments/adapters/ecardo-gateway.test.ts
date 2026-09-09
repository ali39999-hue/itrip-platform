import { describe, it, expect, vi } from 'vitest';
import { EcardoGatewayAdapter } from './EcardoGatewayAdapter';
import { getPaymentGateway } from '../gateway-port';
import { Money } from '@/lib/finance';
import crypto from 'crypto';

describe('EcardoGatewayAdapter Suite', () => {
  const testPublicKey = process.env.ECARDO_PUBLIC_KEY || 'test_public_key';
  const testSecretKey = process.env.ECARDO_SECRET_KEY || 'test_secret_key';

  it('instantiates via getPaymentGateway factory', () => {
    const adapter = getPaymentGateway('gateway_ecardo');
    expect(adapter.name).toBe('ECARDO_GATEWAY');
    expect(adapter.isDemo).toBe(false);
  });

  it('enforces https protocol and whitelist of allowed eCardo hosts (SSRF defense)', () => {
    const adapter = new EcardoGatewayAdapter({ publicKey: testPublicKey, baseUrl: 'http://malicious.com' });
    interface AdapterWithPrivateMethods {
      assertAllowedHost: (url: string) => void;
    }
    const privateAdapter = adapter as unknown as AdapterWithPrivateMethods;
    expect(() => privateAdapter.assertAllowedHost('http://ecardo.ir')).toThrow(/must use https protocol/);
    expect(() => privateAdapter.assertAllowedHost('https://evil-attacker.com/api')).toThrow(/Disallowed Ecardo host/);
    expect(() => privateAdapter.assertAllowedHost('https://ecardo.ir/api/merchant/make-payment')).not.toThrow();
    expect(() => privateAdapter.assertAllowedHost('https://api.ecardo.ir/api/merchant/make-payment')).not.toThrow();
  });

  it('fails closed when credentials are missing in production mode', async () => {
    const unconfigured = new EcardoGatewayAdapter({ publicKey: '' });
    const oldEnv = process.env.DEMO_MODE;
    process.env.DEMO_MODE = 'false';

    await expect(
      unconfigured.createPayment({
        intentId: 'int_1',
        bookingId: 'bkg_1',
        amount: new Money(100, 'USD'),
        callbackUrl: 'https://firuzo.com/callback',
      })
    ).rejects.toThrow(/ECARDO_PUBLIC_KEY is required/);

    process.env.DEMO_MODE = oldEnv;
  });

  it('formats transaction_id <= 12 chars and description <= 20 chars', async () => {
    const adapter = new EcardoGatewayAdapter({
      publicKey: testPublicKey,
      secretKey: testSecretKey,
      baseUrl: 'https://ecardo.ir',
    });

    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url, opts) => {
      const u = String(url);
      if (u.includes('access-token')) {
        return new Response(
          JSON.stringify({ status: 'success', token: 'mock_token_123', expires_in: '2026-09-09 18:00:00' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (u.includes('make-payment')) {
        const body = JSON.parse(String((opts as RequestInit).body));
        expect(body.transaction_id.length).toBeLessThanOrEqual(12);
        expect(body.description.length).toBeLessThanOrEqual(20);
        expect(body.currency).toBe('USD');
        expect(body.amount).toBe(50);
        return new Response(
          JSON.stringify({ status: 'success', payment_url: 'https://ecardo.ir/pay/TRXTEST123' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not Found', { status: 404 });
    });

    const res = await adapter.createPayment({
      intentId: 'int_test',
      bookingId: 'bkg_long_booking_id_123456789',
      amount: new Money(50, 'USD'),
      callbackUrl: 'https://firuzo.com/api/payments/ecardo/callback',
    });

    expect(res.success).toBe(true);
    expect(res.redirectUrl).toBe('https://ecardo.ir/pay/TRXTEST123');
    expect(res.gatewayRef.length).toBeLessThanOrEqual(12);
    expect(res.status).toBe('PENDING_CUSTOMER');

    fetchSpy.mockRestore();
  });

  it('validates webhook cryptographic HMAC signature', async () => {
    const adapter = new EcardoGatewayAdapter({
      publicKey: testPublicKey,
      secretKey: testSecretKey,
    });

    const payload = {
      transaction_id: 'FZTEST01',
      bookingId: 'bkg_99',
      amount: 100,
      currency: 'USD',
      timestamp: Date.now(),
    };
    const rawBody = JSON.stringify(payload);
    const validSignature = crypto.createHmac('sha256', testSecretKey).update(rawBody).digest('hex');

    const result = await adapter.verifyWebhook(rawBody, validSignature);
    expect(result.valid).toBe(true);
    expect(result.settledAmount.toNumber()).toBe(100);
    expect(result.settledCurrency).toBe('USD');

    const invalidResult = await adapter.verifyWebhook(rawBody, 'tampered_signature_123');
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.error).toContain('Invalid Ecardo webhook');
  });
});
