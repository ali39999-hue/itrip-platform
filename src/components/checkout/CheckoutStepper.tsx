'use client';

import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';

export type CheckoutPhase = 'passengers' | 'payment' | 'issuing' | 'success';

interface CheckoutStepperProps {
  phase: CheckoutPhase;
}

const STEPS = [
  { id: 'passengers', labelKey: 'stepPassengers' as const, num: 1 },
  { id: 'payment', labelKey: 'stepPayment' as const, num: 2 },
  { id: 'issuing', labelKey: 'stepIssuing' as const, num: 3 },
];

export function CheckoutStepper({ phase }: CheckoutStepperProps) {
  const t = useTranslations('Checkout');
  const phaseIdx = phase === 'passengers' ? 0 : phase === 'payment' ? 1 : 2;
  const currentStepNum = phase === 'success' ? 3 : phaseIdx + 1;

  return (
    <nav
      aria-label="Checkout progress"
      className="w-full max-w-2xl mx-auto mb-8"
    >
      {/* Visual & ARIA progressbar indicator */}
      <div
        role="progressbar"
        aria-valuenow={currentStepNum}
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-label={`Step ${currentStepNum} of ${STEPS.length}`}
        className="relative"
      >
        <div className="flex items-center justify-between relative">
          <div className="absolute top-1/2 start-0 end-0 h-0.5 bg-line/80 -translate-y-1/2 z-0" />
          <div
            className="absolute top-1/2 start-0 h-0.5 bg-brand transition-all duration-500 -translate-y-1/2 z-0"
            style={{ width: `${(phaseIdx / (STEPS.length - 1)) * 100}%` }}
          />

          <ol role="list" className="w-full flex items-center justify-between relative z-10 m-0 p-0 list-none">
            {STEPS.map((step, idx) => {
              const isDone = phaseIdx > idx || phase === 'success';
              const isCurrent = phaseIdx === idx && phase !== 'success';
              const label = t(step.labelKey);
              return (
                <li
                  key={step.id}
                  role="listitem"
                  aria-current={isCurrent ? 'step' : undefined}
                  className="flex flex-col items-center"
                >
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-[13px] sm:text-sm transition-all ${
                      isDone
                        ? 'bg-brand text-surface shadow-md shadow-brand/20'
                        : isCurrent
                        ? 'bg-action text-ink ring-4 ring-gold-soft font-black shadow-md'
                        : 'bg-surface border-2 border-line text-sub'
                    }`}
                  >
                    {isDone ? <Check size={18} aria-hidden="true" /> : step.num}
                  </div>
                  <span
                    className={`mt-2 text-[11.5px] sm:text-[13px] font-bold text-center ${
                      isCurrent ? 'text-brand-dark font-black' : isDone ? 'text-ink' : 'text-sub'
                    }`}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </nav>
  );
}
