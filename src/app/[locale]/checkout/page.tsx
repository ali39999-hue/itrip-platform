'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
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
    const totalAmount = baseAmount + (addEsim ? ESIM_PRICE : 0) + (addInsurance ? INSURANCE_PRICE : 0);

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
      const draft = await createBookingDraft(
        {
          type: btype,
          details: {
            title: itemTitle,
            passengers: [data],
            addons: { esim: addEsim, insurance: addInsurance },
          },
          passengers: [data],
          totalAmount,
          currency: 'IRR',
          contactEmail: 'user@firuzo.com',
          contactPhone: '09123456789',
        },
        totalAmount,
        'IRR'
      );

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
          await payBooking(draftBookingId, method === 'wallet_irr' ? 'wallet_irr' : 'gateway_shetab');
        } catch {
          // Fallback gracefully
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
                className="w-full sm:w-auto min-h-[52px] px-8 rounded-xl bg-action hover:bg-action-hover text-[#14201f] text-[15px] font-black shadow-md transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
              >
                تایید اطلاعات و ادامه به مرحله پرداخت ←
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

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setPhase('passengers')}
                className="text-[13px] font-bold text-sub hover:text-ink underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none rounded"
              >
                ← بازگشت به ویرایش مشخصات
              </button>

              <button
                type="button"
                onClick={handleFinalPayment}
                className="min-h-[52px] px-8 rounded-xl bg-action hover:bg-action-hover text-[#14201f] text-[15px] font-black shadow-md transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
              >
                تایید نهایی و پرداخت
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
