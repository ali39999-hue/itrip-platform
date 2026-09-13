import { describe, it, expect } from "vitest";
import { CardToCardPaymentAdapter } from "./CardToCardPaymentAdapter";
import { Money } from "@/lib/finance";

describe("CardToCardPaymentAdapter (Production Hardened)", () => {
  const adapter = new CardToCardPaymentAdapter({
    cardNumber: "6219861012345678",
    accountHolder: "شرکت خدمات مسافرت هوایی فیروزو",
    sheba: "IR820560000000123456789012",
    bankName: "بانک سامان",
    holdMinutes: 120,
  });

  it("exposes formatted merchant details", () => {
    const details = adapter.getMerchantDetails();
    expect(details.cardFormatted).toBe("6219-8610-1234-5678");
    expect(details.bankName).toBe("بانک سامان");
    expect(details.accountHolder).toBe("شرکت خدمات مسافرت هوایی فیروزو");
    expect(details.sheba).toBe("IR820560000000123456789012");
  });

  it("creates a card-to-card payment intent with a hold window", async () => {
    const res = await adapter.createPayment({
      intentId: "intent_123",
      bookingId: "bk_tour_99",
      amount: new Money(150_000_000, "IRR"),
      callbackUrl: "https://firuzo.com/callback",
    });

    expect(res.success).toBe(true);
    expect(res.gatewayRef).toMatch(/^c2c_[a-f0-9]{24}$/);
    expect(res.status).toBe("PENDING_CUSTOMER");
    expect(res.rawResponse?.gateway).toBe("CARD_TO_CARD");
  });

  it("customer submission transitions to PENDING_VERIFICATION (never auto-captured per Section 32)", async () => {
    const res = await adapter.verifyPayment({
      gatewayRef: "c2c_test123",
      expectedAmount: new Money(150_000_000, "IRR"),
      rawPayload: {
        trackingCode: "TRK-98765432",
        customerCard: "6037997123456783", // Valid Luhn Melli card
      },
    });

    // Does NOT auto-confirm without Finance clearance
    expect(res.verified).toBe(false);
    expect(res.status).toBe("PENDING_VERIFICATION");
    expect(res.errorCode).toBe("MANUAL_VERIFICATION_REQUIRED");
  });

  it("authoritatively captures payment upon Finance review (approveByFinance)", async () => {
    const res = await adapter.approveByFinance(
      {
        gatewayRef: "c2c_test123",
        expectedAmount: new Money(150_000_000, "IRR"),
        rawPayload: {
          trackingCode: "TRK-98765432",
        },
      },
      "finance_officer_101"
    );

    expect(res.verified).toBe(true);
    expect(res.status).toBe("CAPTURED");
    expect(res.transactionId).toBe("tx_c2c_c2c_test123");
  });

  it("fails verification if bank tracking code is missing or too short", async () => {
    const res = await adapter.verifyPayment({
      gatewayRef: "c2c_test123",
      expectedAmount: new Money(150_000_000, "IRR"),
      rawPayload: {
        trackingCode: "123", // Too short
      },
    });

    expect(res.verified).toBe(false);
    expect(res.status).toBe("FAILED");
    expect(res.errorCode).toBe("INVALID_TRACKING_CODE");
  });

  it("fails verification if customer card has invalid Luhn checksum", async () => {
    const res = await adapter.verifyPayment({
      gatewayRef: "c2c_test123",
      expectedAmount: new Money(150_000_000, "IRR"),
      rawPayload: {
        trackingCode: "TRK-98765432",
        customerCard: "6037997123456784", // Bad Luhn
      },
    });

    expect(res.verified).toBe(false);
    expect(res.status).toBe("FAILED");
    expect(res.errorCode).toBe("INVALID_CUSTOMER_CARD");
  });

  it("fails closed in production environment if merchant credentials are missing or dummy", () => {
    const oldEnv = process.env.NODE_ENV;
    const oldDemo = process.env.DEMO_MODE;
    try {
      process.env.NODE_ENV = "production";
      delete process.env.DEMO_MODE;

      // Attempt to initialize with dummy test card in prod
      expect(() => {
        new CardToCardPaymentAdapter({
          cardNumber: "6219861012345678", // Dummy
          sheba: "IR820560000000123456789012", // Dummy
          accountHolder: "Dummy",
        });
      }).toThrow(/dummy|missing/i);
    } finally {
      process.env.NODE_ENV = oldEnv;
      process.env.DEMO_MODE = oldDemo;
    }
  });

  it("exposes the production card-to-card adapter shape", () => {
    const gw = new CardToCardPaymentAdapter();
    expect(gw.name).toBe("CARD_TO_CARD");
    expect(gw.isDemo).toBe(false);
  });
});
