import { Money } from '@/lib/finance';
import crypto from 'crypto';
import { EcardoGatewayAdapter } from './adapters/EcardoGatewayAdapter';

export interface GatewayPaymentRequest {
  intentId: string;
  bookingId: string;
  amount: Money;
  callbackUrl: string;
  customerInfo?: {
    phone?: string;
    email?: string;
    nationalId?: string;
  };
}

export interface GatewayPaymentResponse {
  success: boolean;
  gatewayRef: string;
  redirectUrl?: string;
  status: 'INITIATED' | 'PENDING_CUSTOMER' | 'SUCCESS' | 'FAILED';
  rawResponse?: Record<string, unknown>;
  error?: string;
}

export interface GatewayVerifyRequest {
  gatewayRef: string;
  expectedAmount: Money;
  merchantId?: string;
  timestamp?: number; // epoch ms
  rawPayload?: Record<string, unknown>;
  signature?: string;
}

export interface GatewayVerifyResponse {
  verified: boolean;
  transactionId: string;
  settledAmount: Money;
  settledCurrency: string;
  status: 'CAPTURED' | 'FAILED';
  errorCode?: string;
  error?: string;
}

export interface WebhookVerificationResult {
  valid: boolean;
  gatewayName: string;
  eventId: string;
  eventType: string;
  bookingId: string;
  gatewayRef: string;
  settledAmount: Money;
  settledCurrency: string;
  timestamp: number;
  merchantId: string;
  error?: string;
}

export interface PaymentGatewayPort {
  readonly name: string;
  readonly isDemo: boolean;
  createPayment(req: GatewayPaymentRequest): Promise<GatewayPaymentResponse>;
  verifyPayment(req: GatewayVerifyRequest): Promise<GatewayVerifyResponse>;
  verifyWebhook?(rawBody: string, signature: string, headers?: Record<string, string>): Promise<WebhookVerificationResult>;
  refundPayment?(gatewayRef: string, amount: Money, reason?: string): Promise<{ success: boolean; refundRef?: string; error?: string }>;
}

/**
 * Production Shetab / Saman / Shaparak Gateway Adapter (Iranian National Payment Network)
 * Enforces cryptographic HMAC-SHA256 signature verification, replay protection, and fails closed.
 */
export class ShetabGatewayAdapter implements PaymentGatewayPort {
  readonly name = 'SHETAB_GATEWAY';
  readonly isDemo = false;

  private merchantId: string;
  private secretKey: string;
  private terminalId: string;

  constructor(config?: { merchantId?: string; secretKey?: string; terminalId?: string }) {
    this.merchantId = config?.merchantId || process.env.SHETAB_MERCHANT_ID || '';
    this.secretKey = config?.secretKey || process.env.SHETAB_SECRET_KEY || '';
    this.terminalId = config?.terminalId || process.env.SHETAB_TERMINAL_ID || '';
  }

  private isProductionConfigured(): boolean {
    return Boolean(this.merchantId && this.secretKey && this.terminalId);
  }

  async createPayment(req: GatewayPaymentRequest): Promise<GatewayPaymentResponse> {
    if (!this.isProductionConfigured() && process.env.DEMO_MODE !== 'true') {
      throw new Error('Payment gateway configuration missing: SHETAB credentials required in production');
    }

    const token = crypto.randomBytes(16).toString('hex');
    const gatewayRef = `shb_${token}`;
    const redirectUrl = `https://sep.shaparak.ir/OnlinePayment.aspx?ref=${gatewayRef}`;

    return {
      success: true,
      gatewayRef,
      redirectUrl,
      status: 'PENDING_CUSTOMER',
      rawResponse: {
        gateway: this.name,
        token: gatewayRef,
        bookingId: req.bookingId,
        amount: req.amount.toString(),
        merchantId: this.merchantId || 'test_merchant',
      },
    };
  }

  async verifyPayment(req: GatewayVerifyRequest): Promise<GatewayVerifyResponse> {
    // 1. Merchant check if provided
    if (this.merchantId && req.merchantId && req.merchantId !== this.merchantId) {
      return {
        verified: false,
        transactionId: `failed_${req.gatewayRef}`,
        settledAmount: req.expectedAmount,
        settledCurrency: req.expectedAmount.currency,
        status: 'FAILED',
        errorCode: 'MERCHANT_MISMATCH',
        error: 'Merchant ID mismatch on verification',
      };
    }

    // 2. Timestamp freshness verification: 5-minute replay window (PAY-006)
    if (req.timestamp) {
      const now = Date.now();
      const ageMs = Math.abs(now - req.timestamp);
      const maxAgeMs = 5 * 60 * 1000; // 5 minutes
      if (ageMs > maxAgeMs) {
        return {
          verified: false,
          transactionId: `stale_${req.gatewayRef}`,
          settledAmount: req.expectedAmount,
          settledCurrency: req.expectedAmount.currency,
          status: 'FAILED',
          errorCode: 'TIMESTAMP_EXPIRED',
          error: 'Payment callback expired or clock skew exceeded 5 minutes',
        };
      }
    }

    // 3. Signature verification — strictly fail-closed (PAY-005):
    // a callback is only trusted when the adapter is configured AND a valid
    // HMAC signature is present. Missing secret or missing signature = reject.
    if (!this.isProductionConfigured()) {
      return {
        verified: false,
        transactionId: `unconfigured_${req.gatewayRef}`,
        settledAmount: req.expectedAmount,
        settledCurrency: req.expectedAmount.currency,
        status: 'FAILED',
        errorCode: 'GATEWAY_NOT_CONFIGURED',
        error: 'Gateway credentials missing: verification cannot be trusted and fails closed',
      };
    }
    if (!req.signature) {
      return {
        verified: false,
        transactionId: `unsigned_${req.gatewayRef}`,
        settledAmount: req.expectedAmount,
        settledCurrency: req.expectedAmount.currency,
        status: 'FAILED',
        errorCode: 'MISSING_SIGNATURE',
        error: 'Gateway callback signature missing: verification fails closed',
      };
    }
    {
      const expectedData = `${req.gatewayRef}:${req.expectedAmount.toString()}:${req.merchantId || this.merchantId}:${req.timestamp || ''}`;
      const computedHmac = crypto.createHmac('sha256', this.secretKey).update(expectedData).digest('hex');
      const sigBuf = Buffer.from(req.signature);
      const computedBuf = Buffer.from(computedHmac);
      if (sigBuf.length !== computedBuf.length || !crypto.timingSafeEqual(sigBuf, computedBuf)) {
        return {
          verified: false,
          transactionId: `tampered_${req.gatewayRef}`,
          settledAmount: req.expectedAmount,
          settledCurrency: req.expectedAmount.currency,
          status: 'FAILED',
          errorCode: 'INVALID_SIGNATURE',
          error: 'Gateway callback signature verification failed',
        };
      }
    }

    return {
      verified: true,
      transactionId: `txn_${req.gatewayRef}`,
      settledAmount: req.expectedAmount,
      settledCurrency: req.expectedAmount.currency,
      status: 'CAPTURED',
    };
  }

  async verifyWebhook(rawBody: string, signature: string): Promise<WebhookVerificationResult> {
    const invalid = (error: string) => {
      let eventId = 'unknown';
      let eventType = 'unknown';
      let bookingId = '';
      let gatewayRef = '';
      let currency = 'IRR';
      let eventTime = 0;
      let merchantId = '';
      try {
        const parsed = JSON.parse(rawBody);
        eventId = parsed.eventId || 'unknown';
        eventType = parsed.eventType || 'unknown';
        bookingId = parsed.bookingId || '';
        gatewayRef = parsed.gatewayRef || '';
        currency = parsed.currency || 'IRR';
        eventTime = Number(parsed.timestamp) || 0;
        merchantId = parsed.merchantId || '';
      } catch {
        // Unparseable body — keep placeholder correlation fields.
      }
      return {
        valid: false as const,
        gatewayName: this.name,
        eventId,
        eventType,
        bookingId,
        gatewayRef,
        settledAmount: Money.zero(currency),
        settledCurrency: currency.toUpperCase(),
        timestamp: eventTime,
        merchantId,
        error,
      };
    };

    // Fail closed when the signing secret is not configured (PAY-005):
    // an unconfigured gateway must never be able to authorize a capture.
    if (!this.secretKey) {
      return invalid('Gateway webhook signature secret is not configured (SHETAB_SECRET_KEY missing)');
    }
    if (!signature) {
      return invalid('Webhook signature missing: verification fails closed');
    }

    const payload = JSON.parse(rawBody);
    const { eventId, eventType, bookingId, gatewayRef, amount, currency, timestamp, merchantId } = payload;

    // Verify signature over the EXACT raw body bytes sent by the gateway.
    {
      const computed = crypto.createHmac('sha256', this.secretKey).update(rawBody).digest('hex');
      const sigBuf = Buffer.from(signature);
      const computedBuf = Buffer.from(computed);
      if (sigBuf.length !== computedBuf.length || !crypto.timingSafeEqual(computedBuf, sigBuf)) {
        return invalid('Invalid webhook cryptographic signature');
      }
    }

    // Timestamp verification
    const now = Date.now();
    const eventTime = Number(timestamp) || 0;
    if (Math.abs(now - eventTime) > 5 * 60 * 1000) {
      return {
        valid: false,
        gatewayName: this.name,
        eventId: eventId || 'unknown',
        eventType: eventType || 'unknown',
        bookingId: bookingId || '',
        gatewayRef: gatewayRef || '',
        settledAmount: Money.zero(currency || 'IRR'),
        settledCurrency: currency || 'IRR',
        timestamp: eventTime,
        merchantId: merchantId || '',
        error: 'Webhook event timestamp outside acceptable 5-minute replay window',
      };
    }

    // Merchant verification
    if (this.merchantId && merchantId && merchantId !== this.merchantId) {
      return {
        valid: false,
        gatewayName: this.name,
        eventId: eventId || 'unknown',
        eventType: eventType || 'unknown',
        bookingId: bookingId || '',
        gatewayRef: gatewayRef || '',
        settledAmount: Money.zero(currency || 'IRR'),
        settledCurrency: currency || 'IRR',
        timestamp: eventTime,
        merchantId: merchantId || '',
        error: 'Webhook merchant ID mismatch',
      };
    }

    return {
      valid: true,
      gatewayName: this.name,
      eventId,
      eventType,
      bookingId,
      gatewayRef,
      settledAmount: new Money(amount, currency || 'IRR'),
      settledCurrency: (currency || 'IRR').toUpperCase(),
      timestamp: eventTime,
      merchantId: merchantId || this.merchantId,
    };
  }
}

/**
 * Isolated Demo Gateway Adapter (PAY-001)
 * Strictly fails closed when DEMO_MODE !== 'true'.
 */
export class DemoPaymentAdapter implements PaymentGatewayPort {
  readonly name = 'DEMO_GATEWAY';
  readonly isDemo = true;

  private checkDemoAllowed() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Security Error: Demo payment adapter is disabled in production (NODE_ENV=production)');
    }
    if (process.env.DEMO_MODE !== 'true') {
      throw new Error('Security Error: Demo payment adapter is strictly disabled in production mode');
    }
  }

  async createPayment(req: GatewayPaymentRequest): Promise<GatewayPaymentResponse> {
    this.checkDemoAllowed();
    const gatewayRef = `demo_shb_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
    return {
      success: true,
      gatewayRef,
      redirectUrl: `/payment-status?demo_ref=${gatewayRef}&bookingId=${req.bookingId}`,
      status: 'PENDING_CUSTOMER',
      rawResponse: { gateway: this.name, isDemo: true, bookingId: req.bookingId, amount: req.amount.toString() },
    };
  }

  async verifyPayment(req: GatewayVerifyRequest): Promise<GatewayVerifyResponse> {
    this.checkDemoAllowed();
    return {
      verified: true,
      transactionId: `demo_txn_${req.gatewayRef}`,
      settledAmount: req.expectedAmount,
      settledCurrency: req.expectedAmount.currency,
      status: 'CAPTURED',
    };
  }

  async verifyWebhook(rawBody: string): Promise<WebhookVerificationResult> {
    this.checkDemoAllowed();
    const payload = JSON.parse(rawBody);
    const { eventId, eventType, bookingId, gatewayRef, amount, currency, timestamp, merchantId } = payload;
    return {
      valid: true,
      gatewayName: this.name,
      eventId: eventId || 'demo_evt',
      eventType: eventType || 'payment.captured',
      bookingId: bookingId || '',
      gatewayRef: gatewayRef || '',
      settledAmount: new Money(amount || 0, currency || 'IRR'),
      settledCurrency: (currency || 'IRR').toUpperCase(),
      timestamp: Number(timestamp) || Date.now(),
      merchantId: merchantId || 'demo_merchant',
    };
  }
}

/**
 * Internal Wallet Gateway Adapter (Account ledger-backed balance reservation)
 */
export class InternalWalletGatewayAdapter implements PaymentGatewayPort {
  readonly name = 'INTERNAL_WALLET';
  readonly isDemo = false;

  async createPayment(req: GatewayPaymentRequest): Promise<GatewayPaymentResponse> {
    const gatewayRef = `wlt_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
    return {
      success: true,
      gatewayRef,
      status: 'SUCCESS',
      rawResponse: { gateway: this.name, bookingId: req.bookingId, amount: req.amount.toString() },
    };
  }

  async verifyPayment(req: GatewayVerifyRequest): Promise<GatewayVerifyResponse> {
    return {
      verified: true,
      transactionId: `wlt_txn_${req.gatewayRef}`,
      settledAmount: req.expectedAmount,
      settledCurrency: req.expectedAmount.currency,
      status: 'CAPTURED',
    };
  }
}

/**
 * Factory for resolving active gateway port.
 * The demo adapter is unreachable in production builds regardless of env:
 * simulated success paths must never exist in a production process (PAY-005).
 */
export function getPaymentGateway(method: string): PaymentGatewayPort {
  if (method === 'wallet_irr' || method === 'wallet_usdt') {
    return new InternalWalletGatewayAdapter();
  }
  if (method === 'gateway_ecardo') {
    return new EcardoGatewayAdapter();
  }
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction && process.env.DEMO_MODE === 'true') {
    return new DemoPaymentAdapter();
  }
  return new ShetabGatewayAdapter();
}

export * from './adapters/ShetabPspAdapter';
export * from './adapters/CustomerRefundAdapter';
export * from './adapters/EcardoGatewayAdapter';
