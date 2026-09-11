# معماری لایه انتزاع تأمین‌کنندگان و مدارشکن فیروزه (Firuzo / iTrip Supplier Architecture)

این سند معماری آداپتورهای تأمین‌کنندگان خدمات سفر، مکانیزم‌های پایش سلامت، مدیریت خطا و قطع مدار (Circuit Breaking) در پلتفرم فیروزه را تبیین می‌کند.

---

## ۱. لایه انتزاع یکپارچه تأمین‌کنندگان (Supplier Abstraction Layer)

هیچ کدی خارج از پوشه آداپتورها حق ندارد مستقیماً از پارامترها، متدها یا خطاهای اختصاصی یک تأمین‌کننده خاص (نظیر علی‌بابا، پارتو، فلای‌تودی، آمادئوس یا هتل‌های محلی) آگاه باشد. تمامی تأمین‌کنندگان باید اینترفیس واحد `ISupplierAdapter` را پیاده‌سازی کنند:

```typescript
export interface ISupplierAdapter {
  readonly supplierId: string;
  readonly capabilities: SupplierCapabilities;
  
  search(query: NormalizedSearchQuery): Promise<NormalizedOffer[]>;
  revalidate(offerId: string): Promise<RevalidationResult>;
  hold(offerId: string, passengers: Passenger[]): Promise<HoldReservationResult>;
  issueTicket(reservationId: string, paymentProof: PaymentProof): Promise<TicketingResult>;
  cancel(ticketId: string, reason?: string): Promise<CancellationQuoteResult>;
  refund(ticketId: string): Promise<RefundExecutionResult>;
  getStatus(reservationId: string): Promise<BookingStatus>;
}
```

### متادیتای قابلیت‌های تأمین‌کننده (Supplier Capability Metadata):
- `supportedOperations`: عملیات مجاز (مثلاً آیا استرداد آنلاین دارد یا نیازمند تماس دستی است).
- `timeoutPolicy`: مهلت زمانی مجاز برای پاسخ‌دهی (مثلاً ۳۰۰۰ میلی‌ثانیه برای جست‌وجو و ۸۰۰۰ میلی‌ثانیه برای صدور).
- `retryPolicy`: تعداد تلاش‌های مجدد در صورت خطای شبکه با Exponential Backoff.
- `rateLimits`: سقف تعداد درخواست در دقیقه جهت جلوگیری از بلاک شدن IP.

---

## ۲. موتور پایش سلامت و مدارشکن (Supplier Health & Circuit Breaker)

در صورت اختلال یا قطعی یک تأمین‌کننده، کل سامانه فیروزه نباید با کندی یا خطا مواجه شود؛ بلکه سیستم با استفاده از الگوی Circuit Breaker به صورت هوشمند واکنش نشان می‌دهد:

```
           [CLOSED: وضعیت نرمال]
              │
              │ خطای بیش از ۴۰٪ در بازه ۶۰ ثانیه
              ▼
           [OPEN: مدار قطع] ──(انتقال فوری جست‌وجوها به تأمین‌کننده پشتیبان)
              │
              │ گذشت زمان خنک‌سازی (Cooldown 90s)
              ▼
         [HALF-OPEN: نیمه‌باز]
          ├── (موفقیت ۵ تست اول) ──► [CLOSED: بازگشت به مدار اصلی]
          └── (شکست تست)          ──► [OPEN: تمدید زمان قطعی]
```

### معیارهای پایش بلادرنگ (Real-Time Metrics):
1. **نرخ موفقیت (Success Rate):** نسبت پاسخ‌های ۲۰۰ به کل استعلام‌ها.
2. **تأخیر میانگین (p95 Latency):** در صورتی که تأخیر یک آداپتور از ۴ ثانیه فراتر رود، به انتهای لیست اولویت‌ها منتقل می‌شود.
3. **کیفیت نرخ‌ها (Price Quality):** مقایسه انحراف قیمت پیشنهادی با قیمت پس از اعتبارسنجی نهایی؛ اگر تأمین‌کننده‌ای مکرراً خطای مغایرت قیمت دهد، امتیاز اعتماد آن کاهش می‌یابد.
4. **تخریب تدریجی و آبرومندانه (Graceful Degradation):** در صورت قطع ارتباط با یک سیستم پروازی، نتایج سایر ایرلاین‌ها بدون نمایش ارور به مسافر نمایش داده می‌شوند.
