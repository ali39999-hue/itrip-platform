'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';
import { getDemoPaymentPreview, simulateEcardoPayment } from '@/actions/demo-payment';
import {
  Loader2,
  Lock,
  CreditCard,
  Coins,
  CircleDollarSign,
  Banknote,
  FlaskConical,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

type Preview =
  | { success: true; payment: { amount: number; currency: string; status: string; bookingId: string | null } }
  | { success: false; error: string };

const CURRENCY_ICONS: Record<string, typeof CreditCard> = {
  IRR: Banknote,
  USD: CircleDollarSign,
  USDT: Coins,
  CNY: CircleDollarSign,
};

function formatAmount(amount: number, currency: string, locale: string): string {
  const formatted = amount.toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US', {
    maximumFractionDigits: currency === 'IRR' ? 0 : 2,
  });
  const unit =
    currency === 'IRR'
      ? lt(locale, { fa: 'تومان', en: 'Toman' })
      : currency === 'USDT'
        ? 'USDT'
        : currency === 'CNY'
          ? 'CNY (¥)'
          : 'USD ($)';
  return `${formatted} ${unit}`;
}

export default function EcardoDemoCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" aria-busy="true" aria-live="polite">
          <Loader2 className="animate-spin text-brand" size={32} />
        </div>
      }
    >
      <DemoCheckoutContent />
    </Suspense>
  );
}

function DemoCheckoutContent() {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const ref = searchParams.get('ref') || '';

  const [preview, setPreview] = useState<Preview | null>(null);
  const [submitting, setSubmitting] = useState<'success' | 'failed' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getDemoPaymentPreview(ref)
      .then((res) => {
        if (active) setPreview(res);
      })
      .catch(() => {
        if (active) setPreview({ success: false, error: 'Failed to load payment' });
      });
    return () => {
      active = false;
    };
  }, [ref]);

  async function act(outcome: 'success' | 'failed') {
    if (submitting) return;
    setSubmitting(outcome);
    setError('');
    try {
      const res = await simulateEcardoPayment(ref, outcome);
      if (res.success && res.redirectUrl) {
        window.location.href = res.redirectUrl;
        return;
      }
      setError(res.error || lt(locale, { fa: 'شبیه‌سازی ناموفق بود', en: 'Simulation failed' }));
    } catch {
      setError(lt(locale, { fa: 'خطای شبکه در شبیه‌سازی', en: 'Network error during simulation' }));
    } finally {
      setSubmitting(null);
    }
  }

  const amountText = preview?.success ? formatAmount(preview.payment.amount, preview.payment.currency, locale) : '';
  const CurrencyIcon = preview?.success ? CURRENCY_ICONS[preview.payment.currency] || CreditCard : CreditCard;

  return (
    <div className="min-h-screen bg-[#0b1020] text-white flex flex-col" dir={locale === 'fa' ? 'rtl' : 'ltr'}>
      {/* Demo-mode ribbon */}
      <div className="w-full bg-amber-400 text-slate-900 text-center text-[11px] sm:text-xs font-black py-1.5 px-3">
        {lt(locale, {
          fa: 'حالت دمو — این صفحه درگاه واقعی ایکاردو نیست و هیچ پول واقعی جابه‌جا نمی‌شود',
          en: 'DEMO MODE — this is not the real eCardo gateway; no real money moves',
        })}
      </div>

      {/* Gateway-style header */}
      <header className="px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-4 border-b border-white/10">
        <div className="max-w-[480px] mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 grid place-items-center shrink-0">
              <FlaskConical size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="font-black text-sm leading-tight">eCardo Checkout</p>
              <p className="text-[11px] text-white/60 font-bold flex items-center gap-1">
                <Lock size={11} aria-hidden="true" />
                {lt(locale, { fa: 'اتصال امن (شبیه‌سازی)', en: 'Secure session (simulated)' })}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black bg-amber-400/90 text-slate-900 rounded-md px-2 py-1 shrink-0">
            DEMO
          </span>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-6 pb-40">
        <div className="max-w-[480px] mx-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-400/30 text-rose-200 text-xs font-bold">
              {error}
            </div>
          )}

          {preview === null && (
            <div className="p-10 grid place-items-center text-white/70">
              <Loader2 className="animate-spin" size={28} />
            </div>
          )}

          {preview && !preview.success && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center space-y-3">
              <XCircle className="mx-auto text-rose-300" size={36} aria-hidden="true" />
              <p className="font-black text-sm">{preview.error}</p>
              <p className="text-xs text-white/60 font-bold leading-relaxed">
                {lt(locale, {
                  fa: 'یک شارژ کیف پول جدید از صفحه کیف پول شروع کنید تا صفحه دمو ساخته شود.',
                  en: 'Start a new wallet top-up from the wallet page to create a demo session.',
                })}
              </p>
            </div>
          )}

          {preview && preview.success && (
            <>
              {/* Amount card */}
              <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-white/60">
                    {lt(locale, { fa: 'پذیرنده', en: 'Merchant' })}
                  </span>
                  <span className="text-sm font-black">Firuzo · فیروزو</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white/60">
                    {lt(locale, { fa: 'مبلغ قابل پرداخت', en: 'Amount due' })}
                  </span>
                  <span className="flex items-center gap-2 text-xl sm:text-2xl font-black font-mono num" dir="ltr">
                    <CurrencyIcon size={20} className="text-emerald-300" aria-hidden="true" />
                    {amountText}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                  <span className="text-xs font-bold text-white/60">
                    {lt(locale, { fa: 'شماره تراکنش', en: 'Transaction ID' })}
                  </span>
                  <span className="text-xs font-mono font-bold bg-white/10 rounded-lg px-2.5 py-1" dir="ltr">
                    {ref}
                  </span>
                </div>
                {preview.payment.bookingId && (
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs font-bold text-white/60">
                      {lt(locale, { fa: 'سفارش', en: 'Order' })}
                    </span>
                    <span className="text-[11px] font-mono text-white/70 truncate max-w-[60%]" dir="ltr">
                      {preview.payment.bookingId.slice(0, 24)}
                    </span>
                  </div>
                )}
              </section>

              {/* Instrument picker (visual) */}
              <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <p className="text-xs font-bold text-white/60 mb-3">
                  {lt(locale, { fa: 'روش پرداخت (نمایشی)', en: 'Payment instrument (visual only)' })}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: CreditCard, label: 'Visa / MC' },
                    { icon: Coins, label: 'USDT' },
                    { icon: CircleDollarSign, label: 'CNY / Alipay' },
                  ].map(({ icon: Icon, label }, i) => (
                    <div
                      key={label}
                      className={`min-h-[56px] rounded-xl border p-2 flex flex-col items-center justify-center gap-1 text-[10px] font-bold ${
                        i === 0 ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-200' : 'border-white/10 text-white/50'
                      }`}
                      aria-current={i === 0 ? 'true' : undefined}
                    >
                      <Icon size={18} aria-hidden="true" />
                      {label}
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2.5" aria-hidden="true">
                  <div className="h-11 rounded-xl bg-white/5 border border-white/10 flex items-center px-3 text-sm font-mono text-white/50" dir="ltr">
                    4242 4242 4242 4242
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-11 rounded-xl bg-white/5 border border-white/10 flex items-center px-3 text-sm font-mono text-white/50" dir="ltr">
                      12 / 34
                    </div>
                    <div className="h-11 rounded-xl bg-white/5 border border-white/10 flex items-center px-3 text-sm font-mono text-white/50" dir="ltr">
                      •••
                    </div>
                  </div>
                </div>
              </section>

              <p className="text-[11px] text-white/50 font-bold leading-relaxed px-1">
                {lt(locale, {
                  fa: 'با زدن «پرداخت موفق»، یک IPN امضاشده (HMAC واقعی) به وب‌هوک پلتفرم ارسال می‌شود و کل مسیر تولیدی — تایید امضا، capture و شارژ لجر — اجرا می‌شود.',
                  en: 'Pressing "Pay" sends a genuinely signed (HMAC) IPN to the platform webhook, exercising the full production path: signature verification, capture and ledger credit.',
                })}
              </p>
            </>
          )}
        </div>
      </main>

      {/* Sticky thumb-zone action bar */}
      {preview && preview.success && (
        <div className="fixed bottom-0 inset-x-0 bg-[#0b1020]/95 backdrop-blur-md border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] z-40">
          <div className="max-w-[480px] mx-auto grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => act('success')}
              disabled={submitting !== null}
              className="min-h-[48px] w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition active:scale-[0.98]"
            >
              {submitting === 'success' ? (
                <Loader2 className="animate-spin" size={18} aria-hidden="true" />
              ) : (
                <CheckCircle2 size={18} aria-hidden="true" />
              )}
              {lt(locale, { fa: 'پرداخت موفق (دمو)', en: 'Pay successfully (demo)' })}
            </button>
            <button
              type="button"
              onClick={() => act('failed')}
              disabled={submitting !== null}
              className="min-h-[44px] w-full rounded-xl border border-white/20 text-white/80 hover:bg-white/5 font-black text-xs flex items-center justify-center gap-2 transition active:scale-[0.98]"
            >
              <XCircle size={15} aria-hidden="true" />
              {lt(locale, { fa: 'شبیه‌سازی پرداخت ناموفق', en: 'Simulate failed payment' })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
