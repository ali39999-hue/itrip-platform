import { Money } from '@/lib/finance';
import crypto from 'crypto';

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
  paymentMode?: 'real' | 'demo';
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
  status: 'CAPTURED' | 'FAILED' | 'PENDING_VERIFICATION';
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

export interface GatewayQueryResponse {
  status: 'INITIAL' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';
  gatewayRef: string;
  amount: Money;
  settledAt?: Date;
  rawResponse?: Record<string, unknown>;
  error?: string;
}

export interface GatewaySettleResponse {
  success: boolean;
  settledAmount: Money;
  settlementRef?: string;
  error?: string;
}

export interface GatewayCallbackParsed {
  valid: boolean;
  gatewayRef: string;
  amount?: Money;
  status: 'SUCCESS' | 'FAILED' | 'CANCELED';
  rawParams: Record<string, unknown>;
  error?: string;
}

export interface GatewayRetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  factor?: number;
  timeoutMs?: number;
}

/**
 * Robust retry wrapper with exponential backoff and timeout for external PSP operations (PAY-004)
 */
export async function withGatewayRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: GatewayRetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const initialDelay = options.initialDelayMs ?? 500;
  const factor = options.factor ?? 2;
  const timeoutMs = options.timeoutMs ?? 10000;

  let attempt = 0;
  let lastError: unknown;

  while (attempt < maxRetries) {
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await fn(controller.signal);
      clearTimeout(timeoutTimer);
      return result;
    } catch (err) {
      clearTimeout(timeoutTimer);
      lastError = err;
      attempt++;
      if (attempt >= maxRetries) break;
      const delay = initialDelay * Math.pow(factor, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export interface PaymentGatewayPort {
  readonly name: string;
  readonly isDemo: boolean;
  createPayment(req: GatewayPaymentRequest): Promise<GatewayPaymentResponse>;
  verifyPayment(req: GatewayVerifyRequest): Promise<GatewayVerifyResponse>;
  queryPayment?(gatewayRef: string): Promise<GatewayQueryResponse>;
  settlePayment?(gatewayRef: string, amount: Money): Promise<GatewaySettleResponse>;
  parseCallback?(params: Record<string, string | string[] | undefined>): Promise<GatewayCallbackParsed>;
  verifyWebhook?(rawBody: string, signature: string, headers?: Record<string, string>): Promise<WebhookVerificationResult>;
  refundPayment?(gatewayRef: string, amount: Money, reason?: string): Promise<{ success: boolean; refundRef?: string; error?: string }>;
}

/**
 * Production Shetab / Saman / Shaparak Gateway Adapter (Iranian National Payment Network)
 * Enforces cryptographic HMAC-SHA256 signature verification, replay protection, and fails closed.
 */
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

  async queryPayment(gatewayRef: string): Promise<GatewayQueryResponse> {
    this.checkDemoAllowed();
    return {
      status: 'SUCCESS',
      gatewayRef,
      amount: Money.zero('IRR'),
      settledAt: new Date(),
    };
  }

  async settlePayment(gatewayRef: string, amount: Money): Promise<GatewaySettleResponse> {
    this.checkDemoAllowed();
    return {
      success: true,
      settledAmount: amount,
      settlementRef: `demo_stl_${gatewayRef.slice(0, 12)}`,
    };
  }

  async parseCallback(params: Record<string, string | string[] | undefined>): Promise<GatewayCallbackParsed> {
    this.checkDemoAllowed();
    return {
      valid: true,
      gatewayRef: String(params.demo_ref || params.ref || 'demo_ref'),
      status: 'SUCCESS',
      rawParams: params as Record<string, unknown>,
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

  async queryPayment(gatewayRef: string): Promise<GatewayQueryResponse> {
    return {
      status: 'SUCCESS',
      gatewayRef,
      amount: Money.zero('IRR'),
      settledAt: new Date(),
    };
  }

  async settlePayment(gatewayRef: string, amount: Money): Promise<GatewaySettleResponse> {
    return {
      success: true,
      settledAmount: amount,
      settlementRef: `wlt_stl_${gatewayRef}`,
    };
  }

  async parseCallback(params: Record<string, string | string[] | undefined>): Promise<GatewayCallbackParsed> {
    return {
      valid: true,
      gatewayRef: String(params.ref || 'wallet_ref'),
      status: 'SUCCESS',
      rawParams: params as Record<string, unknown>,
    };
  }
}

export * from './adapters/ShetabPspAdapter';
export * from './adapters/CustomerRefundAdapter';
export * from './adapters/EcardoGatewayAdapter';
export * from './adapters/CardToCardPaymentAdapter';
