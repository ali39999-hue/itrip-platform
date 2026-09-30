# BUSINESS RECONCILIATION — قرارداد اجرایی تور فناوری ↔ هسته فیروزو

> نویسنده: سشن کمک‌به‌پیشبرد (تحت مدیریت سشن لیدر) · Sep 30 2026
> ملاک: «فیروزو بیزنس — سند تحویل فنی تور فناوری» (Downloads) به‌عنوان قرارداد اجرایی؛ `5.txt` به‌عنوان سند معماری درازمدت.
> مالک کد: سشن backend (`prisma/`, `src/domains/business/`, `src/app/api/v1/business/`). این سند فقط مرجع است — کد را نباید مستقیم اجرا کرد.

---

## ۱. تصمیم رهبری معماری (تأییدشده)

**قرارداد اجرایی ملاک است.** مدل داده دقیقاً از جدول ۱۱ موجودیتی سند تور فناوری گرفته می‌شود (نه مدل generic Experience از `5.txt`). الگوهای «Experience/Program/Provider» سند `5.txt` به‌عنوان لایهٔ عمودیِ فازهای بعد نگه داشته می‌شوند، نه جایگزین این مدل.

- «مسیر ج» (دامنه داخل هسته + مرز انتزاعی) تأیید شد.
- `FiruzoCoreClient` = معادل «Child → API/SDK → Core» در سند معماری؛ مرز اجباری. (پیاده‌سازی فعلی: `src/domains/business/core/FiruzoCoreClient.ts` + `InProcessFiruzoCoreClient.ts` — تأیید سشن backend در کامنت header اسکیمای فعلی)
- پیشوند API: `/api/v1/business` (قرارداد سند — نه `/api/business`).
- زیرمجموعهٔ همان سایت: همان دامنه، همان هدر/فوتر، مسیر `/business` — سند اجرایی «UI مستقل» سند معماری را در فاز ۱ ملایم می‌کند؛ Design System فیروزو با توکن‌های اختصاصی `--fz-*` (بخش توکن‌های طراحی سند).

---

## ۲. جدول ۱۱ موجودیت — فیلدهای دقیق سند + اتصال به هسته

پول: **Int ریال** (تصمیم schema فعلی — سند صریح است: «همه مبالغ به ریال و عدد صحیح»؛ تبدیل به تومان فقط در نمایش). تاریخ: `timestamptz` میلادی؛ نمایش شمسی فقط در UI.

| # | موجودیت | فیلدهای اصلی (سند) | رابطه | اتصال به هسته | مالکیت |
|---|---|---|---|---|---|
| ۱ | `company` | `id, name, national_id(11 رقم, unique), economic_code?, field, rep_name, rep_phone, verified_at?` | ۱ شرکت ← N درخواست | اختیاری: `organizationId` (String، بدون FK) — وقتی شرکت، عضو Organization هسته است | Child |
| ۲ | `tour_package` | `id, slug, title, destination, duration_days, base_price, includes[], required_docs[], status` | ۱ پکیج ← N departure | — | Child |
| ۳ | `departure` | `id, package_id, depart_date, return_date, capacity, booked_count` | ظرفیت از همین‌جا | **فاز ۱ دستی** — بدون InventoryEngine؛ در فاز ۲ می‌تواند به InventoryItem/Allotment provision شود (نگهداری decision در فاز ۲، نه الان) | Child |
| ۴ | `addon` | `id, package_id?, code, title, price, unit (per_person\|per_group)` | چندبه‌چند با درخواست (از طریق `BusinessRequestAddon`) | — | Child |
| ۵ | `request` | `id, code (FZB-<سال>-<ترتیبی>, unique), company_id, departure_id, pax_count, status, total_amount, deposit_amount, grant_amount, paid_amount, expires_at, assignee_id?` | ریشهٔ کل فرایند | `assignee_id` → core User.id (بدون FK)؛ ساخت کاربر/شرکت از Identity هسته | Child (وضعیت) + Core (پول) |
| ۶ | `traveler` | `id, request_id, full_name_latin, passport_no, passport_expiry, birth_date?` | N مسافر ← ۱ درخواست | اختیاری: `coreUserId` اگر مسافر حساب فیروزو دارد | Child |
| ۷ | `document` | `id, request_id, traveler_id?, type, file_url, state (pending\|approved\|rejected), reject_reason?` | چند مدرک ← ۱ درخواست | فایل در File/Media infrastructure مشترک؛ آدرس عمومی ممنوع — لینک امضاشدهٔ کوتاه‌مدت | Child |
| ۸ | `payment` | `id, request_id, kind (deposit\|settlement), method, amount, status, gateway_ref?, receipt_url?, paid_at?` | دو ردیف در حالت عادی | **دو گزینه:** (الف) درگاه شتاب هسته (webhook HMAC، Idempotency-Key) یا (ب) درگاه مستقل؛ توصیه: (الف) — از PaymentOrchestration هسته با `referenceType: 'BUSINESS_REQUEST'` استفاده شود؛ کال‌بک تنها منبع حقیقت | Core اجرا، Child رکورد |
| ۹ | `invoice` | `id, request_id, type (proforma\|official), lines[], issued_at, pdf_url` | برای واحد مالی | فاکتور رسمی tamper-evident از زیرساخت invoice هسته (کامیت v1.8.7)؛ شماره‌گذاری داخلی child | مشترک |
| ۱۰ | `voucher` | `id, request_id, code, traveler_id?, qr_payload, pdf_url, issued_at, revoked_at?` | ووچر گروهی + هر مسافر | صادرش فقط وقتی `paid_amount == total_amount - grant_amount`؛ verify عمومی از `/api/v1/business/vouchers/verify/:code` | Child |
| ۱۱ | `status_event` | `id, request_id, from_status, to_status, actor_id, note?, created_at` | تاریخچهٔ کامل | **Append-only.** هر تغییر وضعیت = یک ردیف + صف اعلان پیامک/ایمیل از Notify infrastructure هسته | Child (record) + Core (notify) |

### ماشین وضعیت `request` (۶ وضعیت، فقط سرور)

`draft → submitted → deposit_paid → under_review → approved → issued`، با شاخه‌های: `changes_requested` (کارشناس) و `cancelled` (کاربر/کارشناس).

- پرش وضعیت = **HTTP 409 `invalid_transition`**؛ ریدایرکت به صفحهٔ درست.
- این ماشین **مستقل از BookingStateMachine هسته** است (درخواست بیزنس، Booking سفر نیست) — اما اگر روزی request به Booking هسته لینک شود، transitionهای Booking فقط با `FiruzoCoreClient.assertBookingTransition/transitionCoreBooking`.
- ظرفیت: `booked_count` فقط با کال‌بک موفق پیش‌پرداخت +۱؛ نگه‌داشت ظرفیت تا ۴۸ ساعت با `expires_at` (نه با hold هسته — در فاز ۱ دستی).

---

## ۳. دو تلهٔ تأییدشده (ریسک‌های راستی‌آزمایی‌شده در کد)

### تلهٔ ۱ — `OWNER_TYPE_TO_CHART_ACCOUNT` (map بسته)
`src/domains/ledger/GeneralLedgerService.ts` — map بسته؛ هر ownerType جدید (`BUSINESS_*`) **بی‌صدا** در posting خراب می‌شود. اگر posting لجری برای پرداخت‌های بیزنس لازم شد، ownerType باید به این map اضافه شود **قبل از** اولین `postRevenueRealization`. تست: `GeneralLedgerService` باید با error صریح fail کند، نه silently.

### تلهٔ ۲ — `db-schema-guard.ts` (SQL دستی)
~۱۷۸ خط SQL دستی که در cold-start prod جداول را تضمین می‌کند. جداول ۱۱گانهٔ Business یا باید به آن اضافه شوند، یا مایگریشن Vercel را قطعی کنیم — وگرنه در prod cold-start جدول نیست. **کار نیمه‌تمام نماند؛ در PRِ مایگریشن، به‌روزرسانی guard هم بیاید.**

### تلهٔ ۳ (جدید) — ران تست‌ها باید روی `itrip_test`
`scripts/run-unit-tests.mjs` الان (کامیت `0409f34`) فقط loopback را retarget می‌کند؛ اگر `DATABASE_URL` دیتابیسی غیر از `itrip/itrip_dev/itrip_local` روی لوپ‌بک باشد، **suite روی همان دیتابیس اجرا می‌شود.** `.env` لوکال باید همیشه به `itrip` یا `itrip_dev` اشاره کند؛ در غیر این صورت `TEST_DATABASE_URL` دستی ست شود. (شکست فلیکِ `pricing.test.ts` در ران کامل ۱۳۰۴/۱۳۰۵ با ران مستقیم ۱۷/۱۷ پاس شد — علامت تداخل ران موازی، نه باگ.)

---

## ۴. تصمیم `Organization` هسته در برابر `company` بیزنس

**دو مدل برای یک چیز می‌شوند اگر قید نشود.** تصمیم:

- `company` (بیزنس) **نگه داشته می‌شود** — چون `national_id`، `economic_code`، `verified_at` و `rep_*` سند اجرایی فقط آنجا هستند و Organization هسته شکل عمومی‌تری دارد.
- اتصال: `company.organizationId` → `Organization.id` (String، **بدون FK فیزیکی**، index) با همان قاعدهٔ «بدون FK» بقیهٔ مدل‌ها — جداسازی فیزیکی DB بعداً ارزان می‌ماند.
- وقتی کاربرِ عضو Organization درخواست می‌سازد، backend با `FiruzoCoreClient.getTenantContext(userId)` چک می‌کند membership همان company است؛ در غیر این صورت `403`.
- یکتایی: `company.national_id` unique خودش کافی است؛ نباید روی `organizationId` unique باشد (چند شرکت می‌توانند یک Organization اشتراکی داشته باشند؟ خیر — تصمیم: **یک company حداکثر یک Organization**، ولی unique نه، چون Organization می‌تواند بدون company باشد).

---

## ۵. فیلدهای `5.txt` که به فاز بعد منتقل می‌شوند

این‌ها در `5.txt` (معماری درازمدت) هستند و **در فاز ۱ تور فناوری ساخته نمی‌شوند**؛ ولی در طراحی مدل فاز ۱ باید جا برایشان باز باشد (بنابراین از `String[]`/`Json` پر کردن سطوح را به‌جای ستون‌های enum-سفت ترجیح بده):

| قابلیت `5.txt` | فاز پیشنهادی | نحوهٔ افزودن بعدی |
|---|---|---|
| Experts / Guides (مسئول تور، راهنما) | فاز ۲ | مدل `BusinessExpert` با `providerId`/`requestId` |
| Venues / Suppliers (تأمین‌کنندهٔ واقعی) | فاز ۳ Marketplace | `BusinessSupplier` + order splitting |
| Waivers (رضایت‌نامهٔ امضاشده) | فاز ۲ | `waiverJson` روی request یا مدل مستقل |
| Difficulty / Audience (دسته‌بندی عمومی Experience) | فاز ۲ — وقتی verticalهای Wellness/Education اضافه شدند | ستون‌های nullable روی `tour_package` یا taxonomy جدول‌محور |
| Add-ons پیشرفته (زیرپکیج، package-level addon) | فاز ۲ | همان `addon` فعلی با `package_id?` — آماده است |
| Event Bus خارجی (Temporal / DLQ) | فاز ۳+ | فعلاً Outbox داخلی هسته (`src/domains/events`) کافی است؛ `status_event` append-only منبع حقیقت UI است |
| AI Engine / Semantic Search | فاز بعد از Data Model سالم (سند صریح) | — |
| Multi-Tenant / White Label | فاز آخر | — |

**قاعدهٔ کلی:** هر جا سند اجرایی با `5.txt` تعارض دارد، سند اجرایی برندهٔ فاز ۱ است؛ تعارض‌ها اینجا ثبت می‌شوند تا فاز بعد reconcile شوند.

---

## ۶. چک‌لیست گیت‌ها برای PR سشن backend

- [ ] `npm run typecheck` → ۰ خطا
- [ ] `npm run lint` → ۰ خطا/هشدار (`--max-warnings=0`)
- [ ] `npm run test:unit` → ۱۰۰٪ (روی `itrip_test` — تلهٔ ۳)
- [ ] `node scripts/i18n-audit.js` → missing/extra = 0 در هر ۵ لوکیل (`messages/{fa,en,ar,zh,ru}.json`) — namespace پیشنهادی: `Business.*` مطابق طرح i18n
- [ ] `prisma migrate dev` شامل به‌روزرسانی `db-schema-guard.ts` (تلهٔ ۲)
- [ ] کال‌بک درگاه: HMAC روی raw body، fail-closed بدون `SHETAB_SECRET_KEY`، Idempotency-Key (قرارداد AGENTS.md §5 + سند)
- [ ] `request.code` و `voucher.code` با الگوی سند؛ `status_event` برای هر transition (تست داشته باشد)
- [ ] مبالغ صفحه/فاکتور/ووچر از یک منبع — ران تست E2E «Search → Booking → Payment → Confirmation» سند

---

*این سند زنده است؛ هر تغییر تصمیم معماری اینجا append شود، نه در chat.*
