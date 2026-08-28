'use client';

import { Link } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { Wallet, ShieldCheck, ArrowLeft } from 'lucide-react';

export function FinancialSection() {
  const locale = useLocale();
  const t = useTranslations('Home');

  return (
    <section className="w-full py-12 md:py-16 px-4 md:px-10 bg-soft/30">
      <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-mint text-brand-dark text-xs font-bold mb-3">
            <Wallet size={14} />
            <span>کیف پول چندارزی فیروز</span>
          </div>
          <h2 className="text-2xl md:text-[32px] font-black text-ink tracking-tight mb-4">
            پرداخت بدون دغدغه با ریال، تتر و کارت‌های بین‌المللی
          </h2>
          <p className="text-xs sm:text-sm text-sub leading-relaxed mb-6">
            با شارژ کیف پول خود به ریال یا تتر، تمامی خدمات سفر اعم از هتل، پرواز، اسنپ محلی و سیم‌کارت را بدون نیاز به کارت بانکی خارجی در لحظه رزرو و تسویه کنید.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/wallet"
              className="h-11 px-6 rounded-xl bg-brand text-surface font-bold text-xs sm:text-sm hover:bg-brand-dark transition flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <span>مشاهده و مدیریت کیف پول</span>
              <ArrowLeft size={16} className="ltr:rotate-180" />
            </Link>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-3xl p-6 md:p-8 shadow-elev-2 space-y-6">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <span className="text-xs font-bold text-sub">موجودی تجمیعی</span>
            <span className="text-sm font-black text-ink font-mono">۱۵۰,۰۰۰,۰۰۰ تومان</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-soft border border-line/60">
              <span className="text-[11px] text-sub block mb-1">کیف پول تومانی (IRR)</span>
              <span className="text-base font-black text-brand-dark font-mono">۱۵۰,۰۰۰,۰۰۰ ت</span>
            </div>
            <div className="p-4 rounded-2xl bg-soft border border-line/60">
              <span className="text-[11px] text-sub block mb-1">کیف پول تتر (USDT)</span>
              <span className="text-base font-black text-price font-mono">۲۵۰.۰۰ USDT</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-sub bg-mint/50 p-3 rounded-xl">
            <ShieldCheck size={16} className="text-brand shrink-0" />
            <span>تضمین استرداد آنی وجه در صورت لغو طبق قوانین کنسلی</span>
          </div>
        </div>
      </div>
    </section>
  );
}
