'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useAuthStore } from '@/stores/auth-store';
import { useBookingStore } from '@/stores/booking-store';
import { Button } from '@/components/ui/button';
import {
  UserRound, Wallet, LogOut, BadgeCheck,
  LayoutGrid, PlaneTakeoff, Settings, ShieldCheck, ShieldAlert
} from 'lucide-react';

export default function AccountPage() {
  const t = useTranslations('Account');
  const locale = useLocale();
  const router = useRouter();
  const { user, kyc, logout } = useAuthStore();
  const wallet = useBookingStore((s) => s.wallet);

  if (!user) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-16 text-center">
        <UserRound size={52} className="mx-auto text-line mb-4" />
        <h1 className="text-[20px] font-black text-ink mb-2">{locale === 'fa' ? 'وارد نشده‌اید' : 'Not Signed In'}</h1>
        <p className="text-[13px] font-bold text-sub mb-6">{locale === 'fa' ? 'برای مشاهده حساب کاربری ابتدا وارد شوید' : 'Please sign in to view your account dashboard'}</p>
        <Button onClick={() => router.push('/auth')} className="bg-brand hover:bg-brand-2 text-surface h-11 px-10 font-black rounded-xl">
          {locale === 'fa' ? 'ورود / ثبت‌نام' : 'Sign In / Register'}
        </Button>
      </div>
    );
  }

  const kycDone = kyc.step === 'approved' && user.kycApproved;

  return (
    <div className="flex flex-col md:flex-row w-full max-w-[1280px] mx-auto px-4 md:px-10 py-8 gap-8">
      {/* SideNavBar */}
      <aside className="w-full md:w-72 shrink-0 bg-surface rounded-xl shadow-sm h-fit md:sticky md:top-24 border border-line/40 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-line/60 flex flex-col items-center gap-3 bg-soft/30">
          <span className="w-20 h-20 rounded-full bg-brand/10 text-brand-dark flex items-center justify-center border-4 border-surface shadow-sm">
            <UserRound size={36} />
          </span>
          <div className="text-center">
            <h2 className="text-xl font-black text-brand-dark">{locale === 'fa' ? `سلام، ${user.firstNameFa}` : `Hello, ${user.firstNameEn || user.firstNameFa}`}</h2>
            <p className="text-[13px] font-bold text-sub mt-1">{locale === 'fa' ? 'امتیاز شما: ۲۵۰۰' : 'Reward Points: 2,500'}</p>
          </div>
        </div>
        
        <nav className="flex flex-col gap-1 p-4">
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-black bg-brand text-surface shadow-sm text-start">
            <LayoutGrid size={20} /> {locale === 'fa' ? 'داشبورد' : 'Dashboard'}
          </button>
          <button onClick={() => router.push('/my-trips')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold text-sub hover:bg-soft transition-colors text-start">
            <PlaneTakeoff size={20} /> {locale === 'fa' ? 'سفرهای من' : 'My Trips'}
          </button>
          <button onClick={() => router.push('/wallet')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold text-sub hover:bg-soft transition-colors text-start">
            <Wallet size={20} /> {locale === 'fa' ? 'کیف پول و امتیازات' : 'Wallet & Rewards'}
          </button>
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold text-sub hover:bg-soft transition-colors text-start">
            <Settings size={20} /> {t('settings')}
          </button>
        </nav>
        
        <div className="p-4 mt-auto border-t border-line/60">
          <button
            onClick={() => {
              logout();
              router.push('/');
            }}
            className="w-full flex items-center justify-center gap-2 text-rose-warm hover:bg-rose-warm/10 px-4 py-3 rounded-xl transition-colors font-black text-[14px]"
          >
            <LogOut size={20} /> {t('logout')}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-surface border border-line shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-sub">{locale === 'fa' ? 'موجودی ریالی' : 'Rial Balance'}</span>
              <Wallet size={18} className="text-brand" />
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-ink font-mono num">{wallet.IRR.toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}</span>
              <span className="text-xs font-bold text-sub ms-1">{locale === 'fa' ? 'تومان' : 'Toman'}</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface border border-line shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-sub">{locale === 'fa' ? 'موجودی تتر (USDT)' : 'USDT Balance'}</span>
              <BadgeCheck size={18} className="text-brand-dark" />
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-ink font-mono num">${wallet.USDT.toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}</span>
              <span className="text-xs font-bold text-sub ms-1">USDT</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface border border-line shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-sub">{locale === 'fa' ? 'وضعیت احراز هویت' : 'Verification'}</span>
              {kycDone ? <ShieldCheck size={18} className="text-success" /> : <ShieldAlert size={18} className="text-gold" />}
            </div>
            <div className="mt-4">
              <span className={`text-sm font-black ${kycDone ? 'text-success' : 'text-gold'}`}>
                {kycDone ? (locale === 'fa' ? 'احراز هویت شده' : 'Verified') : (locale === 'fa' ? 'در انتظار تکمیل' : 'Pending KYC')}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-line p-6 md:p-8 shadow-sm">
          <h2 className="text-xl font-black text-ink mb-6">{t('profile')}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <span className="block text-xs font-bold text-sub mb-1">{locale === 'fa' ? 'نام و نام خانوادگی' : 'Full Name'}</span>
              <span className="text-base font-black text-ink">{user.firstNameFa} {user.lastNameFa}</span>
            </div>

            <div>
              <span className="block text-xs font-bold text-sub mb-1">{locale === 'fa' ? 'شماره موبایل' : 'Mobile Number'}</span>
              <span className="text-base font-black text-ink font-mono" dir="ltr">{user.phone}</span>
            </div>

            <div>
              <span className="block text-xs font-bold text-sub mb-1">{locale === 'fa' ? 'کد ملی' : 'National ID'}</span>
              <span className="text-base font-black text-ink font-mono">{kyc.nationalId || '—'}</span>
            </div>

            <div>
              <span className="block text-xs font-bold text-sub mb-1">{locale === 'fa' ? 'شماره پاسپورت' : 'Passport No'}</span>
              <span className="text-base font-black text-ink font-mono">{kyc.passportNo || '—'}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
