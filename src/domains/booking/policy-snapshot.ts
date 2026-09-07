import crypto from 'crypto';

export interface CancellationRule {
  hoursBeforeTravel: number;
  penaltyPercentage: number; // 0.0 to 1.0 (e.g. 0.2 = 20% fee)
  description: string;
}

export interface CanonicalBookingPolicy {
  version: '2.0';
  policyId: string;
  productType: string;
  isRefundable: boolean;
  cancellationRules: CancellationRule[];
  baggageAllowance?: string;
  changePolicy?: string;
  noShowPenaltyPercentage: number;
  termsUrl?: string;
  capturedAt: string;
  rulesHash: string;
}

export class PolicySnapshotDomainService {
  /**
   * Generates a canonical policy snapshot (BOOK-104)
   */
  static createDefaultPolicy(productType: string): CanonicalBookingPolicy {
    const pType = productType.toUpperCase();
    const isRefundable = pType !== 'VISA' && pType !== 'ESIM';

    const cancellationRules: CancellationRule[] = isRefundable
      ? [
          {
            hoursBeforeTravel: 72,
            penaltyPercentage: 0.0,
            description: 'لغو رایگان تا ۷۲ ساعت قبل از زمان سفر / Free cancellation up to 72h before',
          },
          {
            hoursBeforeTravel: 24,
            penaltyPercentage: 0.3,
            description: 'جریمه ۳۰ درصد در بازه ۷۲ تا ۲۴ ساعت قبل از سفر / 30% fee between 72h and 24h',
          },
          {
            hoursBeforeTravel: 0,
            penaltyPercentage: 0.8,
            description: 'جریمه ۸۰ درصد در کمتر از ۲۴ ساعت قبل از سفر / 80% fee under 24h before',
          },
        ]
      : [
          {
            hoursBeforeTravel: 0,
            penaltyPercentage: 1.0,
            description: 'غیرقابل استرداد طبق قوانین بین‌المللی و کنسولی / Non-refundable service',
          },
        ];

    const capturedAt = new Date().toISOString();
    const policyId = `pol_${pType.toLowerCase()}_${Date.now().toString(36)}`;
    const raw = JSON.stringify({ productType: pType, isRefundable, cancellationRules, capturedAt });
    const rulesHash = crypto.createHash('sha256').update(raw).digest('hex');

    return {
      version: '2.0',
      policyId,
      productType: pType,
      isRefundable,
      cancellationRules,
      baggageAllowance: pType === 'FLIGHT' ? '۲۰ کیلوگرم بار مجاز پرواز / 20kg standard checked luggage' : undefined,
      changePolicy: isRefundable ? 'امکان تغییر تاریخ با پرداخت مابه‌التفاوت نرخ' : 'امکان تغییر وجود ندارد',
      noShowPenaltyPercentage: 1.0,
      termsUrl: 'https://firuzo.com/terms/policies',
      capturedAt,
      rulesHash,
    };
  }

  /**
   * Serializes canonical policy to JSON string
   */
  static serialize(policy: CanonicalBookingPolicy): string {
    return JSON.stringify(policy);
  }

  /**
   * Migrates legacy policy snapshots to the canonical model (BOOK-104)
   */
  static parseOrMigrate(rawJson?: string | null, productType: string = 'HOTEL'): CanonicalBookingPolicy {
    if (!rawJson) {
      return this.createDefaultPolicy(productType);
    }

    try {
      const parsed = JSON.parse(rawJson);
      // Already canonical v2.0
      if (parsed.version === '2.0' && Array.isArray(parsed.cancellationRules)) {
        return parsed as CanonicalBookingPolicy;
      }

      // Legacy structure migration
      const isRefundable = parsed.refundable ?? parsed.isRefundable ?? true;
      const defaultPolicy = this.createDefaultPolicy(productType);
      return {
        ...defaultPolicy,
        isRefundable,
        cancellationRules: parsed.rules || defaultPolicy.cancellationRules,
      };
    } catch {
      return this.createDefaultPolicy(productType);
    }
  }
}
