# پرامپت اصلاح نسخه ۲ — بستن شکاف‌های ERP

> برای اجرا به هر ایجنت کدنویس قابل ارسال است. پروژه: Next.js 16 + React 19 + TS + Prisma در همین ریپو.
> پیش‌زمینه: `docs/ERP_MASTER_PLAN.md` پلن مرجع است. این پرامپت شکاف‌های تأییدشدهٔ بازبینی ۲۰۲۶-۰۹-۰۲ را می‌بندد.

## قوانین کار (الزامی)

1. فاز به فاز اجرا کن؛ بعد از هر فاز: `npm run typecheck` + `npm run lint` + `npm run test:unit` + `git commit`.
2. هیچ منطق مالی جدیدی در Server Action ننویس — همه چیز به `src/domains/*` برود.
3. Ledger کاملاً append-only؛ اصلاح فقط با قید معکوس.
4. تغییر وضعیت Booking فقط از `src/domains/booking/state-machine.ts` — و این invariant را با یک تست grep در CI قفل کن.
5. منطق دمو را حذف نکن؛ پشت `DEMO_MODE` گیت کن. RTL و ساختار ۷۹۷ کلیدی ترجمه‌ها را خراب نکن.
6. پس از هر تغییر رفتاری، ادعای متناظر در `HANDOFF.md` را دقیق و قابل‌تست بنویس — ادعای نادرست ممنوع.

---

## فاز ۱ — صحت پول (P0، حیاتی‌ترین)

**۱-۱. ایده‌مپوتنسی واقعی پرداخت.**
- `src/actions/booking.ts:145` کلید `` `pay_${bookingId}_${Date.now()}` `` می‌سازد → دابل‌کلیک = دو پرداخت کامل. کلید را کلاینت یکبار تولید کند (UUID در state فرم checkout، در `useRef`/store با گارد) و action آن را بپذیرد و validate کند (فرمت UUID).
- `LedgerEntry.groupId` در `prisma/schema.prisma:75` فقط `@@index` است → `@unique` شود (یا گروه‌بندی به جدول `PostingGroup(id @id)` + FK). در `PaymentDomainService` و `GeneralLedgerService` روی کلید تکراری، پیاده‌سازی موجود `processPayment` (که درست است) به کل مسیر تعمیم داده شود.

**۱-۲. چک مانده کیف پول.** در مسیر `wallet_irr` قبل از DEBIT، مانده از Ledger تجمیع و گارد شود؛ تست واحد: پرداخت بیش از مانده → رد با خطای عمومی.

**۱-۳. یکسان‌سازی refund ادمین.** `src/actions/admin.ts:110-160` قیدها را inline با کلید `Date.now()` انجام می‌دهد و `admin.ts:112` مستقیماً `status: 'CANCELLED'` می‌نویسد (انتقال نامعتبر `CONFIRMED→CANCELLED`). حذف کامل مسیر inline؛ refund فقط از `GeneralLedgerService.refund` + ماشین وضعیت (`CONFIRMED→CANCEL_REQUESTED→CANCELLING→CANCELLED→REFUND_INITIATED→REFUNDED`).

**۱-۴. Invariant توازن.** تست واحد: برای هر `groupId` جمع DEBIT = جمع CREDIT؛ تست شبانه/CI نمونه‌گیری از همه گروه‌ها. در صورت امکان constraint سطح DB.

**پذیرش فاز ۱:** دابل‌کلیک پرداخت فقط یک پرداخت؛ refund ادمین از قالب استاندارد؛ grep بدون هیچ `Date.now()` در کلید مالی؛ تست توازن سبز.

## فاز ۲ — Inventory قابل استفاده (P0)

**۲-۱. Hold اتمیک.** `src/domains/inventory/InventoryEngine.ts:23-100` الگوی read-then-write دارد و `Allotment(total:10)` خودکار می‌سازد. بازنویسی: `UPDATE Allotment SET ... WHERE total - booked - activeHolds >= qty` (یا version/optimistic lock) — روی SQLite با تراکنش سریالی ساده، برای Postgres آماده. auto-create حذف؛ allotment ناموجود = `ON_REQUEST` یا رد.
**۲-۲. جلوگیری از oversell در capture:** `captureHold` (:125-135) `booked` را بدون چک ظرفیت زیاد می‌کند — گارد اضافه شود.
**۲-۳. اتصال به جریان واقعی:** `createBookingDraft` برای اقلام allotment‌دار hold بسازد، `holdToken` در Booking ثبت شود، و پرداخت موفق → `captureHold`؛ انقضا → `EXPIRED`.
**۲-۴. Runner پس‌زمینه:** `instrumentation.ts` (یا اسکریپت worker با اسکریپت npm) که هر ۶۰ ثانیه `sweepExpiredHolds` و consumer جدول `OutboxEvent` را اجرا کند — «پرنده‌های بدون ساعت» ممنوع.

**پذیرش فاز ۲:** تست هم‌زمانی (۲۰ hold موازی روی ظرفیت ۱۰ → دقیقاً ۱۰ موفق)؛ جریان hold→pay→confirm در یک تست E2E؛ sweeper با تست زمان مصنوعی سبز.

## فاز ۳ — بدهی ساختاری (P1)

**۳-۱. Postgres:** migration از SQLite با `prisma migrate` از همین‌جا؛ `DATABASE_URL` از env؛ مستند در HANDOFF.
**۳-۲. RBAC سیم‌کشی شود:** seed ردیف‌های `Role`/`UserRole`؛ `requirePermission` جایگزین چک رشته‌ای نقش در همه اکشن‌ها (الان صفر مصرف‌کننده دارد).
**۳-۳. CI:** `test:unit` به `.github/workflows/ci.yml` اضافه شود + تست grepِ invariant ماشین وضعیت + تست هم‌زمانی فاز ۲.
**۳-۴. کامل‌سازی قالب‌های Ledger:** کارمزد درگاه، TAX_PAYABLE، FX (با `fxRate/baseAmount` موجود در اسکیما) — و حذف fallbackهای `netCost = total*0.9` و `supplierId='sup_default'` از `saga-orchestrator.ts:62-63` (بجایش netCost واقعی از SupplierContract یا خطای صریح).
**۳-۵. createBookingDraft به Domain Service:** منطق قیمت/کاربر/ایجاد booking از `src/actions/booking.ts:14-48` به `domains/booking` منتقل شود؛ resolve قیمت از mockها فقط با flag demo.

## فاز ۴ — کیفیت و صداقت (P2)

**۴-۱. HANDOFF.md:** ادعاهای نادرست بخش ۸ («atomic decrement»، «sweeper در پس‌زمینه»، «Saga Orchestration») اصلاح شود؛ نسخه واقعی: «Saga = تراکنش واحد ACID»، و بعد از فازهای بالا به‌روزرسانی دقیق.
**۴-۲. checkout:** خطای واقعی `payBooking` به کاربر نمایش داده شود (`catch` فعلی در `checkout/page.tsx:140-157` خطا را قورت می‌دهد و فاز موفق را نشان می‌دهد).
**۴-۳. Pricing:** `PricingRule` + گرد کردن پول با policy (IRR به ۱۰۰۰، USD/AED دو رقم، تابع مرکزی + تست).
**۴-۴. KYC از localStorage به DB؛ ادامه migration `lt.ts` (۱۰ فایل سنگین اول).**

---

## چک‌لیست تحویل نهایی

- [ ] کلید ایده‌مپوتنسی از کلاینت؛ `LedgerEntry.groupId` unique؛ grep بدون `Date.now()` در کلید مالی
- [ ] چک مانده wallet + تست
- [ ] refund ادمین از service + ماشین وضعیت (بدون inline)
- [ ] hold اتمیک + تست هم‌زمانی + اتصال به جریان booking + sweeper با runner واقعی
- [ ] consumer برای OutboxEvent
- [ ] CI: lint + tsc + vitest + e2e + تست grep وضعیت
- [ ] Postgres migration انجام و مستند
- [ ] HANDOFF بدون ادعای نادرست
- [ ] `npm run typecheck && npm run lint && npm run test:unit && npx playwright test` همگی سبز
