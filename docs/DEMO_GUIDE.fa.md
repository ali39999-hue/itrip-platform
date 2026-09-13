# راهنمای حالت دمو — تست کامل پرداخت ایکاردو (بدون پول واقعی)

حالت دمو کل تجربه واقعی پرداخت را شبیه‌سازی می‌کند: صفحه درگاه، امضای IPN، تایید
cryptographic، capture و شارژ لجر — همه با همان کد production، فقط بدون درگاه واقعی.

## پیش‌نیازها

- سرور dev در حال اجرا روی `http://localhost:3000`
- در `itrip-platform/.env.local`:
  ```
  ECARDO_DEMO_GATEWAY="true"            # شبیه‌سازی صفحه درگاه ایکاردو (scoped — مسیر واقعی دست‌نخورده می‌ماند)
  NEXT_PUBLIC_ECARDO_DEMO_GATEWAY="true" # نمایش بنر دمو در UI
  ECARDO_SECRET_KEY="..."               # برای امضای HMAC واقعی IPN (از .env)
  ```
  ⚠️ فلگ گلوبال `DEMO_MODE` دست‌نخورده (`"false"`) می‌ماند تا مسیر واقعی Shetab/FX/Signature و بقیه سرویس‌ها تغییری نکنند. با `ECARDO_DEMO_GATEWAY="false"` صفحه واقعی ایکاردو باز می‌شود (برای تست IPN واقعی از طریق تونل).
- تستر باید وارد حساب شده باشد (شارژ کیف پول نیازمند login است).

## سناریو ۱ — شارژ کیف پول با ایکاردو

1. به `/wallet` بروید (بنر «حالت دمو فعال است» باید دیده شود).
2. درگاه «ای‌کاردو» و ارز (تومان / USD / USDT / CNY) را انتخاب کنید؛ مبلغ را وارد کنید.
3. دکمه «شارژ» را بزنید → به صفحه **شبیه‌سازی درگاه ایکاردو** (`/demo/ecardo-checkout`) منتقل می‌شوید؛ مبلغ و شماره تراکنش (FZ…) نمایش داده می‌شود.
4. «پرداخت موفق (دمو)» را بزنید:
   - یک IPN واقعاً امضاشده (HMAC-SHA256 با ECARDO_SECRET_KEY) به `/api/payments/webhook` پست می‌شود؛
   - وب‌هوک امضا را تأیید و تراکنش را capture می‌کند؛
   - لجر، کیف پول شما را شارژ می‌کند.
5. صفحه وضعیت «پرداخت با موفقیت انجام شد» را می‌بینید → به `/wallet` برگردید؛ موجودی جدید در کارت‌ها و تاریخچه تراکنش‌ها ثبت شده است.

### سناریوی خطا
در صفحه دمو «شبیه‌سازی پرداخت ناموفق» را بزنید → Payment و Intent به FAILED می‌روند،
هیچ capture و شارژی انجام نمی‌شود، و صفحه وضعیت «پرداخت انجام نشد» نمایش داده می‌شود. کیف پول دست‌نخورده می‌ماند.

## سناریو ۲ — پرداخت رزرو از Checkout

1. یک رزرو (هتل/پرواز/تور) تا صفحه Checkout جلو ببرید.
2. روش پرداخت «درگاه ای‌کاردو» را انتخاب کنید و ادامه دهید.
3. صفحه دموی درگاه باز می‌شود → «پرداخت موفق (دمو)».
4. رزرو به CONFIRMED می‌رود و در «سفرهای من» قابل مشاهده است.

## نکات فنی

- آداپتور ایکاردو در `DEMO_MODE=true` (و غیر production) به‌جای فراخوانی API واقعی،
  به `/demo/ecardo-checkout` ریدایرکت می‌کند (`EcardoGatewayAdapter`).
- اکشن‌های دمو در `src/actions/demo-payment.ts` فقط در حالت دمو و غیر production کار
  می‌کنند و در production fail-closed هستند.
- IPN ناموفق در `PaymentDomainService.processWebhook` هرگز capture نمی‌کند
  (گیت `payment.failed`).
- برای تست IPN واقعی (نه دمو): تونل `cloudflared tunnel --url http://localhost:3000
  --protocol http2` + ست‌کردن `ECARDO_IPN_BASE_URL` (تست پایتون: `scripts/test_ipn_pipe.mjs`).
- تست‌های واحد مرتبط: `src/domains/payments/wallet-topup-capture.test.ts`,
  `src/domains/payments/adapters/ecardo-gateway.test.ts`.
