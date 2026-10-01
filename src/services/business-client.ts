/**
 * قرارداد API بخش بیزنس — از سند تحویل فنی (2026-09-28).
 * پیشوند همه مسیرها: /api/v1/business
 * همه پاسخ‌ها { data, meta?, error? }؛ خطا با code متنی ثابت.
 *
 * تا API بک‌اند آماده شود این لایه mock می‌شود؛ بعداً فقط fetch این فایل
 * به fetch واقعی تغییر می‌کند و کامپوننت‌ها دست‌نخورده می‌مانند.
 * هیچ قراردادی حدس زده نشده — هر فیلد از سند تحویل آمده است.
 */

export const BUSINESS_API_BASE = '/api/v1/business';

/* ---------------- انواع داده (مدل داده سند) ---------------- */

/** وضعیت درخواست — شش وضعیت + cancelled (تغییر فقط سمت سرور) */
export type BusinessRequestStatus =
  | 'draft'
  | 'submitted'
  | 'deposit_paid'
  | 'under_review'
  | 'changes_requested'
  | 'approved'
  | 'issued'
  | 'cancelled';

export interface BusinessPackageSummary {
  id: string;
  slug: string;
  title: string;
  destination: string;
  durationDays: number;
  /** نرخ هر نفر به ریال (عدد صحیح) */
  basePriceRial: number;
  nearestDepartureDate?: string | null;
  /** مسیر تصویر یا خالی برای placeholder */
  imageUrl?: string | null;
}

export interface BusinessPackageDetail extends BusinessPackageSummary {
  summary: string;
  /** برنامه روزبه‌روز */
  itinerary: string[];
  includes: string[];
  requiredDocs: string[];
  departures: Array<{
    id: string;
    /** ISO date در دیتابیس؛ UI شمسی */
    departDate: string;
    returnDate: string;
    capacity: number;
    bookedCount: number;
  }>;
  addons: Array<{
    id: string;
    code: string;
    title: string;
    note: string;
    /** ریال */
    priceRial: number;
    unit: 'per_person' | 'per_group';
  }>;
}

export interface BusinessTraveler {
  id?: string;
  fullNameLatin: string;
  passportNo: string;
  /** ISO یا رشته شمسی — در UI شمسی */
  passportExpiry: string;
  birthDate?: string;
}

export interface BusinessDocument {
  id: string;
  type: string;
  fileName: string;
  state: 'pending' | 'approved' | 'rejected';
  rejectReason?: string | null;
}

export interface BusinessMoneyLine {
  label: string;
  note?: string;
  amountRial: number;
  negative?: boolean;
}

export interface BusinessRequestDetail {
  id: string;
  code: string;
  status: BusinessRequestStatus;
  packageTitle: string;
  departureDate: string;
  returnDate: string;
  paxCount: number;
  travelers: BusinessTraveler[];
  documents: BusinessDocument[];
  /** مبالغ به ریال — قفل از لحظه submitted */
  totalAmountRial: number;
  depositAmountRial: number;
  /** کمک‌هزینه: تا تایید «در انتظار» است */
  grantAmountRial: number;
  grantPending: boolean;
  paidAmountRial: number;
  assigneeName?: string | null;
  expiresAt?: string | null;
  /** تاریخچه وضعیت — فقط افزودنی */
  timeline: Array<{
    title: string;
    note?: string;
    state: 'done' | 'doing' | 'waiting';
  }>;
}

/* ---------------- خطاهای سمت سرور (سند: کد ثابت متنی) ---------------- */

export type BusinessApiErrorCode =
  | 'capacity_full' // 409 → پیشنهاد تاریخ بعدی
  | 'invalid_transition' // 409 → ریدایرکت به صفحه درست
  | 'request_expired' // 410
  | 'payment_failed' // 402 → تلاش دوباره
  | 'validation_error' // 422 → لیست فیلدها
  | 'unauthorized'
  | 'not_found'
  | 'network_error';

export class BusinessApiError extends Error {
  code: BusinessApiErrorCode;
  /** برای validation_error: نام فیلدهای مشکل‌دار */
  fields?: Record<string, string>;

  constructor(code: BusinessApiErrorCode, fields?: Record<string, string>, message?: string) {
    super(message || `business_api_error:${code}`);
    this.code = code;
    this.fields = fields;
  }
}

export const BUSINESS_ERROR_I18N_KEYS: Record<BusinessApiErrorCode, string> = {
  capacity_full: 'Business.tour.errors.paxRange',
  invalid_transition: 'Business.common.networkErrorBody',
  request_expired: 'Business.common.networkErrorBody',
  payment_failed: 'Business.deposit.paymentFailed',
  validation_error: 'Business.form.errors.required',
  unauthorized: 'Business.common.networkErrorBody',
  not_found: 'Business.common.networkErrorBody',
  network_error: 'Business.common.networkErrorBody',
};

export function getBusinessErrorMessage(
  code: BusinessApiErrorCode,
  t?: (key: string) => string
): string {
  if (t) {
    const key = BUSINESS_ERROR_I18N_KEYS[code];
    if (key) return t(key);
  }
  switch (code) {
    case 'capacity_full':
      return 'ظرفیت تاریخ انتخابی تکمیل شده است. لطفاً تاریخ دیگری انتخاب کنید.';
    case 'invalid_transition':
      return 'تغییر وضعیت نامعتبر است یا این مرحله قبلاً انجام شده است.';
    case 'request_expired':
      return 'مهلت پرداخت یا تکمیل این درخواست منقضی شده است.';
    case 'payment_failed':
      return 'پرداخت ناموفق بود. لطفاً مجدداً تلاش کنید.';
    case 'validation_error':
      return 'اطلاعات وارد شده نامعتبر یا ناقص است.';
    case 'not_found':
      return 'اطلاعات مورد نظر یافت نشد.';
    case 'unauthorized':
      return 'دسترسی غیرمجاز است.';
    case 'network_error':
    default:
      return 'خطا در برقراری ارتباط با سرور.';
  }
}

/* ---------------- شکل پاسخ (قرارداد سند: { data, meta?, error? }) ---------------- */

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  meta?: { page?: number; total?: number };
  error?: string | { code: BusinessApiErrorCode; fields?: Record<string, string>; message?: string };
  code?: BusinessApiErrorCode;
  fields?: Record<string, string>;
  redirect_url?: string;
}

/* ---------------- لایه fetch مشترک ---------------- */

export async function callBusinessApi<T>(
  path: string,
  init?: RequestInit & { idempotencyKey?: string }
): Promise<T> {
  const { idempotencyKey, ...rest } = init || {};
  let res: Response;
  try {
    res = await fetch(`${BUSINESS_API_BASE}${path}`, {
      ...rest,
      headers: {
        ...(rest.body && !(rest.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        ...rest.headers,
      },
    });
  } catch {
    throw new BusinessApiError('network_error');
  }

  if (!res.ok) {
    let body: ApiEnvelope<unknown> | null = null;
    try {
      body = (await res.json()) as ApiEnvelope<unknown>;
    } catch {
      // پاسخ غیر JSON — کد بر اساس HTTP status
    }

    const errCode =
      (typeof body?.error === 'object' ? body.error?.code : body?.code) ||
      (res.status === 404
        ? 'not_found'
        : res.status === 401
        ? 'unauthorized'
        : res.status === 409
        ? (body?.code as BusinessApiErrorCode) || 'invalid_transition'
        : res.status === 422
        ? 'validation_error'
        : res.status === 402
        ? 'payment_failed'
        : res.status === 410
        ? 'request_expired'
        : 'network_error');

    const fields = typeof body?.error === 'object' ? body.error?.fields : body?.fields;
    const msg = typeof body?.error === 'string' ? body.error : typeof body?.error === 'object' ? body.error?.message : undefined;
    throw new BusinessApiError(errCode as BusinessApiErrorCode, fields, msg);
  }

  const json = (await res.json()) as ApiEnvelope<T>;
  if (json && typeof json === 'object' && 'data' in json && json.data !== undefined) {
    if ('redirect_url' in json && typeof json.data === 'object' && json.data !== null) {
      (json.data as Record<string, unknown>).redirect_url = json.redirect_url;
    }
    return json.data as T;
  }
  return json as unknown as T;
}

/* ---------------- MOCK DATA FOR FALLBACK / TESTS ---------------- */

export const MOCK_PACKAGES: BusinessPackageSummary[] = [
  {
    id: 'pkg-canton',
    slug: 'canton-fair-mobile-market',
    title: 'نمایشگاه کانتون فر + بازار موبایل گوانگژو',
    destination: 'گوانگژو، چین',
    durationDays: 7,
    basePriceRial: 2_980_000_0,
    nearestDepartureDate: '1405-07-15',
    imageUrl: null,
  },
  {
    id: 'pkg-shenzhen',
    slug: 'shenzhen-factory-sourcing',
    title: 'بازدید کارخانه و تامین‌کننده‌یابی شنژن',
    destination: 'شنژن، چین',
    durationDays: 6,
    basePriceRial: 2_640_000_0,
    nearestDepartureDate: '1405-07-29',
    imageUrl: null,
  },
  {
    id: 'pkg-moscow',
    slug: 'moscow-industry-delegation',
    title: 'هیئت تجاری صنعت و تجهیزات مسکو',
    destination: 'مسکو، روسیه',
    durationDays: 5,
    basePriceRial: 3_450_000_0,
    nearestDepartureDate: '1405-08-13',
    imageUrl: null,
  },
];

export const MOCK_PACKAGE_DETAIL: Record<string, BusinessPackageDetail> = Object.fromEntries(
  MOCK_PACKAGES.map((p) => [
    p.slug,
    {
      ...p,
      summary:
        'برنامه‌ای برای بازرگانان و فعالان: بازدید نمایشگاه، بازار تخصصی و جلسات B2B هماهنگ‌شده با مترجم گروهی.',
      itinerary: [
        'پرواز تهران، ترانسفر فرودگاهی و استقرار در هتل، جلسه توجیهی گروه.',
        'بازدید نمایشگاه با مترجم گروهی، ثبت لیست تامین‌کنندگان هدف.',
        'ادامه نمایشگاه و جلسات B2B از پیش هماهنگ‌شده در غرفه‌ها.',
        'بازار تخصصی و بررسی نمونه و قیمت‌گیری.',
        'بازدید کارخانه تولیدکننده منتخب و گفت‌وگو درباره تولید سفارشی.',
        'نهایی‌سازی مذاکرات با حضور مترجم و مشاور حقوقی، هماهنگی بازرسی کالا.',
        'زمان آزاد، ترانسفر به فرودگاه و پرواز بازگشت.',
      ],
      includes: [
        'پرواز رفت و برگشت با بار مجاز',
        'هتل ۴ ستاره نزدیک محل نمایشگاه با صبحانه',
        'ویزای تجاری و دعوت‌نامه نمایشگاه',
        'ترانسفر فرودگاهی و جابه‌جایی روزانه گروه',
        'مترجم گروهی در روزهای نمایشگاه',
        'بیمه مسافرتی و سرپرست تور',
      ],
      requiredDocs: [
        'پاسپورت با اعتبار حداقل ۶ ماه',
        'روزنامه رسمی یا آگهی تاسیس شرکت',
        'معرفی‌نامه شرکت برای نفرات اعزامی',
        'کارت بازرگانی (در صورت وجود)',
        'عکس پرسنلی با پس‌زمینه سفید',
      ],
      departures: [
        { id: 'dep-1', departDate: '1405-07-15', returnDate: '1405-07-21', capacity: 30, bookedCount: 18 },
        { id: 'dep-2', departDate: '1405-07-29', returnDate: '1405-08-04', capacity: 30, bookedCount: 9 },
        { id: 'dep-3', departDate: '1405-08-13', returnDate: '1405-08-19', capacity: 25, bookedCount: 2 },
      ],
      addons: [
        { id: 'addon-translator', code: 'translator', title: 'مترجم اختصاصی', note: 'همراه یک نفر در تمام جلسات', priceRial: 4_500_000_0, unit: 'per_person' },
        { id: 'addon-legal', code: 'legal', title: 'مشاور حقوقی و قرارداد', note: 'تنظیم و بازبینی قرارداد خرید', priceRial: 6_200_000_0, unit: 'per_group' },
        { id: 'addon-booth', code: 'booth', title: 'غرفه یا میز نمایشگاهی', note: 'حضور به‌عنوان نمایشگاه‌دهنده', priceRial: 8_800_000_0, unit: 'per_group' },
        { id: 'addon-driver', code: 'driver', title: 'خودرو و راننده اختصاصی', note: 'جابه‌جایی خارج از برنامه گروه', priceRial: 3_900_000_0, unit: 'per_group' },
      ],
    },
  ])
);

export const MOCK_REQUEST: BusinessRequestDetail = {
  id: 'req-0001',
  code: 'FZB-1405-0001',
  status: 'under_review',
  packageTitle: 'نمایشگاه کانتون فر — گوانگژو',
  departureDate: '1405-07-15',
  returnDate: '1405-07-21',
  paxCount: 4,
  travelers: [],
  documents: [],
  totalAmountRial: 125_600_000_0,
  depositAmountRial: 37_680_000_0,
  grantAmountRial: 20_000_000_0,
  grantPending: true,
  paidAmountRial: 37_680_000_0,
  assigneeName: null,
  expiresAt: null,
  timeline: [],
};

/* ---------------- توابع عمومی (قرارداد سند، بخش APIها) ---------------- */

import type { VoucherData } from '@/components/business/VoucherCard';
export type { VoucherData };

export const businessApi = {
  /** GET /packages */
  listPackages(params?: { goal?: string; destination?: string; month?: string }): Promise<BusinessPackageSummary[]> {
    const qs = new URLSearchParams();
    if (params?.goal) qs.set('goal', params.goal);
    if (params?.destination) qs.set('destination', params.destination);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return callBusinessApi<BusinessPackageSummary[]>(`/packages${query}`);
  },

  /** Alias: getPackages */
  getPackages(filters?: { goal?: string; destination?: string; month?: string }): Promise<BusinessPackageSummary[]> {
    return this.listPackages(filters);
  },

  /** GET /packages/:slug */
  getPackage(slug: string): Promise<BusinessPackageDetail> {
    return callBusinessApi<BusinessPackageDetail>(`/packages/${slug}`);
  },

  /** Alias: getPackageBySlug */
  getPackageBySlug(slug: string): Promise<BusinessPackageDetail> {
    return this.getPackage(slug);
  },

  /** POST /requests → draft + expires_at */
  createRequest(input: {
    packageId: string;
    departureId: string;
    paxCount: number;
    addonIds?: string[];
    companyName?: string;
    nationalId?: string;
    repName?: string;
    repPhone?: string;
    field?: string;
  }): Promise<BusinessRequestDetail> {
    return callBusinessApi<BusinessRequestDetail>('/requests', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  /** PATCH /requests/:id — ذخیره خودکار draft */
  updateRequest(
    id: string,
    body: {
      company?: {
        name?: string;
        nationalId?: string;
        economicCode?: string;
        field?: string;
        repName?: string;
        repPhone?: string;
      };
      travelers?: BusinessTraveler[];
      note?: string;
    }
  ): Promise<BusinessRequestDetail> {
    return callBusinessApi<BusinessRequestDetail>(`/requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  /** Alias: saveRequestDraft */
  saveRequestDraft(
    id: string,
    body: {
      company?: {
        name?: string;
        nationalId?: string;
        economicCode?: string;
        field?: string;
        repName?: string;
        repPhone?: string;
      };
      travelers?: BusinessTraveler[];
      note?: string;
    }
  ): Promise<BusinessRequestDetail> {
    return this.updateRequest(id, body);
  },

  /** POST /requests/:id/documents — multipart */
  async uploadDocument(id: string, form: FormData): Promise<BusinessDocument> {
    let res: Response;
    try {
      res = await fetch(`${BUSINESS_API_BASE}/requests/${id}/documents`, {
        method: 'POST',
        body: form,
      });
    } catch {
      throw new BusinessApiError('network_error');
    }
    if (!res.ok) {
      let body: ApiEnvelope<unknown> | null = null;
      try {
        body = (await res.json()) as ApiEnvelope<unknown>;
      } catch {}
      const code = (typeof body?.error === 'object' ? body.error?.code : body?.code) || 'validation_error';
      throw new BusinessApiError(code as BusinessApiErrorCode);
    }
    const json = (await res.json()) as ApiEnvelope<BusinessDocument>;
    return json.data as BusinessDocument;
  },

  /** POST /requests/:id/submit — terms_accepted + Idempotency-Key */
  submitRequest(id: string, termsAccepted: boolean = true, idempotencyKey?: string): Promise<BusinessRequestDetail> {
    return callBusinessApi<BusinessRequestDetail>(`/requests/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ terms_accepted: termsAccepted }),
      idempotencyKey,
    });
  },

  /** POST /requests/:id/payments — kind, method, receipt? */
  async createPayment(
    id: string,
    body: { kind: 'deposit' | 'settlement'; method: string; receipt?: File },
    idempotencyKey?: string
  ): Promise<{ redirectUrl: string | null; data?: unknown }> {
    const res = await callBusinessApi<{ redirect_url?: string; [key: string]: unknown }>(`/requests/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify({ kind: body.kind, method: body.method }),
      idempotencyKey,
    });
    return {
      redirectUrl: res?.redirect_url || null,
      data: res,
    };
  },

  /** GET /requests/:id — درخواست کامل: وضعیت، تایم‌لاین، مدارک، مالی */
  getRequest(id: string): Promise<BusinessRequestDetail> {
    return callBusinessApi<BusinessRequestDetail>(`/requests/${id}`);
  },

  /** GET /requests/:id/invoice?type= */
  getInvoice(id: string, type: 'proforma' | 'official'): Promise<{ pdfUrl: string }> {
    return Promise.resolve({ pdfUrl: `${BUSINESS_API_BASE}/requests/${id}/invoice?type=${type}` });
  },

  /** GET /requests/:id/voucher */
  getVoucher(id: string): Promise<VoucherData> {
    return callBusinessApi<VoucherData>(`/requests/${id}/voucher`);
  },

  /** GET /vouchers/verify/:code */
  verifyVoucher(code: string): Promise<{ valid: boolean; code: string; companyName?: string; packageTitle?: string }> {
    return callBusinessApi<{ valid: boolean; code: string; companyName?: string; packageTitle?: string }>(
      `/vouchers/verify/${code}`
    );
  },
};
