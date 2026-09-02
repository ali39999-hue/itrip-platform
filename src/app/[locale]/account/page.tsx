س'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useAuthStore } from '@/stores/auth-store';
import { useBookingStore } from '@/stores/booking-store';
import { useLocalizedUserName } from '@/hooks/useLocalizedUserName';
import { Button } from '@/components/ui/button';
import {
  UserRound, Wallet, LogOut, BadgeCheck,
  LayoutGrid, PlaneTakeoff, Settings, ShieldCheck, ShieldAlert, Edit2, X
} from 'lucide-react';
import { lt } from '@/lib/lt';

export default function AccountPage() {
  const t = useTranslations('Account');
  const locale = useLocale();
  const router = useRouter();
  const { user, kyc, logout, updateKyc } = useAuthStore();
  const wallet = useBookingStore((s) => s.wallet);
  const localizedUserName = useLocalizedUserName();

  const firstName = localizedUserName.split(' ')[0] || '';
  const localeTag = locale === 'fa' ? 'fa-IR' : locale;

  const [isEditingName, setIsEditingName] = useState(false);
  const [editFirstName, setEditFirstName] = useState(user?.firstNameFa || '');
  const [editLastName, setEditLastName] = useState(user?.lastNameFa || '');
  const [editError, setEditError] = useState('');

  const handleSaveName = () => {
    if (!editFirstName.trim() || !editLastName.trim()) {
      setEditError(lt(locale, { fa: 'نام و نام خانوادگی الزامی است', en: 'First and last name are required', ar: 'الاسم الأول والأخير مطلوبان', zh: '姓名和姓氏为必填项', ru: 'Имя и фамилия обязательны' }));
      return;
    }
    setEditError('');
    updateKyc({ firstNameFa: editFirstName, lastNameFa: editLastName });
    setIsEditingName(false);
  };

  if (!user) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-16 text-center">
        <UserRound size={52} className="mx-auto text-line mb-4" />
        <h1 className="text-[20px] font-black text-ink mb-2">{lt(locale, { fa: 'وارد نشده‌اید', en: 'Not Signed In', ar: 'لم تقم بتسجيل الدخول', zh: '未登录', ru: 'Вы не вошли в систему' })}</h1>
        <p className="text-[13px] font-bold text-sub mb-6">{lt(locale, { fa: 'برای مشاهده حساب کاربری ابتدا وارد شوید', en: 'Please sign in to view your account dashboard', ar: 'يرجى تسجيل الدخول لعرض لوحة حسابك', zh: '请登录以查看您的账户仪表板', ru: 'Войдите, чтобы увидеть панель вашего аккаунта' })}</p>
        <Button onClick={() => router.push('/auth')} className="bg-brand hover:bg-brand-2 text-surface h-11 px-10 font-black rounded-xl">
          {lt(locale, { fa: 'ورود / ثبت‌نام', en: 'Sign In / Register', ar: 'تسجيل الدخول / إنشاء حساب', zh: '登录 / 注册', ru: 'Вход / Регистрация' })}
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
            <h2 className="text-xl font-black text-brand-dark">
              {lt(locale, {
                fa: `سلام، ${firstName}`,
                en: `Hello, ${firstName}`,
                ar: `مرحبا، ${firstName}`,
                zh: `你好，${firstName}`,
                ru: `Привет, ${firstName}`,
              })}
            </h2>
            <p className="text-[13px] font-bold text-sub mt-1">{lt(locale, { fa: 'امتیاز شما: ۲۵۰۰', en: 'Reward points: 2,500', ar: 'نقاطك: 2,500', zh: '您的积分：2,500', ru: 'Ваши баллы: 2 500' })}</p>
          </div>
        </div>
        
        <nav className="flex flex-col gap-1 p-4">
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-black bg-brand text-surface shadow-sm text-start">
            <LayoutGrid size={20} /> {lt(locale, { fa: 'داشبورد', en: 'Dashboard', ar: 'لوحة التحكم', zh: '仪表板', ru: 'Панель управления' })}
          </button>
          <button onClick={() => router.push('/my-trips')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold text-sub hover:bg-soft transition-colors text-start">
            <PlaneTakeoff size={20} /> {lt(locale, { fa: 'سفرهای من', en: 'My Trips', ar: 'رحلاتي', zh: '我的旅行', ru: 'Мои поездки' })}
          </button>
          <button onClick={() => router.push('/wallet')} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold text-sub hover:bg-soft transition-colors text-start">
            <Wallet size={20} /> {lt(locale, { fa: 'کیف پول و امتیازات', en: 'Wallet & Rewards', ar: 'المحفظة والمكافآت', zh: '钱包与奖励', ru: 'Кошелёк и бонусы' })}
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
              <span className="text-xs font-bold text-sub">{lt(locale, { fa: 'موجودی ریالی', en: 'Rial Balance', ar: 'الرصيد بالريال', zh: '里亚尔余额', ru: 'Баланс в риалах' })}</span>
              <Wallet size={18} className="text-brand" />
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-ink font-mono num">{wallet.IRR.toLocaleString(localeTag)}</span>
              <span className="text-xs font-bold text-sub ms-1">{lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'томанов' })}</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface border border-line shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-sub">{lt(locale, { fa: 'موجودی تتر (USDT)', en: 'USDT Balance', ar: 'رصيد التيثر (USDT)', zh: 'USDT 余额', ru: 'Баланс USDT' })}</span>
              <BadgeCheck size={18} className="text-brand-dark" />
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-ink font-mono num">${wallet.USDT.toLocaleString(localeTag)}</span>
              <span className="text-xs font-bold text-sub ms-1">USDT</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface border border-line shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-sub">{lt(locale, { fa: 'وضعیت احراز هویت', en: 'Verification', ar: 'حالة التحقق من الهوية', zh: '身份认证状态', ru: 'Статус верификации' })}</span>
              {kycDone ? <ShieldCheck size={18} className="text-success" /> : <ShieldAlert size={18} className="text-gold" />}
            </div>
            <div className="mt-4">
              <span className={`text-sm font-black ${kycDone ? 'text-success' : 'text-gold'}`}>
                {kycDone ? (lt(locale, { fa: 'احراز هویت شده', en: 'Verified', ar: 'تم التحقق', zh: '已认证', ru: 'Верифицирован' })) : (lt(locale, { fa: 'در انتظار تکمیل', en: 'Pending KYC', ar: 'في انتظار الاستكمال', zh: '待完善', ru: 'Ожидает завершения' }))}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-line p-6 md:p-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-ink">{t('profile')}</h2>
            <button
              onClick={() => {
                setEditFirstName(user?.firstNameFa || '');
                setEditLastName(user?.lastNameFa || '');
                setEditError('');
                setIsEditingName(true);
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand/10 text-brand-dark hover:bg-brand/20 transition font-bold text-sm"
            >
              <Edit2 size={16} />
              {lt(locale, { fa: 'ویرایش', en: 'Edit', ar: 'تعديل', zh: '编辑', ru: 'Редактировать' })}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <span className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'نام و نام خانوادگی', en: 'Full Name', ar: 'الاسم الكامل', zh: '姓名', ru: 'ФИО' })}</span>
              <span className="text-base font-black text-ink">{localizedUserName}</span>
            </div>

            <div>
              <span className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'شماره موبایل', en: 'Mobile Number', ar: 'رقم الجوال', zh: '手机号码', ru: 'Номер мобильного' })}</span>
              <span className="text-base font-black text-ink font-mono" dir="ltr">{user.phone}</span>
            </div>

            <div>
              <span className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'کد ملی', en: 'National ID', ar: 'الرقم الوطني', zh: '国民身份证号', ru: 'Национальный ID' })}</span>
              <span className="text-base font-black text-ink font-mono">{kyc.nationalId || '—'}</span>
            </div>

            <div>
              <span className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'شماره پاسپورت', en: 'Passport Number', ar: 'رقم جواز السفر', zh: '护照号码', ru: 'Номер паспорта' })}</span>
              <span className="text-base font-black text-ink font-mono">{kyc.passportNo || '—'}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Name Modal */}
      {isEditingName && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface border border-line rounded-3xl p-8 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-ink">{lt(locale, { fa: 'ویرایش نام', en: 'Edit Name', ar: 'تعديل الاسم', zh: '编辑姓名', ru: 'Редактировать имя' })}</h3>
              <button
                onClick={() => setIsEditingName(false)}
                className="p-2 hover:bg-soft rounded-lg transition"
              >
                <X size={20} className="text-sub" />
              </button>
            </div>

            {editError && (
              <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs font-bold">
                {editError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-sub mb-2">
                  {lt(locale, { fa: 'نام', en: 'First Name', ar: 'الاسم الأول', zh: '名', ru: 'Имя' })}
                </label>
                <input
                  type="text"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  placeholder={lt(locale, { fa: 'نام خود را وارد کنید', en: 'Enter your first name', ar: 'أدخل اسمك الأول', zh: '输入您的名字', ru: 'Введите свое имя' })}
                  className="w-full h-11 rounded-xl border border-line px-4 font-bold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-sub mb-2">
                  {lt(locale, { fa: 'نام خانوادگی', en: 'Last Name', ar: 'اسم العائلة', zh: '姓', ru: 'Фамилия' })}
                </label>
                <input
                  type="text"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  placeholder={lt(locale, { fa: 'نام خانوادگی خود را وارد کنید', en: 'Enter your last name', ar: 'أدخل اسم عائلتك', zh: '输入您的شيماسی', ru: 'Введите свою фамилию' })}
                  className="w-full h-11 rounded-xl border border-line px-4 font-bold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsEditingName(false)}
                  className="flex-1 h-11 rounded-xl border border-line text-ink font-black hover:bg-soft transition"
                >
                  {lt(locale, { fa: 'انصراف', en: 'Cancel', ar: 'إلغاء', zh: '取消', ru: 'Отмена' })}
                </button>
                <button
                  onClick={handleSaveName}
                  className="flex-1 h-11 rounded-xl bg-brand text-surface font-black hover:bg-brand-dark transition"
                >
                  {lt(locale, { fa: 'ثبت', en: 'Save', ar: 'حفظ', zh: '保存', ru: 'Сохранить' })}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
