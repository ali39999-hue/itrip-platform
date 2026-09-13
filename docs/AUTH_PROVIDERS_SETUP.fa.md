# راهنمای راه‌اندازی ورود با گوگل، تلگرام، واتساپ و وی‌چت (WeChat)

این سند دقیقاً مشخص می‌کند چه چیزی از سمت شما نیاز است و کدام متغیرهای محیطی را در `.env.local` (لوکال) یا پنل هاست (پروداکشن) تنظیم کنید.

مبنای فنی: NextAuth v5 — صفحه‌ی `/[locale]/auth` و فایل `src/auth.ts`. همه‌ی callbackها به‌صورت بومی NextAuth هندل می‌شوند.

---

## ۱. ورود با گوگل ✅ (فقط نیاز به کلید دارد)

کد کامل است؛ با تنظیم کلیدها دکمه‌ی «ورود با گوگل» به‌طور خودکار فعال می‌شود.

**مراحل:**
1. به [Google Cloud Console](https://console.cloud.google.com/apis/credentials) بروید → Create Credentials → OAuth client ID → Web application.
2. در **Authorized JavaScript origins**: دامنه‌ی سایت (مثلاً `https://firuzo.com`) و برای تست `http://localhost:3000`.
3. در **Authorized redirect URIs** این مقدار حتماً اضافه شود:
   - `https://your-domain.com/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google`
4. دو متغیر را تنظیم کنید:

```env
GOOGLE_CLIENT_ID="xxxxxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxx"
```

> نکته: تا زمانی که صفحه‌ی تأیید (OAuth consent screen) در حالت Testing است، فقط ایمیل‌های اضافه‌شده در Test users می‌توانند وارد شوند. برای عموم، آن را Publish کنید.

---

## ۲. ورود با تلگرام ✅ (فقط نیاز به بات دارد)

دو مسیر پشتیبانی می‌شود:
- **ویجت رسمی تلگرام (Login Widget)** — مسیر اصلی و مطمئن؛ کاربر یک کلیک وارد می‌شود.
- **کد یک‌بارماسب در چت ربات** — فقط برای کاربرانی که یک‌بار به ربات Start داده‌اند (محدودیت خود تلگرام است؛ بات نمی‌تواند به کاربری که Start نزده پیام بدهد).

**مراحل:**
1. در تلگرام به [@BotFather](https://t.me/BotFather) پیام دهید → `/newbot` → نام و نام کاربری ربات را تعیین کنید → توکن را کپی کنید.
2. در همان BotFather: `/setdomain` → ربات خود را انتخاب کنید → **دامنه‌ی سایت** را وارد کنید (بدون https، مثلاً `firuzo.com`). بدون این مرحله ویجت روی سایت کار نمی‌کند.
3. متغیرها:

```env
TELEGRAM_BOT_TOKEN="123456789:AAxxxxx..."
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME="YourBotUsername"   # بدون @
```

---

## ۳. ورود با واتساپ (کد یک‌بارماسب) ⚙️

ورود واتساپ به معنای ارسال کد تأیید به واتساپ کاربر است. دو ارائه‌دهنده پشتیبانی می‌شود:

### گزینه A — Meta WhatsApp Cloud API (رسمی و ارزان‌تر)
1. یک اپ در [Meta for Developers](https://developers.facebook.com) بسازید → محصول **WhatsApp** را اضافه کنید.
2. از بخش WhatsApp → API Setup مقدار `Phone number ID` و توکن دائمی (System User token با مجوز `whatsapp_business_messaging`) را بردارید.
3. **مهم:** چون پیام Business-initiated خارج از پنجره‌ی ۲۴ ساعته فقط با **تمپلیت تأییدشده** مجاز است، در WhatsApp Manager یک تمپلیت از دسته‌ی **Authentication** بسازید (متن انگلیسی/فارسی با یک متغیر، مثلاً `{{1}}`؛ نام پیش‌فرض کد: `otp_verification`).

```env
WHATSAPP_ACCESS_TOKEN="EAAG..."
WHATSAPP_PHONE_NUMBER_ID="123456789012345"
WHATSAPP_OTP_TEMPLATE_NAME="otp_verification"
WHATSAPP_OTP_TEMPLATE_LANG="fa"
```

### گزینه B — Twilio WhatsApp
1. در [Twilio Console](https://www.twilio.com/console) حساب بسازید، `Account SID` و `Auth Token` را بردارید.
2. در Messaging → Content Tools یک قالب WhatsApp با یک متغیر بسازید و `ContentSid` آن را ثبت کنید.

```env
TWILIO_ACCOUNT_SID="ACxxxxxxxx"
TWILIO_AUTH_TOKEN="xxxxxxxx"
TWILIO_WHATSAPP_NUMBER="+14155238886"   # یا شماره سندباکس/تأییدشده
TWILIO_WHATSAPP_CONTENT_SID="HXxxxxxxxx"
```

---

## ۴. ورود با وی‌چت / WeChat ⚙️

ورود اصلی WeChat با **اسکن QR** است (مسیر رسمی WeChat Open Platform). دو فلوی بومی NextAuth پیاده شده است:
- `wechat` → صفحات دسکتاپ (QR: `open.weixin.qq.com/connect/qrconnect`)
- `wechat_mp` → داخل مرورگر داخلی WeChat (OfficialAccount authorize) — به‌صورت خودکار تشخیص داده می‌شود.

**مراحل:**
1. ثبت‌نام در [WeChat Open Platform](https://open.weixin.qq.com) (نیاز به احراز هویت شرکت و هزینه‌ی سالانه‌ی تأیید دارد).
2. یک **Website Application** بسازید و دامنه‌ی سایت را به‌عنوان **Authorization callback domain** ثبت کنید (فقط دامنه‌ی ریشه، بدون پروتکل).
3. برای یکسان شدن شناسه‌ی کاربر بین اپ‌ها، اپ را به حساب Open Platform لینک کنید تا `unionid` صادر شود (در غیر این صورت `openid` همان اپ به‌عنوان شناسه ذخیره می‌شود).
4. متغیرها — **هر دو** باید تنظیم شوند تا دکمه‌ی QR نمایش داده شود:

```env
WECHAT_APP_ID="wx1234567890abcdef"
WECHAT_APP_SECRET="xxxxxxxxxxxxxxxx"
```

> نکته: سرور فیروزو باید بتواند به `open.weixin.qq.com` و `api.weixin.qq.com` دسترسی داشته باشد. اگر ورود QR فعال نباشد، صفحه‌ی لاگین به‌جای خطای زمان اجرا، پیام شفاف «فعال نشده» نمایش می‌دهد و کاربر می‌تواند با شماره موبایل (SMS) وارد شود.

---

## جمع‌بندی: چه چیزهایی از شما لازم است؟

| کانال | چیزی که باید تهیه کنید | متغیرهای محیطی |
|---|---|---|
| گوگل | OAuth Client (رایگان، چند دقیقه) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| تلگرام | بات در BotFather + `/setdomain` (رایگان) | `TELEGRAM_BOT_TOKEN`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` |
| واتساپ | Meta Cloud API یا Twilio + تمپلیت Authentication | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_OTP_TEMPLATE_NAME` (یا `TWILIO_*`) |
| وی‌چت | حساب WeChat Open Platform (شرکتی/غیررایگان) | `WECHAT_APP_ID`, `WECHAT_APP_SECRET` |

پیام‌رسان **بله (Bale)** از قبل تنظیم و فعال است.

## تست سریع لوکال

```bash
npm run dev
# http://localhost:3000/fa/auth
```

- اگر کلیدی تنظیم نشده باشد، دکمه/کانال مربوطه یا مخفی می‌شود یا پیام شفاف نمایش می‌دهد (خطای زمان اجرا نمی‌بینید).
- در حالت dev اگر ارائه‌دهنده‌ای در دسترس نباشد، کد OTP در همین صفحه به‌صورت «کد دسترسی موقت» نمایش داده می‌شود (فقط خارج از پروداکشن).
