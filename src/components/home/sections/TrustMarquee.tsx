'use client';

import { useLocale, useTranslations } from 'next-intl';
import { ShieldCheck, RefreshCcw, CheckCircle2, Headset } from 'lucide-react';

export function TrustMarquee() {
  const locale = useLocale();
  const t = useTranslations('Home');

  const items = [
    { icon: ShieldCheck, title: t('trustKycTitle'), desc: t('trustKycDesc') },
    { icon: RefreshCcw, title: t('trustRefundTitle'), desc: t('trustRefundDesc') },
    { icon: CheckCircle2, title: t('trustInstantTitle'), desc: t('trustInstantDesc') },
    { icon: Headset, title: t('trustSupportTitle'), desc: t('trustSupportDesc') },
  ];

  return (
    <section className="w-full border-y border-line/60 bg-surface/50 py-4 px-4 overflow-hidden">
      <div className="max-w-[1280px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-mint text-brand-dark grid place-items-center shrink-0">
                <Icon size={20} />
              </div>
              <div className="min-w-0">
                <h4 className="text-[13px] font-bold text-ink m-0 truncate">{item.title}</h4>
                <p className="text-[11px] text-sub m-0 truncate">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
