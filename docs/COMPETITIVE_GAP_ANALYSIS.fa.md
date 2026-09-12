# تحلیل رقابتی و شکاف‌های محصول Firuzo (فارسی)

> تاریخ: 2026-09-12 — نسخه پلتفرم: 1.6.1
> روش تحقیق: موجودی کامل امکانات فعلی (اسکن کد) + بنچمارک رقبای ایرانی (Alibaba، SnappTrip، Jabama، FlyToday، MRBilit، Safarmarket، Trip.ir، Parto، Shab) + استانداردهای جهانی (Skyscanner، Kiwi، Hopper، Booking.com، Airbnb، Wego/Traveloka، Expedia، Google Travel) + ریپوهای open-source مرجع.

---

## 1. خلاصه اجرایی

بزرگ‌ترین مشکل پلتفرم **داخل خودش نیست، بلکه قبل از درِ ورودی است**: جستجوی پرواز و هتل هنوز از دیتاست JSON داخل ریپو سرو می‌شود (`src/services/flights-service.ts` + `src/data/server/*.json`) و هیچ تأمین‌کننده‌ی زنده‌ای در مسیر serving وصل نیست — آداپتور Parto/Eghamat فقط contract-test شده‌اند. تا این وصل نشود، هر مقایسه‌ای با رقبا در نهایت به «نمایش‌دهنده دمو» ختم می‌شود.

پس از آن، شکاف‌های اصلی نسبت به بازار ایران عبارتند از: **خرید اقساطی (BNPL)** که الان در ایران table-stakes شده، **پوش نوتیفیکیشن و اپلیکیشن موبایل**، **بک‌اند واقعی قطار/اتوبوس**، **سیستم کوپن/کد تخفیف**، **نظرات کاربران (UGC)**، و **چت زنده پشتیبانی**. در مقابل، در بک‌اند مالی (ledger، settlement، reconciliation)، کیف پول چندارزی + USDT، نوتیفیکیشن چندکاناله (Bale/Telegram/WhatsApp) و ERP ما **جلوتر از همه رقبای ایرانی** هستیم.

---

## 2. جاهایی که جلوتر از رقبا هستیم (نگه داریم)

| قابلیت | وضعیت ما | نزدیک‌ترین رقیب |
|---|---|---|
| بک‌اند مالی/ERP | Ledger، Journal، Settlement، 3-way reconciliation، Exception Center، Manifests | هیچ‌کدام از رقبا این عمق را دارند؛ Parto فقط B2B/CRS است |
| کیف پول چندارزی | IRR/USD/USDT/CNY + تبدیل ارز | فقط SnappTrip کیف پول ساده دارد |
| پرداخت USDT (TRC-20) | verifier ترانسته + checkout | هیچ رقیب ایرانی ندارد |
| نوتیفیکیشن چندکاناله | Email/SMS/Bale/Telegram/WhatsApp با outbox | فقط اپ/ایمیل استاندارد |
| Planner هوش مصنوعی | `/plan` با AiRouter failover | جاباما تازه «هوش مصنوعی» را با برچسب «جدید» اضافه کرده |
| PWA + آفلاین | manifest + service worker + tile cache | رقبا اپ native دارند؛ PWA تقریباً هیچ‌کس |
| i18n | ۵ زبان (fa/en/ar/zh/ru) با gate کامل بودن ترجمه | رقبا تقریباً تک‌زبانه فارسی |
| تست و CI | ~589 unit + Playwright e2e + security gates | قابل مقایسه عمومی نیست ولی از میانگین بازار خیلی بالاتر است |

نکته: `/account/organization` یعنی پیش‌زمینه B2B داریم، ولی رقبا «فروش سازمانی» را به‌صورت محصول تبلیغ می‌کنند (Alibaba سفرکارت سازمانی، SnappTrip b2b، MRBilit سفرکاری) — ما هنوز این را package و عرضه نکرده‌ایم.

---

## 3. شکاف‌های بحرانی (P0 — قبل از هر بازاریابی)

### 3.1. تأمین‌کننده زنده (Live Supplier) — «وجود» محصول
- **ما:** جستجو از `flights-master.json` / `hotels-iran-master.json` سرو می‌شود. آداپتور Parto آماده ولی وصل نیست.
- **رقبا:** Alibaba، SnappTrip، FlyToday همه inventory زنده دارند.
- **راهکار:** در `api_hunt/APIS.md` اثبات شده که Alibaba flight search بدون احراز هویت جواب می‌دهد؛ وصل کردن همان کلاینت به `SupplierPort` موجود (معماری آماده است) سریع‌ترین مسیر MVP زنده است. Parto نیاز به پنل آژانسی دارد — به‌عنوان supplier دوم.

### 3.2. خرید اقساطی / BNPL — الان table-stakes بازار ایران است
- **Alibaba:** «سفر اقساطی» با وام تا ۱۰۰ میلیون تومان از Bloobank، بدون ضامن، با چک صیادی؛ پلن‌های آبی/نقره‌ای/طلایی.
- **SnappTrip:** ۴ قسط با اسنپ‌پی، بدون چک و ضامن.
- **Safarmarket:** صف کامل اقساطی با Tara، DigiPay، AzkiVam، Balloon.
- **FlyToday:** «سفر قسطی با وام سفر».
- **ما:** فقط wallet / gateway eCardo / کارت‌به‌کارت / USDT. هیچ BNPL نداریم.
- **راهکار:** انبار (integrator) در `PaymentDomainService` از قبل برای چند gateway طراحی شده؛ افزودن AzkiVam یا DigiPay (هر دو API باز دارند) به‌صورت adapter پنجم.

### 3.3. بک‌اند Price Alert — UI داریم، موتور نداریم
- `FlightPriceAlertModal.tsx` فقط نمایشی است؛ هیچ API/persistence/jobی برای alert نیست.
- **Skyscanner/Google/Traveloka/Hopper** همه cheapest retention loop دنیا را همین می‌دانند: کاربر مسیر را watch می‌کند، ما برمی‌گردانیمش بدون هزینه تبلیغات.
- **SnappTrip** حتی اطلاع‌رسانی موجودی بلیط در اپ دارد.
- **راهکار:** جدول `PriceAlert` + worker دوره‌ای روی همان کرون موجود (`/api/cron/auto-buy`) + ارسال از طریق outbox.

### 3.4. Web Push / اپلیکیشن
- **ما:** PWA هست ولی هیچ PushManager و هیچ اپ native نداریم.
- **رقبا:** همگی اپ Android (و iOS) دارند؛ price alert بدون کانال push عملاً بی‌اثر است (Hopper کل مدلش روی notification channel بنا شده).
- **راهکار کوتاه‌مدت:** Web Push (VAPID) روی SW موجود + fallback به Telegram/Bale که providerهایشان از قبل داریم. راهکار بلندمدت: wrapper اپ (TWA/Capacitor).

### 3.5. سیستم کوپن/کد تخفیف
- کد تخفیف در همه رقبا استاندارد است (SnappTrip، Safarmarket، Jabama،FlyToday)؛ در checkout ما فقط «کد معرف» داریم.
- **راهکار:** موتور Coupon در `pricing` domain (سقف مصرف، دامنه عمودی، انقضا) — ساختار quote/rate-plan از قبل آماده است.

---

## 4. شکاف‌های Table-Stakes بازار ایران (P1)

| # | قابلیت | رقبا | وضعیت ما |
|---|---|---|---|
| 1 | **قطار/اتوبوس واقعی** | Alibaba، SnappTrip، FlyToday، MRBilit (رزرو خودکار روی ظرفیت!) | `/trains` فقط کاتالوگ ثابت بدون بک‌اند |
| 2 | **نظرات و امتیاز (UGC)** | Jabama (امتیاز در رتبه‌بندی)، Shab، همه هتل‌ها در Alibaba/SnappTrip | هیچ سیستم review نداریم؛ بزرگ‌ترین کسری اعتماد |
| 3 | **چت زنده پشتیبانی** | همه «۲۴ ساعته» تبلیغ می‌کنند؛ Jabama چت با میزبان | فقط فرم تیکت + FAQ — با اینکه providerهای WhatsApp/Bale/Telegram را داریم! |
| 4 | **فیلترهای لحظه آخری / چارتر / کنسلی رایگان** | SnappTrip (لحظه آخری، کنسلی رایگان)، MRBilit (تا ۹۰٪ تخفیف)، Alibaba (چارتر/سیستمی) | فیلتر ticket type داریم ولی صفحه/کمپین «لحظه آخری» نداریم |
| 5 | **تضمین بهترین قیمت / بیمه سفر رایگان** | SnappTrip، Safarmarket، Shab (بیمه رایگان اقامت) | claimها داریم ولی به‌صورت product قابل خرید نیست |
| 6 | **بیمه مسافرتی به‌عنوان add-on در checkout عمودی‌ها** | Alibaba، FlyToday، Trip.ir (باندل تور) | صفحه `/insurance` مستقل داریم؛ باید در checkout پرواز/هتل cross-sell شود |
| 7 | **برچسب کنسلی رایگان روی نرخ‌ها** | Booking.com (قوی‌ترین ابزار اعتماد صنعت)، SnappTrip | refund-rules modal داریم ولی فیلتر/برچسب first-class نداریم |
| 8 | **پکیج فروش سازمانی (B2B)** | Alibaba، SnappTrip، MRBilit، Jabama | پیش‌زمینه organization داریم؛ محصول نشده |

---

## 5. شکاف‌ها نسبت به استاندارد جهانی (P2 — تمایز و رشد)

### 5.1. جستجو و Discovery
- **جستجوی Multi-City** (Skyscanner تا ۶ لگ): فرم ما فقط `oneWay | round` است — بیشترین درخواست سفرهای ترکیبی (زیارت/ویزا/مهاجرت) را از دست می‌دهیم.
- **فرودگاه‌های نزدیک** (Skyscanner toggle): در `CityAutocomplete.tsx` نیست.
- **Whole-Month / ارزان‌ترین ماه** (Skyscanner، Google): کامپوننت `FlightPriceCalendar` داریم — باید به داده واقعی چندتاریخی وصل شود و «ارزان‌ترین روز» را برجسته کند.
- **کاوش «هرجا» با قیمت از** (Skyscanner Everywhere): صفحه `/destinations` داریم ولی قیمت‌های «از» زنده ندارد.
- **جستجوی هتل روی نقاط نقشه با قیمت** (Booking.com): HotelMap با Leaflet داریم؛ مارکر قیمت و re-search هنگام pan/zoom ندارد.

### 5.2. قیمت و Fintech
- **قیمت نهایی از همان ابتدا (بدون drip pricing)** — Wego: بزرگ‌ترین گ wedge اعتماد در متاسرچ.
- **Price Freeze و پیش‌بینی قیمت** (Hopper): بعد از زنده شدن inventory، این‌ها موتور سود ancillary می‌شوند.
- **Member Price** (Expedia): ثبت‌نام را ارزش‌مند می‌کند.
- **تخفیف باندل پرواز+هتل** (Expedia/Booking): unified cart و BookingSagaCoordinator ما از نظر معماری آماده است — فقط قواعد تخفیف باندل ندارد.

### 5.3. وفاداری و Engagement
- **باشگاه مشتریان چندسطحی با مزیت واقعی** (Booking Genius → اعضا ~۱۵٪ بیشتر خرج می‌کنند): ما فقط streak و referral داریم؛ پرچم `LOYALTY_V2` هنوز روشن نشده.
- **Wishlist/لیست‌های ذخیره** (Airbnb): هیچ سیستم save کردن نداریم — ارزان‌ترین سازنده عادت بازگشت.

### 5.4. محتوا و SEO
- **صفحات فرود programmatic به‌ازای هر مسیر/شهر** («بلیط تهران–مشهد» با قیمت زنده): گودال SEO صنعت سفر؛ domain محتوای ما (CMS + SEO score) هست ولی تولید این صفحات را ندارد.
- **Structured data (schema.org Flight/Hotel/FAQ)**: crawler-audit e2e داریم — باید تأیید شود rich snippet قیمت می‌گیریم.

### 5.5. سفر پس از خرید
- **نوتیفیکیشن فعالِ تغییر برنامه/تأخیر** (Hopper/Booking): outbox داریم؛ رویدادهای disruption تعریف نشده‌اند.
- **تضمین اتصال برای مسیرهای ترکیبی** (Kiwi Guarantee): بعد از multi-city.

---

## 6. ریپوهای open-source برای بنچمارک فنی

1. **[QloApps](https://github.com/qloapps/qloapps)** — موتور رزرو هتل + PMS بالغ؛ مدل room-type/availability و معماری چندزبانه/چندارزی را یاد بگیر.
2. **[fullstack-nextjs-golobe-travel-agency](https://github.com/mojahidhasan/fullstack-nextjs-golobe-travel-agency)** — نزدیک‌ترین استک به ما (Next.js App Router + server actions): step checkout، favorites، search history، invoice.
3. **[Airbnb-Build](https://github.com/SashenJayathilaka/Airbnb-Build)** — مرجع داده‌مدل رزرواسیون + listing UX با Prisma/NextAuth.
4. **[clone-wars](https://github.com/GorvGoyl/clone-wars)** — دایرکتوری الگوهای UI برای cherry-pick.

---

## 7. مشکلات مهندسی جانبی (فراتر از Feature)

1. **وابستگی زنجیره تأمین تک‌نقطه‌ای:** حتی بعد از وصل Alibaba، بهتر است حداقل دو supplier در failover باشند (معماری `predictive routing` supplier داریم — فقط مصرفش کنیم).
2. **WeChat Pay نداریم** با اینکه gateway ما instrument پول CNY ارائه می‌دهد و locale زداریم — برای ترافیک چین ناسازگاری آشکار است.
3. **Snapp فقط recharge widget است** — integration واقعی سواری (deep link به اپ) نه.
4. **esim/visa/transfer** کاتالوگ ثابت هستند — حداقل esim APIهای خارجی (Airalo و مشابه) ارزان‌ترین مورد برای زنده کردن است.
5. **شرط امنیتی:** درخت کد با workstreamهای موازی به اشتراک گذاشته می‌شود — هر گیت (CI-012، fail-fast AUTH_SECRET، IDOR guards) در پایان هر سشن re-verify شود.

---

## 8. نقشه راه پیشنهادی (اولویت‌بندی)

### فاز ۰ — «زنده شدن» (بدون این، بقیه بی‌معنی است)
1. وصل کردن supplier زنده پرواز (شروع: کلاینت Alibaba از `api_hunt`) به `SupplierPort` + پرچم feature و fallback به دیتاست.
2. Price Alert بک‌اند (جدول + worker + ارسال Telegram/Bale/email).
3. Web Push روی SW موجود.

### فاز ۱ — Table-stakes بازار ایران
4. BNPL adapter (AzkiVam یا DigiPay).
5. موتور کوپن.
6. سیستم review هتل (double-blind، فقط پس از اقامت).
7. چت پشتیبانی روی کانال‌های موجود (WhatsApp/Bale inbound).
8. قطار/اتوبوس واقعی (MRBilit-style API یا سیستم سراسری) + «رزرو خودکار» به‌عنوان تمایز.
9. برچسب/فیلتر کنسلی رایگان + کمپین لحظه آخری.

### فاز ۲ — تمایز و رشد
10. Multi-city + nearby airports + whole-month واقعی.
11. Wishlist.
12. LOYALTY_V2: باشگاه چندسطحی با مزیت‌های شریک‌محور (الگوی Genius).
13. صفحات فرود programmatic مسیر/شهر + schema.org.
14. تخفیف باندل پرواز+هتل روی unified cart.
15. بسته‌بندی «فروش سازمانی» روی organization موجود.

### فاز ۳ — افق بلند
16. اپ موبایل (TWA/Capacitor) + Price Freeze + پیش‌بینی قیمت.
17. eSIM زنده، WeChat Pay، تضمین اتصال (Kiwi-style)، disruption alerts.

---

## 9. منابع اصلی

- رقبای ایرانی: alibaba.ir (و /installment-travel, /invitation)، snapptrip.com، jabama.com، flytoday.ir (و /installment-travel)، partocrs.com، trip.ir، safarmarket.com (و /flights/installment)، mrbilit.com، shab.ir، pay.snapp.ir، azkivam.com/service/ticket، myclub.snapp.ir، cafebazaar.ir (لیستینگ اپ‌ها)
- جهانی: skyscanner.net، kiwi.com (travel-hacks، Nomad)، hopper (Skift Research، PhocusWire)، booking.com (Genius، taxi، Connected Trip)، airbnb.com، wego.com، traveloka.com، expedia.com (One Key)، support.google.com/travel
- موجودی داخلی: اسکن کد `itrip-platform` (routingها، domains، api، workers) — 2026-09-12
