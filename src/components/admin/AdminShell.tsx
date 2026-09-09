'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { LocaleSwitcher } from '@/components/layout/header/LocaleSwitcher';
import { AdminGlobalSearch } from './AdminGlobalSearch';
import {
  LayoutDashboard, BriefcaseBusiness, Wallet,
  PlaneTakeoff, ExternalLink, ShieldCheck, UserCheck, Activity,
  Building2, Boxes, PanelLeftClose, PanelLeftOpen, FolderKanban, Users, Menu, X,
  ChevronLeft, Keyboard, ReceiptText,
} from 'lucide-react';
import { lt, LText } from '@/lib/lt';
import { cn } from '@/lib/utils';
import { getPendingReceiptsCount } from '@/actions/receipts';

type NavItem = { href: string; label: LText; icon: typeof LayoutDashboard };
type NavGroup = { id: string; title: LText; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    title: { fa: 'نمای کلی', en: 'Overview', ar: 'نظرة عامة', zh: '总览', ru: 'Обзор' },
    items: [
      { href: '/admin', label: { fa: 'داشبورد', en: 'Dashboard', ar: 'لوحة القيادة', zh: '仪表盘', ru: 'Панель' }, icon: LayoutDashboard },
    ],
  },
  {
    id: 'operations',
    title: { fa: 'عملیات', en: 'Operations', ar: 'العمليات', zh: '运营', ru: 'Операции' },
    items: [
      { href: '/admin/travel-files', label: { fa: 'پرونده‌های سفر', en: 'Travel Files', ar: 'ملفات السفر', zh: '行程档案', ru: 'Файлы поездок' }, icon: BriefcaseBusiness },
      { href: '/admin/exceptions', label: { fa: 'مرکز خطا و استثنائات', en: 'Exception Center', ar: 'مركز الاستثناءات', zh: '异常中心', ru: 'Центр исключений' }, icon: ShieldCheck },
      { href: '/admin/ops', label: { fa: 'عملیات و پشتیبانی', en: 'Ops & Support', ar: 'العمليات والدعم', zh: '运营与支持', ru: 'Операции и поддержка' }, icon: Activity },
      { href: '/admin/bookings', label: { fa: 'رزروها', en: 'Bookings', ar: 'الحجوزات', zh: '预订', ru: 'Бронирования' }, icon: PlaneTakeoff },
    ],
  },
  {
    id: 'growth',
    title: { fa: 'رشد و فروش', en: 'Growth', ar: 'النمو', zh: '增长', ru: 'Рост' },
    items: [
      { href: '/admin/referrals', label: { fa: 'کدهای معرف / سرگروه‌ها', en: 'Referrals & Leaders', ar: 'رموز الإحالة والقادة', zh: '推荐码与领队', ru: 'Рефералы и лидеры' }, icon: Users },
    ],
  },
  {
    id: 'finance',
    title: { fa: 'مالی', en: 'Finance', ar: 'المالية', zh: '财务', ru: 'Финансы' },
    items: [
      { href: '/admin/finance', label: { fa: 'مالی و تراکنش‌ها', en: 'Finance & Transactions', ar: 'المالية والمعاملات', zh: '财务与交易', ru: 'Финансы и транзакции' }, icon: Wallet },
      { href: '/admin/finance/receipts', label: { fa: 'بررسی رسیدها (پیمنتینو)', en: 'Receipts Review (Paymentino)', ar: 'مراجعة الإيصالات (بيمينتينو)', zh: '回执审核 (Paymentino)', ru: 'Проверка квитанций (Paymentino)' }, icon: ReceiptText },
    ],
  },
  {
    id: 'catalog',
    title: { fa: 'کاتالوگ و تامین', en: 'Catalog & Supply', ar: 'الكتالوج والتوريد', zh: '目录与供应', ru: 'Каталог и поставки' },
    items: [
      { href: '/admin/suppliers', label: { fa: 'تامین‌کنندگان', en: 'Suppliers', ar: 'الموردون', zh: '供应商', ru: 'Поставщики' }, icon: Building2 },
      { href: '/admin/inventory', label: { fa: 'انبار و سهمیه‌ها', en: 'Inventory & Allotments', ar: 'المخزون والحصص', zh: '库存与配额', ru: 'Инвентарь и квоты' }, icon: Boxes },
      { href: '/admin/content', label: { fa: 'مدیریت محتوا (CMS)', en: 'Content Management', ar: 'إدارة المحتوى', zh: '内容管理 (CMS)', ru: 'Управление контентом' }, icon: FolderKanban },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

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
  // Remember the operator's sidebar preference on this device.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('erp_sidebar_collapsed') === '1';
    } catch {
      return false;
    }
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const shortcutsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    getPendingReceiptsCount()
      .then((cnt) => {
        if (!cancelled) setPendingCount(cnt);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    try {
      localStorage.setItem('erp_sidebar_collapsed', collapsed ? '1' : '0');
    } catch {
      // Private mode — preference simply won't persist.
    }
  }, [collapsed]);

  const roleLabel = ROLE_LT[role] ? lt(locale, ROLE_LT[role]) : lt(locale, { fa: 'همکار', en: 'Staff', ar: 'موظف', zh: '员工', ru: 'Сотрудник' });
  const initial = (userName || 'A').trim().charAt(0).toUpperCase();

  const isActive = (href: string) =>
    href === '/admin'
      ? /(?:^|\/)admin\/?$/.test(pathname)
      : pathname.includes(href);

  const crumb = useMemo(() => {
    const match = [...ALL_ITEMS].sort((a, b) => b.href.length - a.href.length).find((n) => isActive(n.href));
    return match ? lt(locale, match.label) : lt(locale, { fa: 'داشبورد', en: 'Dashboard', ar: 'لوحة القيادة', zh: '仪表盘', ru: 'Панель' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, locale]);

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
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);

  // Close the shortcuts helper on outside tap / Escape.
  useEffect(() => {
    if (!shortcutsOpen) return;
    const onDoc = (e: PointerEvent) => {
      if (shortcutsRef.current && !shortcutsRef.current.contains(e.target as Node)) {
        setShortcutsOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShortcutsOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [shortcutsOpen]);

  const shortcuts = [
    { keys: ['/'], hint: lt(locale, { fa: 'جستجو در جدول‌ها', en: 'Search inside tables', ar: 'البحث في الجداول', zh: '在表格中搜索', ru: 'Поиск по таблицам' }) },
    { keys: ['Ctrl', 'K'], hint: lt(locale, { fa: 'جستجوی سراسری', en: 'Global search', ar: 'بحث عام', zh: '全局搜索', ru: 'Глобальный поиск' }) },
    { keys: ['Esc'], hint: lt(locale, { fa: 'بستن پنجره / منو', en: 'Close dialog / menu', ar: 'إغلاق النافذة', zh: '关闭弹窗/菜单', ru: 'Закрыть окно / меню' }) },
  ];

  const renderNav = (opts?: { onNavigate?: () => void; dark?: boolean }) => (
    <div className="flex flex-col gap-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.id}>
          {!collapsed && (
            <p
              className={cn(
                'mb-1.5 px-3 text-[10px] font-black tracking-wider uppercase',
                opts?.dark ? 'text-mint-bright/60' : 'text-sub/80',
              )}
            >
              {lt(locale, group.title)}
            </p>
          )}
          <div className="flex flex-col gap-0.5">
            {group.items.map((n) => {
              const Icon = n.icon;
              const active = isActive(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={opts?.onNavigate}
                  title={collapsed ? lt(locale, n.label) : undefined}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                    collapsed && 'lg:justify-center lg:px-0',
                    active
                      ? opts?.dark
                        ? 'bg-surface/12 text-surface shadow-inner'
                        : 'bg-mint font-black text-brand-dark shadow-xs'
                      : opts?.dark
                        ? 'text-surface/70 hover:bg-surface/8 hover:text-surface'
                        : 'text-sub hover:bg-soft hover:text-ink',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute inset-y-2 start-0 w-1 rounded-full bg-current transition-all',
                      active ? 'opacity-100' : 'opacity-0 group-hover:opacity-30',
                      opts?.dark ? 'text-mint-bright' : 'text-brand',
                    )}
                  />
                  <Icon size={18} className="shrink-0" aria-hidden="true" />
                  {!collapsed && <span className="min-w-0 truncate">{lt(locale, n.label)}</span>}
                  {n.href === '/admin/finance/receipts' && pendingCount > 0 && !collapsed && (
                    <span className="ms-auto inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-black rounded-full bg-rose-600 text-white animate-pulse">
                      {pendingCount}
                    </span>
                  )}
                  {!collapsed && active && n.href !== '/admin/finance/receipts' && (
                    <ChevronLeft
                      size={14}
                      aria-hidden="true"
                      className="ms-auto shrink-0 opacity-60 rtl:rotate-180"
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-soft/30 relative">
      {/* Grid pattern lives on its own layer: the .bg-grid-fade mask must never
          wrap content, or the radial mask fades real page content toward the
          document bottom on long pages. */}
      <div aria-hidden="true" className="bg-grid-fade pointer-events-none absolute inset-0" />
      <div className="spotlight top-0 end-[20%]" />
      <div className="spotlight top-[50%] start-[10%] animate-pulse" />
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-[300] focus:rounded-xl focus:bg-brand focus:px-4 focus:py-2 focus:text-xs focus:font-black focus:text-surface"
      >
        {lt(locale, { fa: 'پرش به محتوای اصلی', en: 'Skip to main content', ar: 'تخطي إلى المحتوى', zh: '跳到主要内容', ru: 'Перейти к содержимому' })}
      </a>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-[250] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={lt(locale, { fa: 'ماژول‌های عملیاتی', en: 'Operational Modules', ar: 'الوحدات التشغيلية', zh: '业务模块', ru: 'Операционные модули' })}
        >
          <div className="fade-soft absolute inset-0 bg-deep/60 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
          <div className="sheet-up absolute inset-y-0 start-0 flex w-[300px] max-w-[86vw] flex-col overflow-hidden rounded-e-3xl bg-deep text-surface shadow-elev-3">
            <div className="flex items-center gap-2.5 border-b border-surface/10 p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand text-surface">
                <PlaneTakeoff size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-black">
                  {lt(locale, { fa: 'فیروزو · پنل عملیات', en: 'Firuzo · Ops Panel', ar: 'فيروزو · لوحة العمليات', zh: 'Firuzo · 运营面板', ru: 'Firuzo · Панель' })}
                </p>
                <p className="text-[10px] font-bold text-mint-bright/70">ERP v2.0</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                autoFocus
                aria-label={lt(locale, { fa: 'بستن منو', en: 'Close menu', ar: 'إغلاق القائمة', zh: '关闭菜单', ru: 'Закрыть меню' })}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface/10 text-surface transition hover:bg-surface/20"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <nav
              aria-label={lt(locale, { fa: 'ماژول‌های عملیاتی', en: 'Operational Modules', ar: 'الوحدات التشغيلية', zh: '业务模块', ru: 'Операционные модули' })}
              className="flex-1 overflow-y-auto p-4"
            >
              {renderNav({ onNavigate: () => setMobileNavOpen(false), dark: true })}
            </nav>
            <div className="border-t border-surface/10 p-4">
              <div className="flex items-center gap-2.5 rounded-2xl bg-surface/8 p-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-sm font-black text-surface" aria-hidden="true">
                  {initial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black">{userName}</p>
                  <p className="flex items-center gap-1 text-[10px] font-bold text-mint-bright/80">
                    <ShieldCheck size={10} aria-hidden="true" /> {roleLabel}
                  </p>
                </div>
                <Link
                  href="/"
                  aria-label={lt(locale, { fa: 'سایت مسافران', en: 'Traveler Site', ar: 'موقع المسافرين', zh: '旅客网站', ru: 'Сайт для путешественников' })}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface/10 transition hover:bg-surface/20"
                >
                  <ExternalLink size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[1500px] items-start gap-5 px-3 py-4 sm:px-5 md:px-6 lg:px-8">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            'sticky top-4 hidden max-h-[calc(100vh-2rem)] shrink-0 flex-col overflow-hidden rounded-3xl bg-deep text-surface shadow-elev-2 transition-all duration-200 lg:flex',
            collapsed ? 'w-[76px]' : 'w-[264px]',
          )}
        >
          <div className="flex items-center gap-2.5 p-4 pb-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand text-surface shadow-brand">
              <PlaneTakeoff size={19} aria-hidden="true" />
            </span>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-black leading-tight">
                  {lt(locale, { fa: 'فیروزو · پنل عملیات', en: 'Firuzo · Ops Panel', ar: 'فيروزو · لوحة العمليات', zh: 'Firuzo · 运营面板', ru: 'Firuzo · Панель' })}
                </p>
                <p className="mt-0.5 inline-block rounded-full bg-surface/10 px-2 py-0.5 text-[9px] font-black tracking-wide text-mint-bright">
                  ERP v2.0
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              aria-expanded={!collapsed}
              aria-label={lt(locale, { fa: 'جمع یا گسترش منو', en: 'Collapse or expand menu', ar: 'طي القائمة أو توسيعها', zh: '折叠或展开菜单', ru: 'Свернуть или развернуть меню' })}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface/10 text-surface/80 transition hover:bg-surface/20 hover:text-surface"
            >
              {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
            </button>
          </div>

          <nav
            aria-label={lt(locale, { fa: 'ماژول‌های عملیاتی', en: 'Operational Modules', ar: 'الوحدات التشغيلية', zh: '业务模块', ru: 'Операционные модули' })}
            className="flex-1 overflow-y-auto px-3 pb-3"
          >
            {renderNav({ dark: true })}
          </nav>

          <div className="border-t border-surface/10 p-3">
            {!collapsed ? (
              <div className="flex items-center gap-2.5 rounded-2xl bg-surface/8 p-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-sm font-black text-surface" aria-hidden="true">
                  {initial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="max-w-32 truncate text-xs font-black">{userName}</p>
                  <p className="flex items-center gap-1 text-[10px] font-bold text-mint-bright/80">
                    <ShieldCheck size={10} aria-hidden="true" /> {roleLabel}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2" title={userName}>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-sm font-black text-surface" aria-hidden="true">
                  {initial}
                </span>
              </div>
            )}
          </div>
        </aside>

        {/* Main column */}
        <div className="min-w-0 flex-1">
          <header className="glass-bar sticky top-4 z-40 rounded-2xl border border-line px-3 py-2.5 shadow-elev-1 sm:px-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                aria-label={lt(locale, { fa: 'باز کردن منوی ماژول‌ها', en: 'Open modules menu', ar: 'فتح قائمة الوحدات', zh: '打开模块菜单', ru: 'Открыть меню модулей' })}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-soft text-sub transition hover:bg-line/60 hover:text-ink lg:hidden"
              >
                <Menu size={18} aria-hidden="true" />
              </button>

              <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-xs font-bold text-sub md:flex">
                <Link href="/admin" className="shrink-0 transition hover:text-brand-dark">
                  {lt(locale, { fa: 'عملیات', en: 'Ops', ar: 'العمليات', zh: '运营', ru: 'Операции' })}
                </Link>
                <ChevronLeft size={13} aria-hidden="true" className="shrink-0 opacity-50 rtl:rotate-180" />
                <span aria-current="page" className="truncate font-black text-ink">{crumb}</span>
              </nav>

              <div className="min-w-0 flex-1 md:max-w-md">
                <AdminGlobalSearch />
              </div>

              {pendingCount > 0 && (
                <Link
                  href="/admin/finance/receipts"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-black hover:bg-amber-100 transition shadow-xs"
                  title="فیش‌های کارت به کارت در انتظار بررسی"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping shrink-0" />
                  <span>{pendingCount} فیش نیازمند بررسی</span>
                </Link>
              )}

              <div className="ms-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
                <div ref={shortcutsRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShortcutsOpen((v) => !v)}
                    aria-expanded={shortcutsOpen}
                    aria-label={lt(locale, { fa: 'راهنمای میانبرهای صفحه‌کلید', en: 'Keyboard shortcuts help', ar: 'مساعدة اختصارات لوحة المفاتيح', zh: '键盘快捷键帮助', ru: 'Справка по горячим клавишам' })}
                    title={lt(locale, { fa: 'میانبرها', en: 'Shortcuts', ar: 'الاختصارات', zh: '快捷键', ru: 'Горячие клавиши' })}
                    className="grid h-10 w-10 place-items-center rounded-xl border border-line text-sub transition hover:border-brand/40 hover:bg-mint hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <Keyboard size={15} aria-hidden="true" />
                  </button>
                  {shortcutsOpen && (
                    <div role="note" className="fade-soft absolute end-0 top-full z-50 mt-2 w-64 rounded-2xl border border-line bg-surface p-3 shadow-elev-3">
                      <p className="mb-2 px-1 text-[11px] font-black text-ink">
                        {lt(locale, { fa: 'سریع‌تر کار کنید', en: 'Work faster', ar: 'اعمل بشكل أسرع', zh: '更高效工作', ru: 'Работайте быстрее' })}
                      </p>
                      <ul className="space-y-1.5">
                        {shortcuts.map((s) => (
                          <li key={s.keys.join('+')} className="flex items-center justify-between gap-2 rounded-lg bg-soft/60 px-2.5 py-2">
                            <span className="text-[11px] font-bold text-sub">{s.hint}</span>
                            <span className="flex shrink-0 items-center gap-1" dir="ltr">
                              {s.keys.map((k) => (
                                <kbd key={k} className="rounded-md border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] font-black text-ink shadow-xs">
                                  {k}
                                </kbd>
                              ))}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <LocaleSwitcher />
                <Link
                  href="/"
                  aria-label={lt(locale, { fa: 'سایت مسافران', en: 'Traveler Site', ar: 'موقع المسافرين', zh: '旅客网站', ru: 'Сайт для путешественников' })}
                  title={lt(locale, { fa: 'سایت مسافران', en: 'Traveler Site', ar: 'موقع المسافرين', zh: '旅客网站', ru: 'Сайт для путешественников' })}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-line text-sub transition hover:border-brand/40 hover:bg-mint hover:text-brand-dark"
                >
                  <ExternalLink size={15} aria-hidden="true" />
                </Link>
                <span className="hidden items-center gap-2 rounded-xl bg-soft py-1.5 pe-3 ps-1.5 sm:flex">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-deep text-[11px] font-black text-surface" aria-hidden="true">
                    {initial}
                  </span>
                  <span className="hidden max-w-28 truncate text-xs font-black text-ink xl:block">{userName}</span>
                  <UserCheck size={14} className="text-brand-dark" aria-hidden="true" />
                </span>
              </div>
            </div>
          </header>

          <main id="admin-main" tabIndex={-1} className="mt-4 min-w-0 focus:outline-none">
            {children}
          </main>

          <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 px-1 pb-4 text-[10px] font-bold text-sub/70">
            <span>
              {lt(locale, { fa: 'سامانه یکپارچه فیروزو · ERP v2.0', en: 'Firuzo Unified System · ERP v2.0', ar: 'نظام فيروزو الموحد · ERP v2.0', zh: 'Firuzo 统一系统 · ERP v2.0', ru: 'Единая система Firuzo · ERP v2.0' })}
            </span>
            <span dir="ltr" className="font-mono">OPS · FIN · CATALOG</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
