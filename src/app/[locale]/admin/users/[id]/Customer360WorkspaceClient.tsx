'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Customer360Data } from '@/domains/identity/Customer360Service';
import {
  ErpPageHeader,
  ErpStatCard,
  ErpSectionCard,
  ErpBadge,
  ErpEmptyState,
} from '@/components/admin/erp-ui';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import { addCustomerNoteAction } from '@/actions/admin-users';
import {
  Users,
  Plane,
  Briefcase,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Phone,
  MessageCircle,
  ExternalLink,
  Wallet,
  FileText,
  ArrowRight,
  Shield,
  Building,
  Star,
  Receipt,
  MessageSquare,
  Send,
  Loader2,
} from 'lucide-react';

interface Props {
  customerData: Customer360Data;
  canViewPii: boolean;
}

type TabKey = 'identity' | 'travelers' | 'trips' | 'financials' | 'exceptions' | 'notes';

function formatRials(amountRials: number, loc = 'fa') {
  return formatMoney(amountRials / 10, 'IRR', loc);
}

export function Customer360WorkspaceClient({ customerData, canViewPii }: Props) {
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<TabKey>('identity');
  const [notesList, setNotesList] = useState(customerData.notes || []);
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setSubmittingNote(true);
    try {
      const res = await addCustomerNoteAction(customerData.user.id, newNote);
      if (res.success && res.note) {
        setNotesList([res.note, ...notesList]);
        setNewNote('');
      } else {
        alert(res.error || 'خطا در ثبت یادداشت');
      }
    } finally {
      setSubmittingNote(false);
    }
  };

  const { user, travelers, financials, metrics, trips, bookings, exceptions } = customerData;

  const displayName =
    user.firstNameFa && user.lastNameFa
      ? `${user.firstNameFa} ${user.lastNameFa}`
      : user.name || user.email || user.phone || 'کاربر فیروزه';

  const clvDisplay =
    financials.totalSpendIRR > 0
      ? formatRials(financials.totalSpendIRR, locale)
      : `$${num(financials.totalSpendUSD, locale)}`;

  return (
    <div className="space-y-6 pb-16">
      {/* Back Link */}
      <div>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-xs font-black text-brand-dark hover:underline"
        >
          <ArrowRight size={14} className="rtl:rotate-180" />
          <span>{lt(locale, { fa: 'بازگشت به فهرست کاربران', en: 'Back to Users List' })}</span>
        </Link>
      </div>

      {/* Page Header */}
      <ErpPageHeader
        eyebrow={lt(locale, {
          fa: 'هوش جامع مشتری و هویت (Customer 360)',
          en: 'Customer 360 & Identity Intelligence',
        })}
        title={displayName}
        description={lt(locale, {
          fa: 'نمای جامع متمرکز بر پروفایل مسافر، همراهان، سوابق سفرها، تراز کیف پول چندارزی و وضعیت پرونده‌های عملیاتی.',
          en: 'Unified 360° overview across identity, stored companions, travel files, multi-currency ledger balance, and operational health.',
        })}
        icon={<Users size={22} className="text-mint-bright" />}
        meta={
          <>
            <span className="font-mono text-xs text-sub">UID: {user.id.slice(0, 12)}…</span>
            <ErpBadge tone={user.isActive ? 'green' : 'rose'}>
              {user.isActive
                ? lt(locale, { fa: 'حساب فعال', en: 'Active' })
                : lt(locale, { fa: 'غیرفعال', en: 'Suspended' })}
            </ErpBadge>
            <ErpBadge tone="gold">
              <span className="flex items-center gap-1">
                <Star size={11} className="fill-amber-500 text-amber-500" />
                {metrics.loyaltyTier} ({num(metrics.loyaltyPoints, locale)} pts)
              </span>
            </ErpBadge>
            {user.memberships.map((m) => (
              <span
                key={m.organizationId}
                className="px-2.5 py-0.5 rounded-full bg-deep/10 text-deep text-xs font-bold flex items-center gap-1"
              >
                <Building size={12} />
                <span>{m.organizationName}</span>
                {m.roleName && <span className="text-sub text-[10px]">({m.roleName})</span>}
              </span>
            ))}
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            {!canViewPii && (
              <span className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1">
                <Shield size={13} />
                {lt(locale, { fa: 'داده‌های هویتی ماسک‌شده (PII)', en: 'Masked PII Mode' })}
              </span>
            )}
          </div>
        }
      />

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ErpStatCard
          icon={<Receipt size={18} />}
          label={lt(locale, { fa: 'ارزش طول عمر مشتری (CLV)', en: 'Customer Lifetime Value' })}
          value={clvDisplay}
          tone="brand"
          hint={`${num(metrics.confirmedBookings, locale)} رزرو قطعی`}
        />
        <ErpStatCard
          icon={<Plane size={18} />}
          label={lt(locale, { fa: 'پرونده‌های سفر و رزروها', en: 'Dossiers & Bookings' })}
          value={`${num(metrics.totalTrips, locale)} سفر`}
          tone="green"
          hint={`${num(metrics.totalBookings, locale)} آیتم کل`}
        />
        <ErpStatCard
          icon={<Wallet size={18} />}
          label={lt(locale, { fa: 'موجودی کیف پول (ریال)', en: 'Wallet Balance (IRR)' })}
          value={formatRials(financials.balances.IRR || 0, locale)}
          tone="gold"
          hint={
            financials.balances.USDT ? `${num(financials.balances.USDT, locale)} USDT کریپتو` : 'تراز معتبر'
          }
        />
        <ErpStatCard
          icon={<Users size={18} />}
          label={lt(locale, { fa: 'همراهان و مدارک ذخیره‌شده', en: 'Travelers & Passports' })}
          value={`${num(travelers.length, locale)} مسافر`}
          tone="neutral"
          hint={`${num(travelers.reduce((acc, t) => acc + t.documents.length, 0), locale)} مدرک`}
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-line gap-2 overflow-x-auto no-scrollbar">
        {[
          { key: 'identity', label: lt(locale, { fa: 'مشخصات و کانال‌ها', en: 'Identity & Channels' }), icon: Users },
          { key: 'travelers', label: lt(locale, { fa: `مسافران و اسناد (${travelers.length})`, en: `Travelers (${travelers.length})` }), icon: FileText },
          { key: 'trips', label: lt(locale, { fa: `سفرها و رزروها (${bookings.length})`, en: `Trips & Bookings (${bookings.length})` }), icon: Plane },
          { key: 'financials', label: lt(locale, { fa: 'کیف پول و مالی', en: 'Wallet & Ledger' }), icon: Wallet },
          { key: 'exceptions', label: lt(locale, { fa: `استثنائات (${exceptions.length})`, en: `Exceptions (${exceptions.length})` }), icon: ShieldAlert },
          { key: 'notes', label: lt(locale, { fa: `یادداشت‌های CRM (${notesList.length})`, en: `CRM Notes (${notesList.length})` }), icon: MessageSquare },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-black border-b-2 transition whitespace-nowrap ${
                isActive
                  ? 'border-brand text-brand-dark bg-mint/30'
                  : 'border-transparent text-sub hover:text-ink hover:bg-soft'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Identity & Channels */}
      {activeTab === 'identity' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ErpSectionCard
            title={lt(locale, { fa: 'اطلاعات هویتی و پرسنلی', en: 'Personal & Legal Identity' })}
            subtitle={lt(locale, { fa: 'مشخصات ثبت شده در پایگاه داده اصلی', en: 'Official records in database' })}
            icon={<Users size={16} />}
          >
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-line/60">
                <span className="text-sub font-bold">نام و نام خانوادگی (فارسی):</span>
                <span className="font-black text-ink">
                  {user.firstNameFa || ''} {user.lastNameFa || ''}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-line/60">
                <span className="text-sub font-bold">نام و نام خانوادگی (انگلیسی):</span>
                <span className="font-mono font-black text-ink uppercase">
                  {user.firstNameEn || ''} {user.lastNameEn || ''}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-line/60">
                <span className="text-sub font-bold">کد ملی:</span>
                <span className="font-mono font-bold text-ink">{user.nationalId || '—'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-line/60">
                <span className="text-sub font-bold">شماره گذرنامه اختصاصی:</span>
                <span className="font-mono font-bold text-ink">{user.passportNo || '—'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-line/60">
                <span className="text-sub font-bold">تاریخ انقضای گذرنامه:</span>
                <span className="font-mono font-bold text-ink">{user.passportExpiry || '—'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sub font-bold">تاریخ عضویت در پلتفرم:</span>
                <span className="font-mono text-ink">
                  {new Date(user.createdAt).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US')}
                </span>
              </div>
            </div>
          </ErpSectionCard>

          <ErpSectionCard
            title={lt(locale, { fa: 'کانال‌های ارتباطی و B2B', en: 'Communication Channels & B2B' })}
            subtitle={lt(locale, { fa: 'شبکه‌های اجتماعی، پیام‌رسان‌ها و عضویت‌های آژانسی', en: 'Messaging & Organizations' })}
            icon={<MessageCircle size={16} />}
          >
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-line/60">
                <span className="flex items-center gap-2 text-sub font-bold">
                  <Phone size={14} className="text-brand" /> شماره همراه:
                </span>
                <span className="font-mono font-bold text-ink" dir="ltr">
                  {user.phone || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-line/60">
                <span className="flex items-center gap-2 text-sub font-bold">
                  <Mail size={14} className="text-brand" /> ایمیل:
                </span>
                <span className="font-mono font-bold text-ink" dir="ltr">
                  {user.email || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-line/60">
                <span className="text-sub font-bold">تلگرام (Telegram):</span>
                <span className="font-mono text-ink" dir="ltr">
                  {user.telegramId ? `@${user.telegramId}` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-line/60">
                <span className="text-sub font-bold">واتساپ (WhatsApp):</span>
                <span className="font-mono text-ink" dir="ltr">
                  {user.whatsappPhone || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-line/60">
                <span className="text-sub font-bold">پیام‌رسان بله (Bale):</span>
                <span className="font-mono text-ink" dir="ltr">
                  {user.baleId || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sub font-bold">عضویت سازمان شرکتی/آژانسی:</span>
                <span className="font-bold text-brand-dark">
                  {user.memberships.length > 0
                    ? user.memberships.map((m) => m.organizationName).join(', ')
                    : 'حساب شخصی (B2C)'}
                </span>
              </div>
            </div>
          </ErpSectionCard>
        </div>
      )}

      {/* Tab 2: Stored Travelers */}
      {activeTab === 'travelers' && (
        <div className="space-y-4">
          {travelers.length === 0 ? (
            <ErpEmptyState
              icon={<Users size={32} className="text-line" />}
              title={lt(locale, { fa: 'مسافر همراهی ثبت نشده است', en: 'No companion travelers found' })}
              description={lt(locale, { fa: 'این کاربر هنوز پروفایل همراهی در حساب خود ذخیره نکرده است.', en: 'User has not created companion profiles.' })}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {travelers.map((tr) => (
                <div key={tr.id} className="p-5 rounded-3xl bg-surface border border-line space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-brand/10 text-brand-dark flex items-center justify-center font-black">
                        {tr.firstName[0]}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-ink">
                          {tr.firstName} {tr.lastName}
                        </h4>
                        <span className="text-[11px] text-sub font-mono">
                          {tr.gender === 'MALE' ? 'مرد' : tr.gender === 'FEMALE' ? 'زن' : 'سایر'} | تابعیت: {tr.nationality}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-sub bg-soft px-2 py-0.5 rounded-md">
                      کد ملی: {tr.nationalId || '—'}
                    </span>
                  </div>

                  {/* Documents */}
                  <div className="space-y-1.5 pt-2 border-t border-line/50">
                    <span className="text-[11px] font-black text-sub block">اسناد و گذرنامه‌ها:</span>
                    {tr.documents.length === 0 ? (
                      <span className="text-xs text-sub italic">مدرکی ثبت نشده</span>
                    ) : (
                      tr.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-2.5 rounded-xl bg-soft/60 border border-line text-xs flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-ink">{doc.documentNumber}</span>
                            <span className="text-[10px] bg-surface px-1.5 py-0.5 rounded text-sub font-bold">
                              {doc.type}
                            </span>
                          </div>
                          {doc.expiresAt && (
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="text-sub">انقضا: {doc.expiresAt}</span>
                              {doc.validity?.isValidForTravel ? (
                                <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                                  <CheckCircle2 size={12} /> معتبر
                                </span>
                              ) : (
                                <span className="text-amber-700 font-bold flex items-center gap-0.5">
                                  <AlertTriangle size={12} /> هشدار انقضا
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Trips & Bookings */}
      {activeTab === 'trips' && (
        <div className="space-y-6">
          <ErpSectionCard
            title={lt(locale, { fa: 'پرونده‌های سفر (Travel Files)', en: 'Travel Dossiers (Trips)' })}
            subtitle={lt(locale, { fa: 'پرونده‌های تجمیعی چندسرویسی مشتری', en: 'Multi-service dossiers' })}
            icon={<Briefcase size={16} />}
          >
            {trips.length === 0 ? (
              <p className="text-xs text-sub py-3">پرونده سفری یافت نشد.</p>
            ) : (
              <div className="divide-y divide-line/60">
                {trips.map((t) => (
                  <div key={t.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-brand-dark">{t.reference}</span>
                        <span className="font-bold text-ink">{t.title}</span>
                      </div>
                      <span className="text-[11px] text-sub font-mono">
                        {t.bookingsCount} رزرو متصل | {new Date(t.createdAt).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ErpBadge tone={t.status === 'COMPLETED' ? 'green' : 'brand'}>{t.status}</ErpBadge>
                      <Link
                        href={`/admin/travel-files/${t.id}`}
                        className="inline-flex items-center gap-1 text-xs font-black text-brand hover:underline"
                      >
                        <span>مشاهده پرونده</span>
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ErpSectionCard>

          <ErpSectionCard
            title={lt(locale, { fa: 'سوابق رزروهای فردی (Bookings)', en: 'Individual Bookings' })}
            subtitle={lt(locale, { fa: 'پرواز، هتل، تور و خدمات متصل', en: 'Flights, hotels, tours' })}
            icon={<Plane size={16} />}
          >
            {bookings.length === 0 ? (
              <p className="text-xs text-sub py-3">رزروی ثبت نشده است.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="border-b border-line text-sub font-black">
                      <th className="py-2.5 px-3 text-start">کد پیگیری</th>
                      <th className="py-2.5 px-3 text-start">نوع</th>
                      <th className="py-2.5 px-3 text-start">عنوان خدمت</th>
                      <th className="py-2.5 px-3 text-start">مبلغ کل</th>
                      <th className="py-2.5 px-3 text-start">وضعیت</th>
                      <th className="py-2.5 px-3 text-start">تاریخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/40 font-medium">
                    {bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-soft/50">
                        <td className="py-2.5 px-3 font-mono font-black text-ink">{b.reference}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-soft text-[10px] font-bold text-sub">
                            {b.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-ink max-w-xs truncate">{b.itemsSummary}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-ink">
                          {b.currency === 'IRR' ? formatRials(b.totalAmount, locale) : `${num(b.totalAmount, locale)} ${b.currency}`}
                        </td>
                        <td className="py-2.5 px-3">
                          <ErpBadge
                            tone={
                              b.status === 'CONFIRMED' || b.status === 'TICKETED' || b.status === 'COMPLETED'
                                ? 'green'
                                : b.status === 'CANCELLED' || b.status === 'REFUNDED'
                                ? 'rose'
                                : 'neutral'
                            }
                          >
                            {b.status}
                          </ErpBadge>
                        </td>
                        <td className="py-2.5 px-3 text-sub font-mono">
                          {new Date(b.createdAt).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ErpSectionCard>
        </div>
      )}

      {/* Tab 4: Wallet & Ledger */}
      {activeTab === 'financials' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ErpSectionCard
            title={lt(locale, { fa: 'تراز حساب‌های چندارزی (Ledger Balances)', en: 'Multi-Currency Accounts' })}
            subtitle={lt(locale, { fa: 'مانده اعتبارات مسافر در دفترکل دوطرفه', en: 'Double-entry ledger balances' })}
            icon={<Wallet size={16} />}
          >
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-2.5 border-b border-line/60">
                <span className="text-sub font-bold">ریال ایران (IRR):</span>
                <span className="font-mono font-black text-ink text-sm">
                  {formatRials(financials.balances.IRR || 0, locale)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-line/60">
                <span className="text-sub font-bold">تتر (USDT):</span>
                <span className="font-mono font-black text-ink text-sm">
                  {num(financials.balances.USDT || 0, locale)} USDT
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-line/60">
                <span className="text-sub font-bold">درهم امارات (AED):</span>
                <span className="font-mono font-bold text-ink">
                  {num(financials.balances.AED || 0, locale)} AED
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-line/60">
                <span className="text-sub font-bold">دلار آمریکا (USD):</span>
                <span className="font-mono font-bold text-ink">
                  ${num(financials.balances.USD || 0, locale)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-sub font-bold">یوآن چین (CNY):</span>
                <span className="font-mono font-bold text-ink">
                  ¥{num(financials.balances.CNY || 0, locale)}
                </span>
              </div>
            </div>
          </ErpSectionCard>

          <ErpSectionCard
            title={lt(locale, { fa: 'خلاصه شاخص‌های مالی و خرج‌کرد', en: 'Financial Spend Summary' })}
            subtitle={lt(locale, { fa: 'کل تراکنش‌های خرید موفق در فیروزه', en: 'Lifetime successful spends' })}
            icon={<Receipt size={16} />}
          >
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-soft/70 border border-line space-y-2">
                <span className="text-sub font-bold block">مجموع خرید ریالی:</span>
                <span className="text-lg font-black text-brand-dark block">
                  {formatRials(financials.totalSpendIRR, locale)}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-soft/70 border border-line space-y-2">
                <span className="text-sub font-bold block">مجموع خرید ارزی (معادل دلار):</span>
                <span className="text-lg font-black text-ink block">
                  ${num(financials.totalSpendUSD, locale)}
                </span>
              </div>
              <p className="text-[11px] text-sub leading-relaxed">
                کلیه تراکنش‌های فوق دارای سند دوبل در سرفصل‌های معین حسابداری (Chart of Accounts) بوده و با استیتمنت‌های بانکی تطبیق داده شده‌اند.
              </p>
            </div>
          </ErpSectionCard>
        </div>
      )}

      {/* Tab 5: Exceptions */}
      {activeTab === 'exceptions' && (
        <ErpSectionCard
          title={lt(locale, { fa: 'استثنائات و رویدادهای عملیاتی باز', en: 'Operational Exceptions & Fallouts' })}
          subtitle={lt(locale, { fa: 'موارد نیازمند مداخله اپراتور برای رزروهای این کاربر', en: 'Items requiring human operator intervention' })}
          icon={<ShieldAlert size={16} />}
        >
          {exceptions.length === 0 ? (
            <div className="py-8 text-center text-xs text-sub flex flex-col items-center gap-2">
              <CheckCircle2 size={32} className="text-success" />
              <span className="font-bold">هیچ استثناء یا خطای عملیاتی فعالی برای این مشتری وجود ندارد.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {exceptions.map((ex) => (
                <div key={ex.id} className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-rose-800">{ex.type}</span>
                    <ErpBadge tone="rose">{ex.severity}</ErpBadge>
                  </div>
                  <p className="text-ink font-medium">{ex.description}</p>
                  <span className="text-[10.5px] text-sub font-mono block">
                    ثبت شده در: {new Date(ex.createdAt).toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ErpSectionCard>
      )}

      {/* Tab 6: CRM Notes & Activity Log */}
      {activeTab === 'notes' && (
        <div className="space-y-6">
          {/* New Note Form */}
          <ErpSectionCard
            title={lt(locale, { fa: 'ثبت یادداشت یا پیگیری جدید', en: 'Record New CRM Note / Follow-up' })}
            subtitle={lt(locale, { fa: 'یادداشت‌های تماس تلفنی، درخواست‌های ویژه، وضعیت رسیدگی و هماهنگی‌ها', en: 'Phone call notes, special requests, and support follow-ups' })}
            icon={<MessageSquare size={16} />}
          >
            <form onSubmit={handleAddNote} className="space-y-3">
              <textarea
                rows={3}
                required
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder={lt(locale, {
                  fa: 'متن یادداشت یا شرح تماس با مشتری را اینجا بنویسید (مثلاً: مشتری درخواست صندلی راهرو در پرواز استانبول داشت؛ هماهنگی با کانتر انجام شد)...',
                  en: 'Write interaction details or customer notes here...',
                })}
                className="w-full p-3.5 rounded-2xl bg-soft border border-line text-xs font-medium text-ink focus:outline-none focus:border-brand"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingNote}
                  className="px-5 py-2.5 rounded-2xl bg-brand hover:bg-brand-dark text-surface text-xs font-black flex items-center gap-2 shadow-brand transition disabled:opacity-50"
                >
                  {submittingNote ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} className="rtl:rotate-180" />
                  )}
                  <span>{lt(locale, { fa: 'ثبت در پرونده مشتری', en: 'Save Note to Dossier' })}</span>
                </button>
              </div>
            </form>
          </ErpSectionCard>

          {/* Notes History */}
          <ErpSectionCard
            title={lt(locale, { fa: 'تاریخچه یادداشت‌های اپراتورها و کارشناسان', en: 'Operator Notes History' })}
            subtitle={lt(locale, { fa: 'ثبت شده در سامانه بازرسی و ممیزی هویت (Audit Log)', en: 'Chronological audit entries' })}
            icon={<FileText size={16} />}
          >
            {notesList.length === 0 ? (
              <div className="py-8 text-center text-xs text-sub flex flex-col items-center gap-2">
                <MessageSquare size={32} className="text-line" />
                <span>هنوز یادداشتی برای این مشتری ثبت نشده است.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {notesList.map((n) => (
                  <div key={n.id} className="p-4 rounded-2xl bg-soft/60 border border-line text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-sub text-[11px]">
                      <span className="font-bold text-brand-dark">{n.authorName}</span>
                      <span className="font-mono">
                        {new Date(n.createdAt).toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US')}
                      </span>
                    </div>
                    <p className="text-ink font-medium leading-relaxed whitespace-pre-wrap">{n.note}</p>
                  </div>
                ))}
              </div>
            )}
          </ErpSectionCard>
        </div>
      )}
    </div>
  );
}
