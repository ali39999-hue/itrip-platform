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

### تثبیت قرارداد API
`src/lib/api-response.ts` ساخته شد (`apiSuccess`/`apiError`) و سه route بدشکل (admin/search، loyalty/streak، payments/receipt-upload) به‌صورت **additive** مهاجرت یافتند (فیلد `success` اضافه می‌شود؛ هیچ فیلدی حذف نمی‌شود). قرارداد خارجی `payments/webhook` (eCardo IPN) عمداً دست‌نخورده ماند.

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
| P1 | مهاجرت کامل ۲۵ route به `api-response.ts` (فقط ۳ تا انجام شد؛ webhook دست‌نخورده) |
| P2 | دوگانهٔ token (brand/action در برابر primary/muted)؛ adoption کم `ui/*`؛ ~۴۵ modal دستی |
| P2 | drift شکل Passenger (form vs BookingPassenger vs MALE/FEMALE) |
| P2 | دو مکانیزم i18n (`lt()` در ~۱۷۰ فایل در برابر next-intl؛ gate:i18n فقط JSON را می‌پوشاند) |
| P2 | حذف پکیج `@tanstack/react-query` از package.json در next install |
| ساختاری | supplier زنده در مسیر سرویس‌دهی (به مستند `COMPETITIVE_GAP_ANALYSIS.fa.md` ارجاع شود) |

## ۵. منابع حقیقت (Sources of Truth)

Booking → `BookingApplicationService` + saga-orchestrator · Cart → `UnifiedCartService` (قیمت فقط server-side) · Payment → `PaymentDomainService` + `gateway-port` (یک ShetabPspAdapter / یک EcardoGatewayAdapter) · Wallet → GeneralLedgerService (مدل Wallet وجود ندارد) · KYC → checkout funnel · State کلاینت → ۳ zustand store · پاسخ API → `lib/api-response.ts` (قرارداد `success/error`).
