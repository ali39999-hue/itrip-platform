'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useAuthStore } from '@/stores/auth-store';
import { useLocalizedUserName } from '@/hooks/useLocalizedUserName';
import { Button } from '@/components/ui/button';
import { getWallet, getMyBookings } from '@/actions/booking';
import { updateProfileDetails } from '@/actions/auth';
import { AccountSidebar } from '@/components/account/AccountSidebar';
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
} from 'lucide-react';
import { lt } from '@/lib/lt';

export default function AccountPage() {
  const locale = useLocale();
  const router = useRouter();
  const { user, kyc, updateKyc } = useAuthStore();
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

  const [formState, setFormState] = useState({
    firstNameFa: user?.firstNameFa || '',
    lastNameFa: user?.lastNameFa || '',
    firstNameEn: user?.firstNameEn || '',
    lastNameEn: user?.lastNameEn || '',
    email: user?.email || '',
    phone: user?.phone || '',
    nationalId: kyc?.nationalId || '',
    passportNo: kyc?.passportNo || '',
    passportExpiry: kyc?.passportExpiry || '',
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [walletRes, bookingsRes] = await Promise.all([
          getWallet(),
          getMyBookings(),
        ]);
        if (walletRes.success && walletRes.balances) {
          setWallet(walletRes.balances);
        }
        if (bookingsRes.success && bookingsRes.bookings) {
          setRecentBookings(bookingsRes.bookings.slice(0, 3));
        }
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
        nationalId: formState.nationalId,
        passportNo: formState.passportNo,
        passportExpiry: formState.passportExpiry,
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

  const kycDone = (kyc.step === 'approved' && user.kycApproved) || Boolean(kyc.nationalId || formState.nationalId);

  return (
    <div className="flex flex-col md:flex-row w-full max-w-[1280px] mx-auto px-4 md:px-10 py-8 gap-8">
      <AccountSidebar activeSection="profile" />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col gap-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-brand to-brand-dark rounded-3xl p-6 md:p-8 text-surface shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/15 text-xs font-bold mb-2">
              <Sparkles size={14} />
              {lt(locale, { fa: 'سطح کاربری: مسافر طلایی', en: 'Tier: Gold Traveler', ar: 'المستوى: مسافر ذهبي', zh: '会员等级：黄金旅客', ru: 'Уровень: Золотой' })}
            </div>
            <h1 className="text-2xl md:text-3xl font-black">
              {lt(locale, { fa: 'خوش آمدید،', en: 'Welcome back,', ar: 'أهلاً بك،', zh: '欢迎回来，', ru: 'Добро пожаловать,' })} {localizedUserName || user.firstNameFa || user.phone}
            </h1>
            <p className="text-surface/80 text-xs md:text-sm mt-1">
              {lt(locale, { fa: 'مدیریت یکپارچه سفرها، مدارک هویتی، کیف پول و خدمات ویژه فیروزه', en: 'Manage bookings, identity documents, wallet and services in one place', ar: 'إدارة رحلاتك ووثائقك ومحفظتك في مكان واحد', zh: '集中管理您的行程、身份凭证与多币种钱包', ru: 'Управление поездками, документами и кошельком' })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push('/my-trips')}
              variant="outline"
              className="bg-surface/10 hover:bg-surface/20 text-surface border-surface/30 font-bold rounded-xl"
            >
              {lt(locale, { fa: 'سفرهای من', en: 'My Trips', ar: 'رحلاتي', zh: '我的行程', ru: 'Мои поездки' })}
            </Button>
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="bg-surface/10 hover:bg-surface/20 text-surface border-surface/30 font-bold rounded-xl"
            >
              <Edit3 size={16} />
              {lt(locale, { fa: 'ویرایش پروفایل', en: 'Edit Profile', ar: 'تعديل الملف الشخصي', zh: '编辑个人资料', ru: 'Редактировать профиль' })}
            </Button>
            <Button
              onClick={() => router.push('/wallet')}
              className="bg-surface text-brand-dark hover:bg-surface/90 font-black rounded-xl"
            >
              {lt(locale, { fa: 'شارژ کیف پول', en: 'Top Up Wallet', ar: 'شحن المحفظة', zh: '充值钱包', ru: 'Пополнить' })}
            </Button>
          </div>
        </div>

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
                <h2 className="text-lg font-black text-ink">{lt(locale, { fa: 'اطلاعات پروفایل و پاسپورت', en: 'Profile & Passport Info', ar: 'الملف الشخصي والجواز', zh: '个人资料与护照信息', ru: 'Профиль и паспорт' })}</h2>
                <p className="text-xs font-bold text-sub">{lt(locale, { fa: 'مورد استفاده در صدور پرواز، هتل و خدمات ویزا', en: 'Used for issuing flight tickets, hotel rooms & visas', ar: 'تُستخدم لإصدار تذاكر الطيران والفنادق والتأشيرة', zh: '用于预订机票、酒店及办理签证', ru: 'Используется для оформления билетов и виз' })}</p>
              </div>
            </div>
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
                  {lt(locale, { fa: 'کد ملی / شناسه اقامت', en: 'National ID', ar: 'الرقم الوطني', zh: '国民身份证号', ru: 'Национальный ID' })}
                </span>
                <span className="text-sm font-black text-ink font-mono">{kyc.nationalId || formState.nationalId || '—'}</span>
              </div>

              <div>
                <span className="block text-xs font-bold text-sub mb-1">
                  {lt(locale, { fa: 'شماره گذرنامه', en: 'Passport Number', ar: 'رقم جواز السفر', zh: '护照号码', ru: 'Номер паспорта' })}
                </span>
                <span className="text-sm font-black text-ink font-mono">{kyc.passportNo || formState.passportNo || '—'}</span>
              </div>

              <div>
                <span className="block text-xs font-bold text-sub mb-1">
                  {lt(locale, { fa: 'تاریخ انقضای گذرنامه', en: 'Passport Expiry', ar: 'تاريخ انتهاء الجواز', zh: '护照有效期', ru: 'Срок действия паспорта' })}
                </span>
                <span className="text-sm font-black text-ink font-mono">{kyc.passportExpiry || formState.passportExpiry || '—'}</span>
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

              <div>
                <label className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'کد ملی', en: 'National ID', ar: 'الرقم الوطني', zh: '身份证号', ru: 'Национальный ID' })}</label>
                <input
                  type="text"
                  dir="ltr"
                  maxLength={10}
                  value={formState.nationalId}
                  onChange={(e) => setFormState({ ...formState, nationalId: e.target.value })}
                  className="w-full h-11 rounded-xl border border-line px-3 text-sm font-bold font-mono bg-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'شماره پاسپورت', en: 'Passport No', ar: 'رقم الجواز', zh: '护照号', ru: 'Номер паспорта' })}</label>
                <input
                  type="text"
                  dir="ltr"
                  value={formState.passportNo}
                  onChange={(e) => setFormState({ ...formState, passportNo: e.target.value.toUpperCase() })}
                  className="w-full h-11 rounded-xl border border-line px-3 text-sm font-bold font-mono bg-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-sub mb-1">{lt(locale, { fa: 'تاریخ انقضای پاسپورت', en: 'Passport Expiry', ar: 'انتهاء الجواز', zh: '护照有效期', ru: 'Срок действия' })}</label>
                <input
                  type="date"
                  dir="ltr"
                  value={formState.passportExpiry}
                  onChange={(e) => setFormState({ ...formState, passportExpiry: e.target.value })}
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
      </main>
    </div>
  );
}