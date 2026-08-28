import { useState, useEffect, useCallback, useRef } from 'react';
import { useBookingStore } from '@/stores/booking-store';
import { createBookingDraft, payBooking } from '@/actions/booking';
import { ESIM_PRICE, INSURANCE_PRICE, DEFAULT_COUNTDOWN } from '../constants';
import type { CheckoutPhase, PaymentMethod } from '../types';
import type { Passenger } from '@/lib/validations';
import type { BookingPassenger } from '@/lib/types';

interface UseCheckoutWorkflowOptions {
  initialPhase?: CheckoutPhase;
  defaultBaseAmount?: number;
  defaultItemTitle?: string;
  defaultCurrency?: string;
  defaultEsimPrice?: number;
  defaultInsurancePrice?: number;
}

/**
 * Main Checkout Workflow State Machine & Logic Orchestrator
 * Coordinates step navigation, form submission, draft generation,
 * issuing progress stages, timers, and store synchronizations.
 */
export function useCheckoutWorkflow(options: UseCheckoutWorkflowOptions = {}) {
  const {
    initialPhase = 'passengers',
    defaultBaseAmount = 34500000,
    defaultItemTitle = 'رزرو هتل لوکس مشهد',
    defaultCurrency = 'IRR',
    defaultEsimPrice = ESIM_PRICE,
    defaultInsurancePrice = INSURANCE_PRICE,
  } = options;

  const bookingContext = useBookingStore((s) => s.bookingContext);
  const setPassengers = useBookingStore((s) => s.setPassengers);
  const confirmBookingStore = useBookingStore((s) => s.confirmBooking);
  const wallet = useBookingStore((s) => s.wallet);

  const [phase, setPhase] = useState<CheckoutPhase>(initialPhase);
  const [addEsim, setAddEsim] = useState(false);
  const [addInsurance, setAddInsurance] = useState(false);
  const [draftBookingId, setDraftBookingId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('wallet_irr');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(DEFAULT_COUNTDOWN);
  const [issueStep, setIssueStep] = useState(0);
  const [confirmedRef, setConfirmedRef] = useState('');
  const [confirmedTitle, setConfirmedTitle] = useState('');

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  // Scroll to top on phase transitions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [phase]);

  // Countdown timer during issuing phase
  useEffect(() => {
    if (phase !== 'issuing') return;
    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const baseAmount = bookingContext?.amount ?? defaultBaseAmount;
  const itemTitle = bookingContext?.title ?? defaultItemTitle;
  const currency = 'IRR';
  const walletBalance = wallet?.IRR ?? 150000000;

  const handlePassengerSubmit = useCallback(
    async (data: Passenger) => {
      setError('');
      const btype = (bookingContext?.type?.toUpperCase() || 'HOTEL') as any;
      const totalAmount =
        baseAmount +
        (addEsim ? defaultEsimPrice : 0) +
        (addInsurance ? defaultInsurancePrice : 0);

      const bp: BookingPassenger = {
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
            currency,
            contactEmail: 'user@firuzo.com',
            contactPhone: '09123456789',
          },
          totalAmount,
          currency
        );

        if (draft.success && draft.bookingId) {
          setDraftBookingId(draft.bookingId);
        }
        setPassengers([bp]);
        setPhase('payment');
      } catch (err: any) {
        setPassengers([bp]);
        setPhase('payment');
      }
    },
    [
      bookingContext,
      baseAmount,
      addEsim,
      addInsurance,
      defaultEsimPrice,
      defaultInsurancePrice,
      currency,
      itemTitle,
      setPassengers,
    ]
  );

  const handleFinalPayment = useCallback(async () => {
    setError('');
    setPhase('issuing');
    setIssueStep(0);
    setCountdown(DEFAULT_COUNTDOWN);
    clearTimers();

    const t1 = setTimeout(() => setIssueStep(1), 1800);
    const t2 = setTimeout(() => setIssueStep(2), 3600);

    const t3 = setTimeout(async () => {
      const finalRef = 'FIR-' + Math.floor(100000 + Math.random() * 900000);
      setConfirmedRef(finalRef);
      setConfirmedTitle(itemTitle);

      const addOnList: string[] = [];
      if (addEsim) addOnList.push('eSIM');
      if (addInsurance) addOnList.push('Insurance');

      // Update zustand store
      try {
        confirmBookingStore(method === 'wallet_irr' ? 'wallet_irr' : 'gateway_shetab', addOnList);
      } catch {
        // Fallback gracefully
      }

      // Process backend payment draft if exists
      if (draftBookingId) {
        try {
          await payBooking(
            draftBookingId,
            method === 'wallet_irr' ? 'wallet_irr' : 'gateway_shetab'
          );
        } catch {
          // Fallback gracefully
        }
      }

      setPhase('success');
    }, 5200);

    timersRef.current = [t1, t2, t3];
  }, [
    itemTitle,
    addEsim,
    addInsurance,
    method,
    draftBookingId,
    confirmBookingStore,
    clearTimers,
  ]);

  const goToPhase = useCallback((targetPhase: CheckoutPhase) => {
    setError('');
    setPhase(targetPhase);
  }, []);

  const resetWorkflow = useCallback(() => {
    clearTimers();
    setPhase('passengers');
    setAddEsim(false);
    setAddInsurance(false);
    setDraftBookingId(null);
    setMethod('wallet_irr');
    setError('');
    setCountdown(DEFAULT_COUNTDOWN);
    setIssueStep(0);
    setConfirmedRef('');
    setConfirmedTitle('');
  }, [clearTimers]);

  return {
    phase,
    setPhase,
    goToPhase,
    method,
    setMethod,
    addEsim,
    setAddEsim,
    addInsurance,
    setAddInsurance,
    draftBookingId,
    error,
    setError,
    countdown,
    issueStep,
    confirmedRef,
    confirmedTitle,
    baseAmount,
    itemTitle,
    currency,
    walletBalance,
    handlePassengerSubmit,
    handleFinalPayment,
    resetWorkflow,
  };
}
