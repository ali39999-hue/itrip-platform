'use client';

import { useRouter } from '@/i18n/routing';
import { useAuthStore } from '@/stores/auth-store';
import { useBookingStore } from '@/stores/booking-store';
import { Button } from '@/components/ui/button';
import {
  UserRound, Wallet, LogOut, BadgeCheck, AlertCircle,
  LayoutGrid, PlaneTakeoff, Gift, Settings, Lock, ShieldCheck,
  Settings2, ShieldAlert
} from 'lucide-react';

export default function AccountPage() {
  const router = useRouter();
  const { user, kyc, logout } = useAuthStore();
  const wallet = useBookingStore((s) => s.wallet);

  if (!user) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-16 text-center">
        <UserRound size={52} className="mx-auto text-line mb-4" />
        <h1 className="text-[20px] font-black text-ink mb-2">وارد نشده‌اید</h1>
        <p className="text-[13px] font-bold text-sub mb-6">برای مشاهده حساب کاربری ابتدا وارد شوید</p>
        <Button onClick={() => router.push('/auth')} className="bg-brand hover:bg-brand-2 text-surface h-11 px-10 font-black rounded-xl">
          ورود / ثبت‌نام
        </Button>
      </div>
    );
  }

  const kycDone = kyc.step === 'approved' && user.kycApproved;

  return (
    <div className="flex flex-col md:flex-row w-full max-w-[1280px] mx-auto px-4 md:px-10 py-8 gap-8">
      
      {/* SideNavBar (Desktop & Mobile) */}
      <aside className="w-full md:w-72 shrink-0 bg-surface rounded-xl shadow-sm h-fit md:sticky md:top-24 border border-line/40 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-line/60 flex flex-col items-center gap-3 bg-soft/30">
          <span className="w-20 h-20 rounded-full bg-brand/10 text-brand-dark flex items-center justify-center border-4 border-surface shadow-sm">
            <UserRound size={36} />
          </span>
          <div className="text-center">
            <h2 className="text-xl font-black text-brand-dark">سلام، {user.firstNameFa}</h2>
            <p className="text-[13px] font-bold text-sub mt-1">امتیاز شما: ۲۵۰۰</p>
          </div>
        </div>
        
        {/* Nav Links */}
        <nav className="flex flex-col gap-1 p-4">
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold text-sub hover:bg-soft transition-colors">
            <LayoutGrid size={20} /> داشبورد
          </button>
          <button onClick={() => router.push('/my-trips')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold text-sub hover:bg-soft transition-colors">
            <PlaneTakeoff size={20} /> سفرهای من
          </button>
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold text-sub hover:bg-soft transition-colors">
            <UserRound size={20} /> پروفایل کاربری
          </button>
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold text-sub hover:bg-soft transition-colors">
            <Gift size={20} /> باشگاه مشتریان
          </button>
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-black bg-brand/10 text-brand-dark transition-transform active:scale-95">
            <Settings size={20} /> تنظیمات
          </button>
          {user.role === 'admin' && (
            <button onClick={() => router.push('/admin')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-black text-brand hover:bg-brand/5 transition-colors mt-2 border border-brand/20">
              <ShieldAlert size={20} /> پنل مدیریت
            </button>
          )}
        </nav>
        
        {/* Footer Action */}
        <div className="p-4 border-t border-line/60 bg-soft/30 mt-auto">
          <button onClick={() => { logout(); router.push('/'); }} className="w-full flex items-center justify-center gap-2 text-rose-warm hover:bg-rose-warm/10 px-4 py-3 rounded-xl transition-colors text-[14px] font-black">
            <LogOut size={18} /> خروج از حساب
          </button>
        </div>
      </aside>

      {/* Main Content Canvas */}
      <div className="flex-grow flex flex-col gap-8">
        {/* Page Header */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl md:text-[32px] font-black text-ink m-0 tracking-tight">تنظیمات حساب کاربری</h1>
          <p className="text-[14px] font-bold text-sub">اطلاعات کاربری، وضعیت احراز هویت و امنیت خود را مدیریت کنید.</p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* KYC & Wallet Overview (Added to retain existing functionality) */}
          <section className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 border shadow-sm ${kycDone ? 'bg-success/5 border-success/30' : 'bg-hotel/5 border-hotel/30'}`}>
              <div className={`w-12 h-12 rounded-full grid place-items-center shrink-0 ${kycDone ? 'bg-success/20 text-success' : 'bg-hotel/20 text-hotel'}`}>
                {kycDone ? <BadgeCheck size={24} /> : <AlertCircle size={24} />}
              </div>
              <div className="flex-1">
                <p className={`font-black text-[16px] mb-1 ${kycDone ? 'text-success' : 'text-hotel'}`}>
                  {kycDone ? 'احراز هویت کامل شد' : 'احراز هویت ناقص است'}
                </p>
                {!kycDone ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                    <p className="text-[13px] font-bold text-sub">برای صدور بلیت و پرداخت، KYC را تکمیل کنید.</p>
                    <Button onClick={() => router.push('/auth')} size="sm" className="bg-brand hover:bg-brand-2 text-surface font-black rounded-xl px-5">
                      تکمیل احراز هویت
                    </Button>
                  </div>
                ) : (
                  <div className="text-[13px] font-bold text-sub flex gap-6 mt-2">
                    <span>کد ملی: <b dir="ltr" className="text-ink">{kyc.nationalId || user.phone.slice(-5)}</b></span>
                    <span>پاسپورت: <b dir="ltr" className="text-ink">{kyc.passportNo || '—'}</b></span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl p-6 bg-surface border border-line flex items-center justify-between shadow-sm card-lift cursor-pointer hover:border-brand/40 transition-colors" onClick={() => router.push('/wallet')}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-mint/50 text-brand-dark grid place-items-center">
                  <Wallet size={24} />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-sub mb-1">موجودی کیف پول</p>
                  <p className="font-black text-lg text-ink">{wallet.IRR.toLocaleString('fa-IR')} <span className="text-xs text-sub">ریال</span></p>
                </div>
              </div>
              <Button variant="outline" className="rounded-xl border-line font-black text-brand-dark">مدیریت</Button>
            </div>
          </section>

          {/* Profile Edit Card */}
          <section className="lg:col-span-2 bg-surface rounded-xl shadow-sm border border-line/50 p-6 flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b border-line/60 pb-4">
              <UserRound size={20} className="text-brand-dark" />
              <h3 className="text-lg font-black text-brand-dark">ویرایش اطلاعات فردی</h3>
            </div>
            
            <form className="flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-sub">نام</label>
                  <input className="rounded-xl border border-line/80 bg-surface px-4 py-3 text-[14px] font-bold text-ink focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all" type="text" defaultValue={user.firstNameFa} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-sub">نام خانوادگی</label>
                  <input className="rounded-xl border border-line/80 bg-surface px-4 py-3 text-[14px] font-bold text-ink focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all" type="text" defaultValue={user.lastNameFa} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-sub">پست الکترونیکی</label>
                  <input className="rounded-xl border border-line/80 bg-surface px-4 py-3 text-[14px] font-bold text-ink focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all text-start" dir="ltr" type="email" placeholder="example@email.com" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-sub">شماره تماس</label>
                  <input className="rounded-xl border border-line/80 bg-soft px-4 py-3 text-[14px] font-bold text-sub outline-none text-start cursor-not-allowed" dir="ltr" type="tel" value={user.phone} disabled title="شماره موبایل قابل تغییر نیست" />
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <Button type="button" className="bg-brand hover:bg-brand-2 text-surface px-8 h-11 rounded-full font-black">ذخیره تغییرات</Button>
              </div>
            </form>
          </section>

          {/* Reference Image Container */}
          <section className="lg:col-span-1 rounded-2xl overflow-hidden shadow-sm relative min-h-[300px] border border-line/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="Account settings" className="absolute inset-0 w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB8AWoLtwrwMHLzzspXKWeS_aoThA1CC1zwZdyteVwscJ4hme5hECKVLryGcgt5G6QaSAArocKTEZeUAR8ke1biF_SbVVE72DHMalp0tGpT0gvsFA5MwwfRRAUV2RN_ikUzTR2wMMTyCl0XoSG-qlPMrB27Ep2mYgX6gVfWQMQMwWkNlDMeKrHlvj4DoctlaORjTPUd3_UhOZTSGyzcm7kchKFlROjIujaWOp2XpCMgEWRKKKhNwaLHT4F9S0XqxoFzmQ" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-black/20 to-transparent flex items-end p-6">
              <p className="text-surface font-black text-[15px] leading-relaxed">آرامش خیال در سفر با حساب کاربری امن و مطمئن.</p>
            </div>
          </section>

          {/* Notifications Card */}
          <section className="lg:col-span-1 bg-surface rounded-xl shadow-sm border border-line/50 p-6 flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b border-line/60 pb-4">
              <Settings2 size={20} className="text-brand-dark" />
              <h3 className="text-lg font-black text-brand-dark">تنظیمات اطلاع‌رسانی</h3>
            </div>
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-black text-[14px] text-ink mb-1">خبرنامه پیامکی</span>
                  <span className="font-bold text-[12px] text-sub">دریافت پیشنهادات ویژه</span>
                </div>
                {/* Switch Toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={true}
                  aria-label="خبرنامه پیامکی"
                  className="w-11 h-6 bg-brand rounded-full relative cursor-pointer shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <span className="absolute start-1 top-1 w-4 h-4 bg-surface rounded-full shadow-sm block"></span>
                </button>
              </div>
              <hr className="border-line/60" />
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-black text-[14px] text-ink mb-1">اطلاعیه‌های ایمیلی</span>
                  <span className="font-bold text-[12px] text-sub">به‌روزرسانی‌های مهم سفر</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={false}
                  aria-label="اطلاعیه‌های ایمیلی"
                  className="w-11 h-6 bg-line rounded-full relative cursor-pointer shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <span className="absolute end-1 top-1 w-4 h-4 bg-surface rounded-full shadow-sm block"></span>
                </button>
              </div>
            </div>
          </section>

          {/* Security Settings Card */}
          <section className="lg:col-span-2 bg-surface rounded-xl shadow-sm border border-line/50 p-6 flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b border-line/60 pb-4">
              <ShieldCheck size={20} className="text-brand-dark" />
              <h3 className="text-lg font-black text-brand-dark">امنیت حساب</h3>
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-surface rounded-xl border border-line/60 gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-soft p-3 rounded-full text-brand-dark">
                    <Lock size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-[14px] text-ink mb-1">رمز عبور</span>
                    <span className="font-bold text-[12px] text-sub">ورود با OTP فعال است</span>
                  </div>
                </div>
                <Button variant="outline" className="border-brand/30 text-brand-dark font-black hover:bg-brand/5 rounded-xl">افزودن رمز عبور ثابت</Button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-surface rounded-xl border border-line/60 gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-soft p-3 rounded-full text-brand-dark">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-[14px] text-ink mb-1">احراز هویت دو مرحله‌ای (2FA)</span>
                    <span className="font-bold text-[12px] text-sub">افزایش امنیت حساب با پیامک</span>
                  </div>
                </div>
                <Button className="bg-brand/10 text-brand-dark font-black hover:bg-brand/20 rounded-xl shadow-none">فعال‌سازی</Button>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
