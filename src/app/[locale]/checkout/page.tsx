'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { lt } from '@/lib/lt';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useBookingStore } from '@/stores/booking-store';
import { useAuthStore } from '@/stores/auth-store';
import { useCountryStore } from '@/stores/country-store';
import { countryName } from '@/lib/countries';
import { normalizeBookingType, passengerSchema, type Passenger } from '@/lib/validations';
import { createBookingDraft, payBooking, getWallet, repriceBookingAction } from '@/actions/booking';
import { getAdminPaymentModeAction, setAdminPaymentModeAction } from '@/actions/admin-payment-mode';
import { AlertTriangle } from 'lucide-react';
import { useHydration } from '@/hooks/useHydration';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';
import { calculateCountryPricing, formatMoney } from '@/lib/money';

import { CheckoutStepper, type CheckoutPhase } from '@/components/checkout/CheckoutStepper';
import { PassengerSection } from '@/components/checkout/PassengerSection';
import { AddonsSection, ESIM_PRICE, INSURANCE_PRICE } from '@/components/checkout/AddonsSection';
import { ReferralInputSection } from '@/components/checkout/ReferralInputSection';
import { PriceBreakdownTable } from '@/components/checkout/PriceBreakdownTable';
import { SoftLockTimer } from '@/components/checkout/SoftLockTimer';
import { CancellationPolicyCard } from '@/components/checkout/CancellationPolicyCard';
import { PaymentGatewaySelector, type PaymentMethodType, type EcardoInstrument } from '@/components/checkout/PaymentGatewaySelector';
import { CardTransferPaymentView } from '@/components/checkout/CardTransferPaymentView';
import { CryptoPaymentView } from '@/components/checkout/CryptoPaymentView';
import { IssuingModal } from '@/components/checkout/IssuingModal';
import { SuccessConfirmation } from '@/components/checkout/SuccessConfirmation';
import { StickyMobileBar } from '@/components/checkout/StickyMobileBar';
import { trackFunnel } from '@/lib/analytics';
import { PassportValidityGuard } from '@/domains/identity/PassportValidityGuard';
import { getMyTravelerProfilesAction, saveTravelerProfileAction, saveTravelDocumentAction } from '@/actions/travelers';
import { EnrichedTravelerProfile } from '@/domains/identity/TravelerProfileService';

import { v4 as uuidv4 } from 'uuid';

export default function CheckoutPage() {
  const locale = useLocale();
  const tCheckout = useTranslations('Checkout');
  const router = useRouter();
  const hydrated = useHydration();
  const { country } = useCountryStore();
  const { currency, taxRate, taxLabel, gatewayFeeRate, gatewayFeeLabel } = useDisplayCurrency();
  const bookingContext = useBookingStore((s) => s.bookingContext);
  const setPassengers = useBookingStore((s) => s.setPassengers);
  const wallet = useBookingStore((s) => s.wallet);
  const authUser = useAuthStore((s) => s.user);
  const searchParams = useSearchParams();

  const [phase, setPhase] = useState<CheckoutPhase>('passengers');
  const [addEsim, setAddEsim] = useState(false);
  const [addInsurance, setAddInsurance] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [referralDiscountAmount, setReferralDiscountAmount] = useState(0);
  const [draftBookingId, setDraftBookingId] = useState<string | null>(null);
  const [serverWallet, setServerWallet] = useState<number | null>(null);
  const [method, setMethod] = useState<PaymentMethodType>('gateway_ecardo');
  const [selectedInstrument, setSelectedInstrument] = useState<EcardoInstrument>('visa_mastercard');
  const [scanning, setScanning] = useState(false);
  const [passportScanned, setPassportScanned] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(25);
  const [issueStep, setIssueStep] = useState(0);
  const [confirmedRef, setConfirmedRef] = useState('');
  const [confirmedTitle, setConfirmedTitle] = useState('');
  const [idempotencyKey] = useState(() => uuidv4());
  const [priceChangeInfo, setPriceChangeInfo] = useState<{
    oldAmount: number;
    newAmount: number;
    diff: number;
    currency: string;
  } | null>(null);
  const [priceChangeAccepted, setPriceChangeAccepted] = useState(false);
  const [savedProfiles, setSavedProfiles] = useState<EnrichedTravelerProfile[]>([]);
  const [saveToAccount, setSaveToAccount] = useState(false);
  const [adminPaymentMode, setAdminPaymentMode] = useState<'real' | 'demo'>('demo');
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    let active = true;
    getAdminPaymentModeAction()
      .then((res) => {
        if (!active) return;
        setIsAdminUser(res.isAdmin);
        setAdminPaymentMode(res.mode);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [authUser]);

  async function handleToggleAdminPaymentMode(nextMode: 'real' | 'demo') {
    setAdminPaymentMode(nextMode);
    try {
      await setAdminPaymentModeAction(nextMode);
    } catch (e) {
      console.error('Failed to set admin payment mode:', e);
    }
  }

  const totalTravelers = Math.max(1, (bookingContext?.adults ?? 1) + (bookingContext?.children ?? 0));
  const [currentPassengerIdx, setCurrentPassengerIdx] = useState(0);
  const [passengersList, setPassengersList] = useState<Passenger[]>(() =>
    Array.from({ length: 9 }, () => ({
      firstName: '',
      lastName: '',
      nationalId: '',
      passportNo: '',
      passportExpiryDate: '',
      birthDate: '',
      gender: 'MALE' as const,
    }))
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<Passenger>({
    resolver: zodResolver(passengerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      nationalId: '',
      passportNo: '',
      passportExpiryDate: '',
      birthDate: '',
      gender: 'MALE',
    },
  });

  const handleSelectPassengerTab = (newIdx: number) => {
    if (newIdx === currentPassengerIdx) return;
    const currentValues = getValues();
    setPassengersList((prev) => {
      const updated = [...prev];
      updated[currentPassengerIdx] = { ...currentValues };
      return updated;
    });
    const target = passengersList[newIdx] || {
      firstName: '',
      lastName: '',
      nationalId: '',
      passportNo: '',
      passportExpiryDate: '',
      birthDate: '',
      gender: 'MALE',
    };
    reset(target);
    setCurrentPassengerIdx(newIdx);
  };

  const passengersStatus = Array.from({ length: totalTravelers }).map((_, i) => {
    const p = i === currentPassengerIdx ? getValues() : passengersList[i];
    const isComplete = Boolean(p?.firstName && p?.lastName && p?.passportNo && p?.birthDate);
    const fullName = `${p?.firstName || ''} ${p?.lastName || ''}`.trim();
    return {
      isComplete,
      name: fullName || undefined,
    };
  });

  useEffect(() => {
    if (authUser?.id) {
      getMyTravelerProfilesAction().then((res) => {
        if (res.success && res.data) {
          setSavedProfiles(res.data);
        }
      }).catch(() => {});
    }
  }, [authUser?.id]);

  const handleSelectSavedProfile = (profile: EnrichedTravelerProfile) => {
    setValue('firstName', profile.firstName, { shouldValidate: true });
    setValue('lastName', profile.lastName, { shouldValidate: true });
    if (profile.nationalId) setValue('nationalId', profile.nationalId, { shouldValidate: true });
    if (profile.primaryPassport?.documentNumber) setValue('passportNo', profile.primaryPassport.documentNumber, { shouldValidate: true });
    if (profile.primaryPassport?.expiresAt) setValue('passportExpiryDate', profile.primaryPassport.expiresAt, { shouldValidate: true });
    if (profile.dateOfBirth) setValue('birthDate', profile.dateOfBirth, { shouldValidate: true });
    if (profile.gender === 'MALE' || profile.gender === 'FEMALE') setValue('gender', profile.gender, { shouldValidate: true });

    setPassengersList((prev) => {
      const updated = [...prev];
      updated[currentPassengerIdx] = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        nationalId: profile.nationalId || '',
        passportNo: profile.primaryPassport?.documentNumber || '',
        passportExpiryDate: profile.primaryPassport?.expiresAt || '',
        birthDate: profile.dateOfBirth || '',
        gender: (profile.gender as 'MALE' | 'FEMALE') || 'MALE',
      };
      return updated;
    });
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [phase]);

  // Pre-fill referral code from ?ref= query parameter if present
  useEffect(() => {
    const ref = searchParams?.get('ref');
    if (ref) {
      setReferralCode(ref.toUpperCase());
    }
  }, [searchParams]);

  useEffect(() => {
    if (phase !== 'issuing') return;
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Real server wallet balance (authoritative for wallet payments, country-adapted).
  useEffect(() => {
    let cancelled = false;
    getWallet()
      .then((res) => {
        if (!cancelled && res.success && res.balances) {
          const preferred = country === 'iran' ? 'IRR' : country === 'china' ? 'CNY' : 'USD';
          const bal = res.balances[preferred]
            ?? (preferred !== 'IRR' ? (res.balances.USDT ?? res.balances.USD ?? 0) : 0);
          setServerWallet(bal);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [country]);

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
  // Demo wallet mirror follows the country currency too (BUG-007 seeding is IRR-first).
  const walletBalance = serverWallet
    ?? (country === 'iran'
      ? wallet.IRR
      : country === 'china'
      ? (wallet.CNY ?? wallet.USDT ?? wallet.IRR)
      : (wallet.USD ?? wallet.USDT ?? wallet.IRR))
    ?? 0;

  const subtotalBeforeFees = Math.max(
    0,
    baseAmount + (addEsim ? ESIM_PRICE : 0) + (addInsurance ? INSURANCE_PRICE : 0) - referralDiscountAmount
  );
  const countryPricing = calculateCountryPricing({
    subtotal: subtotalBeforeFees,
    countryId: country,
    gateway: method,
  });
  const totalPayable = countryPricing.totalPayable;

  function scanPassport() {
    setScanning(true);
    setTimeout(() => {
      setValue('firstName', 'ALI');
      setValue('lastName', 'MOHAMMADI');
      setValue('passportNo', 'L2948175');
      setValue('passportExpiryDate', '2028-10-15');
      setValue('birthDate', '1988-06-15');
      setValue('nationalId', '0012345678');
      setValue('gender', 'MALE');
      setScanning(false);
      setPassportScanned(true);
    }, 1400);
  }

  const onSubmitPassenger = async (data: Passenger) => {
    setError('');

    // Passport Validity Guard (Travel-CRM & International 6-Month Rule)
    if (data.passportExpiryDate && bookingContext?.travelDate) {
      const pCheck = PassportValidityGuard.verifyPassport({
        passportExpiryDate: data.passportExpiryDate,
        travelDate: bookingContext.travelDate,
      });
      if (!pCheck.isValidForTravel) {
        setError(locale === 'fa' ? pCheck.message.fa : pCheck.message.en);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
    trackFunnel('passenger_submitted', {
      route: '/checkout',
      locale,
      type: bookingContext?.type ?? 'unknown',
      travelers: Math.max(1, (bookingContext?.adults ?? 1) + (bookingContext?.children ?? 0)),
    });

    if (saveToAccount && authUser?.id) {
      saveTravelerProfileAction({
        firstName: data.firstName,
        lastName: data.lastName,
        nationalId: data.nationalId || null,
        dateOfBirth: data.birthDate || null,
        gender: (data.gender as 'MALE' | 'FEMALE') || null,
        nationality: 'IR',
      }).then((res) => {
        if (res.success && res.profile && data.passportNo) {
          saveTravelDocumentAction(res.profile.id, {
            type: 'PASSPORT',
            documentNumber: data.passportNo,
            expiresAt: data.passportExpiryDate || null,
          });
        }
      }).catch(() => {});
    }

    // Fabricated fallback numbers corrupt booking contact data — an email-only
    // user must add a real phone instead of silently booking under a fake one.
    const contactPhone = authUser?.phone || '';
    if (!contactPhone) {
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

    // Multi-passenger assembly & validation: assemble actual distinct passenger inputs
    const finalPassengers = [...passengersList];
    finalPassengers[currentPassengerIdx] = data;

    for (let i = 0; i < totalTravelers; i++) {
      const p = finalPassengers[i];
      const parsed = passengerSchema.safeParse(p);
      if (!parsed.success) {
        setCurrentPassengerIdx(i);
        reset(p);
        setError(
          locale === 'fa'
            ? `لطفاً مشخصات مسافر ${i + 1} را به طور کامل تکمیل نمایید.`
            : `Please complete passenger ${i + 1} details.`
        );
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    // احراز هویت خریدار در مرحله خرید (KYC at Purchase):
    // برای صدور قانونی بلیط و واچر، ثبت کد ملی معتبر یا پاسپورت مسافر اصلی الزامی است.
    const leadPassenger = finalPassengers[0];
    if (!leadPassenger.nationalId && !leadPassenger.passportNo) {
      setCurrentPassengerIdx(0);
      reset(leadPassenger);
      setError(
        lt(locale, {
          fa: 'جهت احراز هویت خریدار (KYC) و صدور رسمی بلیط، ثبت کد ملی ۱۰ رقمی یا شماره گذرنامه مسافر اصلی الزامی است.',
          en: '10-digit National ID or Passport number is required for buyer verification (KYC) and official booking.',
          ar: 'الرقم الوطني المكون من 10 أرقام أو جواز السفر مطلوب للتحقق من هوية المشتري (KYC) وإصدار الحجز.',
          zh: '需要主要旅客的10位身份证号或护照号用于买家实名认证（KYC）及正式预订。',
          ru: '10-значный национальный ID или паспорт обязателен для верификации покупателя (KYC) и оформления бронирования.',
        })
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // ذخیره خودکار اطلاعات هویتی مسافر اول در پروفایل خریدار در صورت ناقص بودن پروفایل
    if (authUser && !authUser.profileComplete && leadPassenger.firstName && leadPassenger.lastName) {
      import('@/actions/auth').then(({ updateProfileDetails }) => {
        updateProfileDetails({
          firstNameFa: leadPassenger.firstName,
          lastNameFa: leadPassenger.lastName,
          nationalId: leadPassenger.nationalId || undefined,
          passportNo: leadPassenger.passportNo || undefined,
          passportExpiry: leadPassenger.passportExpiryDate || undefined,
        }).then((res) => {
          if (res.success) {
            useAuthStore.setState((s) => ({
              user: s.user ? {
                ...s.user,
                firstNameFa: leadPassenger.firstName,
                lastNameFa: leadPassenger.lastName,
                nationalId: leadPassenger.nationalId || s.user.nationalId,
                profileComplete: true,
                kycApproved: true,
              } : null,
            }));
          }
        }).catch(() => {});
      }).catch(() => {});
    }

    const allFormData = finalPassengers.slice(0, totalTravelers);

    const allBps: import('@/lib/types').BookingPassenger[] = allFormData.map((p) => ({
      firstNameFa: p.firstName,
      lastNameFa: p.lastName,
      firstNameEn: p.firstName,
      lastNameEn: p.lastName,
      passportNo: p.passportNo,
      nationalId: p.nationalId ?? '',
      birthDate: p.birthDate,
      gender: p.gender,
    }));

    setPassengers(allBps);

    try {
      const draft = await createBookingDraft({
        type: btype,
        itemId: bookingContext?.id,
        itemTitle,
        count: totalTravelers,
        travelDate: bookingContext?.travelDate || undefined,
        details: {
          title: itemTitle,
          passengers: allFormData,
          addons: { esim: addEsim, insurance: addInsurance },
        },
        addonIds: [
          ...(addEsim ? ['esim'] : []),
          ...(addInsurance ? ['insurance'] : []),
        ],
        addons: { esim: addEsim, insurance: addInsurance },
        passengers: allFormData,
        contactEmail: authUser?.email || 'guest@firuzo.com',
        contactPhone,
        referralCode: referralCode.trim() || undefined,
        // One key per checkout session: a retry of draft creation returns the
        // original draft instead of creating a duplicate (BUG-003).
        idempotencyKey,
        source: 'WEB',
      });

      if ('bookingId' in draft && draft.bookingId) {
        setDraftBookingId(draft.bookingId);
        if (typeof draft.discountAmount === 'number' && draft.discountAmount > 0) {
          setReferralDiscountAmount(draft.discountAmount);
        }
        setPhase('payment');
        return;
      }
      // Draft failure keeps the user on the passenger step so they can fix
      // the problem — never advances to a payment phase they cannot pay in.
      const draftError = 'error' in draft ? draft.error : undefined;
      setError(
        draftError === 'Unauthorized'
          ? lt(locale, { fa: 'برای ادامه وارد حساب خود شوید.', en: 'Please sign in to continue.', ar: 'يرجى تسجيل الدخول للمتابعة.', zh: '请先登录后继续。', ru: 'Войдите, чтобы продолжить.' })
          : draftError
            ? lt(locale, { fa: 'خطا در ثبت رزرو: ', en: 'Booking draft failed: ', ar: 'فشل إنشاء الحجز: ', zh: '创建预订失败：', ru: 'Ошибка бронирования: ' }) + draftError
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

    // Authoritative server-side reprice before payment (MONEY-007, MONEY-011)
    if (draftBookingId && !priceChangeAccepted) {
      try {
        const repriceRes = await repriceBookingAction(draftBookingId, {
          acceptPriceChange: false,
        });
        if (repriceRes && 'requiresCustomerAcceptance' in repriceRes && repriceRes.requiresCustomerAcceptance) {
          setPriceChangeInfo({
            oldAmount: repriceRes.oldTotalAmount ?? totalPayable,
            newAmount: repriceRes.newTotalAmount ?? totalPayable,
            diff: repriceRes.priceDifference ?? 0,
            currency: repriceRes.currency || 'IRR',
          });
          return;
        }
      } catch (e) {
        console.warn('Reprice pre-check warning:', e);
      }
    }

    trackFunnel('payment_started', {
      route: '/checkout',
      locale,
      method,
      amount: totalPayable,
    });
    setPhase('issuing');
    setIssueStep(0);

    // Direct redirect flow for eCardo Multi-Currency Gateway
    if (method === 'gateway_ecardo') {
      if (!draftBookingId) {
        setError(lt(locale, { fa: 'ابتدا اطلاعات مسافر را ثبت کنید.', en: 'Submit passenger details first.', ar: 'أدخل بيانات المسافر أولاً.', zh: '请先提交乘客信息。', ru: 'Сначала укажите данные пассажира.' }));
        setPhase('payment');
        return;
      }
      try {
        const { initiateEcardoPayment } = await import('@/actions/booking');
        const initRes = await initiateEcardoPayment(draftBookingId, {
          paymentInstrument: selectedInstrument,
          // Follow the country switcher: charge in the selected country's
          // currency (mapped to the eCardo-supported rail server-side).
          targetCurrency: currency,
          paymentMode: isAdminUser ? adminPaymentMode : undefined,
        });
        if (initRes.success && initRes.redirectUrl) {
          window.location.href = initRes.redirectUrl;
          return;
        }
        setError(initRes.error || 'Failed to initialize Ecardo payment session');
        setPhase('payment');
        return;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Ecardo gateway error');
        setPhase('payment');
        return;
      }
    }

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
      trackFunnel('payment_failed', { route: '/checkout', locale, reason: 'exception' });
      setError(
        lt(locale, { fa: 'خطای غیرمنتظره در پرداخت رخ داد.', en: 'An unexpected error occurred during payment.', ar: 'حدث خطأ غير متوقع أثناء الدفع.', zh: '支付过程中发生意外错误。', ru: 'При оплате произошла непредвиденная ошибка.' })
      );
      setPhase('payment');
      return;
    }

    if (!paymentRes.success) {
      trackFunnel('payment_failed', {
        route: '/checkout',
        locale,
        reason: (paymentRes as { error?: string }).error ?? 'unknown',
      });
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
    trackFunnel('payment_succeeded', { route: '/checkout', locale, method });
    await minAnimation;
    setConfirmedRef(booking?.externalPnr || booking?.reference || '');
    setConfirmedTitle(itemTitle);
    setPhase('success');
  }

  return (
    <div className="min-h-screen bg-paper pt-8 pb-36 md:py-12 lg:pb-12 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Stepper */}
        {phase !== 'success' && <CheckoutStepper phase={phase} />}

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-[13px] font-bold">
            {error}
          </div>
        )}

        {/* Phase 1: Passenger Form */}
        {phase === 'passengers' && (
          <form id="checkout-passenger-form" onSubmit={handleSubmit(onSubmitPassenger)} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Main Form Column (Left in LTR, Right in RTL) */}
            <div className="lg:col-span-7 space-y-6">
              <PassengerSection
                register={register}
                control={control}
                errors={errors}
                scanning={scanning}
                onScanPassport={scanPassport}
                passportScanned={passportScanned}
                savedProfiles={savedProfiles}
                onSelectSavedProfile={handleSelectSavedProfile}
                saveToAccount={saveToAccount}
                onToggleSaveToAccount={setSaveToAccount}
                totalPassengers={totalTravelers}
                currentPassengerIndex={currentPassengerIdx}
                onSelectPassengerTab={handleSelectPassengerTab}
                passengersStatus={passengersStatus}
              />

              <AddonsSection
                addEsim={addEsim}
                setAddEsim={setAddEsim}
                addInsurance={addInsurance}
                setAddInsurance={setAddInsurance}
                countryName={countryName(country, locale)}
              />

              <ReferralInputSection
                referralCode={referralCode}
                setReferralCode={setReferralCode}
                onValidationChange={(isValid, discountPercent) => {
                  if (isValid) {
                    setReferralDiscountAmount(Math.round(baseAmount * discountPercent));
                  } else {
                    setReferralDiscountAmount(0);
                  }
                }}
              />

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full min-h-[54px] px-8 rounded-xl bg-action hover:bg-action-hover text-ink text-[15px] font-black shadow-md transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
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
            </div>

            {/* Sticky Order Summary Sidebar (Desktop) */}
            <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
              <PriceBreakdownTable
                baseAmount={baseAmount}
                currency={currency}
                addEsim={addEsim}
                addInsurance={addInsurance}
                itemTitle={itemTitle}
                discountAmount={referralDiscountAmount}
                referralCode={referralCode ? referralCode.trim() : undefined}
                taxRate={taxRate}
                taxLabel={taxLabel}
                gatewayFeeRate={gatewayFeeRate}
                gatewayFeeLabel={gatewayFeeLabel}
                paymentMethod={method}
              />

              {/* Security Badge in Sidebar */}
              <div className="p-4 rounded-2xl bg-surface border border-line/80 shadow-xs flex items-center gap-3 text-xs text-sub">
                <span className="w-8 h-8 rounded-full bg-mint text-brand-dark flex items-center justify-center shrink-0">
                  🔒
                </span>
                <p className="leading-relaxed">
                  {lt(locale, {
                    fa: 'اطلاعات شما با پروتکل امنیتی SSL رمزنگاری شده و صدور بلیت آنی انجام می‌شود.',
                    en: 'Your data is secured with SSL encryption and vouchers are issued instantly.',
                    ar: 'بياناتك مشفرة ومحمية ببروتوكول SSL ويتم إصدار التذاكر فوراً.',
                    zh: '您的信息采用SSL高强度加密，凭证即时出具。',
                    ru: 'Ваши данные защищены SSL-шифрованием, ваучер оформляется мгновенно.',
                  })}
                </p>
              </div>
            </div>
          </form>
        )}

        {/* Phase 2: Payment & Review */}
        {phase === 'payment' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">
            {/* Gateway / Transfer Column */}
            <div className="lg:col-span-7 space-y-6">
              {/* Soft-Lock Price & Inventory Hold Timer */}
              <SoftLockTimer locale={locale} initialSeconds={900} />

              {method === 'card_transfer' && draftBookingId ? (
                <CardTransferPaymentView
                  bookingId={draftBookingId}
                  onBackToMethods={() => setMethod('gateway')}
                  onSuccess={() => {
                    setConfirmedRef(draftBookingId);
                    setConfirmedTitle(itemTitle);
                    setPhase('success');
                  }}
                />
              ) : method === 'crypto_usdt' && draftBookingId ? (
                <CryptoPaymentView
                  bookingId={draftBookingId}
                  onBackToMethods={() => setMethod('gateway')}
                  onSuccess={() => {
                    setConfirmedRef(draftBookingId);
                    setConfirmedTitle(itemTitle);
                    setPhase('success');
                  }}
                />
              ) : (
                <>
                  <PaymentGatewaySelector
                    method={method}
                    setMethod={setMethod}
                    walletBalance={walletBalance}
                    totalPayable={baseAmount + (addEsim ? ESIM_PRICE : 0) + (addInsurance ? INSURANCE_PRICE : 0)}
                    selectedInstrument={selectedInstrument}
                    setSelectedInstrument={setSelectedInstrument}
                    isAdmin={isAdminUser}
                    adminPaymentMode={adminPaymentMode}
                    onToggleAdminPaymentMode={handleToggleAdminPaymentMode}
                  />

                  {/* Transparent Cancellation Penalty Policy */}
                  <CancellationPolicyCard locale={locale} />

                  {/* Contextual Trust Banner */}
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
                        en: '← Back to Edit Details',
                        ar: '← العودة لتعديل البيانات',
                        zh: '← 返回修改乘客信息',
                        ru: '← Вернуться к редактированию',
                      })}
                    </button>

                    <button
                      type="button"
                      onClick={handleFinalPayment}
                      className="w-full sm:w-auto min-h-[54px] px-10 rounded-xl bg-action hover:bg-action-hover text-ink text-[16px] font-black shadow-md transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                    >
                      {lt(locale, {
                        fa: 'پرداخت نهایی و صدور آنی واچر',
                        en: 'Complete Payment & Issue Voucher',
                        ar: 'الدفع النهائي وإصدار القسيمة',
                        zh: '确认支付并即时出票',
                        ru: 'Оплатить и получить ваучер',
                      })}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Sticky Order Summary Sidebar (Payment Phase) */}
            <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
              <PriceBreakdownTable
                baseAmount={baseAmount}
                currency={currency}
                addEsim={addEsim}
                addInsurance={addInsurance}
                itemTitle={itemTitle}
                discountAmount={referralDiscountAmount}
                referralCode={referralCode ? referralCode.trim() : undefined}
                taxRate={taxRate}
                taxLabel={taxLabel}
                gatewayFeeRate={gatewayFeeRate}
                gatewayFeeLabel={gatewayFeeLabel}
                paymentMethod={method}
              />
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

        {/* Sticky mobile total + CTA (conversion benchmark: total always visible) */}
        {phase === 'passengers' && (
          <StickyMobileBar
            totalCaption={tCheckout('totalPayable')}
            total={formatMoney(totalPayable, currency, locale)}
            ctaLabel={tCheckout('continueToPayment')}
            formId="checkout-passenger-form"
          />
        )}
        {phase === 'payment' && (
          <StickyMobileBar
            totalCaption={tCheckout('totalPayable')}
            total={formatMoney(totalPayable, currency, locale)}
            ctaLabel={tCheckout('confirmPay')}
            onCta={handleFinalPayment}
          />
        )}
        {/* Price Change Acceptance Modal (MONEY-011) */}
        {priceChangeInfo && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[250] bg-ink/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          >
            <div className="bg-surface rounded-3xl p-6 sm:p-8 max-w-md w-full border border-line shadow-2xl space-y-5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 mx-auto grid place-items-center">
                <AlertTriangle size={28} />
              </div>
              <div className="space-y-2">
                <h3 className="font-black text-lg sm:text-xl text-ink">
                  {lt(locale, {
                    fa: 'به‌روزرسانی نرخ تأمین‌کننده',
                    en: 'Supplier Price Updated',
                    ar: 'تحديث سعر المزود',
                    zh: '供应商价格已变动',
                    ru: 'Цена поставщика обновилась',
                  })}
                </h3>
                <p className="text-xs sm:text-sm text-sub leading-relaxed font-medium">
                  {lt(locale, {
                    fa: 'نرخ نهایی از سوی تأمین‌کننده رسمی به‌روزرسانی شده است. لطفاً پیش از پرداخت، مبلغ جدید را بررسی و تایید فرمایید.',
                    en: 'The official supplier rate has been updated. Please review and accept the revised total before payment.',
                    ar: 'تم تحديث السعر من قبل المزود. يرجى مراجعة المبلغ الجديد والموافقة عليه قبل الدفع.',
                    zh: '供应商价格已实时更新，请在付款前确认最新应付总额。',
                    ru: 'Цена поставщика изменилась. Пожалуйста, подтвердите новую сумму перед оплатой.',
                  })}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-soft border border-line space-y-2 text-xs font-bold">
                <div className="flex justify-between text-sub">
                  <span>{lt(locale, { fa: 'مبلغ قبلی:', en: 'Previous Total:', ar: 'السعر السابق:', zh: '原价：', ru: 'Прежняя цена:' })}</span>
                  <span className="line-through font-mono">{formatMoney(priceChangeInfo.oldAmount, priceChangeInfo.currency, locale)}</span>
                </div>
                <div className="flex justify-between text-ink font-black text-sm pt-1 border-t border-line">
                  <span>{lt(locale, { fa: 'مبلغ نهایی جدید:', en: 'New Total:', ar: 'السعر الجديد:', zh: '最新应付：', ru: 'Новая сумма:' })}</span>
                  <span className="text-price font-mono">{formatMoney(priceChangeInfo.newAmount, priceChangeInfo.currency, locale)}</span>
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setPriceChangeInfo(null)}
                  className="flex-1 h-12 rounded-xl bg-soft hover:bg-line/60 text-sub font-bold text-xs cursor-pointer transition"
                >
                  {lt(locale, { fa: 'انصراف', en: 'Decline', ar: 'إلغاء', zh: '取消', ru: 'Отмена' })}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!draftBookingId) return;
                    await repriceBookingAction(draftBookingId, {
                      acceptPriceChange: true,
                      customerAcceptedPrice: priceChangeInfo.newAmount,
                    });
                    setPriceChangeAccepted(true);
                    setPriceChangeInfo(null);
                    handleFinalPayment();
                  }}
                  className="flex-1 h-12 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-xs cursor-pointer transition shadow-md shadow-action/25"
                >
                  {lt(locale, { fa: 'تایید نرخ جدید و پرداخت', en: 'Accept & Pay', ar: 'موافقة ومتابعة الدفع', zh: '接受并支付', ru: 'Принять и оплатить' })}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
