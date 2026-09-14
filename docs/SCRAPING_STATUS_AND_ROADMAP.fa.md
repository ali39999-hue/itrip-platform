# وضعیت و نقشه‌راه وب‌اسکرپینگ فروزو — 2026-09-13

> این سند مرجع واحد برای تمام جریان‌های اسکرپینگ/کروال پلتفرم است: اسکرپ پورتال پارتو، نرخ ارز زنده، probe قیمت رقبا و به‌روزرسانی کاتالوگ‌ها. سند مکمل `docs/PARTO_LIVE_INTEGRATION_PLAN.fa.md` (§7) است.

---

## ۱) اسکرپ پورتال پارتو (تأمین پرواز) — ✅ پیاده‌سازی‌شده + ارتقای 2026-09-13

### پایه‌ی موجود (تأییدشده در کد)
- `src/domains/supplier/adapters/PartoPortalProvider.ts` — جستجوی B2B با توکن `__RequestVerificationToken`، دو موتور استخراج (JSON ساختاریافته‌ی `/SearchResultData/{id}` + پارسر مقاوم HTML با تبدیل تومان→ریال و اعداد فارسی)، تشخیص انقضای سشن با `PartoPortalSessionExpiredError`.
- اتصال به کش Postgres از طریق `FlightRefreshSource` در `src/services/flight-cache-service.ts`؛ ورکر ساعتی مسیرهای پرتردد را warm نگه می‌دارد (`FlightOfferCache`)؛ سوییچ منبع با `FLIGHT_REFRESH_SOURCE=auto|api|portal`.
- لاگین انسانی با `scripts/parto-portal-capture.mjs login` (کپچای ریاضی عمداً دور زده نمی‌شود) + سشن در `.parto-portal-state.json` (gitignored).

### ارتقاهای جدید (این به‌روزرسانی)
| قابلیت | جزئیات |
|---|---|
| **Keep-Alive سشن** | `PartoSessionHeartbeatWorker` هر ۱۰ دقیقه (قابل تنظیم) یک GET سبک به داشبورد می‌زند تا انقضای اسلایدینگ ASP.NET رخ ندهد. فعال در `npm run worker` و مسیر cron `/api/cron/flight-refresh`. |
| **هشدار انقضای سشن** | `PortalSessionMonitor` → رکورد `SUPPLIER_SESSION_EXPIRED` در Exception Center (HIGH، SLA ۱۲۰ دقیقه، dedupe) + پیام Bale به ادمین‌ها فقط در لحظه‌ی آغاز رخداد؛ auto-RESOLVE با اولین موفقیت. |
| **رفت‌وبرگشت (TwoWay)** | `searchRoundTrip()` با `DepartureDateTimeR`؛ پارسر JSON چندسگمنتی → ردیف per-leg با `leg: outbound/return` و مرجع `#out/#ret` (قیمت سفر تکرار می‌شود، جمع ممنوع). |
| **کالیبراسیون زنده** | دستور `probe` در capture script: ذخیره‌ی همزمان HTML + JSON واقعی در `api_hunt/portal_bundles` برای تطبیق پارسرها. |
| **بهداشت رمز** | credential هاردکدِ اگنسی از capture script حذف شد (env-only از `.env`). ⚠️ **تغییر پسورد پنل پارتو هنوز لازم است** چون نسخه‌ی قبلی در تاریخچه‌ی git عمومی است. |

### باقی‌مانده (نیازمند تصمیم/عملیات انسانی)
1. **کالیبراسیون با پاسخ واقعی**: یک بار `node scripts/parto-portal-capture.mjs login` + `probe THR MHD <تاریخ>` از IP ایران و تطبیق فیلدهای واقعی فرم TwoWay و واحد قیمت (`PARTO_PORTAL_PRICE_UNIT`).
2. **اتوماتیک‌سازی صدور بلیت (Auto-Buy از پورتال)**: عمداً پیاده‌سازی نشده. صدور واقعی بلیت روی اکانت اگنسی بدون تأیید صریح اپراتور و «سناریوی نهایی‌شده‌ی قیمت» خلاف سیاست fail-closed پلتفرم است. فاز پیشنهادی: شبیه‌سازی فرم مسافران + landing روی صفحه‌ی پرداخت پورتال، فقط با `PARTO_PORTAL_AUTOBUY_APPROVED=true` + kill-switch (الگوی `AUTO_BUY_KILL_SWITCH`).
3. **IP ایران**: پورتال‌های داخلی از IP دیتاسنتر خارج، کپچا/لیمیت می‌خورند. اجراکننده‌ی ورکر (سرور worker یا VPS داخل ایران) باید IP معتبر ایران داشته باشد. روی Vercel فقط مسیر cron با پروکسی/سرور داخل ایران معنا دارد.
4. **ثبت cron در vercel.json**: مسیر `/api/cron/flight-refresh` ساخته شده ولی در `vercel.json` ثبت نیست (محدودیت پلن Hobby: فقط daily). در پلن Pro افزودن `"crons": [{"path": "/api/cron/flight-refresh", "schedule": "0 * * * *"}]` پیشنهاد می‌شود؛ keep-alive هم پوشش داده می‌شود.

---

## ۲) نرخ ارز زنده — ✅ ارتقا یافت (قبلاً SIMULATED)

قبلاً `CurrencyService` فقط جدول استاتیک (`USD_IRR: 550000`) داشت و `FEATURE_REALITY_MATRIX` آن را «SIMULATED» علامت زده بود.

**الان**: `LiveFxRateProvider` (داخل `src/domains/currency/CurrencyService.ts`) به‌صورت پیش‌فرض wired شده با زنجیره‌ی fail-closed:

```
FX_LIVE_SOURCE=auto  →  [fxapi (اگر تنظیم شده) → tgju → static]
FX_LIVE_SOURCE=tgju|fxapi|erapi  →  فقط همان منبع
FX_LIVE_SOURCE=off  →  فقط جدول استاتیک (رفتار قدیمی)
DEMO_MODE=true      →  همیشه استاتیک
```

- **tgju**: نرخ بازار آزادِ دلار/تتر/درهم/یوآن (rial) از API عمومی TGJU — پارسر tolerant که قیمت پایانی را از آخرین سلول عددی بزرگ هر ردیف می‌خواند.
- **erapi** (open.er-api.com) فقط با انتخاب صریح اپراتور: چون نرخ «رسمی/پگ‌شده» می‌دهد و برای OTA نرخ بازار ملاک است، در auto هرگز روی جفت‌های IRR اعمال نمی‌شود.
- Snapshot صادقانه: `getRateRecord()` منبع واقعی را برمی‌گرداند (`TGJU_MARKET` / `FXAPI_LIVE` / `ERAPI_OFFICIAL` / `STATIC_FALLBACK`).
- هر خطا → جدول استاتیک؛ تبدیل ارز هرگز نمی‌شکند. TTL پیش‌فرض ۱۵ دقیقه (`FX_CACHE_TTL_MS`).

**باقی‌مانده**: انتخاب نهایی منبع مطلوب اپراتوری (توصیه: tgju در auto بماند) و در صورت نیاز کالیبراسیون از سرور داخل ایران (تأیید دسترسی به api.tgju.org).

---

## ۳) Probe قیمت رقبا (تضمین بهترین قیمت) — ✅ اسکلت آماده، پیش‌فرض خاموش

- `src/domains/pricing/competitor-probe.ts` + مدل `CompetitorPriceSnapshot` (migration اعمال شد).
- منبع فعلی: `AlibabaCompetitorSource` با فلو تاییدشده در `api_hunt/APIS.md` (POST `available` → polling تا `isCompleted` → کمترین `priceAdult` قابل‌خرید، ریال).
- بودجه‌ی درخواست سخت: پیش‌فرض فقط ۳ مسیرِ پرتردد در هر سیکل (هر ۳۰ دقیقه در `npm run worker`)، ۱ سیکل = ۱ شروع جستجو + حداکثر ۶ poll + فاصله‌ی نزاکت ۲ ثانیه.
- **پیش‌فرض خاموش**: `COMPETITOR_PROBE_ENABLED=true` برای فعال‌سازی. مصرف انبوه/رزرو خودکار روی API داخلی رقبا خلاف قوانین سرویس است — مسیر بلندمدت، توافق رسمی (`api-support@alibaba.ir`) است؛ تا آن زمان فقط snapshot کم‌ترافیک.
- خواندن برای لایه‌ی قیمت/UI: `getCompetitorMinPrice(routeKey, departureDate)`.

---

## ۴) کاتالوگ‌های مرجع (پرواز/هتل) — ✅ ابزار پایش اضافه شد، رفرش کامل مانده

- `src/data/server/flights-master.json` و `hotels-iran-master.json` اسکرپ‌های نقطه‌ای eghamat24 با تاریخ **2026-07-25** هستند (پرواز: ۲۰۹ مسیر؛ هتل: ۱۴۳۹ هتل که ۲۰۰ مورد detail کامل دارند).
- ابزار جدید: `npm run catalog:staleness` → عمر داده و هشدار STALE بعد از ۳۰ روز (`CATALOG_MAX_AGE_DAYS`)؛ با `--strict` در CI قابل گیت شدن.
- **مانده**: اجرای مجدد استخراج eghamat24 از IP ایران با همان اسکیما (به‌ویژه `total_hotels_detailed` که فقط ۲۰۰ است)، و در صورت نیاز افزودن job دوره‌ای. کاتالوگ‌ها لایه‌ی fallback پشت کش زنده‌ی پارتو هستند؛ تا رفرش بعدی، مسیرهای warm داده‌ی زنده می‌گیرند.

---

## ۵) جمع‌بندی اولویت‌ها

| # | کار | وضعیت | مسئول/پیش‌نیاز |
|---|---|---|---|
| 1 | Keep-alive + هشدار سشن + auto-resolve | ✅ انجام شد | — |
| 2 | رفت‌وبرگشت اسکرپر + پارسر per-leg | ✅ انجام شد | کالیبراسیون زنده با `probe` |
| 3 | نرخ ارز زنده fail-closed | ✅ انجام شد | تصمیم اپراتوری روی منبع |
| 4 | Probe رقبا (گیت‌شده) | ✅ اسکلت | فعال‌سازی با env؛ توافق رسمی بلندمدت |
| 5 | پایش staleness کاتالوگ | ✅ انجام شد | — |
| 6 | تغییر پسورد پنل پارتو | ⚠️ **فوری** | اپراتور (leak در تاریخچه‌ی git) |
| 7 | کالیبراسیون زنده پورتال | ⏳ | ورود انسانی از IP ایران |
| 8 | Auto-Buy از پورتال | 🔒 عمداً بسته | تأیید صریح + kill-switch |
| 9 | رفرش کامل کاتالوگ eghamat24 | ⏳ | IP ایران |
| 10 | ثبت cron ساعتی در vercel.json (پلن Pro) | ⏳ | تصمیم پلن |
