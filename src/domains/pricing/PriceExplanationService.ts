import { prisma } from '@/lib/prisma';
import { Money, MoneyBreakdown } from '@/lib/finance';
import { CanonicalPriceSnapshot, PriceSnapshotDomainService, RuleVersions } from './PriceSnapshotDomainService';
import { QuoteAggregate } from './QuoteDomainService';
import { formatMoney } from '@/lib/money';

export type PriceExplanationCategory =
  | 'BASE'
  | 'MARKUP'
  | 'FEE'
  | 'TAX'
  | 'DISCOUNT'
  | 'ROUNDING'
  | 'TOTAL';

export interface PriceExplanationItem {
  key: string;
  label: string;
  amount: Money;
  formatted: string;
  description: string;
  percentage?: number;
  category: PriceExplanationCategory;
}

export interface PriceExplanationView {
  currency: string;
  totalSellPrice: Money;
  formattedTotal: string;
  baseCost: Money;
  markup: Money;
  taxes: Money;
  serviceFees: Money;
  discounts: Money;
  roundingDelta: Money;
  items: PriceExplanationItem[];
  taxJurisdiction?: string;
  taxRate?: string;
  ruleVersions: RuleVersions;
  expiresAt?: Date;
  isExpired?: boolean;
  expiresInSeconds?: number;
  priceGuaranteedUntil?: string;
  transparencyNote: string;
}

export class PriceExplanationService {
  /**
   * Generates a transparent, user-facing price explanation view (MONEY-111)
   */
  static explainBreakdown(
    breakdown: MoneyBreakdown,
    options: {
      locale?: string;
      ruleVersions?: RuleVersions;
      expiresAt?: Date;
      bookingReference?: string;
    } = {}
  ): PriceExplanationView {
    const locale = options.locale || 'fa';
    const currency = breakdown.currency.toUpperCase();
    const ruleVersions = options.ruleVersions || {
      taxRuleVersion: '2026-v2',
      pricingEngineVersion: '12-stage-v2',
    };

    const items: PriceExplanationItem[] = [
      {
        key: 'base_fare',
        label: locale === 'fa' ? 'قیمت پایه تأمین‌کننده' : 'Supplier Base Cost',
        amount: breakdown.baseCost,
        formatted: formatMoney(breakdown.baseCost.toNumber(), currency, locale),
        description:
          locale === 'fa'
            ? 'هزینه مستقیم خدمات ارائه‌شده توسط تأمین‌کننده رسمی (هتل، ایرلاین یا مجری)'
            : 'Direct wholesale cost from certified GDS/hotel supplier',
        category: 'BASE',
      },
    ];

    if (breakdown.supplierFee.isPositive()) {
      items.push({
        key: 'supplier_fee',
        label: locale === 'fa' ? 'کارمزد صدور تأمین‌کننده' : 'Supplier Issuance Fee',
        amount: breakdown.supplierFee,
        formatted: formatMoney(breakdown.supplierFee.toNumber(), currency, locale),
        description:
          locale === 'fa'
            ? 'هزینه رسمی صدور بلیت/واچر در سیستم سراسری GDS'
            : 'Official GDS CRS ticket issuance charge',
        category: 'FEE',
      });
    }

    if (breakdown.markupAmount.isPositive()) {
      items.push({
        key: 'platform_markup',
        label: locale === 'fa' ? 'کارمزد خدمات پلتفرم فیروزه' : 'Firuzo Service Margin',
        amount: breakdown.markupAmount,
        formatted: formatMoney(breakdown.markupAmount.toNumber(), currency, locale),
        description:
          locale === 'fa'
            ? 'سود تضمین‌شده پلتفرم بر اساس قوانین نقش کاربری و خدمات VIP'
            : 'Platform margin according to customer tier and channel rules',
        category: 'MARKUP',
      });
    }

    if (breakdown.platformFee.isPositive()) {
      items.push({
        key: 'platform_service_fee',
        label: locale === 'fa' ? 'هزینه خدمات رزرو و پشتیبانی' : 'Reservation & Concierge Fee',
        amount: breakdown.platformFee,
        formatted: formatMoney(breakdown.platformFee.toNumber(), currency, locale),
        description:
          locale === 'fa'
            ? 'پشتیبانی ۲۴/۷، صدور آنی واچر و ضمانت اجرای سفر'
            : '24/7 travel concierge and guaranteed booking reservation',
        category: 'FEE',
      });
    }

    if (breakdown.taxAmount.isPositive()) {
      items.push({
        key: 'vat_tax',
        label: locale === 'fa' ? 'مالیات بر ارزش افزوده و عوارض قانونی' : 'VAT & Legal Tourism Taxes',
        amount: breakdown.taxAmount,
        formatted: formatMoney(breakdown.taxAmount.toNumber(), currency, locale),
        description:
          locale === 'fa'
            ? 'مالیات رسمی ارزش افزوده مطابق قانون مالیات‌های مستقیم مصوب'
            : 'Statutory VAT based on jurisdiction and service category',
        category: 'TAX',
      });
    }

    if (breakdown.discountAmount.isPositive()) {
      items.push({
        key: 'promotional_discount',
        label: locale === 'fa' ? 'تخفیف ویژه و کد پروموشن' : 'Special Promotional Discount',
        amount: breakdown.discountAmount.negated(),
        formatted: `-${formatMoney(breakdown.discountAmount.toNumber(), currency, locale)}`,
        description:
          locale === 'fa'
            ? 'کسر مستقیم از فاکتور با اعمال کد تخفیف یا پاداش وفاداری'
            : 'Direct price reduction applied via promotional rules',
        category: 'DISCOUNT',
      });
    }

    if (!breakdown.roundingDelta.isZero()) {
      items.push({
        key: 'currency_rounding',
        label: locale === 'fa' ? 'تعدیل رندسازی سیستم بانکی' : 'Currency Rounding Adjustment',
        amount: breakdown.roundingDelta,
        formatted: formatMoney(breakdown.roundingDelta.toNumber(), currency, locale),
        description:
          locale === 'fa'
            ? 'رندسازی استاندارد ریالی به نزدیک‌ترین مضرب ده‌هزار ریال'
            : 'Deterministic rounding to canonical currency increment',
        category: 'ROUNDING',
      });
    }

    items.push({
      key: 'final_sell_price',
      label: locale === 'fa' ? 'مبلغ نهایی قابل پرداخت' : 'Final Payable Total',
      amount: breakdown.sellPrice,
      formatted: formatMoney(breakdown.sellPrice.toNumber(), currency, locale),
      description:
        locale === 'fa'
          ? 'مبلغ قطعی و مصوب سرور که مبنای پرداخت در درگاه بانکی قرار می‌گیرد'
          : 'Final authoritative server-calculated amount billed at payment gateway',
      category: 'TOTAL',
    });

    const now = new Date();
    const expiresAt = options.expiresAt;
    const isExpired = expiresAt ? now > expiresAt : false;
    const expiresInSeconds = expiresAt ? Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000)) : undefined;

    return {
      currency,
      totalSellPrice: breakdown.sellPrice,
      formattedTotal: formatMoney(breakdown.sellPrice.toNumber(), currency, locale),
      baseCost: breakdown.baseCost,
      markup: breakdown.markupAmount,
      taxes: breakdown.taxAmount,
      serviceFees: breakdown.platformFee.add(breakdown.supplierFee),
      discounts: breakdown.discountAmount,
      roundingDelta: breakdown.roundingDelta,
      items,
      taxJurisdiction: 'IR',
      taxRate: '9%',
      ruleVersions,
      expiresAt,
      isExpired,
      expiresInSeconds,
      priceGuaranteedUntil: expiresAt ? expiresAt.toISOString() : undefined,
      transparencyNote:
        locale === 'fa'
          ? 'پلتفرم فیروزه تضمین می‌کند که هیچ هزینه پنهان یا کارمزد اعلام‌نشده‌ای در این پیش‌فاکتور وجود ندارد.'
          : 'Firuzo guarantees complete fee transparency with zero hidden costs or undisclosed surcharges.',
    };
  }

  /**
   * Explains a CanonicalPriceSnapshot
   */
  static explainSnapshot(
    snapshot: CanonicalPriceSnapshot,
    locale: string = 'fa'
  ): PriceExplanationView {
    return this.explainBreakdown(snapshot.breakdown, {
      locale,
      ruleVersions: snapshot.ruleVersions,
      expiresAt: snapshot.expiresAt,
      bookingReference: snapshot.bookingId,
    });
  }

  /**
   * Explains a QuoteAggregate
   */
  static explainQuote(
    quote: QuoteAggregate,
    locale: string = 'fa'
  ): PriceExplanationView {
    return this.explainBreakdown(quote.breakdown, {
      locale,
      ruleVersions: quote.ruleVersions,
      expiresAt: quote.expiresAt,
      bookingReference: quote.bookingId,
    });
  }

  /**
   * Explains latest booking price snapshot from database
   */
  static async explainBookingPrice(
    bookingId: string,
    locale: string = 'fa'
  ): Promise<PriceExplanationView | null> {
    const snapshot = await PriceSnapshotDomainService.getLatestSnapshot(bookingId);
    if (snapshot) {
      return this.explainSnapshot(snapshot, locale);
    }

    // Fallback: build from Booking row if snapshot not found
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { items: true },
    });

    if (!booking) return null;

    const currency = booking.currency;
    const sellPrice = new Money(booking.totalAmount, currency);
    const breakdown: MoneyBreakdown = {
      baseCost: sellPrice,
      supplierFee: Money.zero(currency),
      markupAmount: Money.zero(currency),
      taxAmount: Money.zero(currency),
      platformFee: Money.zero(currency),
      discountAmount: Money.zero(currency),
      roundingDelta: Money.zero(currency),
      sellPrice,
      currency,
    };

    return this.explainBreakdown(breakdown, {
      locale,
      bookingReference: booking.reference,
    });
  }
}
