import { describe, it, expect } from "vitest";
import { CardToCardPaymentAdapter } from "./CardToCardPaymentAdapter";
import { getPaymentGateway } from "../gateway-port";
import { Money } from "@/lib/finance";

describe("CardToCardPaymentAdapter", () => {
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

  it("verifies payment when valid bank tracking code is provided", async () => {
    const res = await adapter.verifyPayment({
      gatewayRef: "c2c_test123",
      expectedAmount: new Money(150_000_000, "IRR"),
      rawPayload: {
        trackingCode: "TRK-98765432",
        customerCard: "6037997123456783", // Valid Luhn Melli card
      },
    });

    expect(res.verified).toBe(true);
    expect(res.status).toBe("CAPTURED");
    expect(res.transactionId).toBe("tx_c2c_test123");
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

  it("is resolved by the getPaymentGateway factory", () => {
    const gw = getPaymentGateway("card_to_card");
    expect(gw.name).toBe("CARD_TO_CARD");
    expect(gw.isDemo).toBe(false);
  });
});
