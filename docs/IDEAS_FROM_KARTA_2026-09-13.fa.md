# ایده‌های برداشت‌شده از aroux30/site (Karta) — ۲۰۲۶-۰۹-۱۳

مرجع بررسی: https://github.com/aroux30/site (پلتفرم ای‌کامرس ایرانی، FastAPI + Next.js 15).

> **نکته لایسنس:** ریپوی مبدأ «proprietary — all rights reserved» است. برداشت ما فقط
> **الگو، داده واقعی (کد خطای PSP، BIN بانک‌ها، پیکربندی analyzer) و ایده** است؛
> پیاده‌سازی‌ها همگی بازنویسی مستقل در کدبیس خودمان هستند.

---

## ۱) در این نوبت پیاده شد

| ایده | فایل(ها) | توضیح |
| --- | --- | --- |
| دیکشنری خطای درگاه | `src/domains/payments/gateway-errors.ts` + تست | کدهای داخلی آداپترها (GATEWAY_NOT_CONFIGURED، AMOUNT_MISMATCH، …) و عبارت‌های سیستمی انگلیسی → پیام ۵-زبانه قابل‌نمایش؛ به‌علاوه جداول عددی PSP (زرین‌پال/ملت/سامان/زیبال) با `translatePspError` برای آداپترهای آینده |
| اتصال به checkout | `src/app/[locale]/checkout/page.tsx` | هر سه مسیر `setError` (eCardo init، exception، payBooking) حالا از مترجم عبور می‌کنند؛ fallback هم فارسی/محلی شد |
| کد خطا در برگشت درگاه | `src/domains/payments/payment-callback-handler.ts` | پارامترهای `code/error_code/errorCode/reason` (query یا POST) تا ۶۴ کاراکتر به `/payment-status` منتقل می‌شوند — صرفاً نمایشی، بدون اثر روی capture |
| نمایش دلیل در payment-status | `src/app/[locale]/payment-status/page.tsx` | در حالت failed با کد شناخته‌شده، باکس هشدار با پیام ترجمه‌شده (role=status) |
| مبلغ خوانا | همان صفحه | برای locale=fa و IRR، زیر مبلغ عددی: `formatTomanHuman` (مثلاً «۲۵۰ میلیون تومان») |
| قفل بی‌کاری ادمین | `src/components/admin/AdminIdleLock.tsx` + `src/app/[locale]/admin/layout.tsx` | خروج خودکار پس از ۱۵ دقیقه بدون تعامل در ERP (ایده `use-idle-timeout` آن‌ها) |

## ۲) قبلاً برداشت شده بود (برای مرجع)

- `src/lib/iranian-commerce.ts` — جدول ۱۹ بانک شتاب (BIN)، Luhn، کد ملی، `formatTomanHuman`، نرمال‌سازی فارسی
- `src/domains/payments/adapters/CardToCardPaymentAdapter.ts` + `CardTransferPaymentView` — پرداخت کارت‌به‌کارت با تایید مالی
- `CryptoPaymentView` — UI پرداخت کریپتو
- `src/components/shared/canvas-error-boundary.tsx`، `src/domains/ai/AiRouterService.ts`، `InternalLinkEngine.ts`، `seo-score.ts`، `src/lib/audio-effects.ts`
- گاردهای amount/currency در webhook ما (`PaymentDomainService:476-481,695-703`) از قبل معادل گارد verify زرین‌پالِ آن‌هاست.

## ۳) بک‌لاگ — آماده اجرا

### ۳.۱. آنالایزر جست‌وجوی فارسی (وقتی سرچ زنده شد)
رسپی کامل در `backend/app/modules/search/infrastructure/elasticsearch_client.py` مبدأ؛ معادل برای ما:
- char_filter: `ي→ی`، `ك→ک`، ارقام عربی ٠-٩ → ۰-۹، **ZWNJ (U+200C) → فاصله** (تجزیه کلمات مرکب)
- filter: `persian_normalization` + `arabic_normalization` + stopwords `_persian_`
- دو آنالایزر: index با `edge_ngram(2,15)` برای autocomplete، search با آنالایزر تمیز
- برای Meilisearch: معادلش همان نرمال‌سازی‌هاست که امروز در `normalizePersianText` داریم؛ اگر ES آمد همین JSON آماده است.

### ۳.۲. Passkey / WebAuthn
کلاینت آن‌ها (`use-passkey.ts`) با `@simplewebauthn/browser` است. برای ما:
1. پکیج `@simplewebauthn/server` + ذخیره credential در Prisma (مدل `PasskeyCredential`)
2. دو route: `register/options` + `register/verify`، `auth/options` + `auth/verify`
3. اتصال به NextAuth v5 به‌عنوان provider مکمل OTP (لاگین بدون SMS = ارزان‌تر و ایمن‌تر)
4. UI همان هوک کلاینت + پیام فارسی «مرورگر شما از کلید عبور پشتیبانی نمی‌کند»

### ۳.۳. Outbox pattern برای رویدادهای supplier
`shared/events/outbox_service.py` آن‌ها: رویداد + تراکنش DB در یک commit، worker جدا برای publish. کاربرد ما: رویدادهای `SUPPLIER_SESSION_EXPIRED`/اتمام سشن اسکرپر و اعلان‌های booking تا تلاش مجدد مطمئن داشته باشند.

### ۳.۴. گیمیفیکیشن — مرحله بعد
ما streak روزانه + loyalty + referral را داریم. از آن‌ها برای تکمیل:
- **گردونه شانس پس از خرید موفق** (سرویس‌سمت جایزه تعیین کند، کلاینت فقط انیمیشن — دقت کن UI آن‌ها placeholder بود)
- کاتالوگ جوایز + بنر tier کاربر + تاریخچه claim

### ۳.۵. کریپتو — جزئیات آداپتر (وقتی درگاه واقعی وصل شد)
UI داریم؛ برای سمت سرور از تجربه NowPayments آن‌ها: IPN با HMAC، نرمال‌سازی ارز (usdt→usdttrc20)، حداقل سفارش $1، نرخ IRR/USD از env، آدرس+QR deposit، refund با اعتبار کیف‌پول.

### ۳.۶. پایش امنیتی (اختیاری، infra)
آن‌ها: CrowdSec، fail2ban، Falco، Wazuh، Suricata + ruleهای Sigma برای حملات auth و workflowهای ZAP/CodeQL/gitleaks. ما gitleaks داریم؛ کاندید بعدی: ZAP baseline scan در CI و CodeQL.

## ۴) چیزهایی که برداشتیم **نکردیم** (و دلیل)

- ستون فقرات ۳۴-ماژوله FastAPI و Clean Architecture لایه‌ای — ما Next.js monolith + Prisma هستیم؛ مهاجرت معنا ندارد.
- Money value object در Rial — `Money` خودمان در `src/lib/finance` معادل و تست‌شده است.
- الگوی delivery slots فروشگاهی — به دامنه سفر ربطی ندارد.
