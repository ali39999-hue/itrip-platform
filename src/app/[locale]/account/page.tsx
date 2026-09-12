'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useAuthStore } from '@/stores/auth-store';
import { useLocalizedUserName } from '@/hooks/useLocalizedUserName';
import { Button } from '@/components/ui/button';
import { getWallet, getMyBookings } from '@/actions/booking';
import { updateProfileDetails, getMyKyc } from '@/actions/auth';
import { getAccountPanelConfigAction } from '@/actions/account-panel';
import { LOYALTY_TIERS } from '@/lib/loyalty-tiers';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import { PushNotificationAsk } from '@/components/account/PushNotificationAsk';
import {
  UserRound,
  Wallet,
  BadgeCheck,
  ShieldCheck,
  ShieldAlert,
  Edit3,
  CheckCircle,
  Sparkles,
  Plane,
  Building,
  Briefcase,
  LogOut,
  Users,
  Bot,
} from 'lucide-react';
import { lt } from '@/lib/lt';

export default function AccountPage() {
  const locale = useLocale();
  const router = useRouter();
  const { user, updateKyc } = useAuthStore();
  const localizedUserName = useLocalizedUserName();

  const [wallet, setWallet] = useState<{ IRR: number; USDT: number; AED: number }>({
    IRR: 0,
    USDT: 0,
    AED: 0,
  });
  const [recentBookings, setRecentBookings] = useState<Array<{
    id: string;
    reference: string;
    status: string;
    totalAmount: unknown;
    currency: string;
    createdAt: Date;
    items?: Array<{ title?: string; type?: string }>;
  }>>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [panelConfig, setPanelConfig] = useState<Awaited<ReturnType<typeof getAccountPanelConfigAction>> | null>(null);

  const [formState, setFormState] = useState({
    firstNameFa: user?.firstNameFa || '',
    lastNameFa: user?.lastNameFa || '',
    firstNameEn: user?.firstNameEn || '',
    lastNameEn: user?.lastNameEn || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [walletRes, bookingsRes, kycRes, panelRes] = await Promise.all([
          getWallet(),
          getMyBookings(),
          getMyKyc(),
          getAccountPanelConfigAction().catch(() => null),
        ]);
        if (walletRes.success && walletRes.balances) {
          setWallet(walletRes.balances);
        }
        if (bookingsRes.success && bookingsRes.bookings) {
          setRecentBookings(bookingsRes.bookings.slice(0, 3));
        }
        // Owner-only server read restores saved KYC details after reload
        // (the client store intentionally excludes PII from localStorage).
        if (kycRes.success && kycRes.kyc) {
          setFormState((prev) => ({
            ...prev,
            firstNameFa: prev.firstNameFa || kycRes.kyc!.firstNameFa,
            lastNameFa: prev.lastNameFa || kycRes.kyc!.lastNameFa,
            firstNameEn: prev.firstNameEn || kycRes.kyc!.firstNameEn,
            lastNameEn: prev.lastNameEn || kycRes.kyc!.lastNameEn,
          }));
        }
        // Dynamic panel content (CMS overrides + real loyalty view)
        if (panelRes) setPanelConfig(panelRes);
      } catch (e) {
        console.error('Failed to load user account dashboard data:', e);
      }
    }
    if (user) {
      loadData();
    }
  }, [user]);

  async function handleSaveProfile() {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfileDetails({
        userId: user.id,
        ...formState,
      });
      updateKyc({
        firstNameFa: formState.firstNameFa,
        lastNameFa: formState.lastNameFa,
        firstNameEn: formState.firstNameEn,
        lastNameEn: formState.lastNameEn,
      });
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

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

  const kycDone = user.kycApproved;
  // profileComplete=false یعنی نام/نام خانوادگی/کد ملی هنوز ثبت نشده —
  // کاربر بعد از ثبت‌نام اولیه باید به تکمیل اطلاعات هویتی هدایت شود.
  const profileIncomplete = user.profileComplete === false;

  // Real loyalty view (server-authoritative coins → tier ladder)
  const loyaltyView = panelConfig?.loyalty ?? null;
  const loyaltyEnabled = loyaltyView ? loyaltyView.enabled : true;
  const currentTier = loyaltyView ? LOYALTY_TIERS[Math.max(0, loyaltyView.tierIndex)] : LOYALTY_TIERS[0];
  const nextTier = loyaltyView?.nextTierKey
    ? LOYALTY_TIERS.find((tr) => tr.key === loyaltyView.nextTierKey) ?? null
    : null;
  const tierName = (t: typeof currentTier) =>
    lt(locale, { fa: t.fa, en: t.en, ar: t.ar, zh: t.zh, ru: t.ru });
  const heroTitle = panelConfig?.hero?.title && panelConfig.hero.title[locale as keyof typeof panelConfig.hero.title]
    ? panelConfig.hero.title[locale as keyof typeof panelConfig.hero.title]
    : null;
  const heroSubtitle = panelConfig?.hero?.subtitle && panelConfig.hero.subtitle[locale as keyof typeof panelConfig.hero.subtitle]
    ? panelConfig.hero.subtitle[locale as keyof typeof panelConfig.hero.subtitle]
    : null;

  return (
    <div className="flex flex-col md:flex-row w-full max-w-[1280px] mx-auto px-4 md:px-10 py-6 md:py-8 gap-6 md:gap-8">
      {/* Dynamic Account Navigation: Mobile chips bar + Desktop sticky sidebar */}
      <AccountSidebar activeSection="profile" />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col gap-5 md:gap-6 min-w-0">
        {profileIncomplete && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-gold-soft/70 border border-gold/40">
            <div className="flex items-start gap-3">
              <ShieldAlert size={20} className="text-gold shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-ink m-0">
                  {lt(locale, { fa: 'اطلاعات هویتی شما کامل نیست', en: 'Your identity details are incomplete', ar: 'بياناتك الهوية غير مكتملة', zh: '您的身份信息尚未完成', ru: 'Ваши данные не заполнены' })}
                </p>
                <p className="text-xs text-sub font-bold m-0 mt-1 leading-relaxed">
                  {lt(locale, { fa: 'برای صدور قطعی بلیط و رزرو، نام، نام خانوادگی و کد ملی خود را تکمیل کنید.', en: 'Complete your name and national ID to finalize tickets and bookings.', ar: 'أكمل اسمك ورقم الهوية لإتمام الحجز.', zh: '请完成姓名和身份证号以完成预订。', ru: 'Заполните имя и национальный ID для завершения бронирования.' })}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push('/auth')}
              className="shrink-0 min-h-[44px] px-5 rounded-xl bg-brand-dark hover:bg-deep text-surface text-xs font-black transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {lt(locale, { fa: 'تکمیل اطلاعات', en: 'Complete details', ar: 'إكمال البيانات', zh: '完善信息', ru: 'Заполнить данные' })}
            </button>
          </div>
        )}

        {/* Welcome Header with Mobile-Optimized Layout */}
        <div className="bg-gradient-to-r from-brand to-brand-dark rounded-3xl p-5 sm:p-6 md:p-8 text-surface shadow-elev-1 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-surface/15 text-xs font-bold mb-2 backdrop-blur-xs">
              <Sparkles size={13} />
              <span>
                {lt(locale, { fa: 'سطح کاربری: ', en: 'Tier: ', ar: 'المستوى: ', zh: '会员等级：', ru: 'Уровень: ' })}
                {tierName(currentTier)}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black">
              {heroTitle || lt(locale, { fa: 'خوش آمدید،', en: 'Welcome back,', ar: 'أهلاً بك،', zh: '欢迎回来，', ru: 'Добро пожаловать,' })} {localizedUserName || user.firstNameFa || user.phone}
            </h1>
            <p className="text-surface/80 text-xs md:text-sm mt-1 leading-relaxed">
              {heroSubtitle ||
                lt(locale, { fa: 'مدیریت یکپارچه سفرها، مدارک هویتی، کیف پول و خدمات ویژه فیروزو', en: 'Manage bookings, identity documents, wallet and services in one place', ar: 'إدارة رحلاتك ووثائقك ومحفظتك في مكان واحد', zh: '集中管理您的行程、身份凭证与多币种钱包', ru: 'Управление поездками, документами и кошельком' })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto pt-1 md:pt-0">
            <Button
              onClick={() => router.push('/my-trips')}
              variant="outline"
              size="sm"
              className="flex-1 md:flex-none bg-surface/15 hover:bg-surface/25 text-surface border-surface/30 font-black rounded-xl text-xs h-10"
            >
              {lt(locale, { fa: 'سفرهای من', en: 'My Trips', ar: 'رحلاتي', zh: '我的行程', ru: 'Мои поездки' })}
            </Button>
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              size="sm"
              className="flex-1 md:flex-none bg-surface/15 hover:bg-surface/25 text-surface border-surface/30 font-black rounded-xl text-xs h-10"
            >
              <Edit3 size={14} />
              <span>{lt(locale, { fa: 'ویرایش', en: 'Edit', ar: 'تعديل', zh: '编辑', ru: 'Правка' })}</span>
            </Button>
            <Button
              onClick={() => router.push('/wallet')}
              size="sm"
              className="flex-1 md:flex-none bg-surface text-brand-dark hover:bg-surface/90 font-black rounded-xl text-xs h-10 shadow-xs"
            >
              <Wallet size={14} />
              <span>{lt(locale, { fa: 'شارژ کیف پول', en: 'Top Up', ar: 'شحن', zh: '充值', ru: 'Пополнить' })}</span>
            </Button>
          </div>
        </div>

        {/* Loyalty Progression Tier Bar — real server-authoritative data */}
        {loyaltyEnabled && loyaltyView && (
          <div className="bg-surface rounded-2xl p-4 sm:p-5 border border-line shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 space-y-1.5">
              <div className="flex justify-between items-center text-xs font-black">
                <span className="text-ink">
                  {tierName(currentTier)} (
                  {(loyaltyView.totalCoins).toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}{' '}
                  {lt(locale, { fa: 'امتیاز', en: 'points', ar: 'نقطة', zh: '积分', ru: 'баллов' })})
                </span>
                {nextTier ? (
                  <span className="text-brand-dark">{tierName(nextTier)}</span>
                ) : (
                  <span className="text-brand-dark">
                    {lt(locale, { fa: 'بالاترین سطح ✨', en: 'Top tier ✨', ar: 'أعلى مستوى ✨', zh: '最高等级 ✨', ru: 'Максимальный уровень ✨' })}
                  </span>
                )}
              </div>
              <div
                className="w-full h-2 rounded-full bg-soft overflow-hidden border border-line/60"
                role="progressbar"
                aria-valuenow={Math.round(loyaltyView.progress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={lt(locale, { fa: 'پیشرفت سطح باشگاه مشتریان', en: 'Loyalty tier progress', ar: 'تقدم مستوى الولاء', zh: '会员等级进度', ru: 'Прогресс уровня' })}
              >
                <div
                  className="h-full bg-gradient-to-r from-action to-gold-light rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(4, Math.round(loyaltyView.progress * 100))}%` }}
                />
              </div>
            </div>
            <span className="text-[11.5px] text-sub font-bold shrink-0">
              {loyaltyView.perkText && loyaltyView.perkText[locale as keyof typeof loyaltyView.perkText]
                ? loyaltyView.perkText[locale as keyof typeof loyaltyView.perkText]
                : nextTier
                  ? `${loyaltyView.coinsToNext.toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')} ${lt(locale, {
                      fa: 'امتیاز تا سطح بعد',
                      en: 'points to the next tier',
                      ar: 'نقطة حتى المستوى التالي',
                      zh: '积分升至下一等级',
                      ru: 'баллов до следующего уровня',
                    })}`
                  : lt(locale, {
                      fa: 'همه مزایای باشگاه مشتریان برای شما فعال است',
                      en: 'All loyalty perks are unlocked for you',
                      ar: 'جميع مزايا الولاء مفتوحة لك',
                      zh: '所有会员权益已为您解锁',
                      ru: 'Все привилегии открыты',
                    })}
            </span>
          </div>
        )}

        {/* Push notification soft-ask (پوش نوتیفیکیشن) */}
        <PushNotificationAsk />

        {/* Financial & Status Overview Cards */}
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
                  fa: 'موجودی ارزی (USDT)',
                  en: 'Crypto Balance (USDT)',
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
                  fa: 'وضعیت احراز هویت (KYC)',
                  en: 'Identity Verification',
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
                  ? lt(locale, { fa: 'احراز هویت شده (پاسپورت تایید شد)', en: 'Verified & Passport Approved', ar: 'تم التحقق بنجاح', zh: '已通过身份与护照验证', ru: 'Верифицирован' })
                  : lt(locale, { fa: 'در انتظار تکمیل مدارک', en: 'Pending Verification', ar: 'في انتظار الاستكمال', zh: '待完善信息', ru: 'Ожидает завершения' })}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Details & Quick Editor */}
        <div className="bg-surface rounded-2xl border border-line p-6 md:p-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-mint grid place-items-center text-brand-dark">
                <UserRound size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-ink">{lt(locale, { fa: 'اطلاعات پروفایل', en: 'Profile Info', ar: 'الملف الشخصي والجواز', zh: '个人资料与护照信息', ru: 'Профиль и паспорт' })}</h2>
                <p className="text-xs font-bold text-sub">{lt(locale, { fa: 'مورد استفاده در صدور پرواز، هتل و خدمات ویزا', en: 'Used for issuing flight tickets, hotel rooms & visas', ar: 'تُستخدم لإصدار تذاكر الطيران والفنادق والتأشيرة', zh: '用于预订机票、酒店及办理签证', ru: 'Используется для оформления билетов и виз' })}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  className="rounded-xl font-bold text-xs"
                >
                  {lt(locale, { fa: 'انصراف', en: 'Cancel', ar: 'إلغاء', zh: '取消', ru: 'Отмена' })}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isEditing) handleSaveProfile();
                  else setIsEditing(true);
                }}
                disabled={saving}
                className="rounded-xl font-bold flex items-center gap-1.5"
              >
                {isEditing ? <CheckCircle size={16} className="text-success" /> : <Edit3 size={16} />}
                {isEditing
                  ? lt(locale, { fa: 'ذخیره تغییرات', en: 'Save Changes', ar: 'حفظ التعديلات', zh: '保存更改', ru: 'Сохранить' })
                  : lt(locale, { fa: 'ویرایش اطلاعات', en: 'Edit Info', ar: 'تعديل', zh: '编辑', ru: 'Редактировать' })}
              </Button>
            </div>
          </div>

          {!isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-soft/50 p-6 rounded-2xl border border-line">
              <div>
                <span className="block text-xs font-bold text-sub mb-1">
                  {lt(locale, { fa: 'نام و نام خانوادگی (فارسی)', en: 'Full Name (Persian/Local)', ar: 'الاسم الكامل', zh: '姓名', ru: 'ФИО' })}
                </span>
                <span className="text-sm font-black text-ink">
                  {localizedUserName || `${user.firstNameFa} ${user.lastNameFa}`}
                </span>
              </div>

              <div>
                <span className="block text-xs font-bold text-sub mb-1">
                  {lt(locale, { fa: 'نام لاتین (مطابق پاسپورت)', en: 'Latin Name (Passport)', ar: 'الاسم بالإنجليزية', zh: '英文姓名', ru: 'Имя на латинице' })}
                </span>
                <span className="text-sm font-black text-ink font-mono">
                  {user.firstNameEn || formState.firstNameEn || '—'} {user.lastNameEn || formState.lastNameEn || ''}
                </span>
              </div>

              <div>
                <span className="block text-xs font-bold text-sub mb-1">
                  {lt(locale, { fa: 'شماره تماس / کانال ورود', en: 'Phone / Primary Channel', ar: 'رقم الهاتف / وسيلة الدخول', zh: '手机号 / 登录渠道', ru: 'Телефон' })}
                </span>
                <span className="text-sm font-black text-ink font-mono" dir="ltr">
                  {user.phone || user.email || '—'}
                </span>
              </div>

              <div>
                <span className="block text-xs font-bold text-sub mb-1">
                  {lt(locale, { fa: 'شناسه تلگرام / پیام‌رسان', en: 'Connected Messengers', ar: 'المراسلات المتصلة', zh: '已绑定的社交账号', ru: 'Подключенные мессенджеры' })}
                </span>
                <span className="text-sm font-black text-ink font-mono">
                  {user.telegramId || user.whatsappPhone || user.wechatId || lt(locale, { fa: 'فعال', en: 'Active', ar: 'نشط', zh: '已启用', ru: 'Активен' })}
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-soft/40 p-6 rounded-2xl border border-line">
              <div>
                <label className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'نام فارسی', en: 'First Name (Fa)', ar: 'الاسم الأول', zh: '名字', ru: 'Имя' })}</label>
                <input
                  type="text"
                  value={formState.firstNameFa}
                  onChange={(e) => setFormState({ ...formState, firstNameFa: e.target.value })}
                  className="w-full h-11 rounded-xl border border-line px-3 text-sm font-bold bg-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'نام خانوادگی فارسی', en: 'Last Name (Fa)', ar: 'اسم العائلة', zh: '姓氏', ru: 'Фамилия' })}</label>
                <input
                  type="text"
                  value={formState.lastNameFa}
                  onChange={(e) => setFormState({ ...formState, lastNameFa: e.target.value })}
                  className="w-full h-11 rounded-xl border border-line px-3 text-sm font-bold bg-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'نام و نام خانوادگی لاتین', en: 'Latin Name (EN)', ar: 'الاسم بالإنجليزية', zh: '英文全名', ru: 'Имя на латинице' })}</label>
                <input
                  type="text"
                  dir="ltr"
                  value={formState.firstNameEn}
                  placeholder="ALI MOHAMMADI"
                  onChange={(e) => setFormState({ ...formState, firstNameEn: e.target.value.toUpperCase() })}
                  className="w-full h-11 rounded-xl border border-line px-3 text-sm font-bold font-mono bg-surface"
                />
              </div>
            </div>
          )}
        </div>

        {/* Recent Bookings Strip */}
        <div className="bg-surface rounded-2xl border border-line p-6 md:p-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-mint grid place-items-center text-brand-dark">
                <Briefcase size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-ink">{lt(locale, { fa: 'آخرین رزروها و سفارش‌ها', en: 'Recent Bookings & Services', ar: 'أحدث الحجوزات والخدمات', zh: '近期预订与服务', ru: 'Последние бронирования' })}</h2>
                <p className="text-xs font-bold text-sub">{lt(locale, { fa: 'رهگیری وضعیت صدور، ووچرها و فاکتورها', en: 'Track issuing status, vouchers and invoices', ar: 'تتبع حالة التذاكر والوثائق', zh: '追踪出票状态与行程凭证', ru: 'Отслеживание статуса и ваучеров' })}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/my-trips')}
              className="rounded-xl font-bold"
            >
              {lt(locale, { fa: 'مشاهده همه سفرهای من', en: 'View All My Trips', ar: 'عرض الكل', zh: '查看全部', ru: 'Все поездки' })}
            </Button>
          </div>

          {recentBookings.length === 0 ? (
            <div className="text-center py-8 bg-soft/30 rounded-2xl border border-line/60">
              <p className="text-xs font-bold text-sub mb-3">{lt(locale, { fa: 'هنوز سفری ثبت نکرده‌اید. با برنامه‌ریز هوشمند سفر خود را آغاز کنید.', en: 'No bookings found yet. Start planning your journey today.', ar: 'لا توجد حجوزات حتى الآن. ابدأ رحلتك الآن.', zh: '暂无预订记录。立即使用智能规划助手开启旅程。', ru: 'У вас пока нет броней. Начните планирование поездки.' })}</p>
              <Button
                onClick={() => router.push('/plan')}
                className="bg-brand text-surface hover:bg-brand-2 rounded-xl text-xs font-black h-9"
              >
                {lt(locale, { fa: 'برنامه‌ریزی هوشمند سفر', en: 'Plan a New Journey', ar: 'تخطيط رحلة', zh: '智能行程规划', ru: 'Спланировать поездку' })}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentBookings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => router.push(`/my-trips/${b.id}`)}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border border-line hover:border-brand bg-surface transition cursor-pointer gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-soft grid place-items-center text-brand">
                      {b.items?.[0]?.type === 'FLIGHT' ? <Plane size={18} /> : <Building size={18} />}
                    </div>
                    <div>
                      <span className="font-mono font-black text-sm text-ink">{b.reference}</span>
                      <p className="text-xs font-bold text-sub">
                        {b.items?.[0]?.type || 'TRAVEL'} — {new Date(b.createdAt).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-end">
                      <span className="text-sm font-black text-ink font-mono">
                        {Number(b.totalAmount).toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}
                      </span>
                      <span className="text-xs font-bold text-sub ms-1">{b.currency}</span>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black ${
                        b.status === 'CONFIRMED'
                          ? 'bg-success/10 text-success'
                          : b.status === 'HELD' || b.status === 'DRAFT'
                          ? 'bg-action/10 text-action'
                          : 'bg-sub/10 text-sub'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile-Only Services Grid & Logout Button */}
        <div className="md:hidden space-y-4">
          <div className="bg-surface rounded-2xl border border-line p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-black text-ink">
              {lt(locale, { fa: 'امکانات و خدمات حساب کاربری', en: 'Account Features & Services', ar: 'خدمات الحساب', zh: '账户服务与功能', ru: 'Услуги аккаунта' })}
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => router.push('/my-trips')}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-soft hover:bg-mint/40 text-start transition active:scale-95 border border-line/60"
              >
                <div className="w-8 h-8 rounded-lg bg-mint text-brand-dark grid place-items-center shrink-0">
                  <Briefcase size={16} />
                </div>
                <span className="text-xs font-black text-ink truncate">
                  {lt(locale, { fa: 'سفرهای من', en: 'My Trips', ar: 'رحلاتي', zh: '我的行程', ru: 'Мои поездки' })}
                </span>
              </button>

              <button
                type="button"
                onClick={() => router.push('/wallet')}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-soft hover:bg-mint/40 text-start transition active:scale-95 border border-line/60"
              >
                <div className="w-8 h-8 rounded-lg bg-mint text-brand-dark grid place-items-center shrink-0">
                  <Wallet size={16} />
                </div>
                <span className="text-xs font-black text-ink truncate">
                  {lt(locale, { fa: 'کیف پول', en: 'Wallet', ar: 'المحفظة', zh: '钱包', ru: 'Кошелёк' })}
                </span>
              </button>

              <button
                type="button"
                onClick={() => router.push('/account/travelers')}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-soft hover:bg-mint/40 text-start transition active:scale-95 border border-line/60"
              >
                <div className="w-8 h-8 rounded-lg bg-mint text-brand-dark grid place-items-center shrink-0">
                  <Users size={16} />
                </div>
                <span className="text-xs font-black text-ink truncate">
                  {lt(locale, { fa: 'لیست مسافران', en: 'Travelers', ar: 'المسافرون', zh: '旅客名单', ru: 'Пассажиры' })}
                </span>
              </button>

              <button
                type="button"
                onClick={() => router.push('/account/auto-buy')}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-soft hover:bg-mint/40 text-start transition active:scale-95 border border-line/60"
              >
                <div className="w-8 h-8 rounded-lg bg-mint text-brand-dark grid place-items-center shrink-0">
                  <Bot size={16} />
                </div>
                <span className="text-xs font-black text-ink truncate">
                  {lt(locale, { fa: 'خرید خودکار', en: 'Auto-Buy', ar: 'الشراء التلقائي', zh: '自动购买', ru: 'Авто-покупка' })}
                </span>
              </button>

              <button
                type="button"
                onClick={() => router.push('/account/organization')}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-soft hover:bg-mint/40 text-start transition active:scale-95 border border-line/60"
              >
                <div className="w-8 h-8 rounded-lg bg-mint text-brand-dark grid place-items-center shrink-0">
                  <Building size={16} />
                </div>
                <span className="text-xs font-black text-ink truncate">
                  {lt(locale, { fa: 'پنل سازمانی', en: 'Corporate Hub', ar: 'الشركات', zh: '企业版', ru: 'Корпоративным' })}
                </span>
              </button>

              {['admin', 'SUPER_ADMIN', 'OPS', 'FINANCE', 'OPERATOR'].includes(user?.role || '') && (
                <button
                  type="button"
                  onClick={() => router.push('/admin')}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-mint/60 hover:bg-mint text-start transition active:scale-95 border border-brand/30"
                >
                  <div className="w-8 h-8 rounded-lg bg-brand text-surface grid place-items-center shrink-0">
                    <ShieldCheck size={16} />
                  </div>
                  <span className="text-xs font-black text-brand-dark truncate">
                    {lt(locale, { fa: 'سامانه ERP', en: 'ERP Admin', ar: 'لوحة الإدارة', zh: 'ERP 管理', ru: 'ERP Админ' })}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Primary Mobile Logout Button */}
          <button
            type="button"
            onClick={() => {
              useAuthStore.getState().logout();
              router.push('/');
            }}
            className="w-full min-h-[50px] rounded-2xl bg-rose-warm/15 hover:bg-rose-warm/25 text-rose-warm flex items-center justify-center gap-2 text-sm font-black transition active:scale-[0.98] border border-rose-warm/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-warm"
          >
            <LogOut size={18} />
            <span>{lt(locale, { fa: 'خروج از حساب کاربری', en: 'Sign Out of Account', ar: 'تسجيل الخروج من الحساب', zh: '退出当前账户', ru: 'Выйти из аккаунта' })}</span>
          </button>
        </div>
      </main>
    </div>
  );
}