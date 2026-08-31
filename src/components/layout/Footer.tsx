'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { Send, Camera, ShieldCheck, Clock, CreditCard, Sparkles, Check } from 'lucide-react';
import { Logo } from './Logo';
import { ShamseDivider } from '@/components/ui/Shamse';

export function Footer() {
  const t = useTranslations('Footer');
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setSubscribed(true);
    setTimeout(() => {
      setEmail('');
    }, 2500);
  };

  const footerLinks = [
    {
      title: t('booking'),
      links: [
        { name: t('flights'), href: '/flights/search' },
        { name: t('hotels'), href: '/hotels/search' },
        { name: t('tours'), href: '/tours' },
        { name: t('trains'), href: '/trains' },
      ],
    },
    {
      title: t('services'),
      links: [
        { name: t('visa'), href: '/visa' },
        { name: t('insurance'), href: '/insurance' },
        { name: t('esim'), href: '/esim' },
        { name: t('wallet'), href: '/wallet' },
      ],
    },
    {
      title: t('guide'),
      links: [
        { name: t('faq'), href: '/support' },
        { name: t('guidePage'), href: '/guide' },
        { name: t('myTrips'), href: '/my-trips' },
        { name: t('destinations'), href: '/destinations' },
      ],
    },
  ];

  return (
    <footer className="mt-20">
      {/* Value Proposition Bar */}
      <div className="bg-soft/70 border-t border-line/60 py-8">
        <div className="max-w-[1280px] mx-auto px-4 md:px-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-surface/80 border border-line/50">
            <div className="w-11 h-11 rounded-xl bg-brand/10 text-brand-dark flex items-center justify-center shrink-0">
              <Clock size={22} />
            </div>
            <div>
              <h4 className="font-black text-[14px] text-ink">{t('support24Title')}</h4>
              <p className="font-bold text-[12px] text-sub">{t('support24Desc')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-surface/80 border border-line/50">
            <div className="w-11 h-11 rounded-xl bg-action/10 text-action flex items-center justify-center shrink-0">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h4 className="font-black text-[14px] text-ink">{t('trustTitle')}</h4>
              <p className="font-bold text-[12px] text-sub">{t('trustDesc')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-surface/80 border border-line/50">
            <div className="w-11 h-11 rounded-xl bg-mint text-brand-dark flex items-center justify-center shrink-0">
              <CreditCard size={22} />
            </div>
            <div>
              <h4 className="font-black text-[14px] text-ink">{t('payTitle')}</h4>
              <p className="font-bold text-[12px] text-sub">{t('payDesc')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-surface/80 border border-line/50">
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-tour flex items-center justify-center shrink-0">
              <Sparkles size={22} />
            </div>
            <div>
              <h4 className="font-black text-[14px] text-ink">{t('smartTitle')}</h4>
              <p className="font-bold text-[12px] text-sub">{t('smartDesc')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="bg-surface border-t border-line">
        <div className="max-w-[1280px] mx-auto px-4 md:px-10 pt-12 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-10 text-start">
            <div className="col-span-1 md:col-span-2">
              <div className="mb-4">
                <Logo size="lg" />
              </div>
              <p className="text-sub text-[13px] font-bold leading-relaxed max-w-sm mb-5">
                {t('about')}
              </p>
              <div className="flex items-center gap-2">
                <a href="https://t.me" target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="w-9 h-9 grid place-items-center rounded-full border border-line text-sub hover:text-brand-dark hover:border-brand/40 hover:bg-mint transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none">
                  <Send size={16} />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-9 h-9 grid place-items-center rounded-full border border-line text-sub hover:text-brand-dark hover:border-brand/40 hover:bg-mint transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none">
                  <Camera size={16} />
                </a>
              </div>
            </div>

            {footerLinks.map((section) => (
              <div key={section.title} className="col-span-1">
                <h4 className="font-black text-[14px] text-ink mb-4">{section.title}</h4>
                <ul className="flex flex-col gap-3">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-sub hover:text-brand-dark transition-colors text-[13px] font-bold focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none">
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Newsletter Box */}
            <div className="col-span-1 md:col-span-1">
              <h4 className="font-black text-[14px] text-ink mb-3">{t('newsletterTitle')}</h4>
              <p className="text-[12px] font-bold text-sub mb-3 leading-relaxed">
                {t('newsletterDesc')}
              </p>
              <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
                <div className="relative">
                  <input
                    type="email"
                    placeholder={t('newsletterPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-[12px] font-bold rounded-xl bg-soft border border-line focus:outline-none focus:ring-1 focus:ring-brand text-ink"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-brand text-surface text-[12px] font-black hover:bg-brand-2 transition shadow-sm flex items-center justify-center gap-1.5"
                >
                  {subscribed ? (
                    <>
                      <Check size={14} className="text-surface" /> {t('newsletterDone')}
                    </>
                  ) : (
                    t('newsletterCta')
                  )}
                </button>
              </form>
            </div>
          </div>

          <ShamseDivider className="my-8" />
        </div>
      </div>

      <div className="bg-deep text-surface">
        <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-4 flex items-center justify-center text-center">
          <p className="text-[12px] text-mint-bright/80 font-bold">
            {t('rights')}
          </p>
        </div>
      </div>
    </footer>
  );
}
