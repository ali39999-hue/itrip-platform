import crypto from 'crypto';
import { Money } from '@/lib/finance';
import { timingSafeEqualStrings } from '@/lib/security/timing-safe';
import {
  PaymentGatewayPort,
  GatewayPaymentRequest,
  GatewayPaymentResponse,
  GatewayVerifyRequest,
  GatewayVerifyResponse,
  WebhookVerificationResult,
} from '../gateway-port';
import { getAppBaseUrl } from '@/lib/runtime-url';

/**
 * Currencies the eCardo merchant API actually accepts (official doc):
 * USD, USDT, IRR, IRT (Toman), CNY / RMB.
 *
 * Platform money convention: the platform's "IRR" unit IS Toman (see
 * CURRENCY_TO_TOMAN where IRR = 1), so platform IRR maps to eCardo IRT —
 * sending platform toman amounts as eCardo "IRR" (rial) would undercharge 10x.
 * Country currencies eCardo does not settle (TRY, AED, GEL, RUB, OMR) fall
 * back to USD via the caller-side FX conversion.
 */
export const ECARDO_SUPPORTED_CURRENCIES = new Set(['USD', 'USDT', 'IRR', 'IRT', 'CNY', 'RMB']);

export function mapToEcardoCurrency(currency: string): string {
  const c = (currency || 'USD').toUpperCase();
  if (c === 'TOMAN') return 'IRT';
  if (c === 'RMB') return 'CNY';
  if (c === 'IRR') return 'IRT';
  if (ECARDO_SUPPORTED_CURRENCIES.has(c)) return c;
  return 'USD';
}

/** eCardo reports IRT (Toman) in IPNs; the platform stores that unit as IRR. */
export function normalizeEcardoCurrencyToPlatform(currency: string): string {
  const c = (currency || '').toUpperCase();
  return c === 'IRT' ? 'IRR' : c;
}

export interface EcardoGatewayConfig {
  baseUrl?: string;
  publicKey?: string;
  secretKey?: string;
  timeoutMs?: number;
}

export class EcardoGatewayAdapter implements PaymentGatewayPort {
  readonly name = 'ECARDO_GATEWAY';
  readonly isDemo = false;

  private baseUrl: string;
  private publicKey: string;
  private secretKey: string;
  private timeoutMs: number;

  constructor(config?: EcardoGatewayConfig) {
    this.baseUrl = (config?.baseUrl || process.env.ECARDO_BASE_URL || 'https://ecardo.ir').replace(/\/+$/, '');
    this.publicKey = config?.publicKey !== undefined ? config.publicKey : (process.env.ECARDO_PUBLIC_KEY || '');
    this.secretKey = config?.secretKey !== undefined ? config.secretKey : (process.env.ECARDO_SECRET_KEY || '');
    this.timeoutMs = config?.timeoutMs || 15000;
  }

  private isConfigured(): boolean {
    return Boolean(this.publicKey);
  }

  /**
   * SSRF Protection: strictly enforce https scheme and allowed official eCardo hostnames.
   */
  private assertAllowedHost(targetUrl: string): void {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'https:') {
      throw new Error(`Security Error: Ecardo API requests must use https protocol, got ${parsed.protocol}`);
    }
    const allowedHosts = new Set(['ecardo.ir', 'api.ecardo.ir', 'sandbox.ecardo.ir']);
    if (!allowedHosts.has(parsed.hostname.toLowerCase())) {
      throw new Error(`Security Error: Disallowed Ecardo host ${parsed.hostname}`);
    }
  }

  /**
   * Obtain a bearer access token from eCardo merchant API.
   */
  async getAccessToken(): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Ecardo payment gateway not configured: ECARDO_PUBLIC_KEY is missing');
    }

    const endpoint = `${this.baseUrl}/api/merchant/access-token`;
    this.assertAllowedHost(endpoint);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'FiruzoTravel/1.0',
        },
        body: JSON.stringify({
          public_key: this.publicKey,
        }),
        signal: controller.signal,
      });

      const data = await resp.json().catch(() => ({}));
      const isSuccess = data.status === 'success' || data.status === true || data.status === '1' || data.status === 1;
      if (!resp.ok || !isSuccess) {
        throw new Error(data.message || `Failed to obtain Ecardo access token (HTTP ${resp.status})`);
      }

      // Official doc + WooCommerce caveat: the success payload field name has been
      // observed as token, access_token, payment_url, or nested under data.*
      const tokenValue =
        data.token ||
        data.access_token ||
        data.payment_url ||
        data.data?.token ||
        data.data?.access_token ||
        data.data?.payment_url;

      if (!tokenValue || typeof tokenValue !== 'string') {
        throw new Error(data.message || `Ecardo access token response missing token field (HTTP ${resp.status})`);
      }

      return tokenValue;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Initialize a merchant payment on eCardo.
   * Transaction ID is constrained to maximum 12 characters.
   * Description is constrained to maximum 20 characters.
   */
  async createPayment(req: GatewayPaymentRequest): Promise<GatewayPaymentResponse> {
    // Map to an eCardo-supported currency (platform IRR/TOMAN → IRT; USD/USDT/CNY pass through).
    const targetCurrency = mapToEcardoCurrency(req.amount.currency || 'IRR');

    // Amount formatting
    const numAmount = req.amount.toNumber();
    const formattedAmount = (targetCurrency === 'IRR' || targetCurrency === 'IRT')
      ? Math.round(numAmount)
      : Number(numAmount.toFixed(2));

    // Resolve explicit payment mode (e.g. from Admin switch) vs environment fallback
    const isExplicitDemo = req.paymentMode === 'demo';
    const isExplicitReal = req.paymentMode === 'real';
    const isProduction = process.env.NODE_ENV === 'production';

    // 1. If explicitly requested demo mode in non-production, route to demo simulator
    if (!isProduction && isExplicitDemo) {
      const demoTxId = `FZ${Date.now().toString(36).slice(-6)}${crypto.randomBytes(2).toString('hex')}`.slice(0, 12).toUpperCase();
      const demoParams = new URLSearchParams({
        ref: demoTxId,
        bookingId: req.bookingId || '',
        amount: String(formattedAmount),
        currency: targetCurrency,
      });
      return {
        success: true,
        gatewayRef: demoTxId,
        redirectUrl: `/demo/ecardo-checkout?${demoParams.toString()}`,
        status: 'PENDING_CUSTOMER',
        rawResponse: { demo: true, bookingId: req.bookingId, amount: formattedAmount, currency: targetCurrency },
      };
    }

    // 2. Validate configuration if real gateway is targeted
    if (!this.isConfigured()) {
      if (!isExplicitReal && !isProduction && process.env.DEMO_MODE === 'true') {
        const dummyRef = `FZ${Date.now().toString(36).slice(-8).toUpperCase()}`;
        return {
          success: true,
          gatewayRef: dummyRef,
          redirectUrl: `/payment-status?demo_ref=${dummyRef}&bookingId=${req.bookingId}`,
          status: 'PENDING_CUSTOMER',
          rawResponse: { demo: true, bookingId: req.bookingId },
        };
      }
      throw new Error('Ecardo payment gateway not configured: ECARDO_PUBLIC_KEY is required');
    }

    // 3. Simulated-gateway routing for tester walkthroughs when env flag is on (hard-blocked in production and when explicit real)
    const demoRoutingEnabled =
      !isProduction &&
      !isExplicitReal &&
      (process.env.ECARDO_DEMO_GATEWAY === 'true' || process.env.DEMO_MODE === 'true');

    if (demoRoutingEnabled) {
      const demoTxId = `FZ${Date.now().toString(36).slice(-6)}${crypto.randomBytes(2).toString('hex')}`.slice(0, 12).toUpperCase();
      const demoParams = new URLSearchParams({
        ref: demoTxId,
        bookingId: req.bookingId || '',
        amount: String(formattedAmount),
        currency: targetCurrency,
      });
      return {
        success: true,
        gatewayRef: demoTxId,
        redirectUrl: `/demo/ecardo-checkout?${demoParams.toString()}`,
        status: 'PENDING_CUSTOMER',
        rawResponse: { demo: true, bookingId: req.bookingId, amount: formattedAmount, currency: targetCurrency },
      };
    }

    const token = await this.getAccessToken();
    const endpoint = `${this.baseUrl}/api/merchant/make-payment`;
    this.assertAllowedHost(endpoint);

    // eCardo requires transaction_id <= 12 chars
    // Format: FZ + 8 uppercase alphanumeric chars = 10 chars
    const rawTxId = `FZ${Date.now().toString(36).slice(-6)}${crypto.randomBytes(2).toString('hex')}`.slice(0, 12).toUpperCase();

    const description = `Firuzo ${req.bookingId ? req.bookingId.slice(-6) : 'Booking'}`.slice(0, 20);

    // Official doc: ipn_url (max 255) is the authoritative server-to-server
    // status notification. Without it the capture would depend solely on the
    // untrusted browser callback, which the doc checklist forbids.
    // Resolution priority for IPN host:
    // 1. ECARDO_IPN_BASE_URL (explicit dev tunnel or override)
    // 2. Origin of req.callbackUrl if public HTTPS (Vercel deployments / custom domains)
    // 3. Fallback to getAppBaseUrl()
    let ipnBase = process.env.ECARDO_IPN_BASE_URL?.replace(/\/+$/, '');
    if (!ipnBase && req.callbackUrl) {
      try {
        const parsedCb = new URL(req.callbackUrl);
        if (parsedCb.protocol === 'https:' && !parsedCb.hostname.includes('localhost')) {
          ipnBase = parsedCb.origin;
        }
      } catch {}
    }
    if (!ipnBase) {
      ipnBase = getAppBaseUrl();
    }
    const ipnUrl = `${ipnBase}/api/payments/webhook?gateway=ecardo`.slice(0, 255);

    let cancelUrl = `${getAppBaseUrl()}/checkout`;
    if (req.callbackUrl) {
      try {
        const parsedCb = new URL(req.callbackUrl);
        const cancelPath = req.bookingId?.startsWith('wallet_topup_') ? '/wallet' : '/checkout';
        cancelUrl = `${parsedCb.origin}${cancelPath}`;
      } catch {}
    }
    cancelUrl = cancelUrl.slice(0, 255);
    const customerEmail = req.customerInfo?.email?.slice(0, 50);

    const bodyPayload: Record<string, unknown> = {
      amount: formattedAmount,
      currency: targetCurrency,
      transaction_id: rawTxId,
      order_id: rawTxId,
      description,
      ipn_url: ipnUrl,
      callback_url: req.callbackUrl,
      success_url: req.callbackUrl,
      cancel_url: cancelUrl,
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      ...(req.customerInfo?.phone ? { customer_phone: req.customerInfo.phone } : {}),
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      // Support both REST Merchant API endpoint (/merchant/make-payment)
      // and WooCommerce plugin endpoint (/merchant/payment/create)
      let resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'FiruzoTravel/1.0',
        },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      });

      // Fallback if primary endpoint returns 404 (e.g. WooCommerce-style backend)
      if (resp.status === 404) {
        const altEndpoint = `${this.baseUrl}/api/merchant/payment/create`;
        if (altEndpoint !== endpoint) {
          this.assertAllowedHost(altEndpoint);
          resp = await fetch(altEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`,
              'User-Agent': 'FiruzoTravel/1.0',
            },
            body: JSON.stringify(bodyPayload),
            signal: controller.signal,
          });
        }
      }

      const data = await resp.json().catch(() => ({}));
      const isSuccess =
        data.status === 'success' ||
        data.status === true ||
        data.status === '1' ||
        data.status === 1 ||
        data.result === 'success';

      const paymentUrl =
        (data.payment_url as string | undefined) ||
        (data.data?.payment_url as string | undefined) ||
        (data.redirect as string | undefined) ||
        (data.redirectUrl as string | undefined) ||
        (data.url as string | undefined);

      if (!resp.ok || !isSuccess || !paymentUrl) {
        const errMsg = Array.isArray(data.message)
          ? data.message.join('; ')
          : (data.message || data.error || `Payment creation failed (HTTP ${resp.status})`);
        throw new Error(errMsg);
      }

      return {
        success: true,
        gatewayRef: rawTxId,
        redirectUrl: paymentUrl,
        status: 'PENDING_CUSTOMER',
        rawResponse: data,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async verifyPayment(req: GatewayVerifyRequest): Promise<GatewayVerifyResponse> {
    if (!this.isConfigured()) {
      return {
        verified: false,
        transactionId: `unconf_${req.gatewayRef}`,
        settledAmount: req.expectedAmount,
        settledCurrency: req.expectedAmount.currency,
        status: 'FAILED',
        errorCode: 'GATEWAY_NOT_CONFIGURED',
        error: 'Ecardo gateway credentials missing',
      };
    }

    // Official eCardo Merchant API documents only three endpoints
    // (access-token, make-payment, IPN) — there is NO server-side verify
    // endpoint. Per the release checklist, the browser callback is UX-only
    // and must never be treated as the final capture authority: settlement is
    // confirmed exclusively by the HMAC-signed IPN handled via verifyWebhook.
    return {
      verified: false,
      transactionId: `ecardo_${req.gatewayRef}`,
      settledAmount: req.expectedAmount,
      settledCurrency: req.expectedAmount.currency,
      status: 'FAILED',
      errorCode: 'IPN_REQUIRED',
      error: 'Ecardo has no verify endpoint: capture authority is the signed IPN webhook only',
    };
  }

  async verifyWebhook(rawBody: string, signature: string): Promise<WebhookVerificationResult> {
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      // invalid json
    }

    // Official IPN shape: { status, signature, data: { transaction_id, total_amount, ... } }
    const data = (payload.data && typeof payload.data === 'object' ? payload.data : payload) as Record<string, unknown>;

    const eventId = String(payload.eventId || data.transaction_id || payload.transaction_id || 'ecardo_evt');
    const bookingId = String(payload.bookingId || data.bookingId || '');
    const gatewayRef = String(payload.gatewayRef || data.transaction_id || payload.transaction_id || '');
    const amountVal = Number(data.total_amount ?? payload.amount) || 0;
    const currencyVal = String(data.currency || payload.currency || 'USD').toUpperCase();
    const statusRaw = String(payload.status || data.status || '').toLowerCase();
    const eventTime = Number(payload.timestamp || data.timestamp) || Date.now();

    const rejection = (error: string, eventType: string) =>
      ({
        valid: false as const,
        gatewayName: this.name,
        eventId,
        eventType,
        bookingId,
        gatewayRef,
        settledAmount: Money.zero(currencyVal),
        settledCurrency: currencyVal,
        timestamp: eventTime,
        merchantId: this.publicKey,
        error,
      });

    // Fail closed without the signing secret or the signature (PAY-005)
    if (!this.secretKey) {
      return rejection('Ecardo webhook secret is not configured (ECARDO_SECRET_KEY missing)', 'payment.failed');
    }
    if (!signature) {
      return rejection('Ecardo webhook signature missing: verification fails closed', 'payment.failed');
    }

    // 1. Official documented algorithm: HMAC-SHA256(transaction_id + total_amount, secret_key)
    const txId = String(data.transaction_id || payload.transaction_id || '');
    const totalAmt = data.total_amount !== undefined
      ? String(data.total_amount)
      : payload.total_amount !== undefined
        ? String(payload.total_amount)
        : String(data.amount ?? payload.amount ?? '');

    const documentedSig = crypto
      .createHmac('sha256', this.secretKey)
      .update(`${txId}${totalAmt}`)
      .digest('hex');

    if (!timingSafeEqualStrings(signature, documentedSig)) {
      return rejection('Invalid Ecardo webhook cryptographic signature', 'payment.failed');
    }

    // Fail-Closed: only explicit successful statuses allow capture.
    const isSuccessStatus =
      statusRaw === 'success' ||
      statusRaw === 'completed' ||
      statusRaw === 'paid' ||
      statusRaw === 'ok' ||
      statusRaw === '1' ||
      statusRaw === 'true';

    const eventType = isSuccessStatus ? 'payment.captured' : 'payment.failed';

    return {
      valid: true,
      gatewayName: this.name,
      eventId,
      eventType,
      bookingId,
      gatewayRef,
      settledAmount: new Money(amountVal, currencyVal),
      settledCurrency: currencyVal,
      timestamp: eventTime,
      merchantId: this.publicKey,
    };
  }

  async queryPayment(gatewayRef: string): Promise<{
    status: 'INITIAL' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';
    gatewayRef: string;
    amount: Money;
    settledAt?: Date;
    rawResponse?: Record<string, unknown>;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return {
        status: 'FAILED',
        gatewayRef,
        amount: Money.zero('USD'),
        error: 'Ecardo gateway credentials missing: query fails closed',
      };
    }
    return {
      status: 'PENDING',
      gatewayRef,
      amount: Money.zero('USD'),
      error: 'Ecardo relies on server-to-server IPN webhooks for final capture state',
    };
  }

  async parseCallback(params: Record<string, string | string[] | undefined>): Promise<{
    valid: boolean;
    gatewayRef: string;
    amount?: Money;
    status: 'SUCCESS' | 'FAILED' | 'CANCELED';
    rawParams: Record<string, unknown>;
    error?: string;
  }> {
    const rawRef = String(params.transaction_id || params.order_id || params.ref || '');
    const status = String(params.status || '').toLowerCase();
    const isSuccess = status === 'success' || status === 'completed' || status === 'paid';

    return {
      valid: Boolean(rawRef),
      gatewayRef: rawRef,
      status: isSuccess ? 'SUCCESS' : 'FAILED',
      rawParams: params as Record<string, unknown>,
      error: isSuccess ? undefined : `Ecardo callback indicated status: ${status || 'unknown'}`,
    };
  }
}
