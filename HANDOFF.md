# HANDOFF — PWA و پاکسازی lint کامل شد · آماده CI

## وضعیت پایدار
- سرور: `cd itrip-platform && npm run dev` → http://localhost:3000/fa
- بیلد: تمیز · ۲۹ مسیر · ۳ زبان · `npm run lint` صفر خطا/هشدار

## موجودی مسیرها (Route Inventory) - Single Source of Truth
پروژه شامل دقیقاً **۲۹ مسیر (Route)** در پوشه `src/app/[locale]` است:
- **Public & Home:** `/`
- **Auth:** `/auth`
- **Account & Trips:** `/account`, `/my-trips`, `/my-trips/[id]`, `/wallet`
- **Admin:** `/admin`, `/admin/bookings`, `/admin/content`, `/admin/finance`
- **Travel & Core Services:**
  - `/destinations`
  - `/flights/search`, `/flights/checkout`
  - `/hotels/search`, `/hotels/[id]`
  - `/tours`, `/plan`, `/services`, `/guide`
- **Ancillary Services:** `/esim`, `/insurance`, `/interpreter`, `/trains`, `/transfers`, `/visa`
- **Booking & Payment:** `/book`, `/checkout`, `/payment-status`
- **Support:** `/support`
## انجام شد (نقشه نتایج هتل) ✅
- `leaflet@1.9.4` + `react-leaflet@5.0.0` (+ `@types/leaflet`) نصب شد.
- کامپوننت `src/components/hotels/MapPane.tsx`: client-only، tiles OpenStreetMap، پین قیمت per hotel (divIcon بدون asset)، fitBounds خودکار، popup با لینک اتاق‌ها.
- در `src/app/[locale]/hotels/search/page.tsx`: دکمه «نمایش نقشه» در تولبار (toggle) + حالت with-map با گرید ۳ ستونه (فیلتر/لیست/نقشه) در xl؛ داینامیک import با `ssr:false`.
- RTL: فقط کانتینر نقشه `dir="ltr"`؛ مختصات دمو استانبول [41.008,28.978].
- نکته: lint خطاهای از قبل موجود دارد (Date.now purity و any در صفحات دیگر) — ربطی به نقشه ندارد.

## انجام شد (PWA آیکون‌ها) ✅
- آیکون‌ها در `public/icons/`: `icon-192/512.png` + `icon-maskable-192/512.png` + `apple-touch-icon.png` (هواپیمای کاغذی سفید روی گرادیان برند #0e6f6a، تولید با GDI+).
- `public/manifest.json`: آرایه `icons` کامل + `theme_color: #0e6f6a`.
- `layout.tsx`: `icons.apple` + `export const viewport` با `themeColor` (API جدید — `themeColor` در metadata منسوخ است).
- تأیید: manifest 200 با ۴ آیکون · apple link OK · theme-color OK · بیلد تمیز.

## انجام شد (PWA فاز ۲ — Service Worker و نصب) ✅
- `public/sw.js` (`itrip-v1`): tiles اوپن‌استریت‌مپ cache-first با `no-cors`؛ ناوبری‌ها network-first با fallback به `/offline.html`؛ استاتیک‌های same-origin (`_next/static`, `icons`, `images`) stale-while-revalidate؛ پاکسازی کش‌های نسخه‌های قدیمی در activate.
- `public/offline.html`: صفحه آفلاین RTL با برند #0e6f6a + دکمه تلاش دوباره.
- `src/components/pwa/PwaBoot.tsx`: ثبت SW فقط production + بنر «نصب اپلیکیشن iTrip» با `beforeinstallprompt` (دکمه نصب + بستن)، مانت در layout.
- تأیید: بیلد تمیز · `/sw.js` `/offline.html` `/manifest.json` آیکون‌ها همه 200 روی `next start` · lint کامپوننت PWA پاک.

## انجام شد (پاکسازی lint برای CI) ✅
- purity: `Date.now` در هندلرهای esim/flights/insurance/tours/trains/transfers → helper مشترک `daysFromNow()` در `src/lib/utils.ts`؛ `Math.random` کد پیگیری payment-status → ثابت module-scope.
- no-explicit-any: تاپل‌های آیکون+متن با `[LucideIcon, string, ...][]` تایپ شدند (HeroSection/HomeSections/hotels/[id])؛ `icon: any` STATES → `LucideIcon`؛ ردیف‌های info صفحه payment-status بازنویسی شدند (باگ نمایشی label/code هم اصلاح شد)؛ cast های layout/request → `(typeof routing.locales)[number]`.
- warnings: unused import/var ها پاک شدند (account/admin/book/my-trips/tours/BoardingPass/DestinationsSection/auth-store/hotels)؛ ternary-statement ها → if/else (hotels/[id]:497 و hotels/search:268,344).
- **باگ مهم که در همین مرحله پیدا شد**: `BottomNav` بیرون از `NextIntlClientProvider` بود (جابجایی هنگام افزودن PwaBoot در جلسه قبل) → همه صفحات ۵۰۰ می‌دادند. به داخل Provider منتقل شد؛ هر ۲۵ مسیر روی dev و نمونه‌ها روی `next start` تأیید شدند.

## کار باقی‌مانده
- چیزی بحرانی نیست. گزینه‌های بعدی: تست E2E، اتصال API واقعی، یا استقرار.
