'use client';

import { useRouter, Link } from '@/i18n/routing';
import { useAuthStore } from '@/stores/auth-store';
import {
  LayoutDashboard, BriefcaseBusiness, Wallet, DatabaseZap,
  PlaneTakeoff, Lock, Mail, Key, LogIn, ArrowRight
} from 'lucide-react';

const NAV = [
  { href: '/admin', label: 'داشبورد', icon: LayoutDashboard },
  { href: '/admin/bookings', label: 'رزروها', icon: BriefcaseBusiness },
  { href: '/admin/finance', label: 'مالی و تراکنش‌ها', icon: Wallet },
  { href: '/admin/content', label: 'محتوا و موجودی', icon: DatabaseZap },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  if (!user || user.role !== 'admin') {
    return (
      <div className="bg-surface min-h-screen flex flex-col relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 pointer-events-none z-0" 
          style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDk8CTuGve7G9kOdiykuce55UVg_NkfZMRlOsJ6K2LHA69EsUeHsQ4s2hZzQrFKrLJxOytyT0DBm4rFRkugB9CWNlVRwS-zL82RMEJ9pc2ZJiTw7KGRUSCqNCg8LBYcoHVKXULm4rv0EJSWcnb23krlOMCeWoovOaYPYN3mdeEXjkiljq3Vc1MzyAfrk2aE6AWWpqToXzwJU8H2DjAbmimqyxOxIHUpaziUAPwgxClWwz1Kd0R3PguC7J7auGFR_X8GpQ')" }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-br from-surface/90 to-surface/80 z-0 pointer-events-none dark:from-ink dark:to-ink/80"></div>
        
        <main className="flex-1 flex items-center justify-center relative z-10 px-4 py-12 min-h-screen">
          <div className="bg-surface/70 backdrop-blur-2xl border border-surface/50 w-full max-w-[480px] rounded-3xl shadow-xl flex flex-col items-center text-center p-8 md:p-12 relative overflow-hidden group">
            
            {/* Subtle gradient orb effect */}
            <div className="absolute -top-24 -end-24 w-48 h-48 bg-brand/20 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000 ease-in-out pointer-events-none"></div>
            <div className="absolute -bottom-24 -start-24 w-48 h-48 bg-tour/20 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000 ease-in-out pointer-events-none"></div>
            
            <div className="w-20 h-20 bg-rose-warm/10 text-rose-warm rounded-full flex items-center justify-center mb-6 shadow-sm">
              <Lock size={36} />
            </div>
            
            <h1 className="font-black text-[28px] md:text-[32px] text-ink mb-4 tracking-tight">
              دسترسی غیرمجاز
            </h1>
            <p className="font-bold text-[15px] md:text-[16px] text-sub mb-8 max-w-[320px] mx-auto leading-relaxed">
              برای ورود به پنل مدیریت با حساب ادمین وارد شوید. (دمو: از منوی احراز هویت با شماره <b>0000</b> وارد شوید)
            </p>
            
            {/* Mock Form */}
            <form className="w-full flex flex-col gap-4 text-start mb-8" onSubmit={(e) => { e.preventDefault(); router.push('/auth'); }}>
              <div className="flex flex-col gap-2">
                <label className="font-bold text-[13px] text-ink" htmlFor="admin_email">ایمیل سازمانی</label>
                <div className="relative">
                  <Mail size={18} className="absolute start-4 top-1/2 -translate-y-1/2 text-sub/70" />
                  <input 
                    className="w-full bg-surface/80 border border-line/50 rounded-xl py-3 ps-12 pe-4 text-ink placeholder:text-sub/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all font-bold text-[14px]" 
                    dir="ltr" 
                    id="admin_email" 
                    placeholder="admin@itrip.ir" 
                    type="email"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-bold text-[13px] text-ink" htmlFor="admin_password">رمز عبور</label>
                <div className="relative">
                  <Key size={18} className="absolute start-4 top-1/2 -translate-y-1/2 text-sub/70" />
                  <input 
                    className="w-full bg-surface/80 border border-line/50 rounded-xl py-3 ps-12 pe-4 text-ink placeholder:text-sub/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all font-bold text-[14px]" 
                    dir="ltr" 
                    id="admin_password" 
                    placeholder="••••••••" 
                    type="password"
                  />
                </div>
              </div>
              <button 
                className="mt-4 w-full bg-brand text-surface font-black text-[15px] py-4 px-6 rounded-xl hover:bg-brand-2 hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2" 
                type="submit"
              >
                <LogIn size={20} /> ورود به پنل مدیریت
              </button>
            </form>
            
            <div className="w-full border-t border-line/50 pt-6 mt-2">
              <Link className="inline-flex items-center justify-center gap-2 text-sub font-bold text-[14px] hover:text-ink transition-colors group w-full" href="/">
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                بازگشت به صفحه اصلی سایت
              </Link>
            </div>
            
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8">
      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-56 shrink-0">
          <div className="bg-surface rounded-2xl border border-line p-4 sticky top-24">
            <div className="flex items-center gap-2 px-2 py-3 mb-3 border-b border-line">
              <span className="bg-brand p-1.5 rounded-md text-surface">
                <PlaneTakeoff size={16} />
              </span>
              <span className="font-bold text-ink">پنل ERP</span>
            </div>
            <nav className="space-y-1">
              {NAV.map((n) => {
                const Icon = n.icon;
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sub hover:bg-brand/10 hover:text-brand transition"
                  >
                    <Icon size={17} /> {n.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
