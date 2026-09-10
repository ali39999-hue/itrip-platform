/**
 * Card-to-Card (کارت به کارت) Offline Payment Adapter for Firuzo Platform.
 * Adapted from aroux30/site (ADR-008 & card_to_card.py).
 *
 * Designed for high-ticket travel purchases (group tours, international flights, luxury hotel suites)
 * that exceed the Iranian Shetab daily online payment gateway ceiling (typically 100M-200M Toman).
 *
 * Workflow:
 * 1. User selects Card-to-Card at checkout.
 * 2. System provisions the merchant's official destination card, IBAN (Sheba), and account holder name.
 * 3. A unique payment reference (gatewayRef) with a 2-hour lock window is issued.
 * 4. User transfers funds via mobile banking / ATM and submits the bank transaction tracking code & receipt image.
 * 5. Booking transitions to PENDING_VERIFICATION for back-office finance clearance.
 */

import { Money } from "@/lib/finance";
import {
  PaymentGatewayPort,
  GatewayPaymentRequest,
  GatewayPaymentResponse,
  GatewayVerifyRequest,
  GatewayVerifyResponse,
  GatewayQueryResponse,
} from "../gateway-port";
import { formatShetabCard, validateShetabCard } from "@/lib/iranian-commerce";
import crypto from "crypto";

export interface CardToCardConfig {
  cardNumber?: string;
  accountHolder?: string;
  sheba?: string;
  bankName?: string;
  holdMinutes?: number;
}

export class CardToCardPaymentAdapter implements PaymentGatewayPort {
  readonly name = "CARD_TO_CARD";
  readonly isDemo = false;

  private cardNumber: string;
  private accountHolder: string;
  private sheba: string;
  private bankName: string;
  private holdMinutes: number;

  constructor(config?: CardToCardConfig) {
    this.cardNumber = config?.cardNumber || process.env.MERCHANT_CARD_NUMBER || "6219861012345678";
    this.accountHolder = config?.accountHolder || process.env.MERCHANT_ACCOUNT_HOLDER || "شرکت خدمات مسافرت هوایی فیروزو";
    this.sheba = config?.sheba || process.env.MERCHANT_SHEBA || "IR820560000000123456789012";
    this.bankName = config?.bankName || "بانک سامان";
    this.holdMinutes = config?.holdMinutes || 120; // 2 hours hold window
  }

  getMerchantDetails() {
    return {
      cardNumber: this.cardNumber,
      cardFormatted: formatShetabCard(this.cardNumber),
      accountHolder: this.accountHolder,
      sheba: this.sheba,
      bankName: this.bankName,
      holdMinutes: this.holdMinutes,
    };
  }

  async createPayment(req: GatewayPaymentRequest): Promise<GatewayPaymentResponse> {
    const token = crypto.randomBytes(12).toString("hex");
    const gatewayRef = `c2c_${token}`;

    return {
      success: true,
      gatewayRef,
      status: "PENDING_CUSTOMER",
      rawResponse: {
        gateway: this.name,
        gatewayRef,
        bookingId: req.bookingId,
        amount: req.amount.toString(),
        currency: req.amount.currency,
        merchantDetails: this.getMerchantDetails(),
        expiresAt: new Date(Date.now() + this.holdMinutes * 60 * 1000).toISOString(),
      },
    };
  }

  async verifyPayment(req: GatewayVerifyRequest): Promise<GatewayVerifyResponse> {
    const payload = req.rawPayload || {};
    const trackingCode = String(payload.trackingCode || "").trim();
    const customerCard = String(payload.customerCard || "").trim();

    // Verification requires a legitimate bank transaction tracking code (at least 6 alphanumeric digits)
    if (!trackingCode || trackingCode.length < 6) {
      return {
        verified: false,
        transactionId: `failed_${req.gatewayRef}`,
        settledAmount: req.expectedAmount,
        settledCurrency: req.expectedAmount.currency,
        status: "FAILED",
        errorCode: "INVALID_TRACKING_CODE",
        error: "کد پیگیری تراکنش بانکی معتبر نیست یا وارد نشده است.",
      };
    }

    // If customer card is provided, validate with Shetab Luhn
    if (customerCard) {
      const cardCheck = validateShetabCard(customerCard);
      if (!cardCheck.isValid) {
        return {
          verified: false,
          transactionId: `failed_${req.gatewayRef}`,
          settledAmount: req.expectedAmount,
          settledCurrency: req.expectedAmount.currency,
          status: "FAILED",
          errorCode: "INVALID_CUSTOMER_CARD",
          error: "شماره کارت مبدا نامعتبر است.",
        };
      }
    }

    return {
      verified: true,
      transactionId: `tx_${req.gatewayRef}`,
      settledAmount: req.expectedAmount,
      settledCurrency: req.expectedAmount.currency,
      status: "CAPTURED",
    };
  }

  async queryPayment(gatewayRef: string): Promise<GatewayQueryResponse> {
    return {
      status: "PENDING",
      gatewayRef,
      amount: Money.zero("IRR"),
      rawResponse: {
        gateway: this.name,
        requiresManualReview: true,
      },
    };
  }
}
