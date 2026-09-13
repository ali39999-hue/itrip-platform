'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import { getMyOrganizationInfoAction } from '@/actions/organizations';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import {
  Building,
  Building2,
  Users,
  Briefcase,
  CheckCircle2,
  Plane,
  Shield,
  FileText,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface CorporateMembershipItem {
  id: string;
  organization: {
    id: string;
    displayName: string;
    legalName: string;
    type: string;
    registrationNo: string | null;
    taxNo: string | null;
    status: string;
    defaultCurrency: string;
    branches: Array<{ id: string; name: string; code: string | null }>;
  };
  branchName: string | null;
  roleName: string | null;
  createdAt: Date;
}

interface CorporateBookingItem {
  id: string;
  reference: string;
  status: string;
  totalAmount: number;
  currency: string;
  createdAt: Date;
  title: string;
}

export function CorporateHubClientPage() {
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<CorporateMembershipItem[]>([]);
  const [corporateBookings, setCorporateBookings] = useState<CorporateBookingItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrgInfo() {
      setLoading(true);
      const res = await getMyOrganizationInfoAction();
      if (res.success) {
        setMemberships(res.memberships || []);
        setCorporateBookings(res.corporateBookings || []);
      } else {
        setError(res.error || 'خطا در دریافت اطلاعات سازمانی');
      }
      setLoading(false);
    }
    fetchOrgInfo();
  }, []);

  const primaryMembership = memberships[0];

  return (
    <div className="min-h-screen bg-soft pb-16 pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Sidebar */}
          <AccountSidebar activeSection="organization" />

          {/* Main Content Area */}
          <main className="flex-1 w-full space-y-6">
            {/* Header Card */}
            <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-line shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 text-brand mb-1">
                  <Building size={22} className="shrink-0" />
                  <span className="text-xs font-black uppercase tracking-wider">
                    Corporate & B2B Travel
                  </span>
                </div>
                <h1 className="text-2xl font-black text-ink">
                  {lt(locale, {
                    ar: 'مركز السفر للشركات وB2B', zh: '企业与 B2B 商旅中心', ru: 'Корпоративный хаб и B2B-путешествия',
                    fa: 'سازمان و سفرهای شرکتی (B2B)',
                    en: 'Corporate & B2B Travel Hub',
                  })}
                </h1>
                <p className="text-xs sm:text-sm text-sub mt-1">
                  {lt(locale, {
                    ar: 'إدارة حجوزات الموظفين، الصندوق النقدي للشركة، إصدار الفواتير الرسمية وصلاحيات الوكالة.', zh: '管理员工预订、企业备用金、正式发票开具与代理权限。', ru: 'Управление бронированиями сотрудников, корпоративными средствами, официальными счетами и агентскими правами.',
                    fa: 'مدیریت رزرواسیون‌های پرسنل، تنخواه شرکتی، صدور فاکتور رسمی و دسترسی‌های آژانسی.',
                    en: 'Manage business travel, corporate accounts, official tax invoices, and agency booking.',
                  })}
                </p>
              </div>

              {primaryMembership && (
                <div className="flex items-center gap-2">
                  <Link
                    href="/flights"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-brand hover:bg-brand-dark text-surface text-xs font-black shadow-brand transition active:scale-[0.98]"
                  >
                    <Plane size={15} />
                    <span>{lt(locale, { fa: 'رزرو پرواز سازمانی', en: 'Book Flight', ar: 'حجز رحلات مؤسسية', zh: '企业航班预订', ru: 'Корпоративное бронирование рейсов'})}</span>
                  </Link>
                </div>
              )}
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-sub">
                <Loader2 size={32} className="animate-spin text-brand" />
                <p className="text-sm font-bold">در حال بارگذاری اطلاعات سازمانی...</p>
              </div>
            ) : !primaryMembership ? (
              /* No Organization View */
              <div className="bg-surface rounded-3xl p-8 sm:p-12 border border-line text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-mint flex items-center justify-center text-brand mx-auto">
                  <Building2 size={32} />
                </div>
                <div className="max-w-lg mx-auto space-y-2">
                  <h3 className="text-lg font-black text-ink">
                    {lt(locale, {
                      ar: 'حسابك غير مرتبط بأي مؤسسة بعد', zh: '您的账户尚未关联企业', ru: 'Ваш аккаунт пока не привязан к организации',
                      fa: 'حساب کاربری شما هنوز به سازمانی متصل نیست',
                      en: 'No Corporate Account Linked Yet',
                    })}
                  </h3>
                  <p className="text-xs sm:text-sm text-sub leading-relaxed">
                    {lt(locale, {
                      ar: 'إذا كنت موظفًا في مؤسسة شريكة أو مشغّل وكالة سفر متعاونة، فاطلب من مدير مؤسستك تسجيل رقمك أو بريدك في قسم أعضاء المؤسسة.', zh: '如果您是合作企业的员工或合作旅行社的运营人员，请让贵组织管理员在组织成员中登记您的手机号或邮箱。', ru: 'Если вы сотрудник организации-партнёра или оператор агентства-партнёра, попросите администратора вашей организации добавить ваш номер или email в список участников.',
                      fa: 'اگر کارمند یک سازمان طرف قرارداد یا اپراتور یک آژانس مسافرتی همکار هستید، از مدیر سازمان خود بخواهید شماره یا ایمیل شما را در بخش اعضای سازمان ثبت نماید.',
                      en: 'If you are an employee of a corporate partner or an agency travel operator, ask your administrator to add you to the organization roster.',
                    })}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto pt-4 text-start">
                  <div className="p-4 rounded-2xl bg-soft border border-line space-y-1.5">
                    <div className="flex items-center gap-2 text-brand font-black text-xs">
                      <FileText size={16} />
                      <span>فاکتور رسمی با کد اقتصادی</span>
                    </div>
                    <p className="text-[11px] text-sub">صدور آنی فاکتور رسمی منطبق با قوانین سازمان امور مالیاتی.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-soft border border-line space-y-1.5">
                    <div className="flex items-center gap-2 text-brand font-black text-xs">
                      <Briefcase size={16} />
                      <span>اعتبار و تسویه دوره‌ای</span>
                    </div>
                    <p className="text-[11px] text-sub">امکان خرید اعتباری و پرداخت صورت‌حساب در پایان ماه.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-soft border border-line space-y-1.5">
                    <div className="flex items-center gap-2 text-brand font-black text-xs">
                      <Users size={16} />
                      <span>مدیریت مسافران شرکتی</span>
                    </div>
                    <p className="text-[11px] text-sub">ذخیره خودکار گذرنامه و مشخصات پرسنل جهت رزرو بدون معطلی.</p>
                  </div>
                </div>
              </div>
            ) : (
              /* Active Organization View */
              <div className="space-y-6">
                {/* Organization Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Organization Card */}
                  <div className="bg-surface rounded-3xl p-6 border border-line shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-line/60">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand/20 to-mint text-brand-dark flex items-center justify-center font-black text-xl">
                          {primaryMembership.organization.displayName[0]}
                        </div>
                        <div>
                          <h3 className="text-base font-black text-ink">
                            {primaryMembership.organization.displayName}
                          </h3>
                          <span className="text-[11px] text-sub font-mono">
                            {primaryMembership.organization.type === 'AGENCY'
                              ? 'آژانس مسافرتی همکار (B2B)'
                              : 'مشتری حقوقی و سازمانی (Corporate)'}
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 size={13} />
                        فعال
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-line/40">
                        <span className="text-sub font-bold">نام ثبتی:</span>
                        <span className="font-black text-ink">
                          {primaryMembership.organization.legalName}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-line/40">
                        <span className="text-sub font-bold">شماره ثبت:</span>
                        <span className="font-mono font-bold text-ink">
                          {primaryMembership.organization.registrationNo || '—'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-line/40">
                        <span className="text-sub font-bold">کد اقتصادی / شناسه ملی:</span>
                        <span className="font-mono font-bold text-ink">
                          {primaryMembership.organization.taxNo || '—'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-sub font-bold">ارز مبنای تسویه:</span>
                        <span className="font-mono text-ink">
                          {primaryMembership.organization.defaultCurrency}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* My Membership & Role Card */}
                  <div className="bg-surface rounded-3xl p-6 border border-line shadow-xs space-y-4">
                    <h3 className="text-base font-black text-ink pb-3 border-b border-line/60 flex items-center gap-2">
                      <Shield size={18} className="text-brand" />
                      <span>دسترسی‌ها و نقش شما در سازمان</span>
                    </h3>

                    <div className="space-y-3 text-xs">
                      <div className="p-4 rounded-2xl bg-mint/40 border border-brand/20 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-brand-dark block font-bold">نقش سازمانی شما:</span>
                          <span className="text-sm font-black text-ink">
                            {primaryMembership.roleName || 'MEMBER'}
                          </span>
                        </div>
                        <span className="px-3 py-1 rounded-xl bg-surface text-brand-dark font-black text-xs border border-brand/20">
                          مجاز به رزرو
                        </span>
                      </div>

                      <div className="flex justify-between py-2 border-b border-line/40">
                        <span className="text-sub font-bold">شعبه یا دفتر منتسب:</span>
                        <span className="font-bold text-ink">
                          {primaryMembership.branchName || 'دفتر مرکزی (HQ)'}
                        </span>
                      </div>

                      <div className="flex justify-between py-2 border-b border-line/40">
                        <span className="text-sub font-bold">تاریخ انتساب دسترسی:</span>
                        <span className="font-mono text-ink">
                          {new Date(primaryMembership.createdAt).toLocaleDateString(
                            locale === 'fa' ? 'fa-IR' : 'en-US'
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Corporate Bookings */}
                <div className="bg-surface rounded-3xl p-6 border border-line shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-line/60">
                    <h3 className="text-base font-black text-ink flex items-center gap-2">
                      <Plane size={18} className="text-brand" />
                      <span>رزروها و سفرهای شرکتی اخیر</span>
                    </h3>
                    <span className="text-xs text-sub font-mono">
                      {corporateBookings.length} رزرو ثبت‌شده
                    </span>
                  </div>

                  {corporateBookings.length === 0 ? (
                    <p className="text-xs text-sub py-6 text-center">
                      هنوز رزروی با شناسه این سازمان ثبت نشده است.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-start">
                        <thead>
                          <tr className="border-b border-line text-sub font-black">
                            <th className="py-2.5 px-3 text-start">کد پیگیری</th>
                            <th className="py-2.5 px-3 text-start">عنوان سفر</th>
                            <th className="py-2.5 px-3 text-start">مبلغ</th>
                            <th className="py-2.5 px-3 text-start">وضعیت</th>
                            <th className="py-2.5 px-3 text-start">تاریخ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line/40 font-medium">
                          {corporateBookings.map((b) => (
                            <tr key={b.id} className="hover:bg-soft/50">
                              <td className="py-3 px-3 font-mono font-black text-ink">{b.reference}</td>
                              <td className="py-3 px-3 text-ink font-bold">{b.title}</td>
                              <td className="py-3 px-3 font-mono font-bold text-ink">
                                {b.currency === 'IRR' ? formatMoney(b.totalAmount / 10, 'IRR', locale) : `${num(b.totalAmount, locale)} ${b.currency}`}
                              </td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                                  {b.status}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-sub font-mono">
                                {new Date(b.createdAt).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
