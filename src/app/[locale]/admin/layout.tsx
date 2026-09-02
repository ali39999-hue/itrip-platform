'use client';

import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useRouter, Link } from '@/i18n/routing';
import { useAuthStore } from '@/stores/auth-store';
import {
  LayoutDashboard, BriefcaseBusiness, Wallet, DatabaseZap,
  PlaneTakeoff, Lock, LogIn, ArrowRight, ExternalLink, ShieldCheck, UserCheck, Activity
} from 'lucide-react';
import { lt } from '@/lib/lt';

const NAV = [
  { href: '/admin', label: { fa: 'داشبورد', en: 'Dashboard', ar: 'لوحة القيادة', zh: '仪表盘', ru: 'Панель' }, icon: LayoutDashboard },
  { href: '/admin/ops', label: { fa: 'عملیات و پشتیبانی', en: 'Ops & Support', ar: 'العمليات والدعم', zh: '运营与支持', ru: 'Операции и поддержка' }, icon: Activity },
  { href: '/admin/bookings', label: { fa: 'رزروها', en: 'Bookings', ar: 'الحجوزات', zh: '预订', ru: 'Бронирования' }, icon: BriefcaseBusiness },
  { href: '/admin/finance', label: { fa: 'مالی و تراکنش‌ها', en: 'Finance & Transactions', ar: 'المالية والمعاملات', zh: '财务与交易', ru: 'Финансы и транзакции' }, icon: Wallet },
  { href: '/admin/content', label: { fa: 'تامین‌کنندگان و انبار', en: 'Suppliers & Inventory', ar: 'الموردون والمخزون', zh: '供应商与库存', ru: 'Поставщики и инвентарь' }, icon: DatabaseZap },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname() || '';
  const user = useAuthStore((s) => s.user);

  if (!user || !['admin', 'SUPER_ADMIN', 'FINANCE', 'OPS'].includes(user.role)) {
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
              {lt(locale, { fa: 'دسترسی محدود است', en: 'Restricted Access', ar: 'وصول مقيد', zh: '访问受限', ru: 'Доступ ограничен' })}
            </h1>
            <p className="text-sub font-medium text-[15px] max-w-sm mb-8 leading-relaxed">
              {lt(locale, { fa: 'برای دسترسی به پنل مدیریت، ابتدا با حساب کاربری ادمین وارد شوید.', en: 'To access the admin panel, please log in with an administrator account.', ar: 'للوصول إلى لوحة الإدارة، يرجى تسجيل الدخول بحساب مسؤول.', zh: '要访问管理面板，请使用管理员帐户登录。', ru: 'Для доступа к панели управления войдите под учетной записью администратора.' })}
            </p>

            <div className="w-full flex flex-col gap-4 text-start mb-8">
              <button
                onClick={() => router.push('/auth')}
                className="w-full bg-brand text-surface font-black text-[15px] py-4 px-6 rounded-xl hover:bg-brand-dark hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <LogIn size={20} /> {lt(locale, { fa: 'ورود به حساب کاربری', en: 'Sign In to Account', ar: 'تسجيل الدخول', zh: '登录账号', ru: 'Войти в аккаунт' })}
              </button>
            </div>

            <div className="w-full border-t border-line/50 pt-6 mt-2">
              <Link className="inline-flex items-center justify-center gap-2 text-sub font-bold text-[14px] hover:text-ink transition-colors group w-full" href="/">
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                {lt(locale, { fa: 'بازگشت به صفحه اصلی سایت', en: 'Back to Homepage', ar: 'العودة إلى الصفحة الرئيسية', zh: '返回首页', ru: 'Вернуться на главную' })}
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
              <span>{lt(locale, { fa: 'سامانه مدیریت یکپارچه فیروزه', en: 'Firuzo Unified Management', ar: 'نظام إدارة فيروزو الموحد', zh: 'Firuzo 统一管理系统', ru: 'Единая система управления Firuzo' })}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-mint text-brand-dark font-extrabold">{lt(locale, { fa: 'ERP v2.0', en: 'ERP v2.0', ar: 'ERP v2.0', zh: 'ERP v2.0', ru: 'ERP v2.0' })}</span>
            </div>
            <p className="text-[11px] text-sub font-bold leading-none mt-0.5">{lt(locale, { fa: 'عملیات سفر سازمانی', en: 'Enterprise Travel Operations', ar: 'عمليات السفر المؤسسية', zh: '企业旅行运营', ru: 'Корпоративные операции' })}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-line text-sub text-xs font-bold hover:text-brand-dark hover:border-brand/40 hover:bg-mint transition"
          >
            <span>{lt(locale, { fa: 'سایت مسافران', en: 'Traveler Site', ar: 'موقع المسافرين', zh: '旅客网站', ru: 'Сайт для путешественников' })}</span>
            <ExternalLink size={13} />
          </Link>
          <div className="flex items-center gap-2 ps-3 border-s border-line">
            <div className="w-8 h-8 rounded-full bg-brand-dark text-surface text-xs font-black grid place-items-center">
              <UserCheck size={16} />
            </div>
            <div className="hidden sm:block text-start">
              <span className="block text-xs font-black text-ink">{user.phone || lt(locale, { fa: 'مدیر سیستم', en: 'System Admin', ar: 'مسؤول النظام', zh: '系统管理员', ru: 'Системный администратор' })}</span>
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
                {lt(locale, { fa: 'ماژول‌های عملیاتی', en: 'Operational Modules', ar: 'الوحدات التشغيلية', zh: '业务模块', ru: 'Операционные модули' })}
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
