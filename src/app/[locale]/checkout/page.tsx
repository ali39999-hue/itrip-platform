'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { lt } from '@/lib/lt';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useBookingStore } from '@/stores/booking-store';
import { useAuthStore } from '@/stores/auth-store';
import { useCountryStore } from '@/stores/country-store';
import { countryName } from '@/lib/countries';
import { normalizeBookingType, passengerSchema, type Passenger } from '@/lib/validations';
import { createBookingDraft, payBooking, getWallet } from '@/actions/booking';
import { useHydration } from '@/hooks/useHydration';

import { CheckoutStepper, type CheckoutPhase } from '@/components/checkout/CheckoutStepper';
import { PassengerSection } from '@/components/checkout/PassengerSection';
import { AddonsSection, ESIM_PRICE, INSURANCE_PRICE } from '@/components/checkout/AddonsSection';
import { PriceBreakdownTable } from '@/components/checkout/PriceBreakdownTable';
import { PaymentGatewaySelector } from '@/components/checkout/PaymentGatewaySelector';
import { IssuingModal } from '@/components/checkout/IssuingModal';
import { SuccessConfirmation } from '@/components/checkout/SuccessConfirmation';

import { v4 as uuidv4 } from 'uuid';

export default function CheckoutPage() {
  const locale = useLocale();
  const router = useRouter();
  const hydrated = useHydration();
  const { country } = useCountryStore();
  const bookingContext = useBookingStore((s) => s.bookingContext);
  const setPassengers = useBookingStore((s) => s.setPassengers);
  const wallet = useBookingStore((s) => s.wallet);
  const authUser = useAuthStore((s) => s.user);

  const [phase, setPhase] = useState<CheckoutPhase>('passengers');
  const [addEsim, setAddEsim] = useState(false);
  const [addInsurance, setAddInsurance] = useState(false);
  const [draftBookingId, setDraftBookingId] = useState<string | null>(null);
  const [serverWallet, setServerWallet] = useState<number | null>(null);
  const [method, setMethod] = useState<'wallet_irr' | 'gateway'>('wallet_irr');
  const [scanning, setScanning] = useState(false);
  const [passportScanned, setPassportScanned] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(25);
  const [issueStep, setIssueStep] = useState(0);
  const [confirmedRef, setConfirmedRef] = useState('');
  const [confirmedTitle, setConfirmedTitle] = useState('');
  const [idempotencyKey] = useState(() => uuidv4());

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<Passenger>({
    resolver: zodResolver(passengerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      nationalId: '',
      passportNo: '',
      birthDate: '',
      gender: 'MALE',
    },
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [phase]);

  useEffect(() => {
    if (phase !== 'issuing') return;
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Real server wallet balance (authoritative for wallet payments).
  useEffect(() => {
    let cancelled = false;
    getWallet()
      .then((res) => {
        if (!cancelled && res.success) setServerWallet(res.balances.IRR ?? 0);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Wait for the persisted store before deciding — avoids a false empty state.
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-paper py-12 px-4">
        <div className="max-w-4xl mx-auto space-y-4" aria-busy="true" aria-live="polite">
          <div className="h-10 w-64 rounded-xl bg-soft animate-pulse" />
          <div className="h-72 rounded-3xl bg-soft animate-pulse" />
          <div className="h-40 rounded-3xl bg-soft animate-pulse" />
        </div>
      </div>
    );
  }

  // No fabricated orders: without a real booking context there is nothing to check out.
  if (!bookingContext) {
    return (
      <div className="min-h-screen bg-paper py-16 md:py-24 px-4">
        <div className="max-w-md mx-auto text-center bg-surface border border-line rounded-3xl p-10 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-mint grid place-items-center mx-auto mb-5 text-2xl" aria-hidden>
            🧳
          </div>
          <h1 className="text-xl font-black text-ink mb-2">
            {lt(locale, { fa: 'سبد رزرو شما خالی است', en: 'Your booking cart is empty', ar: 'سلة الحجز فارغة', zh: '预订购物车是空的', ru: 'Корзина бронирования пуста' })}
          </h1>
          <p className="text-[13px] font-bold text-sub mb-6 leading-relaxed">
            {lt(locale, {
              fa: 'برای ادامه، ابتدا یک پرواز، هتل یا تور انتخاب کنید.',
              en: 'Pick a flight, hotel or tour first to continue to checkout.',
              ar: 'اختر رحلة أو فندقاً أو جولة أولاً للمتابعة.',
              zh: '请先选择航班、酒店或旅游套餐再进行结算。',
              ru: 'Сначала выберите рейс, отель или тур, чтобы продолжить.',
            })}
          </p>
          <button
            type="button"
            onClick={() => router.push('/book')}
            className="w-full min-h-[52px] rounded-xl bg-action hover:bg-action-hover text-ink text-[15px] font-black shadow-md transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            {lt(locale, { fa: 'مشاهده خدمات سفر', en: 'Explore Travel Services', ar: 'استكشف خدمات السفر', zh: '浏览旅行服务', ru: 'Смотреть услуги' })}
          </button>
        </div>
      </div>
    );
  }

  // Upfront auth gate: asking for identity BEFORE the long passenger form
  // prevents the classic funnel loss of filling everything and then being
  // redirected to sign-in with all data gone.
  if (!authUser) {
    return (
      <div className="min-h-screen bg-paper py-16 md:py-24 px-4">
        <div className="max-w-md mx-auto text-center bg-surface border border-line rounded-3xl p-10 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-mint grid place-items-center mx-auto mb-5 text-2xl" aria-hidden>
            🔐
          </div>
          <h1 className="text-xl font-black text-ink mb-2">
            {lt(locale, {
              fa: 'برای تکمیل رزرو وارد شوید',
              en: 'Sign in to complete your booking',
              ar: 'سجّل الدخول لإكمال الحجز',
              zh: '登录以完成预订',
              ru: 'Войдите, чтобы завершить бронирование',
            })}
          </h1>
          <p className="text-[13px] font-bold text-sub mb-6 leading-relaxed">
            {lt(locale, {
              fa: 'برای صدور واچر رسمی، تأیید هویت با شماره موبایل لازم است. اطلاعات سبد شما حفظ می‌شود.',
              en: 'We verify your mobile number to issue an official voucher. Your selected item is saved and will be here when you return.',
              ar: 'نتحقق من رقم هاتفك لإصدار قسيمة رسمية. عنصر تحديدك محفوظ وسينتظر عودتك.',
              zh: '我们需要验证您的手机号以出具官方凭证。您选择的商品已保存，返回后仍在。',
              ru: 'Мы проверяем ваш номер телефона для выпуска официального ваучера. Выбранный вариант сохранён и будет здесь.',
            })}
          </p>
          <button
            type="button"
            onClick={() => router.push('/auth?callbackUrl=/checkout')}
            className="w-full min-h-[52px] rounded-xl bg-action hover:bg-action-hover text-ink text-[15px] font-black shadow-md transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            {lt(locale, { fa: 'ورود / ثبت‌نام', en: 'Sign In / Register', ar: 'تسجيل الدخول / التسجيل', zh: '登录 / 注册', ru: 'Вход / Регистрация' })}
          </button>
        </div>
      </div>
    );
  }

  const baseAmount = bookingContext?.amount ?? 0;
  const itemTitle = bookingContext?.title ?? '';
  const currency = 'IRR';
  const walletBalance = serverWallet ?? wallet.IRR ?? 0;

  function scanPassport() {
    setScanning(true);
    setTimeout(() => {
      setValue('firstName', 'ALI');
      setValue('lastName', 'MOHAMMADI');
      setValue('passportNo', 'L2948175');
      setValue('birthDate', '1988-06-15');
      setValue('nationalId', '0012345678');
      setValue('gender', 'MALE');
      setScanning(false);
      setPassportScanned(true);
    }, 1400);
  }

  const onSubmitPassenger = async (data: Passenger) => {
    setError('');
    if (!authUser?.phone) {
      setError(
        lt(locale, {
          fa: 'شماره تماس یافت نشد. لطفاً از طریق شماره موبایل وارد شوید یا در پروفایل شماره ثبت کنید.',
          en: 'No contact phone found. Please sign in with your mobile number or add one to your profile.',
          ar: 'لم يتم العثور على رقم هاتف. يرجى تسجيل الدخول برقم هاتفك أو إضافته إلى ملفك.',
          zh: '未找到联系电话。请使用手机号登录或在个人资料中添加。',
          ru: 'Контактный телефон не найден. Войдите по номеру телефона или добавьте его в профиль.',
        })
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const btype = normalizeBookingType(bookingContext?.type) || 'HOTEL';

    const bp: import('@/lib/types').BookingPassenger = {
      firstNameFa: data.firstName,
      lastNameFa: data.lastName,
      firstNameEn: data.firstName,
      lastNameEn: data.lastName,
      passportNo: data.passportNo,
      nationalId: data.nationalId ?? '',
      birthDate: data.birthDate,
      gender: data.gender === 'FEMALE' ? 'female' : 'male',
    };

    setPassengers([bp]);

    try {
      const draft = await createBookingDraft({
        type: btype,
        itemId: bookingContext?.id,
        itemTitle,
        travelDate: bookingContext?.travelDate || undefined,
        details: {
          title: itemTitle,
          passengers: [data],
          addons: { esim: addEsim, insurance: addInsurance },
        },
        addonIds: [
          ...(addEsim ? ['esim'] : []),
          ...(addInsurance ? ['insurance'] : []),
        ],
        addons: { esim: addEsim, insurance: addInsurance },
        passengers: [data],
        contactEmail: authUser?.email || 'guest@firuzo.com',
        contactPhone: authUser.phone,
      });

      if (draft.success && draft.bookingId) {
        setDraftBookingId(draft.bookingId);
        setPhase('payment');
        return;
      }
      // Draft failure keeps the user on the passenger step so they can fix
      // the problem — never advances to a payment phase they cannot pay in.
      setError(
        draft.error === 'Unauthorized'
          ? lt(locale, { fa: 'برای ادامه وارد حساب خود شوید.', en: 'Please sign in to continue.', ar: 'يرجى تسجيل الدخول للمتابعة.', zh: '请先登录后继续。', ru: 'Войдите, чтобы продолжить.' })
          : draft.error
            ? lt(locale, { fa: 'خطا در ثبت رزرو: ', en: 'Booking draft failed: ', ar: 'فشل إنشاء الحجز: ', zh: '创建预订失败：', ru: 'Ошибка бронирования: ' }) + draft.error
            : lt(locale, { fa: 'خطا در ثبت رزرو. دوباره تلاش کنید.', en: 'Could not create the booking draft. Please retry.', ar: 'تعذر إنشاء الحجز. حاول مجدداً.', zh: '创建预订失败，请重试。', ru: 'Не удалось создать бронирование. Повторите попытку.' })
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError(
        lt(locale, { fa: 'خطای ارتباط با سرور. دوباره تلاش کنید.', en: 'Server connection error. Please retry.', ar: 'خطأ في الاتصال بالخادم. حاول مجدداً.', zh: '服务器连接错误，请重试。', ru: 'Ошибка соединения с сервером. Повторите попытку.' })
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  async function handleFinalPayment() {
    setError('');
    setPhase('issuing');
    setIssueStep(0);

    const animationDelay = (ms: number, fn: () => void) => setTimeout(fn, ms);

    // The animation is a progress indicator — the payment itself is awaited
    // and success is only shown once the server has confirmed it.
    const paymentPromise = draftBookingId
      ? payBooking(draftBookingId, method === 'wallet_irr' ? 'wallet_irr' : 'gateway_shetab', idempotencyKey)
      : Promise.resolve({ success: false as const, error: 'NO_DRAFT' });

    const minAnimation = new Promise<void>((resolve) => {
      animationDelay(1800, () => setIssueStep(1));
      animationDelay(3600, () => setIssueStep(2));
      animationDelay(5200, () => resolve());
    });

    let paymentRes: Awaited<ReturnType<typeof payBooking>> | { success: false; error: string };
    try {
      paymentRes = await paymentPromise;
    } catch {
      setError(
        lt(locale, { fa: 'خطای غیرمنتظره در پرداخت رخ داد.', en: 'An unexpected error occurred during payment.', ar: 'حدث خطأ غير متوقع أثناء الدفع.', zh: '支付过程中发生意外错误。', ru: 'При оплате произошла непредвиденная ошибка.' })
      );
      setPhase('payment');
      return;
    }

    if (!paymentRes.success) {
      if ((paymentRes as { error?: string }).error === 'NO_DRAFT') {
        setError(
          lt(locale, { fa: 'ابتدا اطلاعات مسافر را ثبت کنید.', en: 'Submit passenger details first.', ar: 'أدخل بيانات المسافر أولاً.', zh: '请先提交乘客信息。', ru: 'Сначала укажите данные пассажира.' })
        );
      } else {
        setError((paymentRes as { error?: string }).error || 'Payment failed');
      }
      setPhase('payment');
      return;
    }

    // Server confirmed — take the real reference (and PNR if already issued).
    const booking = (paymentRes as { booking?: { reference?: string; externalPnr?: string } }).booking;
    await minAnimation;
    setConfirmedRef(booking?.externalPnr || booking?.reference || '');
    setConfirmedTitle(itemTitle);
    setPhase('success');
  }

  return (
    <div className="min-h-screen bg-paper py-8 md:py-12 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Stepper */}
        {phase !== 'success' && <CheckoutStepper phase={phase} />}

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-[13px] font-bold">
            {error}
          </div>
        )}

        {/* Phase 1: Passenger Form */}
        {phase === 'passengers' && (
          <form onSubmit={handleSubmit(onSubmitPassenger)} className="space-y-6">
            <PassengerSection
              register={register}
              control={control}
              errors={errors}
              scanning={scanning}
              onScanPassport={scanPassport}
              passportScanned={passportScanned}
            />

            <AddonsSection
              addEsim={addEsim}
              setAddEsim={setAddEsim}
              addInsurance={addInsurance}
              setAddInsurance={setAddInsurance}
              countryName={countryName(country, locale)}
            />

            <PriceBreakdownTable
              baseAmount={baseAmount}
              currency={currency}
              addEsim={addEsim}
              addInsurance={addInsurance}
              itemTitle={itemTitle}
            />

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="w-full sm:w-auto min-h-[52px] px-8 rounded-xl bg-action hover:bg-action-hover text-ink text-[15px] font-black shadow-md transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
              >
                {lt(locale, {
                  fa: 'تایید اطلاعات و ادامه به مرحله پرداخت ←',
                  en: 'Confirm Details & Continue to Payment →',
                  ar: 'تأكيد البيانات والمتابعة إلى الدفع ←',
                  zh: '确认信息并前往支付 →',
                  ru: 'Подтвердить данные и перейти к оплате →',
                })}
              </button>
            </div>
          </form>
        )}

        {/* Phase 2: Payment & Review */}
        {phase === 'payment' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <PaymentGatewaySelector
              method={method}
              setMethod={setMethod}
              walletBalance={walletBalance}
              totalPayable={baseAmount + (addEsim ? ESIM_PRICE : 0) + (addInsurance ? INSURANCE_PRICE : 0)}
            />

            <PriceBreakdownTable
              baseAmount={baseAmount}
              currency={currency}
              addEsim={addEsim}
              addInsurance={addInsurance}
              itemTitle={itemTitle}
            />

            {/* Contextual Trust & Anxiety Relief Banner */}
            <div className="p-4 rounded-2xl bg-mint/40 border border-brand/20 flex items-center gap-3 text-xs text-brand-dark font-bold">
              <span className="w-8 h-8 rounded-full bg-mint flex items-center justify-center shrink-0 shadow-xs">
                🛡️
              </span>
              <p className="leading-relaxed">
                {lt(locale, {
                  fa: 'تراکنش امن با پروتکل رمزنگاری ۲۵۶ بیتی. صدور آنی واچر رسمی و ضمانت استرداد وجه طبق قوانین کنسلی.',
                  en: 'Secure 256-bit encrypted transaction. Instant official voucher issuance and refund guarantee per cancellation policy.',
                  ar: 'معاملة آمنة مع تشفير 256 بت. إصدار فوري للقسيمة الرسمية وضمان الاسترداد حسب سياسة الإلغاء.',
                  zh: '256位加密安全交易。即时出具官方凭证，并按照退订政策提供退款保障。',
                  ru: 'Безопасная транзакция с 256-битным шифрованием. Мгновенная выдача ваучера и гарантия возврата по правилам отмены.',
                })}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={() => setPhase('passengers')}
                className="text-[13px] font-bold text-sub hover:text-ink underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none rounded"
              >
                {lt(locale, {
                  fa: '← بازگشت به ویرایش مشخصات',
                  en: '← Back to Passenger Details',
                  ar: '← العودة لتعديل البيانات',
                  zh: '← 返回修改乘客信息',
                  ru: '← Вернуться к данным пассажиров',
                })}
              </button>

              <button
                type="button"
                onClick={handleFinalPayment}
                disabled={!draftBookingId}
                className="w-full sm:w-auto min-h-[52px] px-8 rounded-xl bg-action hover:bg-action-hover text-ink text-[15px] font-black shadow-md transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {lt(locale, {
                  fa: 'تایید نهایی و پرداخت',
                  en: 'Finalize & Complete Payment',
                  ar: 'التأكيد النهائي والدفع',
                  zh: '最终确认并支付',
                  ru: 'Подтвердить и оплатить',
                })}
              </button>
            </div>
          </div>
        )}

        {/* Phase 3: Issuing Animation */}
        {phase === 'issuing' && (
          <IssuingModal countdown={countdown} issueStep={issueStep} />
        )}

        {/* Phase 4: Success & Confirmation */}
        {phase === 'success' && (
          <SuccessConfirmation
            confirmedRef={confirmedRef}
            confirmedTitle={confirmedTitle}
          />
        )}
      </div>
    </div>
  );
}
