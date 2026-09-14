import { lt, type LText } from '@/lib/lt';

/**
 * Gateway error translation layer (PAY-UX).
 *
 * Two layers:
 * 1. Internal adapter/saga error codes and English system phrases that reach
 *    the checkout/payment-status UI raw — translated per locale instead of
 *    showing English internals to Persian users.
 * 2. PSP (Shaparak member) numeric error code dictionaries — factual gateway
 *    meanings for Zarinpal, Bank Mellat (Behpardakht), Saman Kish and Zibal,
 *    ready for the day a direct PSP adapter is wired (translatePspError).
 *
 * Unknown inputs resolve to `null` so callers keep their existing fallback copy.
 */

const GATEWAY_ERROR_I18N: Record<string, LText> = {
  // Adapter errorCodes (EcardoGatewayAdapter, ShetabPspAdapter, CardToCardPaymentAdapter)
  GATEWAY_NOT_CONFIGURED: {
    fa: 'درگاه پرداخت در دسترس نیست؛ لطفاً بعداً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.',
    en: 'The payment gateway is unavailable. Please try again later or contact support.',
    ar: 'بوابة الدفع غير متاحة. حاول لاحقاً أو تواصل مع الدعم.',
    zh: '支付网关暂不可用，请稍后重试或联系客服。',
    ru: 'Платёжный шлюз недоступен. Попробуйте позже или обратитесь в поддержку.',
  },
  MERCHANT_MISMATCH: {
    fa: 'تراکنش به دلیل عدم تطابق اطلاعات پذیرنده تایید نشد؛ لطفاً با پشتیبانی تماس بگیرید.',
    en: 'The transaction was not accepted due to a merchant mismatch. Please contact support.',
    ar: 'لم يتم قبول المعاملة بسبب عدم تطابق بيانات التاجر. يرجى التواصل مع الدعم.',
    zh: '因商户信息不匹配，交易未被接受，请联系客服。',
    ru: 'Транзакция отклонена из-за несоответствия данных мерчанта. Обратитесь в поддержку.',
  },
  TIMESTAMP_EXPIRED: {
    fa: 'نشست پرداخت منقضی شده است؛ لطفاً دوباره تلاش کنید.',
    en: 'The payment session has expired. Please try again.',
    ar: 'انتهت صلاحية جلسة الدفع. حاول مرة أخرى.',
    zh: '支付会话已过期，请重试。',
    ru: 'Сессия оплаты истекла. Попробуйте снова.',
  },
  MISSING_SIGNATURE: {
    fa: 'به دلیل نقص اطلاعات امنیتی، تراکنش تایید نشد؛ لطفاً با پشتیبانی تماس بگیرید.',
    en: 'The transaction was not accepted due to missing security information. Please contact support.',
    ar: 'لم يتم قبول المعاملة بسبب نقص المعلومات الأمنية. تواصل مع الدعم.',
    zh: '因缺少安全信息，交易未被接受，请联系客服。',
    ru: 'Транзакция отклонена из-за отсутствия данных безопасности. Обратитесь в поддержку.',
  },
  INVALID_SIGNATURE: {
    fa: 'به دلیل عدم تطابق امنیتی، تراکنش تایید نشد؛ لطفاً با پشتیبانی تماس بگیرید.',
    en: 'The transaction failed the security check. Please contact support.',
    ar: 'فشل التحقق الأمني للمعاملة. تواصل مع الدعم.',
    zh: '交易未通过安全校验，请联系客服。',
    ru: 'Транзакция не прошла проверку безопасности. Обратитесь в поддержку.',
  },
  IPN_REQUIRED: {
    fa: 'وضعیت پرداخت هنوز از سمت درگاه قطعی نشده است؛ چند لحظه بعد دوباره بررسی کنید.',
    en: 'The payment is not finalized by the gateway yet. Please check again shortly.',
    ar: 'لم يتم تأكيد الدفع نهائياً من البوابة بعد. تحقق لاحقاً.',
    zh: '网关尚未最终确认付款，请稍后再查。',
    ru: 'Шлюз ещё не подтвердил оплату окончательно. Проверьте позже.',
  },
  AMOUNT_MISMATCH: {
    fa: 'مبلغ پرداخت‌شده با مبلغ سفارش مطابقت ندارد و تراکنش تایید نشد؛ در صورت کسر وجه با پشتیبانی تماس بگیرید.',
    en: 'The settled amount does not match the order total, so the transaction was not accepted. Contact support if you were charged.',
    ar: 'المبلغ المدفوع لا يطابق إجمالي الطلب ولم يتم قبول المعاملة. تواصل مع الدعم إذا تم الخصم.',
    zh: '实付金额与订单金额不符，交易未被接受。如已扣款请联系客服。',
    ru: 'Оплаченная сумма не совпадает с суммой заказа, транзакция не принята. При списании обратитесь в поддержку.',
  },
  NETWORK_ERROR: {
    fa: 'ارتباط با درگاه پرداخت برقرار نشد؛ اتصال اینترنت خود را بررسی و دوباره تلاش کنید.',
    en: 'Could not reach the payment gateway. Check your connection and try again.',
    ar: 'تعذر الاتصال ببوابة الدفع. تحقق من اتصالك وحاول مجدداً.',
    zh: '无法连接支付网关，请检查网络后重试。',
    ru: 'Не удалось связаться с платёжным шлюзом. Проверьте соединение и повторите.',
  },
  INVALID_TRACKING_CODE: {
    fa: 'شماره پیگیری واریز معتبر نیست؛ شماره ارجاع بانکی را دقیق وارد کنید.',
    en: 'The deposit tracking number is not valid. Enter the bank reference exactly.',
    ar: 'رقم تتبع الإيداع غير صالح. أدخل مرجع البنك بدقة.',
    zh: '存款追踪号无效，请准确输入银行参考号。',
    ru: 'Неверный номер отслеживания платежа. Введите банковский референс точно.',
  },
  INVALID_CUSTOMER_CARD: {
    fa: 'شماره کارت واریزکننده معتبر نیست.',
    en: 'The paying card number is not valid.',
    ar: 'رقم بطاقة الدافع غير صالح.',
    zh: '付款卡号无效。',
    ru: 'Номер карты плательщика недействителен.',
  },
  MANUAL_VERIFICATION_REQUIRED: {
    fa: 'فیش واریز شما ثبت شد و پس از تایید مالی نهایی خواهد شد.',
    en: 'Your transfer receipt was recorded and will be finalized after finance review.',
    ar: 'تم تسجيل إيصال التحويل وسيُعتمد بعد مراجعة المالية.',
    zh: '您的转账凭证已登记，财务审核后将最终确认。',
    ru: 'Ваш платёжный документ зарегистрирован и будет подтверждён после проверки.',
  },

  // English system phrases that flow out of server actions into the checkout UI
  Unauthorized: {
    fa: 'برای ادامه، وارد حساب کاربری خود شوید.',
    en: 'Please sign in to your account to continue.',
    ar: 'يرجى تسجيل الدخول للمتابعة.',
    zh: '请先登录您的账号。',
    ru: 'Войдите в аккаунт, чтобы продолжить.',
  },
  'Booking not found': {
    fa: 'سفارش موردنظر یافت نشد.',
    en: 'The booking could not be found.',
    ar: 'لم يتم العثور على الحجز.',
    zh: '未找到该预订。',
    ru: 'Бронирование не найдено.',
  },
  'Booking is not payable in its current state': {
    fa: 'این سفارش در وضعیت فعلی قابل پرداخت نیست.',
    en: 'This booking cannot be paid in its current state.',
    ar: 'لا يمكن دفع هذا الحجز في حالته الحالية.',
    zh: '该预订当前状态无法支付。',
    ru: 'Это бронирование нельзя оплатить в текущем состоянии.',
  },
  'Invalid idempotency key': {
    fa: 'درخواست تکراری نامعتبر است؛ چند لحظه بعد دوباره تلاش کنید.',
    en: 'The duplicate request check failed. Please try again shortly.',
    ar: 'طلب مكرر غير صالح. حاول بعد قليل.',
    zh: '重复请求校验失败，请稍后重试。',
    ru: 'Сбой проверки дублирующего запроса. Повторите позже.',
  },
  'Forbidden: You do not have permission to pay for this booking': {
    fa: 'اجازه پرداخت این سفارش را ندارید.',
    en: 'You are not allowed to pay for this booking.',
    ar: 'لا تملك صلاحية دفع هذا الحجز.',
    zh: '您无权支付该预订。',
    ru: 'У вас нет прав на оплату этого бронирования.',
  },
  'Payment failed': {
    fa: 'پرداخت ناموفق بود؛ روش دیگری امتحان کنید یا دوباره تلاش کنید.',
    en: 'The payment failed. Try another method or retry.',
    ar: 'فشلت عملية الدفع. جرّب طريقة أخرى أو أعد المحاولة.',
    zh: '支付失败，请换一种方式或重试。',
    ru: 'Оплата не удалась. Попробуйте другой способ или повторите.',
  },
};

const GATEWAY_ERROR_LOOKUP: Map<string, LText> = new Map(
  Object.entries(GATEWAY_ERROR_I18N).map(([key, value]) => [key.toLowerCase(), value])
);

/**
 * Translates an internal adapter/saga error code or English system phrase into
 * a user-facing localized message. Returns null for unknown inputs so the
 * caller can fall back to its own copy.
 */
export function translateGatewayError(
  rawCodeOrMessage: string | null | undefined,
  locale: string
): string | null {
  if (!rawCodeOrMessage) return null;
  const cleaned = rawCodeOrMessage.trim();
  if (!cleaned) return null;

  // Exact match first (errorCodes are stable identifiers), then a
  // case-insensitive sweep so English phrases match any casing variant.
  const exact = GATEWAY_ERROR_I18N[cleaned];
  if (exact) return lt(locale, exact);

  const fuzzy = GATEWAY_ERROR_LOOKUP.get(cleaned.toLowerCase());
  if (fuzzy) return lt(locale, fuzzy);

  return null;
}

// ── PSP numeric error dictionaries (factual Shaparak/PSP gateway codes) ────
// Persian wording is ours; the code meanings are the PSPs' documented facts.

export const ZARINPAL_ERRORS: Record<number, string> = {
  [-1]: 'اطلاعات ارسالی به درگاه ناقص است.',
  [-2]: 'آی‌پی یا مرچنت‌کد پذیرنده معتبر نیست.',
  [-3]: 'به دلیل محدودیت‌های شاپرک، امکان پرداخت این مبلغ وجود ندارد.',
  [-4]: 'سطح تایید پذیرنده برای این تراکنش کافی نیست.',
  [-11]: 'درخواست موردنظر یافت نشد.',
  [-12]: 'امکان ویرایش این درخواست وجود ندارد.',
  [-21]: 'عملیات مالی برای این تراکنش یافت نشد.',
  [-22]: 'تراکنش ناموفق بود.',
  [-33]: 'رقم تراکنش با مبلغ پرداخت‌شده مطابقت ندارد.',
  [-34]: 'سقف تقسیم تراکنش (تعداد یا مبلغ) عبور کرده است.',
  [-40]: 'اجازه دسترسی به این متد وجود ندارد.',
  [-41]: 'اطلاعات ارسالی به درگاه نامعتبر است.',
  [-54]: 'درخواست موردنظر آرشیو شده است.',
  100: 'عملیات پرداخت با موفقیت انجام شد.',
  101: 'این تراکنش قبلاً تایید شده است.',
};

export const MELLAT_ERRORS: Record<number, string> = {
  0: 'تراکنش با موفقیت انجام شد.',
  11: 'شماره کارت نامعتبر است.',
  12: 'موجودی حساب کافی نیست.',
  13: 'رمز دوم یا اطلاعات کارت نادرست است.',
  14: 'تعداد دفعات ورود رمز اشتباه بیش از حد مجاز است.',
  15: 'کارت نامعتبر است یا توسط بانک مسدود شده است.',
  16: 'دفعات برداشت از این کارت بیش از حد مجاز است.',
  17: 'کاربر پرداخت را لغو کرده است.',
  18: 'تاریخ انقضای کارت گذشته است.',
  19: 'مبلغ برداشت بیش از حد مجاز کارت است.',
  111: 'بانک صادرکننده کارت نامعتبر است.',
  112: 'خطا در سوئیچ بانک صادرکننده کارت.',
  113: 'پاسخی از بانک صادرکننده کارت دریافت نشد.',
  114: 'دارنده کارت مجاز به انجام این تراکنش نیست.',
  415: 'زمان کاری تراکنش به پایان رسیده است.',
  416: 'خطا در ثبت اطلاعات در سامانه بانک.',
  417: 'شناسه پرداخت‌کننده نامعتبر است.',
  418: 'مشکل در تعریف اطلاعات مشتری در سیستم بانکی.',
  419: 'تعداد دفعات تلاش بیش از حد مجاز است.',
  421: 'آی‌پی ارسال‌کننده معتبر نیست.',
};

export const SAMAN_ERRORS: Record<number, string> = {
  [-1]: 'خطا در پردازش اطلاعات ارسالی.',
  [-3]: 'ورودی‌ها حاوی کاراکترهای غیرمجاز است.',
  [-4]: 'کلمه عبور یا کد فروشنده اشتباه است.',
  [-6]: 'این سند قبلاً برگشت خورده است.',
  [-7]: 'رسید دیجیتال خالی است.',
  [-8]: 'طول ورودی‌ها بیشتر از حد مجاز است.',
  1: 'تراکنش توسط خریدار لغو شد.',
  2: 'پرداخت با موفقیت انجام شد.',
  3: 'پرداخت تایید شد.',
  4: 'کارت منقضی شده است.',
  5: 'موجودی کافی نیست.',
};

export const ZIBAL_ERRORS: Record<number, string> = {
  100: 'پرداخت با موفقیت تایید شد.',
  102: 'مرچنت یافت نشد.',
  103: 'مرچنت غیرفعال است.',
  104: 'مرچنت نامعتبر است.',
  201: 'این تراکنش قبلاً تایید شده است.',
  202: 'سفارش پرداخت نشده یا ناموفق بوده است.',
  203: 'شناسه تراکنش نامعتبر است.',
};

const PSP_ERROR_TABLES: Record<string, Record<number, string>> = {
  zarinpal: ZARINPAL_ERRORS,
  mellat: MELLAT_ERRORS,
  behpardakht: MELLAT_ERRORS,
  saman: SAMAN_ERRORS,
  samankish: SAMAN_ERRORS,
  sep: SAMAN_ERRORS,
  zibal: ZIBAL_ERRORS,
};

/**
 * Translates a raw PSP numeric error code into the documented Persian meaning.
 * `provider` accepts loose aliases (e.g. "behpardakht" → Mellat). Returns null
 * when the provider or code is unknown.
 */
export function translatePspError(
  provider: string | null | undefined,
  code: number | string | null | undefined
): string | null {
  if (!provider || code === null || code === undefined || code === '') return null;
  const table = PSP_ERROR_TABLES[provider.trim().toLowerCase()];
  if (!table) return null;
  const asNumber = Number(
    String(code)
      .replace(/[۰-۹]/g, (ch) => String(ch.charCodeAt(0) - 1776))
      .replace(/[٠-٩]/g, (ch) => String(ch.charCodeAt(0) - 1632))
      .replace(/[^\d-]/g, '')
  );
  if (Number.isNaN(asNumber)) return null;
  return table[asNumber] ?? null;
}
