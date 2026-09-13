# مستندات و معماری یکپارچه‌سازی وب‌سرویس سفر ای‌کاردو (eCardo Travel Platform)

این سند نحوه اتصال پلتفرم فیروزو به وب‌سرویس جامع سفر ای‌کاردو (`eCardo Travel Platform`) را تشریح می‌کند.

---

## ۱. مشخصات عمومی و آدرس‌ها

* **مستندات Swagger UI:**
  `https://travel-origin.ecardo.ir/api/v1/travel/docs`
* **مشخصات OpenAPI 3.1.0 (YAML):**
  `https://travel-origin.ecardo.ir/api/v1/travel/openapi.yaml` (نسخه محلی ذخیره‌شده: `docs/specs/ecardo-travel-openapi.yaml`)
* **هدر امنیتی محرمانه (الزامی):**
  `X-Travel-Origin-Secret: e488432e731b083c0ba08f9481650b53892d6cb127f1a3e1ce4f00c4bec9fc7d`
  *(این کلید در فایل `.env` و `.env.local` با متغیر `ECARDO_TRAVEL_ORIGIN_SECRET` ذخیره شده است).*
* **دامنه اجرای سرویس‌ها (Production Base API):**
  `https://trip.ecardo.ir/api`

---

## ۲. کلاینت نرم‌افزاری پیاده‌سازی‌شده در فیروزو

کلاس `EcardoTravelClient` در مسیر زیر پیاده‌سازی شده و تمامی اندپوینت‌های مشخصات OpenAPI را پشتیبانی می‌کند:
`src/domains/supplier/adapters/EcardoTravelClient.ts`

### امنیت و SSRF Guard
* پروتکل الزامی: فقط `https` (ریکوئست‌های `http` یا لوکال‌هاست رد می‌شوند).
* هاست‌های مجاز (Allowlist): فقط `trip.ecardo.ir` و `travel-origin.ecardo.ir`.
* کلید `X-Travel-Origin-Secret` به صورت اتوماتیک از `process.env` خوانده و به هدر افزوده می‌شود.

---

## ۳. اندپوینت‌های اصلی و قابلیت‌ها

### ۳.۱. کشف و سرور-درایون UI (Discovery & Bootstrap)
* `GET /v1/travel/bootstrap?locale={locale}`
* متد کلاینت: `client.bootstrap(locale)`
* برمی‌گرداند: لیست سرویس‌های فعال (`hotel`, `flight`, `esim`)، شمای جستجوی هر سرویس و اطلاعات برند.

### ۳.۲. جستجوی یکپارچه خدمات (Unified Offers Search)
* `POST /v1/travel/services/{service}/search?locale={locale}`
* متدهای کلاینت:
  - `client.searchHotels({ city, checkIn, checkOut, adults, locale })`
  - `client.searchFlights({ origin, destination, departureDate, locale })`
  - `client.searchService(service, criteria, locale)`
* ویژگی: خروجی به صورت آبجکت‌های استاندارد `Offer` با فیلدهای یکدست قیمت، تصویر، عنوان و نشان برمی‌گردد.

### ۳.۳. محصولات سیم‌کارت و eSIM
* `GET /v1/sim/countries`: لیست کشورهای دارای پوشش
* `GET /v1/sim/products?country_code={code}`: لیست بسته‌های دیتا و قیمت‌ها (هزینه تامین‌کننده و قیمت فروش)
* `GET /v1/sim/airports` و `GET /v1/sim/hotels`: باجه‌های تحویل فیزیکی در فرودگاه‌ها و هتل‌ها

### ۳.۴. احراز هویت و کیف پول ای‌کاردو (Identity & Wallet Order)
* `POST /v1/auth/exchange`: تبادل توکن کاربر ای‌کاردو با `Travel Bearer Token`
* `POST /v1/catalog-orders`: ایجاد پیش‌نویس سفارش
* `POST /v1/orders/{order}/pay`: کسر خودکار هزینه از کیف پول ارزی کاربر در ای‌کاردو (در صورت کسری موجودی، خطای ۴۰۲ با لینک شارژ کیف پول بازمی‌گردد).

---

## ۴. تست‌ها و صحت‌سنجی
* تست‌های واحد در `src/domains/supplier/ecardo-travel-client.test.ts` شامل ۶ آزمون است:
  - مسدودسازی آدرس‌های ناامن و SSRF
  - ارسال هدرهای محرمانه و یوزراجنت
  - جستجوی هتل و پرواز
  - دریافت سیم‌کارت
  - تبادل توکن و پرداخت از کیف پول
* تست‌های زنده با اسکریپت‌های `scripts/test_ecardo_travel_api.mjs` و `scripts/test_flight_search.mjs` با کد ۲۰۰ تأیید شدند.
