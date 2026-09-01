'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { getWallet } from '@/actions/booking';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import {
  UserRound,
  Wallet,
  BadgeCheck,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { lt } from '@/lib/lt';

export default function AccountPage() {
  const t = useTranslations('Account');
  const locale = useLocale();
  const router = useRouter();
  const { user, kyc } = useAuthStore();
  const [wallet, setWallet] = useState<{ IRR: number; USDT: number; AED: number }>({
    IRR: 0,
    USDT: 0,
    AED: 0,
  });

  useEffect(() => {
    async function fetchWallet() {
      try {
        const res = await getWallet();
        if (res.success && res.balances) {
          setWallet(res.balances);
        }
      } catch (e) {
        console.error('Failed to fetch account wallet:', e);
      }
    }
    if (user) {
      fetchWallet();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-16 text-center">
        <UserRound size={52} className="mx-auto text-line mb-4" />
        <h1 className="text-[20px] font-black text-ink mb-2">
          {lt(locale, {
            fa: 'وارد نشده‌اید',
            en: 'Not Signed In',
            ar: 'لم تقم بتسجيل الدخول',
            zh: '未登录',
            ru: 'Вы не вошли в систему',
          })}
        </h1>
        <p className="text-[13px] font-bold text-sub mb-6">
          {lt(locale, {
            fa: 'برای مشاهده حساب کاربری ابتدا وارد شوید',
            en: 'Please sign in to view your account dashboard',
            ar: 'يرجى تسجيل الدخول لعرض لوحة حسابك',
            zh: '请登录以查看您的账户仪表板',
            ru: 'Войдите, чтобы увидеть панель вашего аккаунта',
          })}
        </p>
        <Button
          onClick={() => router.push('/auth')}
          className="bg-brand hover:bg-brand-2 text-surface h-11 px-10 font-black rounded-xl"
        >
          {lt(locale, {
            fa: 'ورود / ثبت‌نام',
            en: 'Sign In / Register',
            ar: 'تسجيل الدخول / إنشاء حساب',
            zh: '登录 / 注册',
            ru: 'Вход / Регистрация',
          })}
        </Button>
      </div>
    );
  }

  const kycDone = kyc.step === 'approved' && user.kycApproved;

  return (
    <div className="flex flex-col md:flex-row w-full max-w-[1280px] mx-auto px-4 md:px-10 py-8 gap-8">
      <AccountSidebar activeSection="profile" />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-surface border border-line shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-sub">
                {lt(locale, {
                  fa: 'موجودی ریالی',
                  en: 'Rial Balance',
                  ar: 'الرصيد بالريال',
                  zh: '里亚尔余额',
                  ru: 'Баланс в риалах',
                })}
              </span>
              <Wallet size={18} className="text-brand" />
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-ink font-mono num">
                {wallet.IRR.toLocaleString(
                  lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' })
                )}
              </span>
              <span className="text-xs font-bold text-sub ms-1">
                {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}
              </span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface border border-line shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-sub">
                {lt(locale, {
                  fa: 'موجودی تتر (USDT)',
                  en: 'USDT Balance',
                  ar: 'رصيد التيثر (USDT)',
                  zh: 'USDT 余额',
                  ru: 'Баланс USDT',
                })}
              </span>
              <BadgeCheck size={18} className="text-brand-dark" />
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-ink font-mono num">
                $
                {wallet.USDT.toLocaleString(
                  lt(locale, { fa: 'fa-IR', en: 'en-US', ar: 'ar', zh: 'zh', ru: 'ru' })
                )}
              </span>
              <span className="text-xs font-bold text-sub ms-1">USDT</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface border border-line shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-sub">
                {lt(locale, {
                  fa: 'وضعیت احراز هویت',
                  en: 'Verification',
                  ar: 'حالة التحقق من الهوية',
                  zh: '身份认证状态',
                  ru: 'Статус верификации',
                })}
              </span>
              {kycDone ? <ShieldCheck size={18} className="text-success" /> : <ShieldAlert size={18} className="text-gold" />}
            </div>
            <div className="mt-4">
              <span className={`text-sm font-black ${kycDone ? 'text-success' : 'text-gold'}`}>
                {kycDone
                  ? lt(locale, { fa: 'احراز هویت شده', en: 'Verified', ar: 'تم التحقق', zh: '已认证', ru: 'Верифицирован' })
                  : lt(locale, { fa: 'در انتظار تکمیل', en: 'Pending KYC', ar: 'في انتظار الاستكمال', zh: '待完善', ru: 'Ожидает завершения' })}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-line p-6 md:p-8 shadow-sm">
          <h2 className="text-xl font-black text-ink mb-6">{t('profile')}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <span className="block text-xs font-bold text-sub mb-1">
                {lt(locale, { fa: 'نام و نام خانوادگی', en: 'Full Name', ar: 'الاسم الكامل', zh: '姓名', ru: 'ФИО' })}
              </span>
              <span className="text-base font-black text-ink">
                {user.firstNameFa} {user.lastNameFa}
              </span>
            </div>

            <div>
              <span className="block text-xs font-bold text-sub mb-1">
                {lt(locale, { fa: 'شماره موبایل', en: 'Mobile Number', ar: 'رقم الجوال', zh: '手机号码', ru: 'Номер мобильного' })}
              </span>
              <span className="text-base font-black text-ink font-mono" dir="ltr">
                {user.phone}
              </span>
            </div>

            <div>
              <span className="block text-xs font-bold text-sub mb-1">
                {lt(locale, { fa: 'کد ملی', en: 'National ID', ar: 'الرقم الوطني', zh: '国民身份证号', ru: 'Национальный ID' })}
              </span>
              <span className="text-base font-black text-ink font-mono">{kyc.nationalId || '—'}</span>
            </div>

            <div>
              <span className="block text-xs font-bold text-sub mb-1">
                {lt(locale, { fa: 'شماره پاسپورت', en: 'Passport Number', ar: 'رقم جواز السفر', zh: '护照号码', ru: 'Номер паспорта' })}
              </span>
              <span className="text-base font-black text-ink font-mono">{kyc.passportNo || '—'}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
