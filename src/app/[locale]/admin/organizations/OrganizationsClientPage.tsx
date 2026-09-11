'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import {
  OrganizationListItem,
  createOrganizationAction,
  getAdminOrganizationsAction,
} from '@/actions/organizations';
import {
  ErpPageHeader,
  ErpStatCard,
  ErpSectionCard,
  ErpBadge,
  ErpEmptyState,
  erpFieldCls,
} from '@/components/admin/erp-ui';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';
import {
  Building,
  Building2,
  Users,
  Plus,
  Search,
  ExternalLink,
  Briefcase,
  Layers,
  Loader2,
  X,
} from 'lucide-react';

interface Props {
  initialItems: OrganizationListItem[];
  initialTotal: number;
}

export function OrganizationsClientPage({ initialItems, initialTotal }: Props) {
  const locale = useLocale();
  const [items, setItems] = useState<OrganizationListItem[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: 'AGENCY' as 'AGENCY' | 'CORPORATE' | 'PARTNER' | 'INTERNAL',
    legalName: '',
    displayName: '',
    registrationNo: '',
    taxNo: '',
    defaultCurrency: 'IRR',
  });

  const loadData = async (filterType = typeFilter, query = search) => {
    setLoading(true);
    const res = await getAdminOrganizationsAction({
      type: filterType,
      search: query,
      limit: 50,
    });
    if (res.success && res.items) {
      setItems(res.items);
      setTotal(res.total || 0);
    }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.legalName.trim() || !form.displayName.trim()) {
      alert('نام قانونی و نام نمایشی سازمان الزامی است.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createOrganizationAction({
        type: form.type,
        legalName: form.legalName,
        displayName: form.displayName,
        registrationNo: form.registrationNo || null,
        taxNo: form.taxNo || null,
        defaultCurrency: form.defaultCurrency,
      });

      if (res.success) {
        setIsModalOpen(false);
        setForm({
          type: 'AGENCY',
          legalName: '',
          displayName: '',
          registrationNo: '',
          taxNo: '',
          defaultCurrency: 'IRR',
        });
        await loadData();
      } else {
        alert(res.error || 'خطا در ثبت سازمان');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const agenciesCount = items.filter((o) => o.type === 'AGENCY').length;
  const corporateCount = items.filter((o) => o.type === 'CORPORATE').length;
  const totalMembers = items.reduce((acc, o) => acc + o.membersCount, 0);

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <ErpPageHeader
        eyebrow={lt(locale, {
          fa: 'مدیریت شرکا و مشتریان سازمانی (B2B Multi-tenancy)',
          en: 'B2B & Corporate Multi-tenancy',
        })}
        title={lt(locale, {
          fa: 'سازمان‌ها و آژانس‌های همکار',
          en: 'Organizations & Agencies',
        })}
        description={lt(locale, {
          fa: 'مدیریت ساختار چندمستاجری آژانس‌های همکار، شرکت‌های تجاری طرف قرارداد، شعب عملیاتی و تخصیص نقش‌های سازمانی.',
          en: 'Manage agencies, corporate partners, operational branches, and staff role allocations.',
        })}
        icon={<Building size={22} className="text-mint-bright" />}
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-brand hover:bg-brand-dark text-surface text-xs font-black shadow-brand transition active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>{lt(locale, { fa: 'ثبت سازمان جدید', en: 'New Organization' })}</span>
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ErpStatCard
          icon={<Building2 size={18} />}
          label={lt(locale, { fa: 'کل سازمان‌های فعال', en: 'Total Organizations' })}
          value={`${num(total, locale)}`}
          tone="brand"
          hint="پوشش کامل چندمستاجری"
        />
        <ErpStatCard
          icon={<Briefcase size={18} />}
          label={lt(locale, { fa: 'آژانس‌های مسافرتی', en: 'Travel Agencies' })}
          value={`${num(agenciesCount, locale)}`}
          tone="gold"
          hint="نمایندگی‌های فروش B2B"
        />
        <ErpStatCard
          icon={<Building size={18} />}
          label={lt(locale, { fa: 'مشتریان شرکتی (Corporate)', en: 'Corporate Clients' })}
          value={`${num(corporateCount, locale)}`}
          tone="green"
          hint="سفرهای کاری پرسنل"
        />
        <ErpStatCard
          icon={<Users size={18} />}
          label={lt(locale, { fa: 'اعضای پرسنلی متصل', en: 'Active Memberships' })}
          value={`${num(totalMembers, locale)} نفر`}
          tone="neutral"
          hint="دسترسی‌های سازمانی احراز شده"
        />
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['ALL', 'AGENCY', 'CORPORATE', 'PARTNER', 'INTERNAL'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTypeFilter(t);
                loadData(t, search);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                typeFilter === t ? 'bg-brand text-surface shadow-xs' : 'bg-soft text-ink hover:bg-mint/40'
              }`}
            >
              {t === 'ALL'
                ? lt(locale, { fa: 'همه سازمان‌ها', en: 'All' })
                : t === 'AGENCY'
                ? lt(locale, { fa: 'آژانس‌ها', en: 'Agencies' })
                : t === 'CORPORATE'
                ? lt(locale, { fa: 'شرکتی (Corporate)', en: 'Corporate' })
                : t === 'PARTNER'
                ? lt(locale, { fa: 'شرکای تجاری', en: 'Partners' })
                : lt(locale, { fa: 'داخلی (Internal)', en: 'Internal' })}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-sub" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') loadData(typeFilter, search);
            }}
            placeholder={lt(locale, { fa: 'جستجو با نام برند، شناسه، شماره ثبت…', en: 'Search organization...' })}
            className={`${erpFieldCls} ps-9 text-xs`}
          />
        </div>
      </div>

      {/* Organizations Table */}
      <ErpSectionCard
        title={lt(locale, { fa: 'فهرست سازمان‌ها و طرف‌های قرارداد', en: 'Organizations Roster' })}
        subtitle={lt(locale, { fa: 'شامل تفکیک شعب، دسترسی‌ها و تعداد رزرواسیون‌های ثبت‌شده', en: 'Branches, memberships and bookings' })}
        icon={<Building size={16} />}
      >
        {loading ? (
          <div className="py-12 flex justify-center items-center text-sub gap-2">
            <Loader2 size={20} className="animate-spin text-brand" />
            <span className="text-xs font-bold">در حال بارگذاری...</span>
          </div>
        ) : items.length === 0 ? (
          <ErpEmptyState
            icon={<Building size={32} className="text-line" />}
            title={lt(locale, { fa: 'سازمانی یافت نشد', en: 'No organizations found' })}
            description={lt(locale, { fa: 'با کلیک روی دکمه بالای صفحه اولین سازمان را ثبت نمایید.', en: 'Click the button above to register an organization.' })}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead>
                <tr className="border-b border-line text-sub font-black">
                  <th className="py-3 px-3 text-start">نام سازمان / شناسه</th>
                  <th className="py-3 px-3 text-start">نوع ساختار</th>
                  <th className="py-3 px-3 text-start">شعب</th>
                  <th className="py-3 px-3 text-start">اعضا و کارمندان</th>
                  <th className="py-3 px-3 text-start">سفارشات</th>
                  <th className="py-3 px-3 text-start">ارز پیش‌فرض</th>
                  <th className="py-3 px-3 text-start">وضعیت</th>
                  <th className="py-3 px-3 text-end">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40 font-medium">
                {items.map((org) => (
                  <tr key={org.id} className="hover:bg-soft/40 transition">
                    <td className="py-3 px-3">
                      <div>
                        <Link
                          href={`/admin/organizations/${org.id}`}
                          className="font-black text-ink hover:text-brand-dark hover:underline block"
                        >
                          {org.displayName}
                        </Link>
                        <span className="text-[11px] text-sub block">{org.legalName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-soft font-mono font-bold text-[10.5px] text-brand-dark">
                        {org.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span className="flex items-center gap-1">
                        <Layers size={12} className="text-sub" />
                        {num(org.branchesCount, locale)}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span className="flex items-center gap-1">
                        <Users size={12} className="text-sub" />
                        {num(org.membersCount, locale)}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-ink">
                      {num(org.bookingsCount, locale)}
                    </td>
                    <td className="py-3 px-3 font-mono text-sub">{org.defaultCurrency}</td>
                    <td className="py-3 px-3">
                      <ErpBadge tone={org.status === 'ACTIVE' ? 'green' : 'rose'}>
                        {org.status}
                      </ErpBadge>
                    </td>
                    <td className="py-3 px-3 text-end">
                      <Link
                        href={`/admin/organizations/${org.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-mint hover:bg-mint/80 text-brand-dark text-xs font-black transition"
                      >
                        <span>مدیریت</span>
                        <ExternalLink size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ErpSectionCard>

      {/* New Organization Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-surface rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-line shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 end-5 text-sub hover:text-ink w-8 h-8 rounded-full flex items-center justify-center hover:bg-soft"
            >
              <X size={18} />
            </button>

            <h2 className="text-xl font-black text-ink mb-1">ثبت سازمان / آژانس جدید</h2>
            <p className="text-xs text-sub mb-5">
              مشخصات ثبتی و حقوقی سازمان را جهت فعال‌سازی حساب B2B وارد نمایید.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-ink mb-1.5">نوع سازمان *</label>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        type: e.target.value as 'AGENCY' | 'CORPORATE' | 'PARTNER' | 'INTERNAL',
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-soft border border-line text-xs font-bold text-ink"
                  >
                    <option value="AGENCY">آژانس همکار (Agency)</option>
                    <option value="CORPORATE">مشتری شرکتی (Corporate)</option>
                    <option value="PARTNER">شریک تجاری (Partner)</option>
                    <option value="INTERNAL">واحد داخلی فیروزه (Internal)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-ink mb-1.5">ارز پیش‌فرض</label>
                  <select
                    value={form.defaultCurrency}
                    onChange={(e) => setForm({ ...form, defaultCurrency: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-soft border border-line text-xs font-bold text-ink"
                  >
                    <option value="IRR">ریال ایران (IRR)</option>
                    <option value="USD">دلار آمریکا (USD)</option>
                    <option value="AED">درهم امارات (AED)</option>
                    <option value="USDT">تتر (USDT)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-ink mb-1.5">نام نمایشی / برند *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: آژانس مسافرتی همسفران ارس"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-soft border border-line text-xs text-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-ink mb-1.5">نام ثبتی و قانونی *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شرکت خدمات مسافرتی و گردشگری همسفران ارس با مسئولیت محدود"
                  value={form.legalName}
                  onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-soft border border-line text-xs text-ink"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-ink mb-1.5">شماره ثبت</label>
                  <input
                    type="text"
                    placeholder="مثال: ۱۲۳۴۵۶"
                    value={form.registrationNo}
                    onChange={(e) => setForm({ ...form, registrationNo: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-soft border border-line text-xs font-mono text-ink"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-ink mb-1.5">شناسه ملی / کد اقتصادی</label>
                  <input
                    type="text"
                    placeholder="مثال: ۱۰۱۰۱۲۳۴۵۶۷"
                    value={form.taxNo}
                    onChange={(e) => setForm({ ...form, taxNo: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-soft border border-line text-xs font-mono text-ink"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl border border-line text-sub font-bold text-xs hover:bg-soft"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-2xl bg-brand hover:bg-brand-dark text-surface font-black text-xs flex items-center gap-2 shadow-brand"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  <span>ثبت سازمان</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
