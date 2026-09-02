'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useBookingStore } from '@/stores/booking-store';
import { useCountryStore } from '@/stores/country-store';
import { countryName } from '@/lib/countries';
import { passengerSchema, type Passenger, type BookingType } from '@/lib/validations';
import { createBookingDraft, payBooking } from '@/actions/booking';

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
  const { country } = useCountryStore();
  const bookingContext = useBookingStore((s) => s.bookingContext);
  const setPassengers = useBookingStore((s) => s.setPassengers);
  const wallet = useBookingStore((s) => s.wallet);

  const [phase, setPhase] = useState<CheckoutPhase>('passengers');
  const [addEsim, setAddEsim] = useState(false);
  const [addInsurance, setAddInsurance] = useState(false);
  const [draftBookingId, setDraftBookingId] = useState<string | null>(null);
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

  const baseAmount = bookingContext?.amount ?? 34500000;
  const itemTitle = bookingContext?.title ?? 'رزرو هتل لوکس مشهد';
  const currency = 'IRR';
  const walletBalance = wallet.IRR ?? 50000000;

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
    const btype = (bookingContext?.type?.toUpperCase() || 'HOTEL') as BookingType;

    const bp: import('@/lib/types').BookingPassenger = {
      firstNameFa: data.firstName || 'کاربر',
      lastNameFa: data.lastName || 'فیروز',
      firstNameEn: data.firstName || 'User',
      lastNameEn: data.lastName || 'Firuzo',
      passportNo: data.passportNo || 'A12345678',
      nationalId: data.nationalId,
      birthDate: data.birthDate || '1990-01-01',
      gender: data.gender === 'FEMALE' ? 'female' : 'male',
    };

    try {
      const draft = await createBookingDraft({
        type: btype,
        itemId: bookingContext?.id,
        itemTitle,
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
        contactEmail: 'user@firuzo.com',
        contactPhone: '09123456789',
      });

      if (draft.success && draft.bookingId) {
        setDraftBookingId(draft.bookingId);
      }
      setPassengers([bp]);
      setPhase('payment');
    } catch {
      setPassengers([bp]);
      setPhase('payment');
    }
  };

  async function handleFinalPayment() {
    setError('');
    setPhase('issuing');
    setIssueStep(0);

    setTimeout(() => setIssueStep(1), 1800);
    setTimeout(() => setIssueStep(2), 3600);

    setTimeout(async () => {
      const finalRef = 'FIR-' + Math.floor(100000 + Math.random() * 900000);
      setConfirmedRef(finalRef);
      setConfirmedTitle(itemTitle);

      if (draftBookingId) {
        try {
          const res = await payBooking(draftBookingId, method === 'wallet_irr' ? 'wallet_irr' : 'gateway_shetab', idempotencyKey);
          if (!res.success) {
            setError(res.error || 'Payment failed');
            setPhase('payment');
            return;
          }
        } catch {
          setError('An unexpected error occurred during payment.');
          setPhase('payment');
          return;
        }
      }

      setPhase('success');
    }, 5200);
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
                className="w-full sm:w-auto min-h-[52px] px-8 rounded-xl bg-action hover:bg-action-hover text-ink text-[15px] font-black shadow-md transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
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
