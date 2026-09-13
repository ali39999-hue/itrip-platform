# ادغام Nadia CRS (نادیا) — هتل

> تاریخ اعتبارسنجی زنده: ۲۰۲۶-۰۹-۱۳ · اسپک کامل: `api_hunt/nadia_swagger.json` (۲۲ مسیر / ۳۲۱ اسکیما)
> Client: `src/domains/supplier/adapters/NadiaCrsClient.ts` · Adapter: `src/domains/supplier/adapters/NadiaHotelSupplierAdapter.ts`

## ۱) مشکل snippet اولیه و اصلاحات انجام‌شده

اسنیپت تحویلی ارائه‌دهنده سه ایراد اساسی داشت که هر سه اصلاح شد:

| ایراد | توضیح | اصلاح |
| --- | --- | --- |
| **دامنه‌ی `.ir` گواهی TLS نداشت** | `api.nadiacrs.ir` گواهی Let's Encrypt صادرشده فقط برای `api.nadiacrs.com` را ارائه می‌دهد → هر TLS client ای روی `.ir` با `SEC_E_WRONG_PRINCIPAL` / `ERR_TLS_CERT_ALTNAME_INVALID` fail می‌شود (هر دو دامنه به `37.32.14.34` اشاره می‌کنند) | Base URL پیش‌فرض روی `https://api.nadiacrs.com` |
| **مسیر `/api` اشتباه بود** | `DEFAULT_BASE_URL = ".../api"` درست نیست؛ مسیرهای واقعی در روت هستند (`POST /auth/login`، `POST /hotel/availability`) و فقط مستندات Swagger زیر `/api/docs-json` سرو می‌شود. Endpointهای مرجع (`/hotel_cities`، `/hotel_countries`) هم در روت‌اند | `REF_BASE_URL` و `BASE_URL` یکی شدند (با امکان override جدا) |
| **توکن هاردکد ۲۴ ساعته** | JWT ضمیمه (کاربر «Test»، id 27) در `2026-07-16` منقضی شده بود؛ هاردکد توکن در یک ریپوی عمومی هم نقض سیاست امنیتی است | لاگین با `NADIA_CRS_USERNAME/PASSWORD` از env + refresh خودکار |

## ۲) یافته‌های اعتبارسنجی زنده (با curl/node)

- `GET https://api.nadiacrs.com/hotel_countries` → **HTTP 200** — ۲۴۷ کشور، صفحه‌بندی `{items, meta}` با `?page=&limit=`
- `GET https://api.nadiacrs.com/hotel_cities?search=tehran` → **HTTP 200** — `{id: 2000000039, name: "Tehran", eghamat_city_id: 69, hotelyar_city_id: 1}` — یعنی نادیا aggregator چندتأمین‌کننده‌ای است (Dreamdays / Eghamat24 / HotelYar)
- `POST https://api.nadiacrs.com/hotel/availability` → **HTTP 401** `{"Success":false,"Error":{"Id":401,"Message":"Unauthorized"}}` بدون توکن معتبر (path تایید شد)
- `POST https://api.nadiacrs.com/auth/login` → **HTTP 404** با پیام `user not found demo214` — یعنی endpoint درست است ولی حساب `demo214` **روی سرور لایو وجود ندارد** (احتمالاً روی محیط تست خودشان ساخته شده؛ نیازمند پیگیری از ایمی‌ل نادیا)

## ۳) نقشه‌ی API (خلاصه)

| Endpoint | متد | Auth | توضیح |
| --- | --- | --- | --- |
| `/auth/login` | POST | عمومی | `{username, password}` → `{access_token, refresh_token}` (JWT ~۲۴h) |
| `/auth/refresh-token` | POST | عمومی | `{refresh_token}` → توکن جدید |
| `/hotel_cities` · `/hotel_countries` | GET | عمومی | مرجع شهر/کشور، `?search=&page=&limit=` |
| `/hotel/availability` | POST | Bearer | `{CityId, HotelId, NationalityId, CheckIn, CheckOut, Rooms:[{AdultCount, ChildCount, ChildAges}]}` |
| `/hotel/recheck` · `/hotel/cancellation-policy` | POST | Bearer | `{OptionId}` |
| `/hotel/preBook` | POST | Bearer | `{OptionId, PhoneNumber, Email, Rooms}` |
| `/hotel/book/{option_id}` · `/hotel/book-detail/{option_id}` | POST | Bearer | رزرو و جزئیات رزرو |
| `/flight/*` (search/book/cancel/...) | POST | Bearer | پرواز — خارج از محدوده‌ی این فاز |

پاکت پاسخ همه‌ی endpointها: `{Success, Error: {Id, Message}, Data}`.

## ۴) معماری و تنظیمات

- Transport از `SupplierTransport` مشترک استفاده می‌کند (timeout، retry با backoff، circuit breaker، health metrics، `supplierRequestId`).
- Token management: کش JWT + refresh پیشگیرانه ۶۰ ثانیه قبل از `exp` + single-flight (هجوم همزمان درخواست‌ها فقط یک login می‌زند) + در ۴۰۱ یک‌بار invalidate → re-login → retry.
- SSRF guard: فقط https در production، ممنوعیت host خصوصی/لوکال، و اجبار هم‌مبدأ بودن `refBaseUrl` با `baseUrl`.

```env
NADIA_CRS_USERNAME=""          # اعتبارنامه پنل B2C نادیا
NADIA_CRS_PASSWORD=""
NADIA_CRS_TOKEN=""             # اختیاری: JWT از پیش صادرشده برای تست دستی
NADIA_CRS_BASE_URL="https://api.nadiacrs.com"
NADIA_CRS_NATIONALITY="IR"     # NationalityId ارسالی در availability
NADIA_CRS_ENABLE_BOOK="false"  # دروازه‌ی رزرو (بخش ۶)
NADIA_CRS_BOOKING_EMAIL="booking@firuzo.ir"
```

رفتار fail-closed (سیاست v1.7.2):

- Production بدون اعتبارنامه → `FAIL_CLOSED` throw (هرگز فروش دمو/فیک نمی‌شود).
- Development بدون اعتبارنامه → نتیجه‌ی صادقانه‌ی خالی `[]` (بدون هتل ساختگی).
- رزرو بدون صریحاً فعال‌کردن `NADIA_CRS_ENABLE_BOOK=true` → `FAILED` با پیام روشن.

## ۵) سیم‌کشی در مسیر سرو (serving path)

- `src/services/hotels-service.ts` → `searchHotelsLive()`: اگر اعتبارنامه تنظیم شده باشد، **اول** نادیا (مهلت ۴ ثانیه) امتحان می‌شود؛ نتایج از طریق `mapNadiaPropertyToHotel` به `DetailedHotelWithMeta` نگاشت و با کاتالوگ محلی merge می‌شود (dedupe بر اساس نام). در نبود اعتبارنامه یا هر خطا، مسیر قدیمی eCardo/کاتالوگ محلی بدون تغییر ادامه می‌یابد.
- شناسه‌های `nadia_<HotelId>` در کش ۳۰ دقیقه‌ای نگه داشته می‌شوند تا `getHotelByIdAsync()` بتواند صفحه‌ی جزئیات را از نتایج جستجوی اخیر رندر کند (نادیا endpoint جزئیات B2C ندارد).

## ۶) موارد تأییدنشده — قبل از فعال‌سازی رزرو باید زنده تست شود

1. **معنای `HotelId: 0`** برای جستجوی کل شهر (اسکیمای ارائه‌دهنده `CityId` و `HotelId` را هر دو required می‌داند؛ فرض ما ۰ = همه‌ی هتل‌های شهر است — با اولین اعتبارنامه‌ی واقعی تأیید/اصلاح شود).
2. **قرارداد `preBook` → `book`** (پیلود واقعی `passengers_info`، `slug` و شکل voucher) — به همین دلیل پشت `NADIA_CRS_ENABLE_BOOK` قفل است.
3. **حساب دمو**: `demo214 / 12345678` روی سرور لایو شناخته نمی‌شود («user not found») — از طرف نادیا پیگیری شود یا حساب واقعی پنل ساخته شود.

## ۷) دستورالعمل راه‌اندازی (pickup)

```bash
# 1. اعتبارنامه را در env بگذار (هرگز در کد/کامیت!)
NADIA_CRS_USERNAME="..." NADIA_CRS_PASSWORD="..."

# 2. تست سریع زنده:
node scripts/nadia_probe.mjs          # مرجع + لاگین
node scripts/nadia_auth_shape.mjs     # شکل 401 / availability

# 3. سرور dev را ری‌استارت کن (تغییر env) و جستجوی هتل یک شهر را بزن؛
#    اگر نادیا جواب بدهد نتایج live بالای کاتالوگ می‌آیند.
```

## ۸) نکته‌ی امنیتی

ریپو عمومی است — هر اعتبارنامه‌ای فقط در env (محلی و Vercel)، نه در کد. اسکریپت‌های `scripts/nadia_*.mjs` فقط اعتبارنامه را از argv/env می‌خواهند و host را با allowlist محدود می‌کنند.
