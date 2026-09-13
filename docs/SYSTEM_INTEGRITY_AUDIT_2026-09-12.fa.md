# ممیزی یکپارچگی سیستم iTrip — 2026-09-12

> اجرای پرامپت ۱۵فصلی System Integrity Audit روی itrip-platform (ادامهٔ سشن KYC→Checkout).
> وضعیت پایانی: **همهٔ گیت‌ها سبز** — typecheck ✅، lint صفر/صفر ✅، test:unit **645/645** ✅، e2e حیاتی **8/8** ✅، gate:a11y صفر violation ✅، gate:i18n ✅.

---

## ۱. نمره یکپارچگی (۰–۱۰)

| محور | نمره | یادداشت |
|---|---|---|
| UI/UX | ۸ | صفحات موبایلی منسجم؛ دوگانهٔ token در auth/ERP |
| Design System | ۶.۵ | `ui/*` پایه هست ولی adoption کم؛ Dialog/Sheet بلااستفاده |
| Mobile | ۸.۵ | safe-area + اهداف لمسی 44px گیت‌شده؛ e2e روی Pixel 5 سبز |
| Frontend Architecture | ۸ | TanStack Query مرده حذف شد؛ ۳ zustand store؛ server actions غالب |
| Backend Architecture | ۸ | ۲۱ domain، saga، ledger، worker؛ `actions/booking.ts` god-action |
| API Consistency | ۶ | helper مشترک `lib/api-response.ts` ساخته شد؛ مهاجرت کامل باقی است |
| Data Consistency | ۷.۵ | drift شکل Passenger باقی؛ wallet فقط ledger |
| Business Logic | ۸.۵ | حفرهٔ price-authority بسته شد؛ fail-closed سراسری در مسیر پول |
| Security | ۹ | fail-fast کلیدها کامل؛ devCode/admin-mode گیت‌شده |
| Performance | ۷.۵ | provider مرده حذف شد؛ اندازه‌گیری مستقل انجام نشده |
| Testing | ۹ | ۶۴۵ unit + ۲۰ spec e2e + گیت‌های a11y/i18n/RTL |
| ERP | ۸ | tenant isolation سالم؛ pricing انبار درست شد |
| **Overall** | **۷.۵ → ۸** | هستهٔ پول/رزرو یکپارچه؛ لایهٔ UI هنوز seam دارد |

## ۲. مشکلات حیاتی و اصلاحات

### P0 — حفرهٔ price-authority (قیمت‌گذاری)
`BookingApplicationService.resolveServerBasePrice` برای هر TOUR ناشناخته قیمت تور دمو (~۸۵M IRR) برمی‌گرداند (چون `startsWith('t')` با هر رشته‌ای match می‌شد). نتیجه: fallback `InventoryItem.basePrice` و guard ناهمخوانی ارز در `UnifiedCartService` غیرقابل‌دسترس بودند؛ اقلام ERP با قیمت دمو قیمت می‌خوردند و `reprice` رزروهای ناشناخته را به دمو ریست می‌کرد.
**فیکس:** فقط پیشوندهای synthetic (ctx-/exp_/plan_/int_) fallback کاتالوگ دارند؛ بقیه → `null` → inventory fallback یا fail-closed. ضمناً `prisma.tour.findUnique` به try/catch منتقل شد (TypeError sync از `.catch()` می‌گذشت).

### P0 — دادهٔ هویتی جعلی در production
`scanPassport()` در checkout نام/پاسپورت/کد ملی hardcoded را در فرم رزرو واقعی پر می‌کرد (نسخهٔ دوم در auth پاسپورت random می‌ساخت).
**فیکس:** حذف کامل تابع، state و دکمهٔ OCR از `PassengerSection`.

### P1 — پیاده‌سازی تکراری PSP
`ShetabGatewayAdapter` دوم با HMAC مجزا در `gateway-port.ts` (۵۷۷ خط) که فقط توسط factory بی‌مصرف `getPaymentGateway` و تستش استفاده می‌شد؛ پیاده‌سازی زنده `ShetabPspAdapter` است.
**فیکس:** حذف کلاس + factory (→۲۸۹ خط)؛ سه فایل تست به آداپتورهای واقعی retarget شدند. حالا فقط **یک** پیاده‌سازی verify امضا وجود دارد.

### P1 — کلید رمزنگاری با fallback عمومی
`crypto-vault.ts` و `DocumentManagementService.ts` (کلید master و signing) در غیاب ENCRYPTION_KEY/AUTH_SECRET به `'dev-insecure-master-key-32-chars-ok'` fallback ساکت می‌کردند.
**فیکس:** در production پرتاب خطا (هم‌گام با gate fail-fast `auth.ts`)؛ fallback فقط برای dev/test.

### P1 — تلفن ساختگی در checkout
`contactPhone = '09120000001'` برای کاربران email-only؛ **فیکس:** حذف — کاربر بدون شماره با پیام صریح مسدود می‌شود.

### حذف کد مرده (~۵۰۰ خط)
- ویزارد KYC غیرقابل‌دسترس در `auth/page.tsx` (مراحل name_info/identity/passport_scan + finishKyc + submitIdentity + ۶ state) — اعمال KYC الان فقط در checkout است.
- قیف یتیم `flights/checkout` (۲۲۹ خط، TAX_RATE=0.09 hardcoded، fallback به mock FLIGHTS[0]) — **صفر مرجع ورودی** در src/tests؛ همراه `PassengerForm.tsx` (فقط همین‌جا مصرف می‌شد) و export آن از barrel حذف شد.
- TanStack Query mounted بدون هیچ consumer: `providers.tsx` پاک شد و `lib/query-client.ts` + تستش حذف شدند. (پکیج `@tanstack/react-query` فعلاً در package.json مانده — در اولین npm install بعدی `npm uninstall` شود.)

### تثبیت قرارداد API (کامل)
`src/lib/api-response.ts` ساخته شد (`apiSuccess`/`apiError`) و سه route بدشکل (admin/search، loyalty/streak، payments/receipt-upload) به‌صورت **additive** مهاجرت یافتند (فیلد `success` اضافه می‌شود؛ هیچ فیلدی حذف نمی‌شود). قرارداد خارجی `payments/webhook` (eCardo IPN) عمداً دست‌نخورده ماند.
**ابزار دائمی:** `scripts/api-shape-scan.mjs` — تأیید نهایی: **صفر انحراف در ۲۵/۲۵ route**.

### هم‌راستاسازی شکل Passenger (موج سوم)
`BookingPassenger.gender` به‌دروغ `'male'|'female'` اعلام شده بود در حالی که canonical (zod `Gender` و مقدار Prisma) `MALE|FEMALE|OTHER` است — و checkout با ternary مقدار OTHER را هم به male تبدیل می‌کرد. الان type با canonical یکی است و مقدار بدون تبدیل عبور می‌کند. `KycProfile.step` به مراحل زنده باریک شد و اینترفیس مردهٔ `WalletTransaction` (صفر مصرف‌کننده) حذف شد.

### واکنش‌پذیری سراسری به تغییر کشور (موج ۷)
الزام محصول: با هر تغییر کشور، همه‌چیز نسبت به همان کشور تغییر کند. آنچه هم‌اکنون واکنش‌پذیر شد:
- **ماتریس قابلیت پرداخت بر اساس کشور** (`countryPaymentCapabilities` در countries.ts + تست unit): درگاه شاپرک/شتاب و کارت‌به‌کارت فقط برای ایران؛ instrument پیش‌فرض eCardo — ایران: کارت شتاب، چین: WeChat/Alipay، سایر: کارت بین‌المللی؛ ابزار کارت شتاب خارج از ایران مخفی می‌شود و انتخاب نامعتبر خودکار به پیش‌فرض کشور برمی‌گردد.
- **نرخ‌های FX در selector** از `CURRENCY_TO_TOMAN` (منبع مشترک) خوانده می‌شوند، نه عدد هاردکد.
- **ارز کیف پول بر اساس کشور، نه زبان** — checkout و selector: ایران→IRR، چین→CNY، سایر→USD (با fallback USDT).
- **حذف لیبل‌های دروغگو:** HotelCard و BentoFlightCard مقدار را به ارز کشور تبدیل می‌کردند ولی لیبل «تومان» هاردکد کنارش می‌نشست (حذف شد — formatAmount لیبل درست دارد).
- **قیمت Addonها (eSIM/بیمه) با ارز کشور** نمایش داده می‌شود نه IRR هاردکد.
- **اسلایدر قیمت فیلتر پرواز:** کران‌ها حالا با ارز کشور نمایش داده می‌شوند (دامنه فیلتر در Toman می‌ماند).

**نقشهٔ راه باقی‌ماندهٔ country-reactivity** (اولویت‌بندی‌شده): پنل رزرو هتل/اتاق‌ها هنوز Toman خام (`BookingPanel.tsx`, `HotelRooms.tsx`)؛ تبادل ارز کیف پول محدود به IRR/USDT/AED؛ مبالغ پرداخت‌شده در my-trips همیشه Toman؛ صفحات فرود/بیمه/قطار/static تومان‌محور؛ تلفن‌های +98 هاردکد (`config/brand.ts` و SupportSection/EmergencySos)؛ مبدأ همهٔ پروازهای seeded تهران (THR) و چیپ‌های شهر محبوب فیلتر کشور ندارند؛ live eCardo offers به `countryId:'iran'` قفل است؛ SSR hydration flash — فقط checkout با useHydration گارد دارد.

### گیت پوشش i18n برای مکانیزم lt() (موج سوم)
مکانیزم inline `lt()` (۲٬۳۸۳ فراخوانی در ~۵۰۰ فایل) تا امروز هیچ gateای نداشت. `scripts/lt-coverage-scan.mjs` + baseline (`docs/baseline/lt-i18n-baseline.json`) + اسکریپت `gate:i18n-lt`: پوشش فعلی ۲۱۵۹/۲۳۸۳ کامل (۹۰.۶٪)؛ **۲۲۴ فراخوانی فاقد ar/zh/ru** (fallback RTL-safe: ar→fa→en طبق I18N-103، پس degrade است نه شکستگی). gate رگرسیون را مسدود می‌کند و پیشرفت ترجمه قابل ردیابی است.

### موارد بررسی‌شده که سالم بودند (بدون تغییر)
- devCode فقط وقتی `!realSent` و در dev/DEMO_MODE لو می‌رود.
- حالت پرداخت admin در checkout با `isAdmin` سمت سرور گیت شده.
- fail-fast AUTH_SECRET در `auth.ts` سر جایش است.
- اسکن RTL (ابزار جدید `scripts/_audit-rtl-scan.mjs`): صفر violation در کد تولیدی.

## ۳. گیت‌ها

| گیت | نتیجه |
|---|---|
| `npm run typecheck` | ✅ ۰ خطا |
| `npm run lint` | ✅ ۰ error / ۰ warning |
| `npm run test:unit` | ✅ 645/645 (۱۰۱ فایل) |
| `npm run test:e2e -- tests/kyc-flow.spec.ts tests/critical-flows.spec.ts` | ✅ 8/8 |
| `npm run gate:a11y` | ✅ صفر violation (۵ صفحه) |
| `npm run gate:i18n` | ✅ پاس |

نکتهٔ اجرا: specs های e2e `.env` را از `process.cwd()` می‌خوانند — حتماً با `npm run test:e2e` اجرا شود، نه npx مستقیم از ریشهٔ workspace.

## ۴. ریسک‌های باقی‌مانده

| اولویت | مورد |
|---|---|
| P2 | دوگانهٔ token (brand/action در برابر primary/muted)؛ adoption کم `ui/*`؛ ~۴۵ modal دستی — نیاز به تصمیم product |
| P2 | بدهی ترجمهٔ lt(): ۲۲۴ رشته فاقد ar/zh/ru (گیت‌شده با `gate:i18n-lt`؛ پیشرفت قابل ردیابی) |
| ساختاری | supplier زنده در مسیر سرویس‌دهی (به مستند `COMPETITIVE_GAP_ANALYSIS.fa.md` ارجاع شود) |

حذف‌شده از ریسک‌ها: drift شکل Passenger (بسته شد) · پکیج مرده tanstack (uninstall شد) · i18n بدون gate (گیت‌شده شد) · قیف flights/checkout (حذف شد؛ crawler-audit با ۲۲۰ لینک و صفر لینک شکسته آن را تأیید کرد)

## ۵. منابع حقیقت (Sources of Truth)

Booking → `BookingApplicationService` + saga-orchestrator · Cart → `UnifiedCartService` (قیمت فقط server-side) · Payment → `PaymentDomainService` + `gateway-port` (یک ShetabPspAdapter / یک EcardoGatewayAdapter) · Wallet → GeneralLedgerService (مدل Wallet وجود ندارد) · KYC → checkout funnel · State کلاینت → ۳ zustand store · پاسخ API → `lib/api-response.ts` (قرارداد `success/error`).
