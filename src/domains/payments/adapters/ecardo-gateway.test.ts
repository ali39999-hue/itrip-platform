import { describe, it, expect, vi } from 'vitest';
import { EcardoGatewayAdapter } from './EcardoGatewayAdapter';
import { getPaymentGateway } from '../gateway-port';
import { Money } from '@/lib/finance';
import crypto from 'crypto';

describe('EcardoGatewayAdapter Suite', () => {
  const testPublicKey = process.env.ECARDO_PUBLIC_KEY || 'test_public_key';
  const testSecretKey = process.env.ECARDO_SECRET_KEY || 'test_secret_key';

  // Tests exercising the REAL gateway HTTP path must opt out of the demo
  // routing branch (vitest runs with DEMO_MODE=true).
  function useRealGateway(): () => void {
    const prev = process.env.DEMO_MODE;
    process.env.DEMO_MODE = 'false';
    return () => {
      process.env.DEMO_MODE = prev;
    };
  }

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

  it('ECARDO_DEMO_GATEWAY routes to the simulated checkout screen without calling the real API', async () => {
    const oldDemo = process.env.DEMO_MODE;
    const oldNodeEnv = process.env.NODE_ENV;
    const oldFlag = process.env.ECARDO_DEMO_GATEWAY;
    process.env.DEMO_MODE = 'false'; // global demo off — scoped flag drives the routing
    process.env.ECARDO_DEMO_GATEWAY = 'true';
    process.env.NODE_ENV = 'test';

    const fetchSpy = vi.spyOn(global, 'fetch');
    try {
      const adapter = new EcardoGatewayAdapter({ publicKey: testPublicKey, secretKey: testSecretKey });
      const res = await adapter.createPayment({
        intentId: 'int_demo',
        bookingId: 'wallet_topup_user_1',
        amount: new Money(2_500_000, 'IRR'),
        callbackUrl: 'http://localhost:3000/api/payments/callback',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('PENDING_CUSTOMER');
      expect(res.redirectUrl).toMatch(/^\/demo\/ecardo-checkout\?/);
      expect(res.redirectUrl).toContain('currency=IRT'); // platform IRR (Toman) → eCardo IRT
      expect(res.redirectUrl).toContain('amount=2500000');
      expect(res.gatewayRef).toMatch(/^FZ[A-Z0-9]{4,10}$/);
      expect(fetchSpy).not.toHaveBeenCalled(); // no real gateway traffic in demo
    } finally {
      fetchSpy.mockRestore();
      process.env.DEMO_MODE = oldDemo;
      process.env.NODE_ENV = oldNodeEnv;
      process.env.ECARDO_DEMO_GATEWAY = oldFlag;
    }
  });

  it('with the demo flag OFF the real gateway path is used unchanged', async () => {
    const oldDemo = process.env.DEMO_MODE;
    const oldNodeEnv = process.env.NODE_ENV;
    const oldFlag = process.env.ECARDO_DEMO_GATEWAY;
    process.env.DEMO_MODE = 'false';
    process.env.ECARDO_DEMO_GATEWAY = 'false';
    process.env.NODE_ENV = 'test';

    try {
      const adapter = new EcardoGatewayAdapter({ publicKey: testPublicKey, secretKey: testSecretKey });
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const u = String(url);
        if (u.includes('access-token')) {
          return new Response(JSON.stringify({ status: 'success', token: 't_real' }), { status: 200 });
        }
        return new Response(JSON.stringify({ status: 'success', payment_url: 'https://ecardo.ir/pay/TRXREAL01' }), {
          status: 200,
        });
      });
      try {
        const res = await adapter.createPayment({
          intentId: 'int_real',
          bookingId: 'bkg_real',
          amount: new Money(10, 'USD'),
          callbackUrl: 'https://firuzo.com/callback',
        });
        expect(res.redirectUrl).toBe('https://ecardo.ir/pay/TRXREAL01'); // REAL gateway untouched
      } finally {
        fetchSpy.mockRestore();
      }
    } finally {
      process.env.DEMO_MODE = oldDemo;
      process.env.NODE_ENV = oldNodeEnv;
      process.env.ECARDO_DEMO_GATEWAY = oldFlag;
    }
  });

  it('simulated routing is never active in production NODE_ENV (even with the flag on)', async () => {
    const oldDemo = process.env.DEMO_MODE;
    const oldNodeEnv = process.env.NODE_ENV;
    const oldFlag = process.env.ECARDO_DEMO_GATEWAY;
    process.env.DEMO_MODE = 'true';
    process.env.ECARDO_DEMO_GATEWAY = 'true';
    process.env.NODE_ENV = 'production';

    try {
      const adapter = new EcardoGatewayAdapter({ publicKey: testPublicKey, secretKey: testSecretKey });
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
        const u = String(url);
        if (u.includes('access-token')) {
          return new Response(JSON.stringify({ status: 'success', token: 't' }), { status: 200 });
        }
        return new Response(JSON.stringify({ status: 'success', payment_url: 'https://ecardo.ir/pay/TRXPROD1' }), {
          status: 200,
        });
      });
      try {
        const res = await adapter.createPayment({
          intentId: 'int_prod',
          bookingId: 'bkg_prod',
          amount: new Money(10, 'USD'),
          callbackUrl: 'https://firuzo.com/callback',
        });
        expect(res.redirectUrl).toBe('https://ecardo.ir/pay/TRXPROD1'); // real gateway, not the demo screen
      } finally {
        fetchSpy.mockRestore();
      }
    } finally {
      process.env.DEMO_MODE = oldDemo;
      process.env.NODE_ENV = oldNodeEnv;
      process.env.ECARDO_DEMO_GATEWAY = oldFlag;
    }
  });

  it('formats transaction_id <= 12 chars and description <= 20 chars', async () => {
    const restoreDemo = useRealGateway();
    try {
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
    } finally {
      restoreDemo();
    }
  });

  it('validates webhook signature per documented algorithm on a flat payload variant', async () => {
    const adapter = new EcardoGatewayAdapter({
      publicKey: testPublicKey,
      secretKey: testSecretKey,
    });

    // Flat variant (no nested `data`): transaction_id + total_amount at top level
    const payload = {
      transaction_id: 'FZTEST01',
      bookingId: 'bkg_99',
      total_amount: 100,
      currency: 'USD',
      timestamp: Date.now(),
    };
    const rawBody = JSON.stringify(payload);
    const validSignature = crypto
      .createHmac('sha256', testSecretKey)
      .update(`${payload.transaction_id}${payload.total_amount}`)
      .digest('hex');

    const result = await adapter.verifyWebhook(rawBody, validSignature);
    expect(result.valid).toBe(true);
    expect(result.settledAmount.toNumber()).toBe(100);
    expect(result.settledCurrency).toBe('USD');

    const invalidResult = await adapter.verifyWebhook(rawBody, 'tampered_signature_123');
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.error).toContain('Invalid Ecardo webhook');
  });

  it('validates the official documented IPN signature: HMAC(transaction_id + total_amount, secret)', async () => {
    const adapter = new EcardoGatewayAdapter({
      publicKey: testPublicKey,
      secretKey: testSecretKey,
    });

    // Exact shape from the official doc: { status, signature, data: { transaction_id, total_amount, ... } }
    const ipnData = {
      transaction_id: 'ABC123456789',
      total_amount: '100.00',
      currency: 'USD',
    };
    const documentedSignature = crypto
      .createHmac('sha256', testSecretKey)
      .update(`${ipnData.transaction_id}${ipnData.total_amount}`)
      .digest('hex');

    const ipnBody = JSON.stringify({
      status: 'success',
      signature: documentedSignature,
      data: ipnData,
    });

    const result = await adapter.verifyWebhook(ipnBody, documentedSignature);
    expect(result.valid).toBe(true);
    expect(result.gatewayRef).toBe('ABC123456789');
    expect(result.settledAmount.toNumber()).toBe(100);
    expect(result.settledCurrency).toBe('USD');
    expect(result.eventType).toBe('payment.captured');

    // A signature computed over the raw body must NOT satisfy the documented algorithm
    const wrongAlgoSig = crypto.createHmac('sha256', testSecretKey).update(ipnBody).digest('hex');
    const tampered = await adapter.verifyWebhook(ipnBody, wrongAlgoSig);
    expect(tampered.valid).toBe(false);

    // Failed IPN status must map to payment.failed so downstream never captures
    const failedBody = JSON.stringify({
      status: 'failed',
      signature: documentedSignature,
      data: ipnData,
    });
    const failedResult = await adapter.verifyWebhook(failedBody, documentedSignature);
    expect(failedResult.valid).toBe(true);
    expect(failedResult.eventType).toBe('payment.failed');
  });

  it('fails closed when the webhook secret is configured but the signature is missing', async () => {
    const adapter = new EcardoGatewayAdapter({
      publicKey: testPublicKey,
      secretKey: testSecretKey,
    });

    const result = await adapter.verifyWebhook(JSON.stringify({ transaction_id: 'X1', amount: 10 }), '');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('signature missing');
  });

  it('accepts payment_url as the access-token response field (official doc caveat)', async () => {
    const restoreDemo = useRealGateway();
    try {
    const adapter = new EcardoGatewayAdapter({
      publicKey: testPublicKey,
      secretKey: testSecretKey,
      baseUrl: 'https://ecardo.ir',
    });

    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const u = String(url);
      if (u.includes('access-token')) {
        // Installed-build variant: token delivered as payment_url
        return new Response(
          JSON.stringify({ status: 'success', payment_url: 'tok_via_payment_url' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (u.includes('make-payment')) {
        return new Response(
          JSON.stringify({ status: 'success', payment_url: 'https://ecardo.ir/pay/TRXTOKENVAR' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not Found', { status: 404 });
    });

    const res = await adapter.createPayment({
      intentId: 'int_tok',
      bookingId: 'bkg_tok',
      amount: new Money(20, 'USD'),
      callbackUrl: 'https://firuzo.com/api/payments/ecardo/callback',
    });

    expect(res.success).toBe(true);
    expect(res.redirectUrl).toBe('https://ecardo.ir/pay/TRXTOKENVAR');

    fetchSpy.mockRestore();
    } finally {
      restoreDemo();
    }
  });

  it('sends ipn_url (authoritative server-to-server channel) with make-payment', async () => {
    const restoreDemo = useRealGateway();
    try {
    const adapter = new EcardoGatewayAdapter({
      publicKey: testPublicKey,
      secretKey: testSecretKey,
      baseUrl: 'https://ecardo.ir',
    });

    let capturedBody: Record<string, unknown> = {};
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url, opts) => {
      const u = String(url);
      if (u.includes('access-token')) {
        return new Response(
          JSON.stringify({ status: 'success', token: 'mock_token_ipn' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (u.includes('make-payment')) {
        capturedBody = JSON.parse(String((opts as RequestInit).body));
        return new Response(
          JSON.stringify({ status: 'success', payment_url: 'https://ecardo.ir/pay/TRXIPNTEST' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not Found', { status: 404 });
    });

    await adapter.createPayment({
      intentId: 'int_ipn',
      bookingId: 'bkg_ipn',
      amount: new Money(75, 'USD'),
      callbackUrl: 'https://firuzo.com/api/payments/ecardo/callback',
    });

    expect(typeof capturedBody.ipn_url).toBe('string');
    expect(String(capturedBody.ipn_url)).toContain('/api/payments/webhook');
    expect(String(capturedBody.ipn_url)).toContain('gateway=ecardo');
    expect(String(capturedBody.ipn_url).length).toBeLessThanOrEqual(255);

    fetchSpy.mockRestore();
    } finally {
      restoreDemo();
    }
  });

  it('converts IRR base amount to USD, USDT, and CNY accurately with Decimal precision and preserves FX snapshot', async () => {
    const { defaultCurrencyService } = await import('@/domains/currency/CurrencyService');
    const baseAmountIrr = new Money(55_000_000, 'IRR'); // 5,500,000 Toman

    // 1. Convert to USD
    const usdConv = defaultCurrencyService.convertMoney(baseAmountIrr, 'USD');
    expect(usdConv.converted.currency).toBe('USD');
    expect(usdConv.converted.toNumber()).toBe(100);
    expect(usdConv.snapshot.fxRate.toString()).toBe('0.00000181818');
    expect(usdConv.snapshot.baseCurrency).toBe('USD');

    // 2. Convert to USDT
    const usdtConv = defaultCurrencyService.convertMoney(baseAmountIrr, 'USDT');
    expect(usdtConv.converted.currency).toBe('USDT');
    expect(usdtConv.converted.toNumber()).toBe(100);

    // 3. Convert to CNY
    const cnyConv = defaultCurrencyService.convertMoney(baseAmountIrr, 'CNY');
    expect(cnyConv.converted.currency).toBe('CNY');
    expect(cnyConv.converted.toNumber()).toBe(723.68);
  });
});
