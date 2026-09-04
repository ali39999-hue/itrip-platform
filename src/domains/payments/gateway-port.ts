import { Money } from '@/lib/finance';

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
  rawPayload?: Record<string, unknown>;
  signature?: string;
}

export interface GatewayVerifyResponse {
  verified: boolean;
  transactionId: string;
  settledAmount: Money;
  settledCurrency: string;
  status: 'CAPTURED' | 'FAILED';
  error?: string;
}

export interface PaymentGatewayPort {
  readonly name: string;
  createPayment(req: GatewayPaymentRequest): Promise<GatewayPaymentResponse>;
  verifyPayment(req: GatewayVerifyRequest): Promise<GatewayVerifyResponse>;
  refundPayment?(gatewayRef: string, amount: Money, reason?: string): Promise<{ success: boolean; refundRef?: string; error?: string }>;
}

/**
 * Shetab / Shaparak Gateway Adapter (Iranian National Payment Network)
 */
export class ShetabGatewayAdapter implements PaymentGatewayPort {
  readonly name = 'SHETAB_GATEWAY';

  async createPayment(req: GatewayPaymentRequest): Promise<GatewayPaymentResponse> {
    const gatewayRef = `shb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const redirectUrl = `https://sep.shaparak.ir/OnlinePayment.aspx?ref=${gatewayRef}`;

    return {
      success: true,
      gatewayRef,
      redirectUrl,
      status: 'PENDING_CUSTOMER',
      rawResponse: { gateway: this.name, token: gatewayRef, bookingId: req.bookingId, amount: req.amount.toString() },
    };
  }

  async verifyPayment(req: GatewayVerifyRequest): Promise<GatewayVerifyResponse> {
    return {
      verified: true,
      transactionId: `txn_${req.gatewayRef}`,
      settledAmount: req.expectedAmount,
      settledCurrency: req.expectedAmount.currency,
      status: 'CAPTURED',
    };
  }
}

/**
 * Wallet Payment Adapter (Internal Escrow Transfer)
 */
export class InternalWalletGatewayAdapter implements PaymentGatewayPort {
  readonly name = 'INTERNAL_WALLET';

  async createPayment(req: GatewayPaymentRequest): Promise<GatewayPaymentResponse> {
    const gatewayRef = `wlt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
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
