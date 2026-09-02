'use client';

import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useRouter, Link } from '@/i18n/routing';
import { useAuthStore } from '@/stores/auth-store';
import { useLocalizedUserName } from '@/hooks/useLocalizedUserName';
import {
  LayoutDashboard, BriefcaseBusiness, Wallet, DatabaseZap,
  PlaneTakeoff, Lock, Mail, Key, LogIn, ArrowRight, ExternalLink, ShieldCheck, UserCheck
} from 'lucide-react';
import { lt } from '@/lib/lt';

const NAV = [
  { href: '/admin', label: { fa: 'داشبورد', en: 'Dashboard', ar: 'لوحة التحكم', zh: '仪表板', ru: 'Панель управления' }, icon: LayoutDashboard },
  { href: '/admin/bookings', label: { fa: 'رزروها', en: 'Bookings', ar: 'الحجوزات', zh: '预订管理', ru: 'Брони' }, icon: BriefcaseBusiness },
  { href: '/admin/finance', label: { fa: 'مالی و تراکنش‌ها', en: 'Finance & Transactions', ar: 'المالية والمعاملات', zh: '财务与交易', ru: 'Финансы и операции' }, icon: Wallet },
  { href: '/admin/content', label: { fa: 'محتوا و موجودی', en: 'Content & Inventory', ar: 'المحتوى والمخزون', zh: '内容与库存', ru: 'Контент и инвентарь' }, icon: DatabaseZap },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname() || '';
  const user = useAuthStore((s) => s.user);
  const localizedUserName = useLocalizedUserName();

  if (!user || user.role !== 'admin') {
    return (
      <div className="bg-surface min-h-screen flex flex-col relative overflow-hidden">
        {/* Background Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-surface/90 to-surface/80 z-0 pointer-events-none dark:from-ink dark:to-ink/80" />

        <main className="flex-1 flex items-center justify-center relative z-10 px-4 py-12 min-h-screen">
          <div className="bg-surface/70 backdrop-blur-2xl border border-line w-full max-w-[480px] rounded-3xl shadow-xl flex flex-col items-center text-center p-8 md:p-12 relative overflow-hidden group">

            <div className="w-20 h-20 bg-rose-500/10 text-rose-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <Lock size={36} />
            </div>

            <h1 className="font-black text-[28px] md:text-[32px] text-ink mb-4 tracking-tight">
              {lt(locale, { fa: 'دسترسی مدیریت سازمانی', en: 'Enterprise Admin Access', ar: 'دخول الإدارة المؤسسية', zh: '企业管理入口', ru: 'Доступ к админ-панели' })}
            </h1>
            <p className="font-bold text-[14px] md:text-[15px] text-sub mb-8 max-w-[320px] mx-auto leading-relaxed">
              {lt(locale, { fa: 'برای ورود به پنل مدیریت با حساب ادمین وارد شوید. (دمو: از منوی ورود با شماره 0000 وارد شوید)', en: 'Sign in with an admin account to access the management panel. (Demo: sign in from the login menu with number 0000)', ar: 'سجّل الدخول بحساب المسؤول للوصول إلى لوحة الإدارة. (تجريبي: من قائمة الدخول بالرقم 0000)', zh: '请使用管理员账户登录管理面板。（演示：在登录菜单中使用号码 0000 登录）', ru: 'Войдите с аккаунтом администратора. (Демо: номер 0000 в меню входа)' })}
            </p>

            {/* Mock Form */}
            <form className="w-full flex flex-col gap-4 text-start mb-8" onSubmit={(e) => { e.preventDefault(); router.push('/auth'); }}>
              <div className="flex flex-col gap-2">
                <label className="font-bold text-[13px] text-ink" htmlFor="admin_email">{lt(locale, { fa: 'ایمیل سازمانی', en: 'Corporate Email', ar: 'البريد المؤسسي', zh: '企业邮箱', ru: 'Корпоративная почта' })}</label>
                <div className="relative">
                  <Mail size={18} className="absolute start-4 top-1/2 -translate-y-1/2 text-sub/70" />
                  <input
                    className="w-full bg-surface/80 border border-line/50 rounded-xl py-3 ps-12 pe-4 text-ink placeholder:text-sub/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all font-bold text-[14px]"
                    dir="ltr"
                    id="admin_email"
                    placeholder="admin@firuzo.com"
                    type="email"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-bold text-[13px] text-ink" htmlFor="admin_password">{lt(locale, { fa: 'رمز عبور', en: 'Password', ar: 'كلمة المرور', zh: '密码', ru: 'Пароль' })}</label>
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
                className="mt-4 w-full bg-brand text-surface font-black text-[15px] py-4 px-6 rounded-xl hover:bg-brand-dark hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                type="submit"
              >
                <LogIn size={20} /> {lt(locale, { fa: 'ورود به پنل مدیریت', en: 'Enter Admin Panel', ar: 'الدخول إلى لوحة الإدارة', zh: '进入管理面板', ru: 'Войти в админ-панель' })}
              </button>
            </form>

            <div className="w-full border-t border-line/50 pt-6 mt-2">
              <Link className="inline-flex items-center justify-center gap-2 text-sub font-bold text-[14px] hover:text-ink transition-colors group w-full" href="/">
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                {lt(locale, { fa: 'بازگشت به صفحه اصلی سایت', en: 'Back to Homepage', ar: 'العودة إلى الصفحة الرئيسية', zh: '返回网站首页', ru: 'Вернуться на главную' })}
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f8f8] flex flex-col">
      {/* Enterprise Top Navigation */}
      <header className="h-16 border-b border-line bg-surface sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand text-surface grid place-items-center shadow-sm">
            <PlaneTakeoff size={18} />
          </div>
          <div>
            <div className="font-black text-[15px] text-ink flex items-center gap-2">
              <span>{lt(locale, { fa: 'سامانه مدیریت یکپارچه فیروز', en: 'Firuzo Unified Management', ar: 'نظام إدارة فيروزو الموحد', zh: 'Firuzo 统一管理系统', ru: 'Единая система управления Firuzo' })}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-mint text-brand-dark font-extrabold">ERP v2.0</span>
            </div>
            <p className="text-[11px] text-sub font-bold leading-none mt-0.5">Enterprise Travel Operations</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-line text-sub text-xs font-bold hover:text-brand-dark hover:border-brand/40 hover:bg-mint transition"
          >
            <span>{lt(locale, { fa: 'سایت مسافران', en: 'Traveler Site', ar: 'موقع المسافرين', zh: '旅行者网站', ru: 'Сайт для путешественников' })}</span>
            <ExternalLink size={13} />
          </Link>
          <div className="flex items-center gap-2 ps-3 border-s border-line">
            <div className="w-8 h-8 rounded-full bg-brand-dark text-surface text-xs font-black grid place-items-center">
              <UserCheck size={16} />
            </div>
            <div className="hidden sm:block text-start">
              <span className="block text-xs font-black text-ink">{localizedUserName || lt(locale, { fa: 'مدیر سیستم', en: 'System Admin', ar: 'مسؤول النظام', zh: '系统管理员', ru: 'Системный администратор' })}</span>
              <span className="block text-[10px] font-bold text-success flex items-center gap-1">
                <ShieldCheck size={10} /> {lt(locale, { fa: 'ادمین فعال', en: 'Active Admin', ar: 'مسؤول نشط', zh: '管理员在线', ru: 'Активный админ' })}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main ERP Body */}
      <div className="flex-1 max-w-[1400px] w-full mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-64 shrink-0">
            <div className="bg-surface rounded-2xl border border-line p-4 sticky top-24 shadow-sm">
              <div className="px-2 py-2 mb-2 text-xs font-bold text-sub border-b border-line">
                {lt(locale, { fa: 'ماژول‌های عملیاتی', en: 'Operational Modules', ar: 'الوحدات التشغيلية', zh: '运营模块', ru: 'Операционные модули' })}
              </div>
              <nav className="space-y-1">
                {NAV.map((n) => {
                  const Icon = n.icon;
                  const isActive = pathname.endsWith(n.href) || (n.href !== '/admin' && pathname.includes(n.href));
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-black transition ${
                        isActive
                          ? 'bg-brand text-surface shadow-sm'
                          : 'text-sub hover:bg-soft hover:text-ink'
                      }`}
                    >
                      <Icon size={18} /> {lt(locale, n.label)}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
