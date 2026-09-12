/**
 * Centralized Product Capability Registry (CAP-001)
 *
 * Single Source of Truth for feature readiness, runtime verification,
 * and public marketing claim reconciliation.
 *
 * Rules:
 * 1. UI MUST NOT claim a capability is LIVE merely because code exists.
 * 2. Unconnected third-party providers must be labeled MOCK / SIMULATED / COMING_SOON / DISABLED.
 * 3. Frontend components must query this registry dynamically rather than hardcoding claims.
 */

export type CapabilityStatus =
  | 'LIVE'
  | 'BETA'
  | 'SIMULATED'
  | 'MOCK'
  | 'DISABLED'
  | 'COMING_SOON';

export type CapabilityCategory =
  | 'payment'
  | 'supplier'
  | 'fx'
  | 'auth'
  | 'ai'
  | 'refund'
  | 'wallet'
  | 'loyalty'
  | 'identity'
  | 'corporate'
  | 'tax'
  | 'trip';

export type CapabilityKey =
  | 'payment.shetab'
  | 'payment.visa'
  | 'payment.mastercard'
  | 'payment.usdt'
  | 'payment.cardToCard'
  | 'payment.wallet'
  | 'supplier.flight'
  | 'supplier.flights'
  | 'supplier.hotel'
  | 'supplier.hotels'
  | 'supplier.tour'
  | 'supplier.tours'
  | 'fx.live'
  | 'fx.liveRates'
  | 'fx.simulated'
  | 'auth.sms'
  | 'auth.email'
  | 'auth.telegram'
  | 'auth.whatsapp'
  | 'auth.wechat'
  | 'auth.google'
  | 'ai.planner'
  | 'ai.router'
  | 'refund.online'
  | 'refund.manual'
  | 'wallet.multicurrency'
  | 'loyalty.streak'
  | 'customer360'
  | 'corporate'
  | 'taxInvoice'
  | 'travelHandbook'
  | 'dutyOfCare';

export interface CapabilityDescriptor {
  key: CapabilityKey;
  category: CapabilityCategory;
  name: {
    fa: string;
    en: string;
    ar?: string;
    zh?: string;
    ru?: string;
  };
  status: CapabilityStatus;
  isReal: boolean;
  description: {
    fa: string;
    en: string;
  };
  badgeLabel: {
    fa: string;
    en: string;
  };
  evidencePath: string;
}

/**
 * Evaluates dynamic status based on runtime environment & credentials.
 */
function resolveDynamicStatus(key: CapabilityKey): CapabilityStatus {
  switch (key) {
    case 'payment.shetab':
      if (process.env.SHETAB_SECRET_KEY && process.env.SHETAB_TERMINAL_ID) {
        return 'LIVE';
      }
      return process.env.NODE_ENV === 'production' && process.env.DEMO_MODE !== 'true'
        ? 'DISABLED'
        : 'SIMULATED';

    case 'payment.cardToCard':
      if (process.env.MERCHANT_CARD_NUMBER && process.env.MERCHANT_SHEBA) {
        return 'BETA';
      }
      return process.env.NODE_ENV === 'production' && process.env.DEMO_MODE !== 'true'
        ? 'DISABLED'
        : 'BETA';

    case 'payment.visa':
    case 'payment.mastercard':
      return 'COMING_SOON';

    case 'payment.usdt':
      return 'COMING_SOON';

    case 'payment.wallet':
      return 'LIVE';

    case 'supplier.flight':
    case 'supplier.flights':
      // Currently uses seeded catalog and mock adapter; direct Parto/Alibaba API integration roadmap active
      return 'MOCK';

    case 'supplier.hotel':
    case 'supplier.hotels':
      // Seeded hotel inventory with rich facets
      return 'MOCK';

    case 'supplier.tour':
    case 'supplier.tours':
      // Backed by database CMS and row-locked reservation
      return 'LIVE';

    case 'fx.live':
      return 'COMING_SOON';

    case 'fx.liveRates':
    case 'fx.simulated':
      // Currently uses StaticRateProvider; live central bank feed pending
      return 'SIMULATED';

    case 'auth.sms':
      if (process.env.SMSWBS_USERNAME && process.env.SMSWBS_PASSWORD) {
        return 'LIVE';
      }
      return 'BETA';

    case 'auth.email':
      return 'BETA';

    case 'auth.telegram':
      return 'BETA';

    case 'auth.whatsapp':
    case 'auth.wechat':
      return 'COMING_SOON';

    case 'auth.google':
      return process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ? 'LIVE'
        : 'DISABLED';

    case 'ai.planner':
      return 'LIVE';

    case 'ai.router':
      return 'LIVE';

    case 'refund.online':
      // Admin workflow + double-entry ledger reversal implemented; bank automated payout pending
      return 'BETA';

    case 'refund.manual':
      return 'LIVE';

    case 'wallet.multicurrency':
      return 'LIVE';

    case 'loyalty.streak':
      return 'LIVE';

    case 'customer360':
      // Server-side tenant isolation enforced (org + staff + self matrix);
      // still staff-facing only, no customer-facing surface yet.
      return 'BETA';

    case 'corporate':
      // Organizations/branches/memberships + admin UI are real; the corporate
      // policy engine and approval workflow are not built yet.
      return 'BETA';

    case 'taxInvoice':
      // Official-FORMAT invoice document generation. No tax-authority
      // (Moadian) submission integration exists — must never claim submission.
      return 'BETA';

    case 'travelHandbook':
      // Digital handbook integrated into trip detail; AI sections are labeled
      // as suggestions and never overwrite authoritative trip data.
      return 'BETA';

    case 'dutyOfCare':
      return 'BETA';

    default:
      return 'DISABLED';
  }
}

export const CAPABILITY_DEFINITIONS: Record<CapabilityKey, Omit<CapabilityDescriptor, 'status' | 'isReal'>> = {
  'payment.shetab': {
    key: 'payment.shetab',
    category: 'payment',
    name: { fa: 'درگاه شتاب شاپرک', en: 'Shetab Shaparak Gateway' },
    description: {
      fa: 'پرداخت امن با کلیه کارت‌های عضو شبکه شتاب',
      en: 'Secure payment with all Iranian Shetab debit cards',
    },
    badgeLabel: { fa: 'شتاب', en: 'Shetab' },
    evidencePath: 'src/domains/payments/gateway-port.ts',
  },
  'payment.cardToCard': {
    key: 'payment.cardToCard',
    category: 'payment',
    name: { fa: 'کارت به کارت آفلاین', en: 'Card-to-Card Transfer' },
    description: {
      fa: 'انتقال بانکی و ثبت شناسه پیگیری برای مبالغ بالا با تایید مالی',
      en: 'Offline bank transfer for high-ticket purchases with manual finance clearance',
    },
    badgeLabel: { fa: 'تایید مالی', en: 'Finance Clearance' },
    evidencePath: 'src/domains/payments/adapters/CardToCardPaymentAdapter.ts',
  },
  'payment.visa': {
    key: 'payment.visa',
    category: 'payment',
    name: { fa: 'ویزا کارت بین‌المللی', en: 'Visa International' },
    description: {
      fa: 'درگاه کارت‌های اعتباری و نقدی ویزا',
      en: 'Visa international credit and debit card processing',
    },
    badgeLabel: { fa: 'به‌زودی', en: 'Coming Soon' },
    evidencePath: 'src/domains/payments/payment-methods.ts',
  },
  'payment.mastercard': {
    key: 'payment.mastercard',
    category: 'payment',
    name: { fa: 'مسترکارت بین‌المللی', en: 'Mastercard International' },
    description: {
      fa: 'پرداخت امن بین‌المللی با مسترکارت',
      en: 'Mastercard international payment processing',
    },
    badgeLabel: { fa: 'به‌زودی', en: 'Coming Soon' },
    evidencePath: 'src/domains/payments/payment-methods.ts',
  },
  'payment.usdt': {
    key: 'payment.usdt',
    category: 'payment',
    name: { fa: 'ارز دیجیتال تتر (USDT)', en: 'Tether (USDT) Crypto' },
    description: {
      fa: 'تسویه ریالی و ارزی با استیبل‌کوین تتر TRC20/ERC20',
      en: 'Settlement via Tether USDT stablecoin',
    },
    badgeLabel: { fa: 'به‌زودی', en: 'Coming Soon' },
    evidencePath: 'src/domains/payments/crypto-port.ts',
  },
  'payment.wallet': {
    key: 'payment.wallet',
    category: 'payment',
    name: { fa: 'کیف پول فیروزو', en: 'Firuzo Wallet' },
    description: {
      fa: 'پرداخت مستقیم و آنی از موجودی کیف پول با ثبت در دفتر کل',
      en: 'Instant debit from customer balance with double-entry journal',
    },
    badgeLabel: { fa: 'فعال', en: 'Active' },
    evidencePath: 'src/domains/payments/PaymentDomainService.ts',
  },
  'supplier.flight': {
    key: 'supplier.flight',
    category: 'supplier',
    name: { fa: 'تامین‌کننده پروازها', en: 'Flight Suppliers' },
    description: {
      fa: 'موتور توزیع پروازهای داخلی و خارجی',
      en: 'Domestic and international flight distribution engine',
    },
    badgeLabel: { fa: 'کاتالوگ اختصاصی', en: 'Catalog' },
    evidencePath: 'src/domains/supplier/flight-supplier-port.ts',
  },
  'supplier.flights': {
    key: 'supplier.flights',
    category: 'supplier',
    name: { fa: 'تامین‌کننده پروازها', en: 'Flight Suppliers' },
    description: {
      fa: 'موتور توزیع پروازهای داخلی و خارجی',
      en: 'Domestic and international flight distribution engine',
    },
    badgeLabel: { fa: 'کاتالوگ اختصاصی', en: 'Catalog' },
    evidencePath: 'src/domains/supplier/flight-supplier-port.ts',
  },
  'supplier.hotel': {
    key: 'supplier.hotel',
    category: 'supplier',
    name: { fa: 'تامین‌کننده هتل‌ها', en: 'Hotel Suppliers' },
    description: {
      fa: 'رزرواسیون اقامتگاه‌ها و هتل‌های برتر',
      en: 'Hotel accommodation reservations and inventory aggregation',
    },
    badgeLabel: { fa: 'کاتالوگ اختصاصی', en: 'Catalog' },
    evidencePath: 'src/domains/supplier/hotel-supplier-port.ts',
  },
  'supplier.hotels': {
    key: 'supplier.hotels',
    category: 'supplier',
    name: { fa: 'تامین‌کننده هتل‌ها', en: 'Hotel Suppliers' },
    description: {
      fa: 'رزرواسیون اقامتگاه‌ها و هتل‌های برتر',
      en: 'Hotel accommodation reservations and inventory aggregation',
    },
    badgeLabel: { fa: 'کاتالوگ اختصاصی', en: 'Catalog' },
    evidencePath: 'src/domains/supplier/hotel-supplier-port.ts',
  },
  'supplier.tour': {
    key: 'supplier.tour',
    category: 'supplier',
    name: { fa: 'تورها و تجربیات اختصاصی', en: 'Exclusive Tours & Experiences' },
    description: {
      fa: 'رزرو ظرفیت واقعی تورها با قفل همزمانی',
      en: 'Direct booking of curated tours with row-locked inventory holds',
    },
    badgeLabel: { fa: 'مستقیم و زنده', en: 'Live Direct' },
    evidencePath: 'src/domains/inventory/InventoryEngine.ts',
  },
  'supplier.tours': {
    key: 'supplier.tours',
    category: 'supplier',
    name: { fa: 'تورها و تجربیات اختصاصی', en: 'Exclusive Tours & Experiences' },
    description: {
      fa: 'رزرو ظرفیت واقعی تورها با قفل همزمانی',
      en: 'Direct booking of curated tours with row-locked inventory holds',
    },
    badgeLabel: { fa: 'مستقیم و زنده', en: 'Live Direct' },
    evidencePath: 'src/domains/inventory/InventoryEngine.ts',
  },
  'fx.live': {
    key: 'fx.live',
    category: 'fx',
    name: { fa: 'نرخ‌های زنده بانکی', en: 'Live Central Bank FX Feed' },
    description: {
      fa: 'دریافت برخط نرخ رسمی ارزها از وب‌سرویس بانک مرکزی',
      en: 'Real-time exchange rate stream from central bank API',
    },
    badgeLabel: { fa: 'به‌زودی', en: 'Coming Soon' },
    evidencePath: 'src/domains/ledger/currency-service.ts',
  },
  'fx.liveRates': {
    key: 'fx.liveRates',
    category: 'fx',
    name: { fa: 'نرخ لحظه‌ای ارزها', en: 'Live Foreign Exchange Rates' },
    description: {
      fa: 'تبدیل خودکار ارزهای ریال، درهم، دلار و یوان',
      en: 'Currency conversion across IRR, AED, USD and CNY',
    },
    badgeLabel: { fa: 'نرخ مرجع', en: 'Reference' },
    evidencePath: 'src/domains/ledger/currency-service.ts',
  },
  'fx.simulated': {
    key: 'fx.simulated',
    category: 'fx',
    name: { fa: 'نرخ‌های مرجع و شبیه‌سازی‌شده', en: 'Reference & Simulated FX Rates' },
    description: {
      fa: 'تبدیل ارزی بر پایه جدول نرخ‌های مرجع با کارمزد اسپرد',
      en: 'Multi-currency conversion using reference rates and spread margins',
    },
    badgeLabel: { fa: 'نرخ مرجع', en: 'Reference' },
    evidencePath: 'src/domains/ledger/currency-service.ts',
  },
  'auth.sms': {
    key: 'auth.sms',
    category: 'auth',
    name: { fa: 'ورود پیامکی (SMS OTP)', en: 'SMS OTP Authentication' },
    description: {
      fa: 'ارسال کد یکبار مصرف با هش رمزنگاری و حفاظت نرخ درخواست',
      en: 'HMAC-SHA256 hashed OTP with rate-limiting and 5-min TTL',
    },
    badgeLabel: { fa: 'فعال', en: 'Live' },
    evidencePath: 'src/auth.ts',
  },
  'auth.email': {
    key: 'auth.email',
    category: 'auth',
    name: { fa: 'ورود با ایمیل', en: 'Email Authentication' },
    description: {
      fa: 'ارسال کد تایید یا لینک جادویی به صندوق پست الکترونیک',
      en: 'OTP or magic link dispatched to registered email',
    },
    badgeLabel: { fa: 'بتا', en: 'Beta' },
    evidencePath: 'src/auth.ts',
  },
  'auth.telegram': {
    key: 'auth.telegram',
    category: 'auth',
    name: { fa: 'ورود از طریق بات تلگرام', en: 'Telegram Bot Auth' },
    description: {
      fa: 'دریافت آنی کد تایید در تلگرام',
      en: 'Instant OTP delivery via Telegram bot gateway',
    },
    badgeLabel: { fa: 'بتا', en: 'Beta' },
    evidencePath: 'src/auth.ts',
  },
  'auth.whatsapp': {
    key: 'auth.whatsapp',
    category: 'auth',
    name: { fa: 'ورود با واتساپ', en: 'WhatsApp Auth' },
    description: {
      fa: 'ارسال کد تایید یکبار مصرف در پیام‌رسان واتساپ',
      en: 'One-time passcode via WhatsApp Business API',
    },
    badgeLabel: { fa: 'به‌زودی', en: 'Coming Soon' },
    evidencePath: 'src/auth.ts',
  },
  'auth.wechat': {
    key: 'auth.wechat',
    category: 'auth',
    name: { fa: 'ورود با وی‌چت', en: 'WeChat Auth' },
    description: {
      fa: 'احراز هویت کاربران چینی از طریق وی‌چت',
      en: 'WeChat OAuth and QR code login for Chinese travelers',
    },
    badgeLabel: { fa: 'به‌زودی', en: 'Coming Soon' },
    evidencePath: 'src/auth.ts',
  },
  'auth.google': {
    key: 'auth.google',
    category: 'auth',
    name: { fa: 'ورود با گوگل', en: 'Google OAuth' },
    description: {
      fa: 'ورود سریع با حساب کاربری گوگل',
      en: 'Single sign-on via Google OAuth 2.0',
    },
    badgeLabel: { fa: 'گوگل', en: 'Google' },
    evidencePath: 'src/auth.ts',
  },
  'ai.planner': {
    key: 'ai.planner',
    category: 'ai',
    name: { fa: 'برنامه‌ریز هوشمند سفر فیروزو', en: 'Firuzo AI Trip Planner' },
    description: {
      fa: 'تولید برنامه سفر شخصی‌سازی شده بر پایه علایق، بودجه و زمان',
      en: 'Personalized itinerary generation based on interests and budget',
    },
    badgeLabel: { fa: 'هوشمند', en: 'AI Powered' },
    evidencePath: 'src/app/api/planner/generate/route.ts',
  },
  'ai.router': {
    key: 'ai.router',
    category: 'ai',
    name: { fa: 'روتر چند ارائه‌دهنده هوش مصنوعی', en: 'Multi-Provider AI Router' },
    description: {
      fa: 'مدیریت و مسیریابی هوشمند بین Gemini، DeepSeek، OpenAI و Claude با Failover خودکار',
      en: 'Intelligent multi-model routing with automatic 429 rate limit failover',
    },
    badgeLabel: { fa: 'فعال', en: 'Live' },
    evidencePath: 'src/domains/ai/AiRouterService.ts',
  },
  'refund.online': {
    key: 'refund.online',
    category: 'refund',
    name: { fa: 'استرداد آنلاین و سیستمی', en: 'Online Automated Refund' },
    description: {
      fa: 'محاسبه جریمه بر اساس قوانین کنسلی و برگشت اعتبار به کیف‌پول/کارت',
      en: 'Penalty calculation per fare rules with automated ledger reversal',
    },
    badgeLabel: { fa: 'سیستمی', en: 'Systemic' },
    evidencePath: 'src/domains/refund/RefundDomainService.ts',
  },
  'refund.manual': {
    key: 'refund.manual',
    category: 'refund',
    name: { fa: 'استرداد دستی مالی', en: 'Manual Finance Refund' },
    description: {
      fa: 'بررسی کارشناس مالی و واریز بین بانکی به حساب مشتری',
      en: 'Manual back-office finance review and interbank transfer payout',
    },
    badgeLabel: { fa: 'دستی', en: 'Manual' },
    evidencePath: 'src/domains/refund/RefundDomainService.ts',
  },
  'wallet.multicurrency': {
    key: 'wallet.multicurrency',
    category: 'wallet',
    name: { fa: 'کیف‌پول چند ارزی متصل به دفتر کل', en: 'Multi-Currency Ledger Wallet' },
    description: {
      fa: 'مدیریت موجودی به تفکیک ریال، درهم امارات، دلار و یوان',
      en: 'Isolated multi-currency balances backed by balanced ledger entries',
    },
    badgeLabel: { fa: 'فعال', en: 'Active' },
    evidencePath: 'src/domains/ledger/GeneralLedgerService.ts',
  },
  'loyalty.streak': {
    key: 'loyalty.streak',
    category: 'loyalty',
    name: { fa: 'زنجیره ورود روزانه و پاداش وفاداری', en: 'Daily Streak & Loyalty Rewards' },
    description: {
      fa: 'دریافت سکه‌های وفاداری روزانه با ثبت قطعی سمت سرور و قوانین ضدسوءاستفاده',
      en: 'Server-authoritative 7-day loyalty streak with idempotent ledger rewards',
    },
    badgeLabel: { fa: 'فعال', en: 'Live' },
    evidencePath: 'src/domains/loyalty/LoyaltyStreakService.ts',
  },
  'customer360': {
    key: 'customer360',
    category: 'identity',
    name: { fa: 'نمای ۳۶۰ درجه مشتری', en: 'Customer 360 View' },
    description: {
      fa: 'نمای تجمیعی مشتری برای اپراتورها با اعمال سرورمحور ایزولاسیون سازمانی و ماسک PII بر اساس مجوز',
      en: 'Aggregated customer view for operators with server-side tenant isolation and permission-gated PII masking',
    },
    badgeLabel: { fa: 'بتا', en: 'Beta' },
    evidencePath: 'src/domains/identity/Customer360Service.ts',
  },
  'corporate': {
    key: 'corporate',
    category: 'corporate',
    name: { fa: 'مرکز مدیریت سفر سازمانی', en: 'Corporate Travel Hub' },
    description: {
      fa: 'سازمان، شعبه، عضویت و فاکتور سازمانی فعال است؛ موتور خط‌مشی سفر و گردش‌کار تاییدیه هنوز ساخته نشده است',
      en: 'Organizations, branches, memberships and corporate invoicing are live; the travel policy engine and approval workflow are not built yet',
    },
    badgeLabel: { fa: 'بتا', en: 'Beta' },
    evidencePath: 'src/domains/identity/OrganizationService.ts',
  },
  'taxInvoice': {
    key: 'taxInvoice',
    category: 'tax',
    name: { fa: 'صورتحساب فروش با قالب رسمی', en: 'Official-Format Tax Invoice' },
    description: {
      fa: 'تولید سند فاکتور در قالب رسمی؛ ارسال به سامانه مؤدیان متصل نیست و سند ادعای ثبت رسمی ندارد',
      en: 'Official-format invoice document generation; no tax-authority (Moadian) submission integration — the document makes no regulatory claims',
    },
    badgeLabel: { fa: 'قالب رسمی', en: 'Official Format' },
    evidencePath: 'src/domains/finance/InvoiceDomainService.ts',
  },
  'travelHandbook': {
    key: 'travelHandbook',
    category: 'trip',
    name: { fa: 'دفترچه راهنمای سفر', en: 'Travel Handbook' },
    description: {
      fa: 'دفترچه سفر در جزئیات سفر؛ بخش‌های هوش مصنوعی به‌عنوان پیشنهاد برچسب‌خورده‌اند و اطلاعات قطعی سفر را بازنویسی نمی‌کنند',
      en: 'Trip-detail handbook; AI sections are labeled as suggestions and never overwrite authoritative trip data',
    },
    badgeLabel: { fa: 'بتا', en: 'Beta' },
    evidencePath: 'src/components/plan/DigitalTravelHandbook.tsx',
  },
  'dutyOfCare': {
    key: 'dutyOfCare',
    category: 'trip',
    name: { fa: 'وظایف مراقبتی مسافر', en: 'Duty of Care' },
    description: {
      fa: 'اطلاعات ایمنی و مراقبت سفر برای مسافر و اپراتور سازمانی',
      en: 'Travel safety and care information surfaced to travelers and corporate operators',
    },
    badgeLabel: { fa: 'بتا', en: 'Beta' },
    evidencePath: 'src/lib/duty-of-care.ts',
  },
};

/**
 * Get descriptor for a single capability
 */
export function getCapability(key: CapabilityKey): CapabilityDescriptor {
  const def = CAPABILITY_DEFINITIONS[key];
  if (!def) {
    throw new Error(`Unknown capability key: ${key}`);
  }
  const status = resolveDynamicStatus(key);
  return {
    ...def,
    status,
    isReal: status === 'LIVE' || status === 'BETA',
  };
}

/**
 * Get all capabilities
 */
export function getAllCapabilities(): Record<CapabilityKey, CapabilityDescriptor> {
  const keys = Object.keys(CAPABILITY_DEFINITIONS) as CapabilityKey[];
  const res: Partial<Record<CapabilityKey, CapabilityDescriptor>> = {};
  for (const k of keys) {
    res[k] = getCapability(k);
  }
  return res as Record<CapabilityKey, CapabilityDescriptor>;
}

/**
 * Quick check if capability is live or operational in production
 */
export function isCapabilityLive(key: CapabilityKey): boolean {
  const status = resolveDynamicStatus(key);
  return status === 'LIVE';
}

/**
 * Check if capability is usable (LIVE or BETA)
 */
export function isCapabilityAvailable(key: CapabilityKey): boolean {
  const status = resolveDynamicStatus(key);
  return status === 'LIVE' || status === 'BETA';
}

/**
 * Public capability summary for client components and metadata
 */
export function getPublicCapabilitiesSummary(): Record<string, { status: CapabilityStatus; isReal: boolean; badgeLabel: { fa: string; en: string } }> {
  const all = getAllCapabilities();
  const summary: Record<string, { status: CapabilityStatus; isReal: boolean; badgeLabel: { fa: string; en: string } }> = {};
  for (const [key, desc] of Object.entries(all)) {
    summary[key] = {
      status: desc.status,
      isReal: desc.isReal,
      badgeLabel: desc.badgeLabel,
    };
  }
  return summary;
}
