# پرامپت ترمیم کامل itrip-platform

> این متن را به‌صورت یک پیام کامل به ایجنت کدنویسی (در ریشه پوشه `itrip-platform`) بده.

---

## نقش و زمینه پروژه

تو یک مهندس ارشد نرم‌افزار هستی. پروژه فعلی **iTrip/Firuzo** یک پلتفرم رزرو سفر با این استک است:

- Next.js 16 (App Router) + React 19 + TypeScript (`strict: true`)
- Tailwind CSS v4 + سیستم توکن طراحی Firuzo Luxe
- next-intl با ۵ زبان (fa/en/ar/zh/ru) — فایل‌های `messages/*.json` با ۷۹۷ کلید در ۳۸ namespace
- Prisma + SQLite (dev) — `prisma/schema.prisma`
- NextAuth v5 beta با Credentials + JWT session
- Zustand (۳ store با persist) + Playwright E2E (۱۳ spec در `tests/`)

وضعیت فعلی: `npx tsc --noEmit` صفر خطا دارد، UI/RTL/i18n زیرساختش بالغ است، اما لایه بک‌اند نیمه‌کاره است، چند حفره امنیتی بحرانی دارد، بخشی از داده‌ها به‌جای DB روی localStorage است و ۳ تست با سورس فعلی fail می‌شوند. وظیفه‌ات اجرای کامل و مرتب فازهای ۱ تا ۶ این سند است. هیچ تسکی را حذف نکن؛ اگر تردیدی داشتی طبق «تصمیم پیش‌فرض» ذکرشده عمل کن.

## قوانین کار (الزامی)

1. فاز‌ها را به‌ترتیب ۱→۶ اجرا کن. بعد از **هر فاز**: `npx tsc --noEmit` و `npm run lint` باید پاس شوند، سپس commit کن (پیام conventional مثل `fix(security): ...`).
2. بعد از فازهای ۱، ۲ و ۵ کل `npx playwright test` را اجرا کن و همه specها باید سبز باشند.
3. **انضباط RTL را حفظ کن**: هیچ کلاس جهت‌دار هاردکد (`ml-`, `mr-`, `pl-`, `pr-`, `left-<n>`, `right-<n>`) اضافه نکن. پروژه روی logical properties است — همین حالا صفر مورد دارد، باید صفر بماند.
4. ساختار ۷۹۷ کلیدی `messages/*.json` را خراب نکن؛ فقط کلید اضافه یا مقدار تکمیل کن. هر کلیدی که در یک زبان اضافه می‌کنی، در هر ۵ زبان اضافه کن.
5. **منطق دمو حذف کامل نمی‌شود** — پشت متغیر محیطی `DEMO_MODE=true` گیت (gate) می‌شود تا دموی محلی سالم بماند ولی حالت پیش‌فرض (production) امن باشد.
6. قبل از رفتن به تسک بعدی، «معیار پذیرش» تسک فعلی را عملاً چک کن (تست بنویس یا دستی verify کن).
7. در `HANDOFF.md` یک بخش «Remediation Log» بساز و بعد از هر فاز سه‌خطی بنویس چه شد.

---

## فاز ۱ — امنیت (P0)

### 1.1 احراز هویت واقعی
**مشکل:** `src/auth.ts:35` با `if (user && credentials.password === 'demo')` به *هر* کاربر موجود با پسورد `"demo"` لاگین می‌دهد. `passwordHash` هیچ‌جا چک نمی‌شود. خطوط ۴۴–۷۶ هم کاربر mock با `passwordHash: 'dummy'` می‌سازند.

**کارها:**
- پکیج `bcryptjs` (+ `@types/bcryptjs`) اضافه کن.
- `authorize()` را بازنویسی کن: `findUnique({where:{email}})` → اگر کاربر هست و `DEMO_MODE !== 'true'`، فقط `bcrypt.compare(password, user.passwordHash)` مسیر قبولی است. مسیر demo (پسورد `demo` و auto-create کاربران `user@firuzo.com` / `admin@firuzo.com`) فقط وقتی `process.env.DEMO_MODE === 'true'` فعال باشد.
- `prisma/seed.ts` بساز که `admin@firuzo.com` (نقش `SUPER_ADMIN`) و `user@firuzo.com` (نقش `CUSTOMER`) را با پسورد هش‌شدهٔ خوانده‌شده از `ADMIN_PASSWORD` / `USER_PASSWORD` در env بسازد (upsert). به `package.json` اسکریپت `"prisma:seed"` اضافه کن.
- نام متغیر secret را یکدست کن: NextAuth v5 از `AUTH_SECRET` استفاده می‌کند؛ ارجاع‌های `NEXTAUTH_SECRET` را حذف/همگام کن.

**پذیرش:** با پسورد غلط authorize مقدار null برمی‌گرداند؛ با `DEMO_MODE` غیرفعال هیچ مسیر demo‌ای اجرا نمی‌شود؛ seed بدون خطا اجرا می‌شود.

### 1.2 حذف بک‌دور ادمین
**مشکل:** `src/stores/auth-store.ts` — `OTP_CODE = '12345'`، `isAdmin = phone.endsWith('0000')` و لاگین بی‌صدای `loginWithCredentials('admin@firuzo.com', 'demo')`. همچنین `src/app/[locale]/auth/page.tsx:45` کدهای بایپس `'demo' | '1234' | '0000'` را می‌پذیرد. متن تبلیغ این بک‌دور («شماره 0000») هم در admin layout هست.

**کارها:** هر سه مورد را پشت `DEMO_MODE` (متغیر `NEXT_PUBLIC_DEMO_MODE` برای سمت کلاینت) گیت کن؛ متن تبلیغ بک‌دور در admin layout را حذف کن. مطمئن شو در حالت عادی، شمارهٔ منتهی به `0000` با کد `12345` نقش `SUPER_ADMIN` نمی‌گیرد (توکن JWT واقعی نقشش از دیتابیس می‌آید، نه از کلاینت).

**پذیرش:** در حالت `DEMO_MODE=false` فلوی OTP/بایپس غیرفعال است و Middleware نقش را فقط از توکن می‌خواند.

### 1.3 قیمت‌گذاری سمت سرور (مهم‌ترین تسک کل پروژه)
**مشکل:** `src/actions/booking.ts:10` — `createBookingDraft(data, totalAmount, currency)` مبلغ و ارز را از کلاینت می‌پذیرد؛ `src/app/[locale]/checkout/page.tsx` (خطوط ~۹۲ و ~۱۲۰) مبلغ را سمت کلاینت جمع می‌زند و می‌فرستد. یعنی کاربر لاگین‌شده می‌تواند مبلغ منفی یا دلخواه ثبت کند. نکته: `src/lib/pricing/engine.ts` با تابع `calculatePricing()` از قبل نوشته شده ولی **هیچ‌جا import نمی‌شود** (کد مرده).

**کارها:**
- امضای اکشن را به `createBookingDraft(data)` تغییر بده که فقط شناسه‌ها را بگیرد: `type` + شناسهٔ قلم (مثلاً `itemId`) + تعداد/تاریخ + `addonIds`.
- قیمت نهایی، `netCost`، `markup`، `sellPrice` را **فقط سمت سرور** با pricing engine از دادهٔ مرجع (فعلاً `src/lib/data.ts`؛ در آینده `InventoryItem`) محاسبه کن. کلاینت مبلغ را فقط برای «نمایش برآوردی» حساب می‌کند و سرور عدد نهایی را برمی‌گرداند.
- در `src/lib/validations.ts`: `bookingSchema` را برای شناسه‌ها کامل کن + یک `moneySchema` بساز (`amount: z.number().nonnegative()`, `currency: z.enum(['IRR','USDT','AED'])`) و در اکشن‌ها اعمال کن.
- کل کامپوننت‌های checkout را با امضای جدید همگام کن.

**پذیرش:** grep در `src/` نشان دهد هیچ مقدار پولی (totalAmount/amount) از کامپوننت به server action پاس نمی‌شود؛ تغییر دستی مبلغ در DevTools روی قیمت ثبت‌شده در DB اثری ندارد.

### 1.4 مسیر درگاه پرداخت باید در Ledger ثبت شود
**مشکل:** `src/actions/booking.ts:108-150` — برای `method === 'gateway_shetab'` هیچ `LedgerEntry`ای ثبت نمی‌شود ولی رزرو `CONFIRMED` می‌شود؛ یعنی رزرو تأییدشده بدون ثبت درآمد — نقض مستقیم دفتر دوطرفه‌ای که اسکیما برایش طراحی شده.

**کارها:**
- یک Account با `ownerType: 'GATEWAY_SETTLEMENT'` (به‌ازای هر ارز) تعریف کن.
- فلوی درگاه: رزرو ابتدا `PENDING_PAYMENT` شود؛ بعد از «تسویهٔ شبیه‌سازی‌شده» (در دمو همان‌جا در تراکنش): CREDIT مبلغ در `GATEWAY_SETTLEMENT`، سپس DEBIT از `GATEWAY_SETTLEMENT` و CREDIT در `PLATFORM_ESCROW`، و در پایان transition به `CONFIRMED` + Outbox + AuditLog (همان الگوی مسیر wallet).
- شارژ جعلی اولیهٔ ۱۵۰٬۰۰۰٬۰۰۰ IRR در `booking.ts:88-97` فقط در `DEMO_MODE` انجام شود.

**پذیرش:** بعد از پرداخت با هر دو روش، در هر `groupId` مجموع DEBIT برابر CREDIT است و هیچ رزرو CONFIRMED بدون entry جفت‌شده وجود ندارد.

### 1.5 Secrets و کانفیگ
**مشکل‌ها و کارها:**
- `src/middleware.ts:40` — fallback رشتهٔ `'fallback-secret'` حذف کن؛ اگر `AUTH_SECRET` تعریف نشده باشد middleware باید throw کند (fail-fast).
- `.env` — `NEXTAUTH_SECRET="your-super-secret-...-change-in-production"` placeholder است و `.env.local` یک `AUTH_SECRET` ضعیف با بک‌اسلش‌های انتهای خط که parsing را می‌شکند. هر دو را تمیز کن؛ `.env.example` با کلیدهای خالی و کامنت بساز. در README هشدار rotation بده.
- `prisma/schema.prisma:10` — `url = "file:./dev.db"` هاردکود است در حالی که `.env` یک `DATABASE_URL` پست‌گرسِ مرده دارد. تغییر بده به `url = env("DATABASE_URL")` و در `.env` مقدار `file:./dev.db` بگذار (برای dev). پوشهٔ `prisma/migrations` هم راه بینداز (`migrate dev`) تا از `db push` خارج شویم.
- **تاریخچهٔ گیت:** فایل `prisma/dev.db` در commit `d5be4c3` کامیت شده (بعداً در `559814a` حذف شده ولی از تاریخچه قابل بازیابی است). اگر قرار است ریپو عمومی شود، با `git filter-repo` پاکسازی کن (تخریبی است — قبلش بکاپ/branch بگیر). اگر ریپو خصوصی دمو است، فقط در README ثبت کن و دیتای حساس جدیدی واردش نکن.
- `next.config.ts` — `images.dangerouslyAllowLocalIP: true` و `allowedOrigins` تونل‌های `*.trycloudflare.com` را پشت env توسعه/دمو کن؛ در production پیش‌فرض خاموش باشند.
- همهٔ server actionها (`src/actions/booking.ts`, `src/actions/admin.ts`) پیام `err.message` خام را به کلاینت برمی‌گردانند → پیام عمومیِ امن برگردان و جزئیات را فقط سمت سرور لاگ کن.

---

## فاز ۲ — معماری داده (حذف Split-Brain)

### 2.1 اتصال my-trips / wallet / account به دیتابیس
**مشکل:** فقط ۴ صفحه از ۳۶ به DB وصل است. کیف پول و سفرها کاملاً روی `booking-store.ts` (zustand persist با نام `'firuzo-bookings'`) و seed جعلی `IRR: 150_000_000, USDT: 250, AED: 400` (خط ~۴۵) در localStorage کار می‌کنند. checkout به DB می‌نویسد ولی `/my-trips` هرگز DB نمی‌خواند — رزرو ثبت‌شده هرگز در لیست سفرها ظاهر نمی‌شود.

**کارها:**
- server actionهای `getMyBookings()` و `getWallet()` بساز (موجودی = کاهش/افزایش ledger به تفکیک ارز، همان reduce فعلی ولی در سرور).
- صفحات `my-trips`، `wallet`، `account` را از این اکشن‌ها تغذیه کن (server component یا اکشن + state کلاینت).
- `booking-store` فقط نقش «سبد خرید/کش» بماند؛ **منبع حقیقت وضعیت مالی فقط سرور است**. تراکنش‌های نمایشی seed شده در store حذف شود.
- `revalidatePath('/my-trips')` در `booking.ts` از این به بعد معنا پیدا می‌کند — عملکردش را verify کن.

**پذیرش:** بعد از checkout و پرداخت موفق، رزرو جدید در `/my-trips` دیده می‌شود و موجودی کیف پول در `/wallet` کاهش یافته است — بدون دستکاری localStorage.

### 2.2 اصلاح `my-trips/[id]`
**مشکل:** `src/app/[locale]/my-trips/[id]/page.tsx` (خطوط ~۸۶–۹۴) پارامتر `id` را اصلاً نمی‌خواند و برای هر URL همان دموی هاردکد «تور ترکیبی استانبول-آنتالیا» با `PNR TRP-98421` را نشان می‌دهد. سایدبار حساب کاربری هم در خطوط ~۳۶–۷۸ با صفحهٔ account تکراری است.

**کارها:** داده را بر اساس `id` + بررسی مالکیت (`customerId === session.user.id`) از DB بخوان؛ برای id نامعتبر `notFound()` صدا بزن؛ سایدبار تکراری را به کامپوننت مشترک (مثلاً `components/account/AccountSidebar.tsx`) منتقل کن.

### 2.3 داشبورد ادمین واقعی
**مشکل:** `src/app/[locale]/admin/page.tsx` کلاینت است و از `admin-mock.ts` + localStorage می‌خواند، در حالی که زیرصفحه‌های bookings/finance/ops از DB واقعی می‌خوانند.

**کارها:** صفحهٔ اصلی ادمین را به server component تبدیل کن و آمار واقعی از DB بده: شمارش رزروها به تفکیک status، جمع ledger به تفکیک ارز، تعداد `OutboxEvent`های PENDING، آخرین AuditLogها. محتوای `admin-mock.ts` یا حذف شود یا فقط دمو.

### 2.4 کدهای مرده: تصمیم و اجرا
موارد زیر با grep تأیید شده صفر مصرف دارند. **تصمیم پیش‌فرض:** pricing سیم‌کشی می‌شود (تسک 1.3)، بقیه حذف.

| مورد | مسیر | اقدام |
|---|---|---|
| HotelService | `src/lib/services/HotelService.ts` | حذف |
| Pricing engine | `src/lib/pricing/{engine,mock,types}.ts` | `engine.ts` در تسک 1.3 وصل شود؛ بقیه در DEMO_MODE برای تست |
| Suppliers | `src/lib/suppliers/{mock,types}.ts` | حذف |
| اسکیماهای بی‌مصرف | `validations.ts`: `walletTopupSchema` (~L89)، `searchSchema` (~L102) | حذف (یا اگر در 2.1 wallet اکشن نوشتی، استفاده کن) |
| مدل‌های بی‌مصرف Prisma | `Supplier`, `InventoryItem`, `Role`, `UserRole` | اگر برنامۀ اتصال نداری از schema حذف کن تا schema با واقعیت یکی باشد. RBAC فعلاً همان `User.role` است — همین را مستند کن |
| react-query | `src/providers.tsx` مونت شده ولی صفر `useQuery` در کل اپ وجود دارد | dependency را حذف کن (`@tanstack/react-query`) و Provider را بردار — سبک‌تر و صادقانه‌تر |

**پذیرش:** `grep -r "HotelService\|lib/suppliers\|useQuery" src/` خالی است؛ `npm run build` بدون هشدار ماژول بی‌استفاده انجام می‌شود.

---

## فاز ۳ — i18n یکپارچه (بستن مسیر دور زدن ترجمه‌ها)

### 3.1 مهاجرت `lt()` به messages
**مشکل:** `src/lib/lt.ts` یک دیکشنری inline است که در **۶۹ فایل با ~۵۶۰ فراخوانی** استفاده می‌شود (سنگین‌ترین‌ها: snapp ۲۹، payment-status ۲۴، my-trips/[id] ۱۹، account ۱۸، hotels ۱۸) — docstring خودش هم می‌گوید رشته‌های مشترک باید در `messages/*.json` باشند. نتیجه: محتوای این صفحات اصلاً از سیستم ترجمه عبور نمی‌کند.

**کارها:**
- به‌صورت مکانیکی و پوشه‌به‌پوشه (پروژهٔ pilot: `snapp` سپس `payment-status`) همهٔ `lt()`ها را به کلیدهای namespace جدید در هر ۵ فایل `messages/*.json` منتقل کن.
- در `scripts/` یک اسکریپت گزارشگر بساز که لیست کند کدام فایل‌ها هنوز `lt(` دارند؛ فاز با رسیدن به صفر بسته می‌شود و `src/lib/lt.ts` حذف می‌شود.

### 3.2 کلیدهای گمشده و خطاهای runtime
- کلیدهای `HotelDetail` → `roomQuantity` و `favorite` (در زبان‌های fa و zh) وجود ندارند — عامل **~۲۲۰ خطای MISSING_MESSAGE** در `dev-server.log`. به هر ۵ زبان اضافه کن.
- خطای ICU `"{nights} 晚"` در zh بدون پاس شدن متغیر `nights` (~۲۰ FORMATTING_ERROR) → فراخوانی `t()` را درست کن.
- `src/app/[locale]/error.tsx:9,12` کلیدهای `Common.aria.error` و `Common.aria.retry` را می‌خواند که **در هیچ فایلی وجود ندارند** → صفحهٔ خطا در production مسیر خام کلید نشان می‌دهد. اضافه کن به ۵ زبان.

### 3.3 ترجمه‌های ناقص و دادهٔ تک‌زبانه
- در `zh.json` حدود ۱۸۶ و در `ru.json` حدود ۱۸۷ مقدار از ۷۹۷ عین انگلیسی است (عمدتاً `HotelDetail.*`, `Flights.*`, `CityPass.*`, `RoutePlanner.*`, `Common.aria.*`) → ترجمه کن (چینی و روسیِ باکیفیت).
- داده‌های fa/en فقط: `src/lib/countries.ts` (`title`/`titleEn`)، `src/lib/interpreters.ts`، `src/lib/data.ts`، `src/lib/hotel-mock.ts` → ساختار چندزبانه `{fa,en,ar,zh,ru}` با fallback به en. کاربر عربی/چینی/روسی نباید فارسی ببیند.
- `src/components/hotels/search/HotelCard.tsx:13-36` — `AM_MAP`/`DISTANCE_MAP` روی **رشتهٔ نمایشی فارسی** کلید خورده‌اند؛ اگر متن دیتا عوض شود بقیهٔ زبان‌ها بی‌صدا فارسی می‌شوند → کلیدها را به id تبدیل کن.
- `booking-store.ts` توصیف تراکنش‌ها فارسی هاردکد است (خطوط ~۶۹، ۹۸، ۱۳۸، ۱۶۴، ۱۸۳، ۲۱۰) → کلید پیام.
- `travelogues/[id]/page.tsx:24-58` یک `MOCK_TRAVELOGUES` محلی و تکراری دارد و منطق `locale === 'fa' ? fa : en` → از منبع واحد استفاده کن و همهٔ زبان‌ها را پوشش بده.
- `HotelInfo.tsx` ترکیب `t()` و متن فارسی هاردکد است (~L59-60, 124-131, 243, 254-260) → همه به `t()`.
- فیلترهای `HotelInfo` روی رشتهٔ نمایشی `'همه'` state دارند (~L158) → به id تغییر کن.

**پذیرش:** سرور dev را بالا بیاور، صفحات کلیدی را در ۵ زبان باز کن — کنسول **صفر** MISSING_MESSAGE/FORMATTING_ERROR دارد.

---

## فاز ۴ — SEO و رندر

### 4.1 متادیتا و صفحات داینامیک
**مشکل:** ۳۳ صفحه از ۳۶ `'use client'` هستند → فقط صفحهٔ home متادیتا دارد؛ هیچ `generateStaticParams` در کل اپ وجود ندارد؛ «not found»های داینامیک با status 200 رندر می‌شوند.

**کارها:**
- برای صفحات عمومی استاتیک (tours، visa، insurance، esim، destinations، guide، services، support، travelogues، city-pass، trains، transfers، interpreter، snapp): یا به server component تبدیل کن یا حداقل در هر پوشه یک `layout.tsx` با `generateMetadata` اختصاصی بساز (title/description از همان namespace صفحه).
- `hotels/[id]/page.tsx`: به‌جای div اینلاینِ not-found (~L53-60) از `notFound()` استفاده کن (status 404 واقعی)؛ `generateStaticParams` برای ۷ هتل موجود؛ `generateMetadata` با نام هتل. خط ~۶۷ `t('nights') || 'شب'` → کلید درست با fallback درست.
- `my-trips/[id]` و `travelogues/[id]` هم `generateMetadata` بگیرند.
- `src/app/sitemap.ts`: از ۵ مسیر هاردکد به همهٔ مسیرهای عمومی (~۳۶) + مسیرهای داینامیک هتل/سیاحتنامه × ۵ زبان برس؛ دامنه از `NEXT_PUBLIC_SITE_URL` بخوان.
- `src/app/robots.ts`: `Disallow: /admin`, `/checkout`, `/account`, `/wallet`, `/payment-status`, `/api`.
- `og-image.jpg` که metadata خانه به آن ارجاع می‌دهد در `public/` وجود ندارد → بساز یا ارجاع را حذف کن.
- Google Analytics با placeholder `G-XXXXXXXXXX` در `layout.tsx:134-141` → id از env یا حذف کامل اسکریپت.
- متادیتای home (~`page.tsx:13-31`) فارسی هاردکد برای همهٔ زبان‌هاست → از `getTranslations` استفاده کن (`t` فعلاً fetch شده ولی استفاده نمی‌شود).

**پذیرش:** view-source صفحات کلیدی title/description اختصاصی دارند؛ `curl -I /fa/hotels/unknown-id` → 404؛ sitemap شامل مسیرهای اصلی است.

---

## فاز ۵ — تست‌ها و CI

### 5.1 سه spec ناسازگار با سورس
1. `tests/critical-flows.spec.ts` — از `#auth-submit-btn`، `#auth-verify-btn`، `#password` استفاده می‌کند که **هیچ‌کدام در سورس وجود ندارند** (input واقعی OTP، `id="otp"` در `auth/page.tsx:138` است). سلکتورها را با سورس همگام کن.
2. `tests/golden-journeys.spec.ts` (Journey 3) — `dest=tr` نامعتبر است؛ union دروقت `lib/countries.ts` فقط `iran|turkey|uae|georgia|oman|china|russia` است → `dest=turkey`.
3. `tests/planner.spec.ts` — regex دکمهٔ «ثبت کل پکیج / Book All» هیچ match ای در `PlannerResult`/`PlannerSidebar`/`PlannerTimeline` ندارد → یا CTA واقعی به PlannerResult اضافه کن یا assertion را به دکمه‌های موجود تغییر بده. همچنین `isVisible().catch(()=>false)`های این spec گام‌ها را بی‌صدا رد می‌کنند → حذفشان کن.

**نکتهٔ مهم:** چون فاز ۱ فلوی auth را تغییر می‌دهد، تست‌های مرتبط با auth را طوری به‌روز کن که در `DEMO_MODE=true` اجرا شوند (test env دمو فعال باشد) و مسیر واقعی (wrong password → fail) را هم پوشش بدهند.

### 5.2 تست‌های بی‌assertion و الگوهای flaky
- `image-scan.spec.ts`، `screenshot-generator.spec.ts`، `search-widget-visual.spec.ts` **صفر assertion** دارند (هرگز fail نمی‌شوند) → یا expect واقعی اضافه کن یا با تگ (مثلاً `@manual` و فیلتر `grepIgnoreTags` در config) از CI خارج کن.
- همهٔ `waitForTimeout`ها (۵ spec) را با expectationهای واقعی (`toBeVisible`, `toHaveURL`) جایگزین کن.
- پروژهٔ `mobile-chromium` در `playwright.config.ts` عملاً بی‌اثر است چون specها `setViewportSize({width:1440,...})` هاردکد دارند → یا این setViewportSizeها را حذف کن یا specهای موبایل را جدا کن.

### 5.3 ابزار و CI
- `package.json`: اسکریپت `"typecheck": "tsc --noEmit"` اضافه کن (CI الان inline دارد) + `test:unit`.
- **vitest** راه بینداز و برای این‌ها تست واحد بنویس: `lib/jalali.ts`، `lib/money.ts`، `lib/format.ts`، `domains/booking/BookingDomainService.ts`، `domains/currency/CurrencyService.ts`، و parser پارامترهای `/plan` (dest/who/days/bud/pace).
- CI (`.github/workflows/ci.yml`) ساختار درستی دارد (lint → tsc → build → e2e)؛ فقط به‌جای اجرای e2e روی dev server، در CI به `next build && next start` سوییچ کن (`webServer.command` در playwright.config) و قدم setup دیتابیس (prisma migrate + seed با DEMO_MODE) را قبل از e2e اضافه کن.
- قرارداد `data-testid` برای کامپوننت‌های کلیدی (فرم‌ها، دکمه‌های CTA) تعریف کن و specها را تدریجاً به آن منتقل کن — الان تست‌ها به متن فارسی چسبیده‌اند و با هر ویرایش copy می‌شکنند.

**پذیرش:** `npx playwright test` روی سیستم محلی سبز است؛ `npm run test:unit` پاس است؛ CI سبز است.

---

## فاز ۶ — پاکسازی و جزئیات

1. `globals.css:165-166` — `var(--paper)`/`var(--ink)` تعریف نشده‌اند (تعریفشده‌ها `--color-paper`/`--color-ink` هستند) → اصلاح یا حذف.
2. `HeroSection.tsx:42-48` — `onError` با دستکاری مستقیم DOM (`document.getElementById('hero-gradient')...`) → با state حل کن.
3. `AppChrome.tsx:11` — `pathname.includes('/admin')` → تطبیق دقیق مسیر یا route group.
4. مدال SOS در `interpreter/page.tsx:301-345` و sheetهای فیلتر: `role="dialog"`، `aria-modal`، بستن با Escape، focus trap ساده — `Dialog.tsx` موجود است؛ از همان استفاده کن.
5. `layout.tsx` سه فونت روی یک متغیر `--font-sans` → فقط فونت فعال per-locale بماند.
6. `body pb-[62px]` magic number → متغیر CSS یا اندازه‌گیری توسط `BottomNav`.
7. هر سه zustand store: `partialize` (فقط دادهٔ ضروری)، `version` + `migrate` اضافه کن؛ **دادهٔ KYC نباید در localStorage باشد**.
8. `tsconfig.json` — `target: "ES2017"` → `"ES2022"`.
9. `middleware.ts` — `ROUTE_PERMISSIONS` مسیرهای ناموجود `/admin/roles` و `/admin/settings` دارد → حذف (یا صفحاتشان بساز).
10. **مستندات را با واقعیت همگام کن:** README ادعای «26/26 Passed» و HANDOFF «25/25» دارد در حالی که ۱۳ spec وجود دارد (۳ تا هم fail)؛ پالت README (`#00a9a5`) با HANDOFF (`#0e6f6a`) فرق دارد → یکی را انتخاب و هر دو را اصلاح کن. بج‌ها و آمار تست را به عدد واقعیِ post-remediation تغییر بده.
11. `ARCHITECTURE_DEBT.md` در `itrip-handoff/` را بروز کن — بدهی «منطق مالی کلاینت‌ساید» با فازهای ۱ و ۲ بسته شده؛ علامت بزن.

---

## چک‌لیست نهایی تحویل

- [ ] `npx tsc --noEmit` صفر خطا، `npm run lint` پاس، `npx playwright test` سبز، `npm run test:unit` پاس
- [ ] grep: هیچ پسورد `'demo'` بدون گیت DEMO_MODE در مسیر auth وجود ندارد
- [ ] grep: هیچ مبلغ پولی از کلاینت به server action پاس نمی‌شود
- [ ] grep: `lt(` در `src/` صفر است و `src/lib/lt.ts` حذف شده
- [ ] باز کردن صفحات کلیدی در ۵ زبان → صفر MISSING_MESSAGE / FORMATTING_ERROR در کنسول
- [ ] `/my-trips` و `/wallet` از DB می‌خوانند؛ checkout → my-trips بدون refresh
- [ ] پرداخت با هر دو روش، ورودی‌های جفت‌شده در ledger دارد
- [ ] sitemap کامل، robots درست، og-image موجود، 404 واقعی برای id نامعتبر
- [ ] README و HANDOFF با وضعیت واقعی هم‌خوان‌اند و Remediation Log کامل است
