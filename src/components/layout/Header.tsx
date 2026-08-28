'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter, Link, usePathname } from '@/i18n/routing';
import { Globe, Headset, UserRound, ChevronDown, Check, MapPin, Plane, BedDouble, FileText, ShieldCheck, CarTaxiFront, Train, Smartphone, Briefcase, Wallet, Map, Compass, CreditCard, Menu, X, Sparkles } from 'lucide-react';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES, COUNTRY_ORDER, countryName } from '@/lib/countries';
import type { CountryId } from '@/lib/countries';

function CountrySwitcher() {
  const { country, setCountry } = useCountryStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const c = COUNTRIES[country];

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('pointerdown', onDoc);
      return () => document.removeEventListener('pointerdown', onDoc);
    }
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="انتخاب کشور مقصد"
        className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-black text-brand-dark bg-brand/10 hover:bg-brand/20 transition border-0 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
      >
        <MapPin size={14} className="text-brand-dark" />
        <span>{c.flag} {countryName(country, locale)}</span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="listbox" className="absolute top-[calc(100%+8px)] end-0 z-90 w-52 p-1.5 border border-line rounded-xl bg-surface shadow-elev-2">
          {COUNTRY_ORDER.map((id: CountryId) => (
            <button
              key={id}
              onClick={() => { setCountry(id); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-[13px] font-bold transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
                id === country ? 'bg-mint text-brand-dark' : 'text-ink hover:bg-soft'
              }`}
            >
              <span>{COUNTRIES[id].flag}</span>
              <span className="flex-1 text-start">{countryName(id, locale)}</span>
              <span dir="ltr" className="text-[10px] text-sub">{COUNTRIES[id].currency}</span>
              {id === country && <Check size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const LOCALES = [
  { id: 'fa', label: 'فارسی', dir: 'RTL' },
  { id: 'en', label: 'English', dir: 'LTR' },
  { id: 'ar', label: 'العربية', dir: 'RTL' },
  { id: 'zh', label: '中文', dir: 'LTR' },
  { id: 'ru', label: 'Русский', dir: 'LTR' },
] as const;

const NAV_CATEGORIES = [
  {
    key: 'explore',
    items: [
      { key: 'destinations', href: '/destinations', icon: Map },
      { key: 'tours', href: '/tours', icon: Compass },
      { key: 'travelogues', href: '/travelogues', icon: FileText },
      { key: 'guide', href: '/guide', icon: FileText }
    ]
  },
  {
    key: 'services',
    items: [
      { key: 'snapp', href: '/snapp', icon: Wallet },
      { key: 'cityPass', href: '/city-pass', icon: CreditCard },
      { key: 'flights', href: '/flights/search', icon: Plane },
      { key: 'hotels', href: '/hotels/search', icon: BedDouble },
      { key: 'visa', href: '/visa', icon: FileText },
      { key: 'insurance', href: '/insurance', icon: ShieldCheck },
      { key: 'transfer', href: '/transfers', icon: CarTaxiFront },
      { key: 'trains', href: '/trains', icon: Train },
      { key: 'esim', href: '/esim', icon: Smartphone }
    ]
  },
  {
    key: 'trips',
    items: [
      { key: 'my-trips', href: '/my-trips', icon: Briefcase },
      { key: 'wallet', href: '/wallet', icon: Wallet }
    ]
  }
];

function NavDropdown({ category, t, colorClass }: { category: typeof NAV_CATEGORIES[0], t: ReturnType<typeof useTranslations>, colorClass: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`min-h-[38px] inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-black transition border border-transparent hover:border-current/10 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${colorClass}`}
      >
        {t(`nav.${category.key}`)}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      
      {open && (
        <div role="menu" className="absolute top-[calc(100%+8px)] start-0 z-90 w-48 p-1.5 border border-line rounded-xl bg-surface shadow-elev-2">
          {category.items.map((item) => (
            <Link
              role="menuitem"
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="group w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-bold text-ink hover:bg-soft hover:text-brand-dark transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              <item.icon size={15} className="text-sub group-hover:text-current transition" />
              {t(`nav.${item.key}`)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('pointerdown', onDoc);
      return () => document.removeEventListener('pointerdown', onDoc);
    }
  }, [open]);

  const current = LOCALES.find((l) => l.id === locale) ?? LOCALES[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Language"
        aria-expanded={open}
        aria-haspopup="listbox"
        className="min-h-[38px] w-[38px] inline-flex items-center justify-center rounded-full text-brand-dark bg-brand/10 hover:bg-brand/20 transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
      >
        <Globe size={17} />
      </button>
      {open && (
        <div role="listbox" className="absolute top-[calc(100%+8px)] end-0 z-90 w-44 p-1.5 border border-line rounded-xl bg-surface shadow-elev-2">
          {LOCALES.map((l) => (
            <button
              key={l.id}
              onClick={() => {
                setOpen(false);
                const query = searchParams.toString();
                const href = query ? `${pathname}?${query}` : pathname;
                router.replace(href, { locale: l.id });
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-bold transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
                l.id === current.id ? 'bg-mint text-brand-dark' : 'text-ink hover:bg-soft'
              }`}
            >
              <span className="font-black w-8 text-start" dir="ltr">{l.id.toUpperCase()}</span>
              <span className="flex-1 text-start">{l.label}</span>
              <span className="text-[10px] text-sub">{l.dir}</span>
              {l.id === current.id && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileMenu({ t }: { t: ReturnType<typeof useTranslations> }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) {
    return (
      <button 
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="md:hidden min-h-[38px] w-[38px] inline-flex items-center justify-center rounded-full text-sub hover:text-brand-dark hover:bg-mint transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        aria-label="منوی موبایل"
      >
        <Menu size={20} />
      </button>
    );
  }

  return (
    <>
      <button 
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="md:hidden min-h-[38px] w-[38px] inline-flex items-center justify-center rounded-full text-brand-dark bg-mint transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        aria-label="منوی موبایل"
      >
        <Menu size={20} />
      </button>
      
      <div className="fixed inset-0 z-[100] bg-surface flex flex-col sheet-up">
        <div className="h-16 px-4 flex items-center justify-between border-b border-line/60">
          <Link href="/" onClick={() => setOpen(false)} className="inline-flex items-center text-brand-dark font-black tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-xl">
            <img src="/firuzo-logo.png" alt={t('brand')} className="h-10 w-auto object-contain mix-blend-multiply" />
          </Link>
          <button 
            onClick={() => setOpen(false)}
            aria-label="بستن منو"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-soft text-sub hover:text-ink transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-6 hide-scrollbar">
          {NAV_CATEGORIES.map((category) => (
            <div key={category.key}>
              <h4 className="text-[11px] font-black text-sub mb-3 uppercase tracking-wider">
                {t(`nav.${category.key}`)}
              </h4>
              <div className="grid grid-cols-1 gap-1">
                {category.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-soft text-ink font-bold text-[14px] transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                  >
                    <span className="w-8 h-8 rounded-full bg-mint/50 flex items-center justify-center text-brand-dark">
                      <item.icon size={16} />
                    </span>
                    {t(`nav.${item.key}`)}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          
          <div className="pt-4 border-t border-line/60">
            <Link
              href="/plan"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl bg-brand/10 text-brand-dark font-black text-[14px] transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              <span className="w-8 h-8 rounded-full bg-brand text-surface flex items-center justify-center">
                <Sparkles size={16} />
              </span>
              {t('nav.plan')}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export function Header() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const locale = useLocale();
  const t = useTranslations('Header');

  const displayName = user
    ? (locale === 'fa' || locale === 'ar' 
        ? (user.firstNameFa || user.firstNameEn || 'کاربر') 
        : (user.firstNameEn || user.firstNameFa || 'User'))
    : '';

  return (
    <header className="sticky top-0 z-[75] glass-bar border-b border-line/60 shadow-[0_1px_0_rgba(20,32,31,.03)]">
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 h-16 flex items-center gap-3">
        <MobileMenu t={t} />
        <Link href="/" className="inline-flex items-center text-brand-dark font-black text-[21px] tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-xl">
          <img src="/firuzo-logo.png" alt={t('brand')} className="h-10 w-auto object-contain mix-blend-multiply" />
        </Link>

        <nav className="hidden md:flex items-center gap-1 mx-auto">
          {NAV_CATEGORIES.map((category, idx) => {
            const colors = ['text-brand-dark bg-mint/70 hover:bg-mint', 'text-action bg-action/10 hover:bg-action/20', 'text-sub bg-soft hover:bg-line'];
            return <NavDropdown key={category.key} category={category} t={t} colorClass={colors[idx % colors.length]} />;
          })}
          <Link
            href="/plan"
            className="min-h-[38px] inline-flex items-center px-4 rounded-full text-[13px] font-black text-action bg-transparent border border-action hover:bg-action/10 transition shadow-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            {t('nav.plan')}
          </Link>
        </nav>

        <div className="flex items-center gap-1.5 ms-auto md:ms-0">
          <CountrySwitcher />
          <LocaleSwitcher />
          <Link href="/support" className="hidden lg:inline-flex min-h-[38px] w-[38px] items-center justify-center rounded-full text-brand-dark bg-brand/10 hover:bg-brand/20 transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none" aria-label={t('support')}>
            <Headset size={17} />
          </Link>

          {user ? (
            <button
              onClick={() => router.push('/account')}
              className="min-h-[38px] inline-flex items-center gap-2 px-4 rounded-full bg-brand text-surface text-[13px] font-bold hover:bg-brand-2 transition shadow-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              <UserRound size={15} />
              {displayName}
            </button>
          ) : (
            <button
              onClick={() => router.push('/auth')}
              className="min-h-[38px] inline-flex items-center gap-2 px-5 rounded-full bg-brand text-surface text-[13px] font-bold hover:bg-brand-2 transition shadow-sm shadow-brand/25 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              <UserRound size={15} />
              {t('signIn')}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
