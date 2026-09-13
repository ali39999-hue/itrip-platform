# ✈️ برنامه‌ی یکپارچه‌سازی زنده‌ی پرتوکراس (Parto CRS) — اسکرپ/کش/رفرش ساعتی

> تاریخ: 2026-09-12 | نسخه: 1.0 | وضعیت: پیاده‌سازی Phase 1 انجام شد
> پیش‌نیاز مطالعه: `api_hunt/APIS.md` (تحقیق API ها)، `api_hunt/MASTER_PLAN.md` (قواعد تعامل)

---

## 0) خلاصه‌ی اجرایی (TL;DR)

پنل اگنسی پرتوکراس خریداری شد اما پشتیبانی API رسمی ارائه نمی‌کند و پیشنهادشان «اسکرپ + کش + رفرش ساعتی» بوده است.
تحقیق ما (2026-09-08 و بازبینی 2026-09-12) نشان می‌دهد **API رسمی v3 پرتو فعال و مستند است** (`api.partocrs.ir` — 27 endpoint، OpenAPI کامل) و فقط اعتبارنامه‌ی اگنسی می‌خواهد — یعنی همان creds پنل. پس استراتژی ما **API-first با fallback اسکرپ پورتال** است:

1. **فاز ۱ (پیاده‌سازی شد):** زیرساخت کش-first — کلاینت رسمی API v3، آداپتر، جدول‌های کش در Postgres، ورکر رفرش ساعتی مسیرهای پرمصرف، اورلی زنده روی سرچ، و revalidate قبل از خرید.
2. **فاز ۲ (تنها با creds واقعی):** تست `CreateSession` با creds پنل. اگر قبول شد ← سیم‌کشی تمام است. اگر رد شد ← درخواست فعال‌سازی وب‌سرویس روی همان اکانت از پشتیبانی (سرویس موجود است، معمولاً فقط باید روی اکانت enable شود).
3. **فاز ۳ (fallback نهایی):** اگر پارتو واقعاً از فعال‌سازی امتناع کرد ← اسکرپ پورتال با سشن کوکی (`/Handler/*` + endpoint سرچ پورتال که باید از ترافیک لاگین‌شده استخراج شود — §7).

---

## 1) چرا این معماری؟

| محدودیت | راه‌حل |
|---|---|
| پارتو API نمی‌دهد (ادعای پشتیبانی) | API v3 واقعاً وجود دارد؛ creds پنل را امتحان می‌کنیم؛ در صورت رد، فعال‌سازی را درخواست می‌کنیم (خود پارتو فروش وب‌سرویس دارد: partocrs.com/Products/Webservices) |
| قیمت چارترها دقیقه‌ای عوض می‌شود | کش با TTL کوتاه + `AirRevalidate` اجباری قبل از پرداخت (قیمت نهایی همیشه زنده) |
| rate-limit / WAF پرتو | رفرش ساعتیِ مسیرهای پرمصرف (نه per-keystroke)، سرچ کاربر همیشه از کش، سقف concurrency و jitter |
| نبود Redis/BullMQ در استک | الگوی ورکر موجود (`setInterval` + `WorkerLease` + cron HTTP با `CRON_SECRET`) — بدون وابستگی جدید |
| UI فعلی از JSON استاتیک می‌خواند | «اورلی زنده»: اگر برای مسیر/تاریخ ردیف کش هست، جایگزین استاتیک می‌شود؛ وگرنه استاتیک (bootstrap امن) |

---

## 2) قرارداد API رسمی v3 (از `parto_swagger.json` + PDF رسمی)

| مورد | مقدار |
|---|---|
| Base URL | `https://api.partocrs.ir` (فعال — probe شده 2026-09-12)، Demo: `https://apidemo.partocrs.com` |
| متد | همه **POST** با JSON؛ پاسخ پاکت: `{Success, Error:{Id,Message}, ...}` |
| احراز هویت | `POST /api/Authenticate/CreateSession` با `{OfficeId, UserName, Password}` — پسورد **SHA-512 hex** |
| توکن | `SessionId` در **بدنه‌ی** همه‌ی درخواست‌ها (هدر نیست!). سشن ۱۵ دقیقه + تمدید با هر درخواست |
| دیتای استاتیک | خطوط/فرودگاه‌ها: `https://cdn-a.partocrs.com/upload/airstaticdata.zip` |

### Endpoint های مصرفی ما

| Endpoint | بدنه (اجباری *) | کاربرد در Firuzo |
|---|---|---|
| `/api/Authenticate/CreateSession` | OfficeId*, UserName*, Password* | سشن با کش ۱۳.۵ دقیقه‌ای + single-flight |
| `/api/Air/AirLowFareSearch` | PricingSourceType*, RequestOption*, SessionId*, AdultCount*, ChildCount*, InfantCount* + `OriginDestinationInformations[]` + `TravelPreference` | سرچ رفرش ساعتی |
| `/api/Air/AirRevalidate` | SessionId*, FareSourceCode* | **قیمت زنده قبل از پرداخت** + رفرش تک‌پروازی |
| `/api/Air/AirRules` | SessionId*, (FareSourceCode یا UniqueId) | قوانین استرداد در صفحه‌ی پرواز |
| `/api/Air/AirBaggages` | FareSourceCode*, SessionId* | بارهای مجاز |
| `/api/Common/CreditBalance` | SessionId* | مانیتورینگ اعتبار اگنسی در ERP |

### مقادیر enum (عددی — از اسپک)

- `PricingSourceType`: 0=All, 1=Private (چارتر/نگو), 2=Publish, 3=WebFare → **ما 0 (All)**
- `RequestOption`: 0=Fifty, 1=Hundred, 2=TwoHundred, 3=All → **ما 3 (All)**؛ برای رفرش ساعتی می‌توان 0 گرفت
- `CabinType`: 1=Y, 2=S, 3=C, 4=J, 5=F, 6=P, 100=Default → **100**
- `AirTripType`: 1=OneWay, 2=Return → **1** (فاز ۱)
- `OriginType/DestinationType` (SearchLocationType): 1=City, 2=Airport → **2 (Airport)** با کد IATA
- `MaxStopsQuantity`: 0=All, 2=Direct → **0**

### شکل پاسخ سرچ (نقشه‌ی نرمالیزه)

```
AirLowFareSearchResponse { Success, SearchId, Error, PricedItineraries[] }
PricedItinerary {
  FareSourceCode                      ← کلید پایدار برای Revalidate/Book
  ValidatingAirlineCode, NonRefundableType(0..3), RefundMethod(0=Offline,1=Online,2=NonRefundable)
  Labels[] / LabelsFa[], IsCharter (روی FlightSegment)
  AirItineraryPricingInfo.ItinTotalFare { BaseFare, TotalFare, TotalTax, Currency(IRR) }
  PtcFareBreakdown[]                  ← قیمت per-passenger-type
  OriginDestinationOptions[].FlightSegments[] {
    DepartureDateTime, ArrivalDateTime, FlightNumber, MarketingAirlineCode,
    DepartureAirportLocationCode, ArrivalAirportLocationCode,
    SeatsRemaining, Baggage, DepartureTerminal, ArrivalTerminal,
    JourneyDurationPerMinute, IsCharter, CabinClassCode, ResBookDesigCode
  }
}
```

قاعده‌ی identify برای UI: `offerId = "off_PARTO_CRS_" + base64url(FareSourceCode)` — برگشت‌پذیر برای `AirRevalidate` و booking.

---

## 3) معماری (پیاده‌سازی‌شده در Phase 1)

```
┌─ Next.js Server ──────────────────────────────────────────────┐
│  /api/flights/search                                          │
│    └─ searchFlights() (استاتیک، fallback امن)                 │
│    └─ overlayLiveFlights()  ← FlightCacheService              │
│         ├─ کش بخوان (routeKey + departDate + expiresAt>now)   │
│         ├─ کهنه/خالی؟ → رفرش sync (timeout 8s، قفل per-route) │
│         └─ ردیف‌ها → شکل UI (Flight) + meta.live{updatedAt}   │
│  getFlightPriceById() ← اول کش Parto، بعد کاتالوگ استاتیک     │
└───────────────────────────────────────────────────────────────┘
┌─ Worker Process (npm run worker) ─────────────────────────────┐
│  FlightCacheWorker — هر ۱ ساعت:                               │
│    seed مسیرهای پرمصرف → برای هر route × lookAheadDays        │
│    کهنه‌ها را رفرش کن (concurrency 2، jitter، circuit-breaker)│
│  + /api/cron/flight-refresh (CRON_SECRET) برای Vercel         │
└───────────────────────────────────────────────────────────────┘
┌─ Postgres (Prisma) ───────────────────────────────────────────┐
│  FlightOfferCache   — ردیف‌های پرواز + fetchedAt/expiresAt    │
│  FlightRouteDemand  — اولویت مسیرها + lastRefreshedAt/خطاها   │
└───────────────────────────────────────────────────────────────┘
```

### فایل‌های Phase 1

| فایل | نقش |
|---|---|
| `src/domains/supplier/adapters/PartoCrsApiClient.ts` | کلاینت v3 (CreateSession/SHA-512، سشن single-flight، Search/Revalidate/Rules/Baggage/Credit) |
| `src/domains/supplier/adapters/PartoFlightSupplierAdapter.ts` | بازنویسی روی کلاینت واقعی (port حفظ شد) |
| `src/domains/supplier/SupplierNormalizer.ts` | + `normalizePricedItinerary` (PricedItinerary → canonical/UI) |
| `src/services/flight-cache-service.ts` | کش-first، stale-while-revalidate، رفرش مسیرها، آمار |
| `src/services/flights-service.ts` | + lookup قیمت از کش در `getFlightPriceById` |
| `src/app/api/flights/search/route.ts` | + اورلی زنده + `meta.live` |
| `src/workers/flight-cache-worker.ts` + `worker-entrypoint.ts` | رفرش ساعتی |
| `src/app/api/cron/flight-refresh/route.ts` | cron HTTP (الگوی auto-buy) |
| `prisma/schema.prisma` + migration `parto_flight_offer_cache` | جداول کش |

### متغیرهای محیطی (بعد از دریافت creds پنل)

```bash
PARTO_CRS_OFFICE_ID=""     # OfficeId پنل
PARTO_CRS_USERNAME=""      # UserName پنل
PARTO_CRS_PASSWORD=""      # پسورد خام پنل — در کد SHA-512 می‌شود
PARTO_CRS_ENDPOINT_URL="https://api.partocrs.ir"
FLIGHT_CACHE_TTL_MINUTES="60"     # TTL کش سرچ
FLIGHT_LIVE_OVERLAY="auto"        # auto=فقط وقتی creds هست | off=خاموش
```

> نکته‌ی امنیتی: creds فقط server-side؛ `SessionId` در بدنه‌ی درخواست است (نشت در لاگ WAF ممکن — قاعده: لاگ نکردن body، فقط error id). پروژه fail-closed است: در production بدون creds، اورلی غیرفعال و سرچ روی کاتالوگ استاتیک می‌ماند.

---

## 4) جریان کاربر (چیزی که دیده می‌شود)

1. **سرچ:** پاسخ فوری از کش. اگر ردیف زنده هست، پروازهای پارتو با badge «قیمت بروزرسانی: X دقیقه پیش» (`meta.live.updatedAt`) نمایش داده می‌شود.
2. **صفحه‌ی پرواز:** قوانین/بار از کش (`AirRules`/`AirBaggages` هنگام رفرش ذخیره می‌شوند — فاز ۲ UI).
3. **پرداخت:** `AirRevalidate` اجباری. اگر قیمت عوض شده: مودال «قیمت به‌روز شد — X ← Y» و ادامه با تایید کاربر. اگر `Success=false` یا پرواز بسته (`IsClosed`) ← خطای تمیز و حذف از لیست.
4. **رفرش ساعتی:** ورکر مسیرهای پرمصرف (seed: THR-MHD، THR-KIH، MHD-THR، KIH-THR، THR-SYZ، THR-IFN، THR-TBZ، IKA-KIH و...) را برای lookAheadDays=3 می‌گردد؛ مسیرهایی که کاربر واقعاً سرچ کرده به‌صورت خودکار به `FlightRouteDemand` اضافه و اولویت می‌گیرند.

---

## 5) قواعد تعامل با پرتو (سیاست شهروند خوب)

1. هر رفرش مسیر = **یک** `AirLowFareSearch` (بدون polling تکراری)؛ `RequestOption=3` فقط برای سرچ کاربر، ساعتی با `0` (۵۰ نتیجه کافی است).
2. Concurrency حداکثر ۲ درخواست همزمان به پرتو + jitter تصادفی ۰–۲s بین مسیرها.
3. رفرش‌های bulk در ساعات کم‌ترافیک هم می‌توانند بگذرند (پنجره‌ی 01:00–06:00 تهران، آپشن `FLIGHT_REFRESH_WINDOW`).
4. Circuit breaker موجود (`SupplierTransport`) روی `PARTO_CRS` فعال است — خطاهای متوالی = توقف خودکار + Exception Center.
5. **رزرو** فقط با کلاینت رسمی و دستی/ساگای موجود؛ هیچ رزرو خودکار روی endpoint های کشف‌نشده انجام نمی‌شود.

---

## 6) فاز ۲ — تست creds پنل (چک‌لیست ۱۰ دقیقه‌ای)

```bash
# 1. creds را در .env بگذار
# 2. اسکریپت اعتبارسنجی (scripts/parto_probe.mjs را با creds واقعی بسط بده):
node scripts/parto_probe.mjs          # الان: Err0102001 (creds الکی) — مورد انتظار
# 3. dev سرور + سرچ THR→MHD در UI → باید badge «بروزرسانی» ببینی
# 4. npm run worker → لاگ [FlightCache] را ببین
```

- **قبول شد** → تمام، فاز ۳ لازم نیست.
- **رد شد با Err0102001** → تیکت به پشتیبانی پارتو: «اکانت اگنسی ما وب‌سرویس v3 فعال شود» (داکیومنت رسمی و apidemo عمومی است؛ این درخواست استاندارد onboarding integrator ها است — ایمیل آماده: `api_hunt/DISCLOSURE_EMAIL.md`).
- **رد شد با خطای دسترسی متفاوت** → اسکرین‌شات + error id را به ما بده؛ شاید فقط تعرفه‌ی پنل است.

## 7) مسیر اسکرپ پورتال (PartoPortalProvider — پیاده‌سازی و آماده‌ی اجرا)

چون پارتو اعلام کرده فعلاً به دلیل مشکلات ساختاری امکان ارائه API ندارد، مسیر **اسکرپ پورتال به‌صورت کامل پیاده‌سازی و فعال شده است**. معماری ما کاملاً چندمنبعی (Multi-source) است: سرویس کش بر اساس متغیر `FLIGHT_REFRESH_SOURCE` (یا به صورت خودکار `auto`) می‌تواند داده را از پورتال اسکرپ کند و هر زمان API فعال شد بدون تغییر فرانت‌اند به API جابجا شود.

### اجزای پیاده‌سازی‌شده‌ی اسکرپ:
1. **آداپتر اسکرپ (`PartoPortalProvider.ts`)**:
   - درخواست `GET /Flight/Search` و استخراج توکن ضدجعل `__RequestVerificationToken`.
   - ارسال فرم `POST /Flight/Search/Search` به عنوان یک درخواست B2B معتبر ASP.NET.
   - پارسر مقاوم و چندلایه (`parseResultsHtml`): استخراج پروازها، قیمت‌ها (تبدیل خودکار تومان به ریال)، ساعات پرواز، ظرفیت صندلی، بار مجاز، نشان چارتر/سیستمی، و استخراج لینک یکتای رزرو به عنوان شناسه offer.
2. **کپچای لاگین (Human-in-the-loop Bootstrapping)**:
   - صفحه لاگین پورتال پارتو دارای کپچای ریاضی است. برای جلوگیری از بلاک شدن و نقض سیاست‌های ضدبات، لاگین با اسکریپت هدلس/هددار Playwright انجام می‌شود:
   ```bash
   node scripts/parto-portal-capture.mjs
   ```
   - یک پنجره مرورگر باز می‌شود، اطلاعات ورود و کپچای ریاضی را وارد می‌کنید و وارد پنل می‌شوید.
   - اسکریپت کوکی‌های معتبر سشن را در فایل محلی `.parto-portal-state.json` (که در `.gitignore` محافظت شده) ذخیره می‌کند و مقدار `PARTO_PORTAL_COOKIE` را هم چاپ می‌کند.
3. **نگهداری سشن (Keep-Alive)**:
   - درخواست‌های دوره‌ای ورکر ساعتی (`flight-cache-worker.ts`) سشن اسلایدینگ پارتو را فعال و زنده نگه می‌دارند.
   - در صورت انقضای سشن، خطای تمیز `PartoPortalSessionExpiredError` ثبت شده و در Exception Center قرار می‌گیرد تا ادمین مجدداً با یک کلیک سشن را تمدید کند.

### تنظیمات محیطی اسکرپ در `.env`:
```bash
# تنظیم منبع روی پورتال یا auto (اگر کوکی پورتال باشد از پورتال می‌خواند)
FLIGHT_REFRESH_SOURCE="portal"
PARTO_PORTAL_BASE_URL="https://www.partocrs.ir"
# کوکی سشن لاگین پورتال (می‌تواند از فایل .parto-portal-state.json نیز خودکار خوانده شود)
PARTO_PORTAL_COOKIE=""
PARTO_PORTAL_PRICE_UNIT="toman"
```

---

## 8) مانیتورینگ و عملیات

| چه چیزی | کجا |
|---|---|
| سلامت/تاخیر/مدار شکن پرتو | `SupplierTransport.getHealth('PARTO_CRS')` → ERP ops (پترن موجود `supplierHealth`) |
| خطای پایدار رفرش | Exception Center (`SUPPLIER_TIMEOUT`) — خودکار |
| خطای آخر هر مسیر | `FlightRouteDemand.lastError/lastErrorAt` |
| آمار کش (تعداد ردیف تازه، مسیر پوشش‌داده‌شده) | `FlightCacheService.getCacheStats()` — برای داشبورد آینده‌ی admin/suppliers |
| اعتبار اگنسی | `CreditBalance` در ورکر ساعتی (لاگ + هشدار زیر آستانه) |

## 9) ریسک‌ها

| ریسک | اثر | کاهش |
|---|---|---|
| creds پنل با API کار نکند و پارتو هم فعال نکند | فاز ۳ (اسکرپ) لازم می‌شود | لایه‌بندی port/cache مستقل از منبع |
| تغییر ناگهانی قیمت چارتر بین رفرش‌ها | پرداخت با قیمت کهنه | `AirRevalidate` اجباری قبل از پرداخت (fail-closed) |
| سشن ۱۵ دقیقه‌ای + SessionId در بدنه | لو رفتن توکن در لاگ | لاگ نکردن body؛ سشن در حافظه‌ی پروسه فقط |
| WAF/rate-limit پرتو | قطع موقت | سقف concurrency، jitter، circuit breaker، پنجره‌ی شبانه |
| parallel workstream روی همین ریپو | تداخل گیت‌ها | در پایان session گیت‌ها دوباره اجرا شدند |

## 10) چک‌لیست پذیرش Phase 1

- [x] کلاینت v3 با قرارداد swagger (SHA-512، SessionId در بدنه، پاکت Error)
- [x] آداپتر port-compliant + fail-closed production + سیم دورِ dev بدون creds
- [x] جداول کش + migration SQL
- [x] اورلی زنده‌ی سرچ بدون شکستن e2e (بدون creds اورلی خاموش)
- [x] ورکر ساعتی + cron route + seed مسیرها
- [x] قیمت booking از کش (`getFlightPriceById`)
- [x] تست‌های unit جدید + گیت‌ها سبز (lint/typecheck/test:unit)
- [ ] **(نیاز creds)** تست `CreateSession` با اکانت واقعی پنل
- [ ] **(بعد از اتصال)** اتصال UI badge تازگی + صفحه قوانین استرداد از `AirRules`
- [ ] **(اختیاری فاز ۲)** داشبورد admin برای `getCacheStats` و `FlightRouteDemand`
