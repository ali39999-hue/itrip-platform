'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { LocaleSwitcher } from '@/components/layout/header/LocaleSwitcher';
import { AdminGlobalSearch } from './AdminGlobalSearch';
import {
  LayoutDashboard, BriefcaseBusiness, Wallet,
  PlaneTakeoff, ExternalLink, ShieldCheck, UserCheck, Activity,
  Building2, Boxes, PanelLeftClose, PanelLeftOpen, FolderKanban, Users, Menu, X
} from 'lucide-react';
import { lt, LText } from '@/lib/lt';

const NAV = [
  { href: '/admin', label: { fa: 'داشبورد', en: 'Dashboard', ar: 'لوحة القيادة', zh: '仪表盘', ru: 'Панель' }, icon: LayoutDashboard },
  { href: '/admin/travel-files', label: { fa: 'پرونده‌های سفر', en: 'Travel Files', ar: 'ملفات السفر', zh: '行程档案', ru: 'Файлы поездок' }, icon: BriefcaseBusiness },
  { href: '/admin/exceptions', label: { fa: 'مرکز خطا و استثنائات', en: 'Exception Center', ar: 'مركز الاستثناءات', zh: '异常中心', ru: 'Центр исключений' }, icon: ShieldCheck },
  { href: '/admin/ops', label: { fa: 'عملیات و پشتیبانی', en: 'Ops & Support', ar: 'العمليات والدعم', zh: '运营与支持', ru: 'Операции и поддержка' }, icon: Activity },
  { href: '/admin/bookings', label: { fa: 'رزروها', en: 'Bookings', ar: 'الحجوزات', zh: '预订', ru: 'Бронирования' }, icon: PlaneTakeoff },
  { href: '/admin/referrals', label: { fa: 'کدهای معرف / سرگروه‌ها', en: 'Referrals & Leaders', ar: 'رموز الإحالة والقادة', zh: '推荐码与领队', ru: 'Рефералы и лидеры' }, icon: Users },
  { href: '/admin/finance', label: { fa: 'مالی و تراکنش‌ها', en: 'Finance & Transactions', ar: 'المالية والمعاملات', zh: '财务与交易', ru: 'Финансы и транзакции' }, icon: Wallet },
  { href: '/admin/suppliers', label: { fa: 'تامین‌کنندگان', en: 'Suppliers', ar: 'الموردون', zh: '供应商', ru: 'Поставщики' }, icon: Building2 },
  { href: '/admin/inventory', label: { fa: 'انبار و سهمیه‌ها', en: 'Inventory & Allotments', ar: 'المخزون والحصص', zh: '库存与配额', ru: 'Инвентарь и квоты' }, icon: Boxes },
  { href: '/admin/content', label: { fa: 'مدیریت محتوا (CMS)', en: 'Content Management', ar: 'إدارة المحتوى', zh: '内容管理 (CMS)', ru: 'Управление контентом' }, icon: FolderKanban },
];

const ROLE_LT: Record<string, LText> = {
  SUPER_ADMIN: { fa: 'ادمین فعال', en: 'Active Admin', ar: 'مسؤول نشط', zh: '管理员在线', ru: 'Активный админ' },
  ADMIN: { fa: 'مدیر', en: 'Admin', ar: 'مدير', zh: '管理员', ru: 'Администратор' },
  OPERATOR: { fa: 'اپراتور', en: 'Operator', ar: 'موظف عمليات', zh: '运营专员', ru: 'Оператор' },
  FINANCE: { fa: 'مالی', en: 'Finance', ar: 'المالية', zh: '财务', ru: 'Финансы' },
  SUPPORT: { fa: 'پشتیبانی', en: 'Support', ar: 'الدعم', zh: '客服', ru: 'Поддержка' },
};

/**
 * Client chrome for the ERP. Access itself is authorized in the server layout;
 * this component only renders the shell for an already-authorized admin.
 */
export function AdminShell({
  children,
  userName,
  role,
}: {
  children: React.ReactNode;
  userName: string;
  role: string;
}) {
  const locale = useLocale();
  const pathname = usePathname() || '';
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const roleLabel = ROLE_LT[role] ? lt(locale, ROLE_LT[role]) : lt(locale, { fa: 'همکار', en: 'Staff', ar: 'موظف', zh: '员工', ru: 'Сотрудник' });

  // Close the mobile drawer on route change + Escape.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileNavOpen]);

  const navLinks = (onNavigate?: () => void) => (
    <>
      {NAV.map((n) => {
        const Icon = n.icon;
        const isActive = pathname.endsWith(n.href) || (n.href !== '/admin' && pathname.includes(n.href));
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNavigate}
            title={collapsed ? lt(locale, n.label) : undefined}
            aria-current={isActive ? 'page' : undefined}
            className={`flex items-center gap-3 px-3 min-h-11 rounded-xl text-xs sm:text-sm font-black transition whitespace-nowrap ${
              collapsed ? 'lg:justify-center lg:px-0' : ''
            } ${
              isActive
                ? 'bg-brand text-surface shadow-xs'
                : 'text-sub hover:bg-soft hover:text-ink'
            }`}
          >
            <Icon size={18} className="shrink-0" aria-hidden="true" />
            {!collapsed && <span>{lt(locale, n.label)}</span>}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-soft/40 flex flex-col">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-[300] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-brand focus:text-surface focus:text-xs focus:font-black"
      >
        {lt(locale, { fa: 'پرش به محتوای اصلی', en: 'Skip to main content', ar: 'تخطي إلى المحتوى', zh: '跳到主要内容', ru: 'Перейти к содержимому' })}
      </a>
      {/* Enterprise Top Navigation */}
      <header className="border-b border-line bg-surface sticky top-0 z-40 px-4 md:px-8 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2.5 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label={lt(locale, { fa: 'باز کردن منوی ماژول‌ها', en: 'Open modules menu', ar: 'فتح قائمة الوحدات', zh: '打开模块菜单', ru: 'Открыть меню модулей' })}
            className="lg:hidden w-10 h-10 rounded-xl bg-soft hover:bg-line/60 text-sub hover:text-ink grid place-items-center transition shrink-0"
          >
            <Menu size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-expanded={!collapsed}
            aria-label={lt(locale, { fa: 'جمع یا گسترش منو', en: 'Collapse or expand menu', ar: 'طي القائمة أو توسيعها', zh: '折叠或展开菜单', ru: 'Свернуть или развернуть меню' })}
            className="hidden lg:grid w-8 h-8 rounded-lg bg-soft hover:bg-line/60 text-sub hover:text-ink place-items-center transition"
            title={collapsed ? 'گسترش منو' : 'جمع کردن منو'}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
          <div className="w-9 h-9 rounded-xl bg-brand text-surface grid place-items-center shadow-xs shrink-0">
            <PlaneTakeoff size={18} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="font-black text-sm sm:text-[15px] text-ink flex items-center gap-2">
              <span className="truncate">{lt(locale, { fa: 'سامانه مدیریت یکپارچه فیروزو', en: 'Firuzo Unified Management', ar: 'نظام إدارة فيروزو الموحد', zh: 'Firuzo 统一管理系统', ru: 'Единая система управления Firuzo' })}</span>
              <span className="hidden min-[420px]:inline text-[10px] px-2 py-0.5 rounded-full bg-mint text-brand-dark font-extrabold shrink-0">{lt(locale, { fa: 'ERP v2.0', en: 'ERP v2.0', ar: 'ERP v2.0', zh: 'ERP v2.0', ru: 'ERP v2.0' })}</span>
            </div>
            <p className="hidden sm:block text-[11px] text-sub font-bold leading-none mt-0.5">{lt(locale, { fa: 'عملیات سفر سازمانی', en: 'Enterprise Travel Operations', ar: 'عمليات السفر المؤسسية', zh: '企业旅行运营', ru: 'Корпоративные операции' })}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 ms-auto">
          <LocaleSwitcher />
          <Link
            href="/"
            aria-label={lt(locale, { fa: 'سایت مسافران', en: 'Traveler Site', ar: 'موقع المسافرين', zh: '旅客网站', ru: 'Сайт для путешественников' })}
            className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-xl border border-line text-sub text-xs font-bold hover:text-brand-dark hover:border-brand/40 hover:bg-mint transition"
          >
            <span className="hidden sm:inline">{lt(locale, { fa: 'سایت مسافران', en: 'Traveler Site', ar: 'موقع المسافرين', zh: '旅客网站', ru: 'Сайт для путешественников' })}</span>
            <ExternalLink size={13} aria-hidden="true" />
          </Link>
          <div className="flex items-center gap-2 ps-2 md:ps-3 border-s border-line">
            <div className="w-8 h-8 rounded-full bg-brand-dark text-surface text-xs font-black grid place-items-center shrink-0" aria-hidden="true">
              <UserCheck size={16} />
            </div>
            <div className="hidden md:block text-start">
              <span className="block text-xs font-black text-ink max-w-32 truncate">{userName}</span>
              <span className="block text-[10px] font-bold text-success flex items-center gap-1">
                <ShieldCheck size={10} aria-hidden="true" /> {roleLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Global search takes its own row on mobile so the header never overflows */}
        <div className="order-last basis-full md:order-none md:basis-auto md:flex-1 md:max-w-sm md:ms-auto">
          <AdminGlobalSearch />
        </div>
      </header>

      {/* Mobile modules drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-[250] lg:hidden" role="dialog" aria-modal="true" aria-label={lt(locale, { fa: 'ماژول‌های عملیاتی', en: 'Operational Modules', ar: 'الوحدات التشغيلية', zh: '业务模块', ru: 'Операционные модули' })}>
          <div className="absolute inset-0 bg-ink/50" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 start-0 w-[280px] max-w-[85vw] bg-surface border-e border-line shadow-elev-3 p-4 flex flex-col gap-1 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-1 border-b border-line">
              <span className="text-xs font-black text-ink">
                {lt(locale, { fa: 'ماژول‌های عملیاتی', en: 'Operational Modules', ar: 'الوحدات التشغيلية', zh: '业务模块', ru: 'Операционные модули' })}
              </span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                aria-label={lt(locale, { fa: 'بستن منو', en: 'Close menu', ar: 'إغلاق القائمة', zh: '关闭菜单', ru: 'Закрыть меню' })}
                className="w-9 h-9 rounded-xl bg-soft text-sub hover:text-ink grid place-items-center"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <nav aria-label={lt(locale, { fa: 'ماژول‌های عملیاتی', en: 'Operational Modules', ar: 'الوحدات التشغيلية', zh: '业务模块', ru: 'Операционные модули' })} className="flex flex-col gap-1">
              {navLinks(() => setMobileNavOpen(false))}
            </nav>
          </div>
        </div>
      )}

      {/* Main ERP Body */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto px-4 md:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Sidebar (desktop only — mobile uses the drawer) */}
          <aside className={`hidden lg:block transition-all duration-200 shrink-0 ${collapsed ? 'lg:w-20' : 'lg:w-60'}`}>
            <div className="bg-surface rounded-2xl border border-line p-3 lg:sticky top-32 shadow-xs">
              {!collapsed && (
                <div className="px-2 py-2 mb-2 text-xs font-bold text-sub border-b border-line">
                  {lt(locale, { fa: 'ماژول‌های عملیاتی', en: 'Operational Modules', ar: 'الوحدات التشغيلية', zh: '业务模块', ru: 'Операционные модули' })}
                </div>
              )}
              <nav aria-label={lt(locale, { fa: 'ماژول‌های عملیاتی', en: 'Operational Modules', ar: 'الوحدات التشغيلية', zh: '业务模块', ru: 'Операционные модули' })} className="flex lg:flex-col gap-1">
                {navLinks()}
              </nav>
            </div>
          </aside>
          <main id="admin-main" tabIndex={-1} className="flex-1 min-w-0 w-full focus:outline-none">{children}</main>
        </div>
      </div>
    </div>
  );
}
