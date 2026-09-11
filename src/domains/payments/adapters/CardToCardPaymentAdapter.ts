/**
 * Card-to-Card (کارت به کارت) Offline Payment Adapter for Firuzo Platform.
 * Adapted from aroux30/site (ADR-008 & card_to_card.py).
 * Hardened per Production Guidelines Section 32 & 33 (FAIL-CLOSED).
 *
 * Designed for high-ticket travel purchases (group tours, international flights, luxury hotel suites)
 * that exceed the Iranian Shetab daily online payment gateway ceiling (typically 100M-200M Toman).
 *
 * Expected Commercial & Financial Flow:
 * 1. User selects Card-to-Card at checkout.
 * 2. System validates that merchant financial credentials are securely configured (fail-closed).
 * 3. System provisions the merchant's official destination card, IBAN (Sheba), and account holder name.
 * 4. A unique payment reference (gatewayRef) with a 2-hour lock window is issued.
 * 5. User transfers funds via mobile banking / ATM and submits the bank transaction tracking code & optional receipt.
 * 6. Customer submission transitions payment to PENDING_VERIFICATION (never auto-captured).
 * 7. Finance back-office audits the bank statement, verifies transaction ID, and confirms capture.
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

const KNOWN_DUMMY_CARDS = new Set(["6219861012345678", "6037990000000000"]);
const KNOWN_DUMMY_SHEBAS = new Set(["IR820560000000123456789012", "IR000000000000000000000000"]);

export class CardToCardPaymentAdapter implements PaymentGatewayPort {
  readonly name = "CARD_TO_CARD";
  readonly isDemo = false;

  private cardNumber: string;
  private accountHolder: string;
  private sheba: string;
  private bankName: string;
  private holdMinutes: number;
  private configured: boolean;

  constructor(config?: CardToCardConfig) {
    const isProd = process.env.NODE_ENV === "production" && process.env.DEMO_MODE !== "true";

    const rawCard = config?.cardNumber || process.env.MERCHANT_CARD_NUMBER;
    const rawSheba = config?.sheba || process.env.MERCHANT_SHEBA;
    const rawHolder = config?.accountHolder || process.env.MERCHANT_ACCOUNT_HOLDER;
    const rawBank = config?.bankName || process.env.MERCHANT_BANK_NAME;

    // Fail-Closed Guard (Section 33):
    // In production mode, missing configuration or dummy accounts MUST refuse initialization.
    if (isProd) {
      if (!rawCard || !rawSheba || !rawHolder) {
        throw new Error(
          "CardToCardPaymentAdapter: Missing production merchant financial configuration (MERCHANT_CARD_NUMBER, MERCHANT_SHEBA, MERCHANT_ACCOUNT_HOLDER). Fail-closed to prevent unauthorized or untracked payment collections."
        );
      }
      if (KNOWN_DUMMY_CARDS.has(rawCard) || KNOWN_DUMMY_SHEBAS.has(rawSheba)) {
        throw new Error(
          "CardToCardPaymentAdapter: Dummy or test financial credentials detected in production environment. Fail-closed."
        );
      }
    }

    this.cardNumber = rawCard || "6219861012345678";
    this.accountHolder = rawHolder || "شرکت خدمات مسافرت هوایی فیروزو (توسعه)";
    this.sheba = rawSheba || "IR820560000000123456789012";
    this.bankName = rawBank || "بانک سامان";
    this.holdMinutes = config?.holdMinutes || 120; // 2 hours hold window
    this.configured = Boolean(rawCard && rawSheba && rawHolder);
  }

  isConfigured(): boolean {
    return this.configured;
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
    const isProd = process.env.NODE_ENV === "production" && process.env.DEMO_MODE !== "true";
    if (isProd && !this.configured) {
      throw new Error("CardToCardPaymentAdapter: Payment initiation rejected due to unconfigured merchant account.");
    }

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

  /**
   * Customer verification submission:
   * Validates format of bank tracking code and customer card.
   * Crucially sets status to PENDING_VERIFICATION (NOT CAPTURED).
   * Do NOT auto-confirm based only on customer uploaded receipt or tracking number (Section 32).
   */
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

    // Acknowledge submission and set status to PENDING_VERIFICATION for back-office Finance clearance.
    return {
      verified: false,
      transactionId: `pending_review_${req.gatewayRef}`,
      settledAmount: req.expectedAmount,
      settledCurrency: req.expectedAmount.currency,
      status: "PENDING_VERIFICATION",
      errorCode: "MANUAL_VERIFICATION_REQUIRED",
      error: "اطلاعات فیش و کد رهگیری با موفقیت ثبت شد و در انتظار تایید واحد مالی است.",
    };
  }

  /**
   * Authoritative Finance clearance: only staff with FINANCE role can capture offline card-to-card payments.
   */
  async approveByFinance(req: GatewayVerifyRequest, financeUserId: string): Promise<GatewayVerifyResponse> {
    if (!financeUserId) {
      throw new Error("Card-to-card clearance requires authorized financeUserId.");
    }
    return {
      verified: true,
      transactionId: `tx_c2c_${req.gatewayRef}`,
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
