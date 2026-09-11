'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { OrganizationDetail } from '@/domains/identity/OrganizationService';
import {
  addOrganizationMemberAction,
  removeOrganizationMemberAction,
  createOrganizationBranchAction,
} from '@/actions/organizations';
import {
  ErpPageHeader,
  ErpStatCard,
  ErpSectionCard,
  ErpBadge,
  ErpEmptyState,
} from '@/components/admin/erp-ui';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';
import {
  Building,
  Building2,
  Users,
  UserPlus,
  Plus,
  Trash2,
  ExternalLink,
  Layers,
  FileText,
  Briefcase,
  ArrowRight,
  Loader2,
  X,
  Plane,
} from 'lucide-react';

interface Props {
  initialOrg: OrganizationDetail;
}

export function OrganizationDetailWorkspaceClient({ initialOrg }: Props) {
  const locale = useLocale();
  const [org, setOrg] = useState<OrganizationDetail>(initialOrg);

  // Add Member Modal
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [memberIdentifier, setMemberIdentifier] = useState('');
  const [memberRole, setMemberRole] = useState('OPS');
  const [memberBranchId, setMemberBranchId] = useState('');
  const [memberSubmitting, setMemberSubmitting] = useState(false);

  // Add Branch Modal
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchSubmitting, setBranchSubmitting] = useState(false);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberIdentifier.trim()) return;

    setMemberSubmitting(true);
    try {
      const res = await addOrganizationMemberAction({
        organizationId: org.id,
        userIdentifier: memberIdentifier.trim(),
        roleName: memberRole,
        branchId: memberBranchId || undefined,
      });

      if (res.success) {
        setIsMemberModalOpen(false);
        setMemberIdentifier('');
        window.location.reload();
      } else {
        alert(res.error || 'خطا در افزودن عضو');
      }
    } finally {
      setMemberSubmitting(false);
    }
  };

  const handleRemoveMember = async (membershipId: string) => {
    if (!confirm('آیا از حذف این عضو از سازمان اطمینان دارید؟')) return;

    const res = await removeOrganizationMemberAction(org.id, membershipId);
    if (res.success) {
      setOrg({
        ...org,
        members: org.members.filter((m) => m.id !== membershipId),
      });
    } else {
      alert(res.error || 'خطا در حذف عضو');
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return;

    setBranchSubmitting(true);
    try {
      const res = await createOrganizationBranchAction(org.id, branchName.trim(), branchCode.trim() || undefined);
      if (res.success && res.branch) {
        setOrg({
          ...org,
          branches: [...org.branches, { ...res.branch, status: 'ACTIVE' }],
        });
        setIsBranchModalOpen(false);
        setBranchName('');
        setBranchCode('');
      } else {
        alert(res.error || 'خطا در ثبت شعبه');
      }
    } finally {
      setBranchSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Back Link */}
      <div>
        <Link
          href="/admin/organizations"
          className="inline-flex items-center gap-1.5 text-xs font-black text-brand-dark hover:underline"
        >
          <ArrowRight size={14} className="rtl:rotate-180" />
          <span>{lt(locale, { fa: 'بازگشت به لیست سازمان‌ها', en: 'Back to Organizations' })}</span>
        </Link>
      </div>

      {/* Header */}
      <ErpPageHeader
        eyebrow="B2B ORGANIZATION DOSSIER"
        title={org.displayName}
        description={org.legalName}
        icon={<Building size={22} className="text-mint-bright" />}
        meta={
          <>
            <ErpBadge tone="brand">{org.type}</ErpBadge>
            <ErpBadge tone={org.status === 'ACTIVE' ? 'green' : 'rose'}>{org.status}</ErpBadge>
            <span className="font-mono text-xs text-sub">ارز: {org.defaultCurrency}</span>
            <span className="font-mono text-xs text-sub">{org.timezone}</span>
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBranchModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-line bg-surface text-ink hover:bg-soft text-xs font-black transition"
            >
              <Plus size={14} />
              <span>{lt(locale, { fa: 'تعریف شعبه', en: 'New Branch' })}</span>
            </button>
            <button
              onClick={() => setIsMemberModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-brand hover:bg-brand-dark text-surface text-xs font-black shadow-brand transition active:scale-[0.98]"
            >
              <UserPlus size={14} />
              <span>{lt(locale, { fa: 'افزودن عضو / کارمند', en: 'Add Member' })}</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ErpStatCard
          icon={<Plane size={18} />}
          label={lt(locale, { fa: 'رزروهای سازمانی', en: 'Corporate Bookings' })}
          value={`${num(org.metrics.totalBookings, locale)}`}
          tone="brand"
          hint="ثبت شده با شناسه این سازمان"
        />
        <ErpStatCard
          icon={<FileText size={18} />}
          label={lt(locale, { fa: 'فاکتورهای رسمی صادره', en: 'Issued Invoices' })}
          value={`${num(org.metrics.totalInvoices, locale)}`}
          tone="gold"
          hint="فاکتورهای B2B با کد اقتصادی"
        />
        <ErpStatCard
          icon={<Briefcase size={18} />}
          label={lt(locale, { fa: 'پرونده‌های سفر شرکتی', en: 'Travel Files' })}
          value={`${num(org.metrics.totalTrips, locale)}`}
          tone="green"
          hint="دوسیه‌های عملیاتی باز و بسته"
        />
        <ErpStatCard
          icon={<Users size={18} />}
          label={lt(locale, { fa: 'کارمندان و اعضا', en: 'Members & Personnel' })}
          value={`${num(org.members.length, locale)} نفر`}
          tone="neutral"
          hint={`${num(org.branches.length, locale)} شعبه عملیاتی`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Legal Info & Branches */}
        <div className="space-y-6 lg:col-span-1">
          {/* Legal Profile */}
          <ErpSectionCard
            title={lt(locale, { fa: 'مشخصات حقوقی و اداری', en: 'Legal Profile' })}
            subtitle="اطلاعات ثبتی، کد اقتصادی و شناسه ملی"
            icon={<Building2 size={16} />}
          >
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-line/60">
                <span className="text-sub font-bold">شماره ثبت:</span>
                <span className="font-mono font-bold text-ink">{org.registrationNo || '—'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-line/60">
                <span className="text-sub font-bold">کد اقتصادی / شناسه ملی:</span>
                <span className="font-mono font-bold text-ink">{org.taxNo || '—'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-line/60">
                <span className="text-sub font-bold">نوع همکاری:</span>
                <span className="font-mono font-bold text-brand-dark">{org.type}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-line/60">
                <span className="text-sub font-bold">ارز مبنای تسویه:</span>
                <span className="font-mono text-ink">{org.defaultCurrency}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sub font-bold">تاریخ ثبت اولیه:</span>
                <span className="font-mono text-ink">
                  {new Date(org.createdAt).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US')}
                </span>
              </div>
            </div>
          </ErpSectionCard>

          {/* Operational Branches */}
          <ErpSectionCard
            title={lt(locale, { fa: `شعب عملیاتی (${org.branches.length})`, en: `Branches (${org.branches.length})` })}
            subtitle="دفاتر مرکزی و نمایندگی‌های زیرمجموعه"
            icon={<Layers size={16} />}
          >
            <div className="space-y-2 text-xs">
              {org.branches.map((b) => (
                <div
                  key={b.id}
                  className="p-3 rounded-2xl bg-soft/70 border border-line flex items-center justify-between"
                >
                  <div>
                    <span className="font-black text-ink block">{b.name}</span>
                    {b.code && <span className="font-mono text-[10px] text-sub">کد: {b.code}</span>}
                  </div>
                  <ErpBadge tone={b.status === 'ACTIVE' ? 'green' : 'neutral'}>{b.status}</ErpBadge>
                </div>
              ))}
            </div>
          </ErpSectionCard>
        </div>

        {/* Right Column: Members & Roles */}
        <div className="space-y-6 lg:col-span-2">
          <ErpSectionCard
            title={lt(locale, { fa: `اعضا و کارمندان متصل (${org.members.length})`, en: `Members & Operators (${org.members.length})` })}
            subtitle="پرسنل دارای مجوز رزرو، مدیریت یا مشاهده گزارش‌های سازمانی"
            icon={<Users size={16} />}
          >
            {org.members.length === 0 ? (
              <ErpEmptyState
                icon={<Users size={32} className="text-line" />}
                title="هنوز عضوی ثبت نشده است"
                description="با استفاده از دکمه بالای صفحه پرسنل را به این سازمان متصل نمایید."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="border-b border-line text-sub font-black">
                      <th className="py-2.5 px-3 text-start">نام و مشخصات</th>
                      <th className="py-2.5 px-3 text-start">اطلاعات تماس</th>
                      <th className="py-2.5 px-3 text-start">نقش سازمانی</th>
                      <th className="py-2.5 px-3 text-start">شعبه</th>
                      <th className="py-2.5 px-3 text-end">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/40 font-medium">
                    {org.members.map((m) => (
                      <tr key={m.id} className="hover:bg-soft/40 transition">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-brand/10 text-brand-dark flex items-center justify-center font-black">
                              {m.name?.[0] || 'U'}
                            </div>
                            <div>
                              <Link
                                href={`/admin/users/${m.userId}`}
                                className="font-black text-ink hover:text-brand-dark hover:underline block"
                              >
                                {m.name || 'کاربر'}
                              </Link>
                              <span className="font-mono text-[10px] text-sub block">
                                {m.userId.slice(0, 10)}…
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-sub">
                          <div>{m.email || '—'}</div>
                          <div>{m.phone || '—'}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-mint text-[10.5px] font-bold text-brand-dark">
                            {m.roleName || 'MEMBER'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-sub">{m.branchName || 'دفتر مرکزی'}</td>
                        <td className="py-3 px-3 text-end">
                          <div className="inline-flex items-center gap-1.5">
                            <Link
                              href={`/admin/users/${m.userId}`}
                              className="p-1.5 rounded-lg text-sub hover:text-brand hover:bg-soft"
                              title="مشاهده پروفایل ۳۶۰°"
                            >
                              <ExternalLink size={14} />
                            </Link>
                            <button
                              onClick={() => handleRemoveMember(m.id)}
                              className="p-1.5 rounded-lg text-sub hover:text-rose-600 hover:bg-rose-50"
                              title="حذف از سازمان"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ErpSectionCard>
        </div>
      </div>

      {/* Add Member Modal */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-surface rounded-3xl max-w-md w-full p-6 sm:p-8 border border-line shadow-2xl relative">
            <button
              onClick={() => setIsMemberModalOpen(false)}
              className="absolute top-5 end-5 text-sub hover:text-ink w-8 h-8 rounded-full flex items-center justify-center hover:bg-soft"
            >
              <X size={18} />
            </button>

            <h2 className="text-xl font-black text-ink mb-1">افزودن عضو یا کارمند</h2>
            <p className="text-xs text-sub mb-5">
              ایمیل یا شماره موبایل کاربر را وارد کنید تا به این سازمان متصل شود.
            </p>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-ink mb-1.5">
                  ایمیل، شماره موبایل یا شناسه کاربر *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 09121234567 یا user@agency.com"
                  value={memberIdentifier}
                  onChange={(e) => setMemberIdentifier(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-soft border border-line text-xs font-mono text-ink focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-ink mb-1.5">نقش در سازمان</label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-soft border border-line text-xs font-bold text-ink"
                >
                  <option value="OPS">اپراتور صدور و بوکینگ (OPS)</option>
                  <option value="FINANCE">مسئول مالی و تسویه (FINANCE)</option>
                  <option value="SUPER_ADMIN">مدیر ارشد سازمان (ADMIN)</option>
                  <option value="CUSTOMER">مسافر شرکتی (TRAVELER)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-ink mb-1.5">شعبه انتخابی</label>
                <select
                  value={memberBranchId}
                  onChange={(e) => setMemberBranchId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-soft border border-line text-xs font-bold text-ink"
                >
                  <option value="">شعبه پیش‌فرض / مرکزی</option>
                  {org.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.code ? `(${b.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsMemberModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl border border-line text-sub font-bold text-xs hover:bg-soft"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={memberSubmitting}
                  className="px-6 py-2.5 rounded-2xl bg-brand hover:bg-brand-dark text-surface font-black text-xs flex items-center gap-2 shadow-brand"
                >
                  {memberSubmitting && <Loader2 size={14} className="animate-spin" />}
                  <span>تخصیص دسترسی</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Branch Modal */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-surface rounded-3xl max-w-md w-full p-6 sm:p-8 border border-line shadow-2xl relative">
            <button
              onClick={() => setIsBranchModalOpen(false)}
              className="absolute top-5 end-5 text-sub hover:text-ink w-8 h-8 rounded-full flex items-center justify-center hover:bg-soft"
            >
              <X size={18} />
            </button>

            <h2 className="text-xl font-black text-ink mb-1">تعریف شعبه جدید</h2>
            <p className="text-xs text-sub mb-5">نام شعبه یا دفتر نمایندگی را وارد نمایید.</p>

            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-ink mb-1.5">نام شعبه *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شعبه فرودگاه بین‌المللی امام خمینی"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-soft border border-line text-xs text-ink focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-ink mb-1.5">کد اختصاری شعبه</label>
                <input
                  type="text"
                  placeholder="مثال: IKA-BR01"
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-soft border border-line text-xs font-mono text-ink focus:outline-none focus:border-brand"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl border border-line text-sub font-bold text-xs hover:bg-soft"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={branchSubmitting}
                  className="px-6 py-2.5 rounded-2xl bg-brand hover:bg-brand-dark text-surface font-black text-xs flex items-center gap-2 shadow-brand"
                >
                  {branchSubmitting && <Loader2 size={14} className="animate-spin" />}
                  <span>ثبت شعبه</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
