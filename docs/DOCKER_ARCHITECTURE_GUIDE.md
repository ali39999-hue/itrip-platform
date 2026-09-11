# راهنمای جامع معماری و راه‌اندازی داکر پروژه فیروزو (Firuzo / iTrip Platform)

این سند برای مدیران فنی، تیم DevOps و توسعه‌دهندگان آماده شده است و ساختار، سناریوها، نحوه پیکربندی و بهترین روش‌های کار با داکر (Docker & Docker Compose) در پلتفرم فیروزو را توضیح می‌دهد.

---

## ۱. خلاصه مدیریتی (Executive Summary)

پلتفرم به گونه‌ای پیکربندی شده است که **بر اساس شرایط و نیازهای مختلف**، دقیقاً خود را تطبیق دهد:

| سناریو | هدف کاربردی | نحوه اجرا | مزیت کلیدی |
| :--- | :--- | :--- | :--- |
| **۱. وصل بودن به داکر (Hybrid / Infra-Only)** | دیتابیس و ردیس در داکر، اجرای Next.js روی سیستم محلی (`npm run dev`) | `npm run docker:infra`<br>یا انتخاب گزینه ۱ در `docker-manage.bat` | سرعت بسیار بالای توسعه و Fast Refresh بدون نیاز به نصب هیچ ابزاری جز داکر روی ویندوز/مک. |
| **۲. اجرای کامل توسعه در داکر (Full Dev)** | اجرای همه سرویس‌ها درون داکر با Hot-Reload سورس‌کد | `npm run docker:dev` | ایزولاسیون ۱۰۰٪ محیط توسعه بین تمام برنامه‌نویسان. |
| **۳. استقرار کامل پروداکشن (Production Stack)** | اجرای بهینه و امن وب‌سرویس، ورکر پس‌زمینه، دیتابیس و ردیس | `npm run docker:prod` | بیلد چندمرحله‌ای (Multi-stage)، کاربر غیرریشه (non-root)، مایگریشن خودکار و چک سلامت. |
| **۴. اتصال به دیتابیس ابری (External Cloud DB)** | اجرای وب‌سرویس و ورکر در داکر متصل به دیتابیس ابری (آروان، لیارا، RDS) | تنظیم `DB_HOST` در `.env.docker` و اجرای `docker compose up app worker` | عدم نیاز به بالا آوردن دیتابیس محلی در سرورهایی که دیتابیس مدیریت‌شده دارند. |

---

## ۲. سناریوهای ۴ گانه اجرایی

### سناریو ۱: "وصل باشیم بهش" (Connected / Infrastructure Mode)
> **پیشنهاد ویژه برای توسعه روزمره برنامه‌نویسان**: 
> نیازی به نصب PostgreSQL 16 یا Redis 7 روی ویندوز ندارید. داکر زیرساخت را بالا می‌آورد و پروژه لوکال به آن متصل می‌شود.

1. اجرای زیرساخت داکر:
   ```bash
   npm run docker:infra
   # یا در ویندوز:
   docker-manage.bat infra
   ```
2. سرویس‌های فعال شده:
   - **PostgreSQL 16**: در پورت `5432` (دیتابیس: `itrip`، کاربر: `postgres`)
   - **Redis 7**: در پورت `6379`
   - **Adminer (رابط وب دیتابیس)**: در آدرس `http://localhost:8080`
3. اجرای پروژه روی سیستم شما:
   ```bash
   npm run dev
   ```
   *پروژه به صورت خودکار به دیتابیس داکر روی `127.0.0.1:5432` متصل می‌شود.*

---

### سناریو ۲: توسعه کامل درون کانتینر (Full Dev Stack with Live Reload)
> مناسب برای شرایطی که می‌خواهید پروژه دقیقاً در یک محیط لینوکسی شبیه به سرور اجرا شود و هر تغییری در کدهای لوکال بلافاصله ریلود شود.

```bash
npm run docker:dev
# یا
docker compose -f docker-compose.dev.yml up
```
- سورس‌کد پروژه به کانتینر متصل (Volume Mount) است.
- وب‌سایت در آدرس `http://localhost:3000` در دسترس است.

---

### سناریو ۳: استقرار پروداکشن (Production Stack)
> مناسب برای سرور اصلی، سرور تست (Staging) و ارزیابی نسخه نهایی قبل از انتشار.

```bash
npm run docker:prod:build
# یا
docker compose up -d --build
```
**ویژگی‌های امنیتی و فنی لایه پروداکشن:**
- **ایمیج چندمرحله‌ای (Multi-Stage Build)**: حجم ایمیج به حداقل رسیده و سورس‌کدهای غیرضروری حذف می‌شوند.
- **امنیت دسترسی (Non-Root User)**: برنامه با کاربر سیستمی `nextjs` (UID 1001) اجرا می‌شود.
- **Entrypoint هوشمند با مکانیسم Retry**: در هنگام استارت، تا زمان آماده شدن کامل دیتابیس صبر کرده و سپس `npx prisma migrate deploy` را بدون کرش کردن سرویس اجرا می‌کند.
- **جداسازی فرآیند وب و ورکر (Web vs Worker)**: کانتینر `firuzo-app` درخواست‌های وب را پردازش کرده و کانتینر `firuzo-worker` صف‌های Outbox، رویدادهای Saga و انقضای Hold را هندل می‌کند.
- **چک سلامت (Healthcheck)**: پایش مداوم با endpoint استاندارد `/api/health/live`.

---

### سناریو ۴: اتصال به دیتابیس خارجی یا ابری (External Managed Database)
اگر در سرور پروداکشن از دیتابیس‌های ابری (مانند PaaS/DBaaS ابر آروان، لیارا یا سرور دیتابیس اختصاصی) استفاده می‌کنید:
1. در فایل `.env.docker` مقدار `DB_HOST` و مشخصات دیتابیس را وارد کنید:
   ```env
   DB_HOST=192.168.1.50   # یا آدرس هاست دیتابیس ابری
   POSTGRES_USER=my_prod_user
   DB_PASSWORD=my_prod_password
   POSTGRES_DB=itrip_production
   ```
2. فقط سرویس‌های برنامه و ورکر را بالا بیاورید:
   ```bash
   docker compose up -d app worker
   ```

---

## ۳. جدول دستورات سریع (Cheatsheet)

| عملیات | دستور npm | دستور مستقیم Docker |
| :--- | :--- | :--- |
| **روشن کردن فقط دیتابیس و ردیس** | `npm run docker:infra` | `docker compose -f docker-compose.infra.yml up -d` |
| **خاموش کردن دیتابیس و ردیس** | `npm run docker:infra:down` | `docker compose -f docker-compose.infra.yml down` |
| **اجرای کامل محیط توسعه (Dev)** | `npm run docker:dev` | `docker compose -f docker-compose.dev.yml up` |
| **اجرای کامل پروداکشن در پس‌زمینه** | `npm run docker:prod` | `docker compose up -d` |
| **بیلد مجدد و اجرای پروداکشن** | `npm run docker:prod:build` | `docker compose up -d --build` |
| **خاموش کردن کانتینرها** | `npm run docker:down` | `docker compose down` |
| **مشاهده لاگ‌های زنده** | `npm run docker:logs` | `docker compose logs -f` |
| **اجرای مایگریشن دیتابیس در کانتینر** | `npm run docker:migrate` | `docker compose exec app npx prisma migrate deploy` |
| **تزریق داده‌های اولیه (Seed) در داکر** | `npm run docker:seed` | `docker compose exec app npm run prisma:seed` |

---

## ۴. اسکریپت‌های تک‌کلیکی (بدون نیاز به نوشتن دستور)

برای راحتی اعضای تیم و کار با منوی گرافیکی/متنی، دو اسکریپت آماده شده است:
- **در ویندوز**: روی فایل `docker-manage.bat` دبل کلیک کنید یا در خط فرمان بنویسید:
  ```cmd
  docker-manage.bat
  ```
- **در لینوکس، مک یا WSL**:
  ```bash
  chmod +x docker-manage.sh
  ./docker-manage.sh
  ```
این اسکریپت یک منوی ساده با گزینه‌های عددی برای تمام سناریوهای بالا ارائه می‌دهد.

---

## ۵. تنظیمات و متغیرهای محیطی (`.env.docker`)

فایل نمونه کامل در مسیر `.env.docker.example` قرار دارد. متغیرهای کلیدی:

- `APP_PORT`: پورت نمایش وب (پیش‌فرض: `3000`)
- `DB_PORT`: پورت دیتابیس در سیستم هاست (پیش‌فرض: `5432`)
- `REDIS_PORT`: پورت ردیس در سیستم هاست (پیش‌فرض: `6379`)
- `ADMINER_PORT`: پورت رابط وب مدیریت دیتابیس (پیش‌فرض: `8080`)
- `POSTGRES_USER`: نام کاربری دیتابیس (پیش‌فرض: `postgres`)
- `DB_PASSWORD`: رمز عبور امن دیتابیس
- `POSTGRES_DB`: نام دیتابیس (پیش‌فرض: `itrip`)
- `AUTH_SECRET`: کلید رمزنگاری جلسات احراز هویت (حداقل ۳۲ کاراکتر)
- `SKIP_DB_MIGRATION`: در صورتی که مایگریشن‌ها در پایپ‌لاین CI اعمال می‌شوند روی `true` تنظیم شود.

---

## ۶. بررسی و تایید گیت‌های امنیتی (Security Compliance)

- **SEC-106**: تمام تنظیمات داکر برای جلوگیری از نشت پسورد و کدهای آسیب‌پذیر بررسی شده و نتیجه اسکن با ۰ هشدار و ۰ آسیب‌پذیری پاس می‌شود (`npm run security:scan`).
- **Data Persistence**: دیتابیس و ردیس از Named Volumes اختصاصی (`firuzo_postgres_data` و `firuzo_redis_data`) استفاده می‌کنند تا اطلاعات حتی با حذف یا بازسازی کانتینرها حفظ شود.
- **Fail-Fast & Zero-Downtime**: کانتینر اپلیکیشن تا زمان سلامت کامل دیتابیس منتظر مانده و در صورت قطعی موقت، با مکانیزم بازآزمایی (Retry) متصل می‌شود.
