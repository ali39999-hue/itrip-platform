'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { useAuthStore } from '@/stores/auth-store';
import { lt } from '@/lib/lt';
import {
  LayoutGrid,
  PlaneTakeoff,
  Gift,
  LogOut,
  ShieldCheck,
  Star,
  UserRound,
  Bot,
} from 'lucide-react';

interface AccountSidebarProps {
  activeSection?: 'dashboard' | 'trips' | 'wallet' | 'profile' | 'autobuy';
}

export function AccountSidebar({ activeSection = 'trips' }: AccountSidebarProps) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('MyTrips');
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const userFullName = locale === 'fa'
    ? `${user?.firstNameFa || ''} ${user?.lastNameFa || ''}`.trim()
    : `${user?.firstNameEn || user?.firstNameFa || ''} ${user?.lastNameEn || user?.lastNameFa || ''}`.trim();

  const userName = user
    ? userFullName || user.phone
    : lt(locale, {
        fa: 'کاربر فیروزو',
        en: 'Firuzo Traveler',
        ar: 'مسافر فيروزو',
        zh: 'Firuzo 旅客',
        ru: 'Путешественник Firuzo',
      });

  const initials = (user?.firstNameFa?.[0] || user?.firstNameEn?.[0] || 'ف').toUpperCase();

  return (
    <aside className="lg:w-72 flex flex-col gap-2 bg-surface shadow-xs rounded-3xl h-fit lg:sticky top-24 shrink-0 border border-line overflow-hidden">
      <div className="p-6 border-b border-line flex flex-col items-center text-center bg-gradient-to-b from-mint/30 to-transparent">
        {/* Dynamic Initials Avatar */}
        <div className="w-18 h-18 rounded-full mb-3 shadow-sm border-2 border-brand/20 bg-gradient-to-br from-brand to-brand-dark text-surface flex items-center justify-center text-xl font-black">
          {userFullName ? initials : <UserRound size={26} />}
        </div>
        <h2 className="text-[17px] font-black text-ink mb-1">{userName}</h2>
        
        {/* Loyalty Tier Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gold-soft border border-action/20 text-price text-[11px] font-black">
          <Star size={12} className="fill-action text-action" />
          <span>{lt(locale, { fa: 'مسافر طلایی فیروزو', en: 'Gold Traveler', ar: 'مسافر ذهبي', zh: '黄金旅客', ru: 'Золотой уровень' })}</span>
        </div>
        
        <p className="font-bold text-[11.5px] text-sub mt-2">
          {lt(locale, {
            fa: '۲,۵۰۰ امتیاز باشگاه مشتریان',
            en: '2,500 Reward Points',
            ar: '2,500 نقطة مكافآت',
            zh: '2,500 奖励积分',
            ru: '2 500 баллов лояльности',
          })}
        </p>
      </div>

      <nav className="flex flex-col gap-1.5 p-3" aria-label={lt(locale, { fa: 'منوی حساب کاربری', en: 'Account menu', ar: 'قائمة الحساب', zh: '账户菜单', ru: 'Меню аккаунта' })}>
        <Link
          href="/account"
          className={`flex items-center gap-3 px-4 py-3 font-bold text-[13.5px] rounded-2xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
            activeSection === 'dashboard' || activeSection === 'profile'
              ? 'bg-brand text-surface font-black shadow-xs'
              : 'text-sub hover:bg-soft hover:text-ink'
          }`}
        >
          <LayoutGrid size={17} />
          {lt(locale, { fa: 'داشبورد و پروفایل', en: 'Dashboard & Profile', ar: 'لوحة التحكم والملف الشخصي', zh: '仪表板与个人资料', ru: 'Панель и профиль' })}
        </Link>

        <Link
          href="/my-trips"
          className={`flex items-center gap-3 px-4 py-3 font-bold text-[13.5px] rounded-2xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
            activeSection === 'trips'
              ? 'bg-brand text-surface font-black shadow-xs'
              : 'text-sub hover:bg-soft hover:text-ink'
          }`}
        >
          <PlaneTakeoff size={17} />
          {t('title')}
        </Link>

        <Link
          href="/wallet"
          className={`flex items-center gap-3 px-4 py-3 font-bold text-[13.5px] rounded-2xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
            activeSection === 'wallet'
              ? 'bg-brand text-surface font-black shadow-xs'
              : 'text-sub hover:bg-soft hover:text-ink'
          }`}
        >
          <Gift size={17} />
          {lt(locale, { fa: 'کیف پول و امتیازات', en: 'Wallet & Rewards', ar: 'المحفظة والمكافآت', zh: '钱包与奖励', ru: 'Кошелёк и бонусы' })}
        </Link>

        <Link
          href="/account/auto-buy"
          className={`flex items-center gap-3 px-4 py-3 font-bold text-[13.5px] rounded-2xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
            activeSection === 'autobuy'
              ? 'bg-brand text-surface font-black shadow-xs'
              : 'text-sub hover:bg-soft hover:text-ink'
          }`}
        >
          <Bot size={17} />
          <span>{lt(locale, { fa: 'خرید خودکار (ربات سفر)', en: 'Auto-Buy (Smart Bot)', ar: 'الشراء التلقائي (بوت السفر)', zh: '自动购票（智能助手）', ru: 'Автопокупка (бот)' })}</span>
        </Link>

        {['admin', 'SUPER_ADMIN', 'OPS', 'FINANCE'].includes(user?.role || '') && (
          <Link
            href="/admin"
            className="flex items-center gap-3 px-4 py-3 font-bold text-[13.5px] rounded-2xl text-brand-dark bg-mint border border-brand/20 hover:bg-mint/80 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <ShieldCheck size={17} />
            {lt(locale, { fa: 'سامانه مدیریت (ERP)', en: 'Admin ERP Panel', ar: 'لوحة الإدارة', zh: '管理后台', ru: 'Панель администратора' })}
          </Link>
        )}
      </nav>

      <div className="p-3 mt-auto border-t border-line/60">
        <button
          onClick={() => {
            logout();
            router.push('/');
          }}
          className="w-full flex items-center justify-center gap-2 text-rose-warm hover:bg-rose-warm/10 px-4 py-2.5 rounded-2xl transition-colors font-bold text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <LogOut size={16} />
          {lt(locale, { fa: 'خروج از حساب', en: 'Sign Out', ar: 'تسجيل الخروج', zh: '退出登录', ru: 'Выйти' })}
        </button>
      </div>
    </aside>
  );
}
