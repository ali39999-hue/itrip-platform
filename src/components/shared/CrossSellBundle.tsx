'use client';

import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES, CountryId } from '@/lib/countries';
import { useRouter } from '@/i18n/routing';
import {
  Plane, BedDouble, Compass, CarTaxiFront, TrainFront,
  ShieldCheck, Wallet, Wifi, ArrowLeft
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const SERVICE_ICONS: Record<string, LucideIcon> = {
  stays: BedDouble,
  flights: Plane,
  tours: Compass,
  transfer: CarTaxiFront,
  transport: TrainFront,
  visa: ShieldCheck,
  money: Wallet,
  esim: Wifi,
  insurance: ShieldCheck,
};

interface CrossSellBundleProps {
  currentService: 'flights' | 'stays' | 'tours' | 'transfer';
  destination?: string; // Search query destination (e.g., IST, Dubai)
}

export function CrossSellBundle({ currentService, destination }: CrossSellBundleProps) {
  const { country } = useCountryStore();
  const router = useRouter();
  
  // Try to find if the destination matches a specific country, otherwise fallback to the active country store
  let targetCountryId: CountryId = country;
  
  if (destination) {
    const dLower = destination.toLowerCase();
    const foundEntry = Object.entries(COUNTRIES).find(([, config]) => 
      config.cities.some(city => 
        city.en.toLowerCase().includes(dLower) || 
        city.fa.includes(dLower)
      )
    );
    if (foundEntry) {
      targetCountryId = foundEntry[0] as CountryId;
    }
  }

  const c = COUNTRIES[targetCountryId];
  
  // Filter out the service they are currently looking at, and only show a max of 4 tailored cross-sells
  const crossSells = c.services
    .filter(s => s.key !== currentService)
    .slice(0, 4);

  if (crossSells.length === 0) return null;

  return (
    <div className="bg-surface rounded-xl border border-line p-5 shadow-elev-1 overflow-hidden relative group">
      {/* Background glow effect */}
      <div className="absolute top-0 end-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl -z-10 group-hover:bg-brand/10 transition-colors" />
      
      <div className="flex flex-col md:flex-row gap-5 items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-black text-ink flex items-center gap-2">
            سفر خود به {destination ? destination : c.nameFa} را کامل کنید
            <span className="px-2 py-0.5 rounded text-[10px] bg-action text-ink">پیشنهاد هوشمند</span>
          </h3>
          <p className="text-[13px] text-sub mt-1 max-w-lg">
            تمامی خدمات {c.nameFa} بدون نیاز به تغییر پلتفرم در دسترس شماست. خدمات ضروری برای ورود و اقامت را همزمان تهیه کنید.
          </p>
        </div>
        <button 
          onClick={() => router.push('/services')} 
          className="shrink-0 hidden md:inline-flex items-center gap-1.5 text-brand-dark text-[13px] font-bold hover:gap-2.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
        >
          مشاهده تمام خدمات {c.nameFa} <ArrowLeft size={14} className="ltr:-scale-x-100" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {crossSells.map((s) => {
          const Icon = SERVICE_ICONS[s.key] || Compass;
          return (
            <button
              key={s.key}
              onClick={() => router.push(s.href)}
              className="flex items-start text-start p-3.5 rounded-xl border border-line/60 bg-surface hover:border-brand/40 hover:bg-mint/30 transition-all card-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <div className="w-9 h-9 shrink-0 grid place-items-center rounded-lg bg-soft text-brand-dark me-3">
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <strong className="block text-[13px] font-black text-ink mb-1 truncate">{s.title}</strong>
                <span className="block text-[11px] font-bold text-sub leading-snug line-clamp-2">{s.desc}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
