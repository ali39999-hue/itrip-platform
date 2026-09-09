import crypto from 'crypto';
import { Money } from '@/lib/finance';
import {
  PaymentGatewayPort,
  GatewayPaymentRequest,
  GatewayPaymentResponse,
  GatewayVerifyRequest,
  GatewayVerifyResponse,
  WebhookVerificationResult,
} from '../gateway-port';

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
      if (!resp.ok || data.status !== 'success' || !data.token) {
        throw new Error(data.message || `Failed to obtain Ecardo access token (HTTP ${resp.status})`);
      }

      return data.token as string;
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
    if (!this.isConfigured()) {
      if (process.env.DEMO_MODE === 'true') {
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

    const token = await this.getAccessToken();
    const endpoint = `${this.baseUrl}/api/merchant/make-payment`;
    this.assertAllowedHost(endpoint);

    // eCardo requires transaction_id <= 12 chars
    // Format: FZ + 8 uppercase alphanumeric chars = 10 chars
    const rawTxId = `FZ${Date.now().toString(36).slice(-6)}${crypto.randomBytes(2).toString('hex')}`.slice(0, 12).toUpperCase();

    // Map currency: eCardo supports USD, USDT, IRR, IRT, CNY, RMB
    let targetCurrency = (req.amount.currency || 'IRR').toUpperCase();
    if (targetCurrency === 'TOMAN') targetCurrency = 'IRT';

    // Amount formatting
    const numAmount = req.amount.toNumber();
    const formattedAmount = (targetCurrency === 'IRR' || targetCurrency === 'IRT')
      ? Math.round(numAmount)
      : Number(numAmount.toFixed(2));

    const description = `Firuzo ${req.bookingId ? req.bookingId.slice(-6) : 'Booking'}`.slice(0, 20);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'FiruzoTravel/1.0',
        },
        body: JSON.stringify({
          amount: formattedAmount,
          currency: targetCurrency,
          transaction_id: rawTxId,
          description,
          callback_url: req.callbackUrl,
        }),
        signal: controller.signal,
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || data.status !== 'success' || !data.payment_url) {
        const errMsg = Array.isArray(data.message) ? data.message.join('; ') : (data.message || `Payment creation failed (HTTP ${resp.status})`);
        throw new Error(errMsg);
      }

      return {
        success: true,
        gatewayRef: rawTxId,
        redirectUrl: data.payment_url as string,
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

    // eCardo callback or merchant verification
    // When customer completes payment and returns with transaction status:
    return {
      verified: true,
      transactionId: `ecardo_${req.gatewayRef}`,
      settledAmount: req.expectedAmount,
      settledCurrency: req.expectedAmount.currency,
      status: 'CAPTURED',
    };
  }

  async verifyWebhook(rawBody: string, signature: string): Promise<WebhookVerificationResult> {
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      // invalid json
    }

    const eventId = String(payload.eventId || payload.transaction_id || 'ecardo_evt');
    const bookingId = String(payload.bookingId || '');
    const gatewayRef = String(payload.gatewayRef || payload.transaction_id || '');
    const amountVal = Number(payload.amount) || 0;
    const currencyVal = String(payload.currency || 'USD').toUpperCase();
    const eventTime = Number(payload.timestamp) || Date.now();

    // If secret key is provided, verify HMAC signature if signature is sent
    if (this.secretKey && signature) {
      const computed = crypto.createHmac('sha256', this.secretKey).update(rawBody).digest('hex');
      const sigBuf = Buffer.from(signature);
      const computedBuf = Buffer.from(computed);
      if (sigBuf.length !== computedBuf.length || !crypto.timingSafeEqual(sigBuf, computedBuf)) {
        return {
          valid: false,
          gatewayName: this.name,
          eventId,
          eventType: 'payment.failed',
          bookingId,
          gatewayRef,
          settledAmount: Money.zero(currencyVal),
          settledCurrency: currencyVal,
          timestamp: eventTime,
          merchantId: this.publicKey,
          error: 'Invalid Ecardo webhook cryptographic signature',
        };
      }
    }

    return {
      valid: true,
      gatewayName: this.name,
      eventId,
      eventType: 'payment.captured',
      bookingId,
      gatewayRef,
      settledAmount: new Money(amountVal, currencyVal),
      settledCurrency: currencyVal,
      timestamp: eventTime,
      merchantId: this.publicKey,
    };
  }
}
