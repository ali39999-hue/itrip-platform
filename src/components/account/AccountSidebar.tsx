'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { useAuthStore } from '@/stores/auth-store';
import { lt } from '@/lib/lt';
import {
  LayoutGrid,
  PlaneTakeoff,
  User,
  Gift,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

interface AccountSidebarProps {
  activeSection?: 'dashboard' | 'trips' | 'profile' | 'wallet' | 'settings';
}

export function AccountSidebar({ activeSection = 'trips' }: AccountSidebarProps) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('MyTrips');
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const userName = user
    ? `${user.firstNameFa || ''} ${user.lastNameFa || ''}`.trim() || user.phone
    : lt(locale, {
        fa: 'کاربر فیروزه',
        en: 'Firuzo Traveler',
        ar: 'مسافر فيروزو',
        zh: 'Firuzo 旅客',
        ru: 'Путешественник Firuzo',
      });

  return (
    <aside className="lg:w-72 flex flex-col gap-4 bg-soft shadow-sm rounded-2xl h-fit lg:sticky top-24 shrink-0 border border-line">
      <div className="p-6 border-b border-line flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full overflow-hidden mb-4 shadow-sm border-2 border-surface relative">
          <Image
            alt="Profile"
            className="object-cover"
            src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=70&w=160"
            fill
            sizes="80px"
          />
        </div>
        <h2 className="text-[18px] font-black text-brand mb-1">{userName}</h2>
        <p className="font-bold text-[12px] text-sub">
          {lt(locale, {
            fa: 'امتیاز وفاداری: ۲,۵۰۰',
            en: 'Reward points: 2,500',
            ar: 'نقاط الولاء: 2,500',
            zh: '忠诚积分：2,500',
            ru: 'Баллы программы: 2 500',
          })}
        </p>
      </div>

      <nav className="flex flex-col gap-1.5 p-4">
        <Link
          href="/account"
          className={`flex items-center gap-3 px-4 py-3 font-bold text-[14px] rounded-xl transition-all ${
            activeSection === 'dashboard'
              ? 'bg-brand text-surface font-black shadow-sm'
              : 'text-sub hover:bg-surface'
          }`}
        >
          <LayoutGrid size={18} />
          {lt(locale, { fa: 'داشبورد', en: 'Dashboard', ar: 'لوحة التحكم', zh: '仪表板', ru: 'Панель управления' })}
        </Link>

        <Link
          href="/my-trips"
          className={`flex items-center gap-3 px-4 py-3 font-bold text-[14px] rounded-xl transition-all ${
            activeSection === 'trips'
              ? 'bg-brand text-surface font-black shadow-sm'
              : 'text-sub hover:bg-surface'
          }`}
        >
          <PlaneTakeoff size={18} />
          {t('title')}
        </Link>

        <Link
          href="/wallet"
          className={`flex items-center gap-3 px-4 py-3 font-bold text-[14px] rounded-xl transition-all ${
            activeSection === 'wallet'
              ? 'bg-brand text-surface font-black shadow-sm'
              : 'text-sub hover:bg-surface'
          }`}
        >
          <Gift size={18} />
          {lt(locale, { fa: 'کیف پول و امتیازات', en: 'Wallet & Rewards', ar: 'المحفظة والمكافآت', zh: '钱包与奖励', ru: 'Кошелёк и бонусы' })}
        </Link>

        <Link
          href="/account"
          className={`flex items-center gap-3 px-4 py-3 font-bold text-[14px] rounded-xl transition-all ${
            activeSection === 'profile'
              ? 'bg-brand text-surface font-black shadow-sm'
              : 'text-sub hover:bg-surface'
          }`}
        >
          <User size={18} />
          {lt(locale, { fa: 'پروفایل و احراز هویت', en: 'Profile & KYC', ar: 'الملف الشخصي والتحقق', zh: '个人资料与验证', ru: 'Профиль и верификация' })}
        </Link>

        {user?.role === 'admin' && (
          <Link
            href="/admin"
            className="flex items-center gap-3 px-4 py-3 font-bold text-[14px] rounded-xl text-brand bg-mint/50 border border-brand/20 hover:bg-mint transition-all"
          >
            <ShieldCheck size={18} />
            {lt(locale, { fa: 'پنل مدیریت (ERP)', en: 'Admin ERP Panel', ar: 'لوحة الإدارة', zh: '管理后台', ru: 'Панель администратора' })}
          </Link>
        )}
      </nav>

      <div className="p-4 mt-auto border-t border-line/60">
        <button
          onClick={() => {
            logout();
            router.push('/');
          }}
          className="w-full flex items-center justify-center gap-2 text-rose-warm hover:bg-rose-warm/10 px-4 py-2.5 rounded-xl transition-colors font-bold text-[13px]"
        >
          <LogOut size={16} />
          {lt(locale, { fa: 'خروج از حساب', en: 'Sign Out', ar: 'تسجيل الخروج', zh: '退出登录', ru: 'Выйти' })}
        </button>
      </div>
    </aside>
  );
}
