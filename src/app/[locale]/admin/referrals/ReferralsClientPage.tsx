'use client';

import React, { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { ERPDataGrid, ColumnDef } from '@/components/admin/ERPDataGrid';
import { ErpHint, ErpModal, ErpPageHeader, erpFieldCls, erpLabelCls, erpPrimaryBtnCls, erpGhostBtnCls } from '@/components/admin/erp-ui';
import type { LeaderDashboardRow } from '@/domains/referral/ReferralDomainService';
import { settleLeaderRewardAction, createReferralCodeAction, updateReferralCodeAction } from '@/actions/admin';
import { getAdminUsers, type AdminUserListItem } from '@/actions/admin-users';
import { TIER_PRESETS, REFERRAL_CONFIG } from '@/lib/referral/config';
import { lt } from '@/lib/lt';
import { formatMoney } from '@/lib/money';
import {
  Users,
  Award,
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
  Eye,
  Plus,
  X,
  Loader2,
  Sliders,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

function buildTierConfigJson(params: {
  discountPercent: number;
  capIrr: number | null;
  maxUses: number | null;
  presetKey: string;
}): string | undefined {
  const config: Record<string, unknown> = {};

  const discRate = params.discountPercent / 100;
  if (discRate !== REFERRAL_CONFIG.referralDiscountPercent) {
    config.discountPercent = discRate;
  }
  if (params.capIrr !== REFERRAL_CONFIG.maxDiscountCapIrr) {
    config.maxDiscountCapIrr = params.capIrr;
  }
  if (params.maxUses !== null) {
    config.maxUses = params.maxUses;
  }
  const preset = TIER_PRESETS.find((p) => p.key === params.presetKey);
  if (preset && preset.key !== 'standard') {
    config.tiers = preset.tiers;
  }

  return Object.keys(config).length > 0 ? JSON.stringify(config) : undefined;
}

function ReferralVariableFields({
  discountPercent,
  setDiscountPercent,
  capType,
  setCapType,
  customCapIrr,
  setCustomCapIrr,
  maxUsesType,
  setMaxUsesType,
  customMaxUses,
  setCustomMaxUses,
  tierPresetKey,
  setTierPresetKey,
  locale,
}: {
  discountPercent: number;
  setDiscountPercent: (v: number) => void;
  capType: 'standard' | 'double' | 'uncapped' | 'custom';
  setCapType: (v: 'standard' | 'double' | 'uncapped' | 'custom') => void;
  customCapIrr: string;
  setCustomCapIrr: (v: string) => void;
  maxUsesType: 'unlimited' | '5' | '10' | '20' | '50' | 'custom';
  setMaxUsesType: (v: 'unlimited' | '5' | '10' | '20' | '50' | 'custom') => void;
  customMaxUses: string;
  setCustomMaxUses: (v: string) => void;
  tierPresetKey: string;
  setTierPresetKey: (v: string) => void;
  locale: string;
}) {
  return (
    <div className="space-y-4 pt-3 border-t border-line/70">
      {/* 1. Passenger Discount % */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={erpLabelCls}>
            {lt(locale, {
              fa: 'درصد تخفیف مسافر (روی قیمت پایه)',
              en: 'Passenger Discount % (Base Price)',
              ar: 'نسبة خصم المسافر (السعر الأساسي)',
              zh: '旅客折扣百分比（基础价）',
              ru: 'Скидка для пассажира % (Базовая цена)',
            })}
          </label>
          <span className="font-mono font-black text-xs text-brand-dark bg-mint/50 px-2.5 py-0.5 rounded-lg border border-brand/20">
            {discountPercent}٪
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1.5 mb-1.5">
          {[5, 10, 15, 20].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => setDiscountPercent(pct)}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold font-mono transition border ${
                discountPercent === pct
                  ? 'bg-brand text-surface border-brand shadow-xs'
                  : 'bg-soft/70 hover:bg-line/50 text-sub border-line'
              }`}
            >
              {pct}٪
            </button>
          ))}
          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              value={discountPercent}
              onChange={(e) => {
                const val = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                setDiscountPercent(val);
              }}
              placeholder="دلخواه"
              className="w-full h-full text-center rounded-xl border border-line bg-surface text-xs font-mono font-bold text-ink focus:outline-none focus:border-brand"
            />
          </div>
        </div>
        <p className="text-[11px] text-sub">
          {lt(locale, {
            fa: 'تخفیف به صورت مستقیم روی هزینه خدمات پایه در فاکتور مسافر کسر می‌گردد.',
            en: 'Discount is applied directly to base trip cost on passenger invoice.',
            ar: 'يتم تطبيق الخصم مباشرة على السعر الأساسي للرحلة.',
            zh: '折扣直接应用于旅客账单的基础行程费用。',
            ru: 'Скидка применяется напрямую к базовой стоимости поездки.',
          })}
        </p>
      </div>

      {/* 2. Max Discount Cap */}
      <div>
        <label className={erpLabelCls}>
          {lt(locale, {
            fa: 'سقف ریالی تخفیف هر رزرو',
            en: 'Max Discount Cap (Per Booking)',
            ar: 'الحد الأقصى للخصم (لكل حجز)',
            zh: '每单最高折扣上限',
            ru: 'Максимальный лимит скидки',
          })}
        </label>
        <div className="grid grid-cols-4 gap-1.5 mb-1.5">
          {[
            { key: 'standard', labelFa: '۵۰ م.ر (استاندارد)', labelEn: '50M IRR' },
            { key: 'double', labelFa: '۱۰۰ م.ر', labelEn: '100M IRR' },
            { key: 'uncapped', labelFa: 'بدون سقف', labelEn: 'No Cap' },
            { key: 'custom', labelFa: 'دلخواه', labelEn: 'Custom' },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setCapType(opt.key as 'standard' | 'double' | 'uncapped' | 'custom')}
              className={`py-1.5 px-1 text-center rounded-xl text-[11px] font-bold transition border ${
                capType === opt.key
                  ? 'bg-brand text-surface border-brand shadow-xs'
                  : 'bg-soft/70 hover:bg-line/50 text-sub border-line'
              }`}
            >
              {locale === 'fa' ? opt.labelFa : opt.labelEn}
            </button>
          ))}
        </div>
        {capType === 'custom' && (
          <div className="mt-2">
            <input
              type="number"
              min="0"
              step="1000000"
              value={customCapIrr}
              onChange={(e) => setCustomCapIrr(e.target.value)}
              placeholder="مبلغ سقف به ریال (مثلاً ۷۵۰۰۰۰۰۰)"
              className={`${erpFieldCls} font-mono`}
              dir="ltr"
            />
          </div>
        )}
      </div>

      {/* 3. Max Uses / Capacity (برای چه تعداد باشه) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={erpLabelCls}>
            {lt(locale, {
              fa: 'سقف تعداد استفاده (ظرفیت کد معرف)',
              en: 'Usage Limit / Capacity',
              ar: 'حد الاستخدام / السعة',
              zh: '使用次数上限 / 名额',
              ru: 'Лимит использований / вместимость',
            })}
          </label>
          <span className="font-mono text-xs text-sub">
            {maxUsesType === 'unlimited' ? 'نامحدود' : `${maxUsesType === 'custom' ? customMaxUses || '—' : maxUsesType} رزرو`}
          </span>
        </div>
        <div className="grid grid-cols-6 gap-1.5 mb-1.5">
          {[
            { key: 'unlimited', labelFa: 'نامحدود', labelEn: 'Unlimited' },
            { key: '5', labelFa: '۵ بار', labelEn: '5' },
            { key: '10', labelFa: '۱۰ بار', labelEn: '10' },
            { key: '20', labelFa: '۲۰ بار', labelEn: '20' },
            { key: '50', labelFa: '۵۰ بار', labelEn: '50' },
            { key: 'custom', labelFa: 'دلخواه', labelEn: 'Custom' },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setMaxUsesType(opt.key as 'unlimited' | '5' | '10' | '20' | '50' | 'custom')}
              className={`py-1.5 px-1 text-center rounded-xl text-[11px] font-bold transition border ${
                maxUsesType === opt.key
                  ? 'bg-brand text-surface border-brand shadow-xs'
                  : 'bg-soft/70 hover:bg-line/50 text-sub border-line'
              }`}
            >
              {locale === 'fa' ? opt.labelFa : opt.labelEn}
            </button>
          ))}
        </div>
        {maxUsesType === 'custom' && (
          <div className="mt-2">
            <input
              type="number"
              min="1"
              value={customMaxUses}
              onChange={(e) => setCustomMaxUses(e.target.value)}
              placeholder="حداکثر تعداد مجاز (مثلاً ۱۵)"
              className={`${erpFieldCls} font-mono`}
              dir="ltr"
            />
          </div>
        )}
        <p className="text-[11px] text-sub">
          {lt(locale, {
            fa: 'پس از تکمیل این تعداد رزرو، کد به حالت «تکمیل ظرفیت» درآمده و تخفیف جدیدی اعمال نمی‌گردد.',
            en: 'Once this limit is reached, the code is exhausted and no new discounts are applied.',
            ar: 'عند اكتمال هذا العدد، ينتهي الرمز ولا يتم تطبيق أي خصم جديد.',
            zh: '名额满后推荐码失效，新预订不再享受折扣。',
            ru: 'После исчерпания лимита код считается заверشённым.',
          })}
        </p>
      </div>

      {/* 4. Leader Reward Tier Preset */}
      <div>
        <label className={erpLabelCls}>
          {lt(locale, {
            fa: 'الگوی پله‌های پاداش سرگروه',
            en: 'Leader Reward Tier Preset',
            ar: 'نمط مكافأة القائد',
            zh: '领队奖励梯队预设',
            ru: 'Шаблон уровней лидера',
          })}
        </label>
        <div className="space-y-1.5">
          {TIER_PRESETS.map((preset) => (
            <label
              key={preset.key}
              className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                tierPresetKey === preset.key
                  ? 'bg-mint/40 border-brand/40 text-brand-dark font-bold'
                  : 'bg-soft/40 border-line hover:bg-soft text-sub'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`tierPreset_${preset.key}`}
                  value={preset.key}
                  checked={tierPresetKey === preset.key}
                  onChange={() => setTierPresetKey(preset.key)}
                  className="text-brand focus:ring-brand"
                />
                <span>{locale === 'fa' ? preset.labelFa : preset.labelEn}</span>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ReferralsClientPageProps {
  initialData: LeaderDashboardRow[];
}

export function ReferralsClientPage({ initialData }: ReferralsClientPageProps) {
  const locale = useLocale();
  const router = useRouter();
  const [data, setData] = useState<LeaderDashboardRow[]>(initialData);
  const [selectedLeader, setSelectedLeader] = useState<LeaderDashboardRow | null>(null);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createCode, setCreateCode] = useState('');
  const [createLeaderId, setCreateLeaderId] = useState('');
  const [leaderSearch, setLeaderSearch] = useState('');
  const [leaderResults, setLeaderResults] = useState<AdminUserListItem[]>([]);
  const [leaderSearching, setLeaderSearching] = useState(false);
  const [pickedLeader, setPickedLeader] = useState<AdminUserListItem | null>(null);
  const [showCreateAdvanced, setShowCreateAdvanced] = useState(false);
  const [createDiscountPercent, setCreateDiscountPercent] = useState<number>(5);
  const [createCapType, setCreateCapType] = useState<'standard' | 'double' | 'uncapped' | 'custom'>('standard');
  const [createCustomCapIrr, setCreateCustomCapIrr] = useState<string>('');
  const [createMaxUsesType, setCreateMaxUsesType] = useState<'unlimited' | '5' | '10' | '20' | '50' | 'custom'>('unlimited');
  const [createCustomMaxUses, setCreateCustomMaxUses] = useState<string>('');
  const [createTierPresetKey, setCreateTierPresetKey] = useState<string>('standard');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit / Config Modal State
  const [editingLeader, setEditingLeader] = useState<LeaderDashboardRow | null>(null);
  const [editIsActive, setEditIsActive] = useState(true);
  const [editDiscountPercent, setEditDiscountPercent] = useState<number>(5);
  const [editCapType, setEditCapType] = useState<'standard' | 'double' | 'uncapped' | 'custom'>('standard');
  const [editCustomCapIrr, setEditCustomCapIrr] = useState<string>('');
  const [editMaxUsesType, setEditMaxUsesType] = useState<'unlimited' | '5' | '10' | '20' | '50' | 'custom'>('unlimited');
  const [editCustomMaxUses, setEditCustomMaxUses] = useState<string>('');
  const [editTierPresetKey, setEditTierPresetKey] = useState<string>('standard');
  const [isUpdating, setIsUpdating] = useState(false);

  const openCreateModal = () => {
    setCreateCode('');
    setCreateLeaderId('');
    setLeaderSearch('');
    setLeaderResults([]);
    setPickedLeader(null);
    setShowCreateAdvanced(false);
    setCreateDiscountPercent(5);
    setCreateCapType('standard');
    setCreateCustomCapIrr('');
    setCreateMaxUsesType('unlimited');
    setCreateCustomMaxUses('');
    setCreateTierPresetKey('standard');
    setShowCreateModal(true);
  };

  const openEditModal = (row: LeaderDashboardRow) => {
    setEditingLeader(row);
    setEditIsActive(row.isActive);

    const discPct = Math.round(row.discountPercent * 100);
    setEditDiscountPercent(discPct);

    if (row.maxDiscountCapIrr === null) {
      setEditCapType('uncapped');
      setEditCustomCapIrr('');
    } else if (row.maxDiscountCapIrr === 50_000_000) {
      setEditCapType('standard');
      setEditCustomCapIrr('');
    } else if (row.maxDiscountCapIrr === 100_000_000) {
      setEditCapType('double');
      setEditCustomCapIrr('');
    } else {
      setEditCapType('custom');
      setEditCustomCapIrr(row.maxDiscountCapIrr.toString());
    }

    if (row.maxUses === null) {
      setEditMaxUsesType('unlimited');
      setEditCustomMaxUses('');
    } else if (['5', '10', '20', '50'].includes(row.maxUses.toString())) {
      setEditMaxUsesType(row.maxUses.toString() as '5' | '10' | '20' | '50');
      setEditCustomMaxUses('');
    } else {
      setEditMaxUsesType('custom');
      setEditCustomMaxUses(row.maxUses.toString());
    }

    let presetKey = 'standard';
    if (row.customTierConfig) {
      try {
        const parsed = JSON.parse(row.customTierConfig);
        if (Array.isArray(parsed.tiers) && parsed.tiers.length > 0) {
          const match = TIER_PRESETS.find((p) => JSON.stringify(p.tiers) === JSON.stringify(parsed.tiers));
          if (match) presetKey = match.key;
        }
      } catch {
        // noop
      }
    }
    setEditTierPresetKey(presetKey);
  };

  // Debounced leader search (name / email / phone).
  useEffect(() => {
    if (!showCreateModal) return;
    const q = leaderSearch.trim();
    if (q.length < 2) {
      setLeaderResults([]);
      return;
    }
    setLeaderSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await getAdminUsers({ search: q, limit: 6 });
        setLeaderResults(res.success ? res.users : []);
      } catch {
        setLeaderResults([]);
      } finally {
        setLeaderSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [leaderSearch, showCreateModal]);

  const pickedDisplayName = (u: AdminUserListItem) =>
    u.name || u.phone || u.email || u.id;
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const numFmt = locale === 'fa' ? 'fa-IR' : 'en-US';

  // Escape closes modals and disarms the two-step settle confirmation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setShowCreateModal(false);
      setSelectedLeader(null);
      setEditingLeader(null);
      setConfirmingId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleSettle = async (row: LeaderDashboardRow) => {
    // Two-step inline confirmation instead of the blocking native confirm().
    if (confirmingId !== row.id) {
      setConfirmingId(row.id);
      return;
    }
    setConfirmingId(null);
    setSettlingId(row.id);
    try {
      const res = await settleLeaderRewardAction(row.id);
      if (res.success) {
        toast.success(lt(locale, {
          fa: 'پاداش با موفقیت تسویه و در پرونده سرگروه و لاگ حسابرسی ثبت شد.',
          en: 'Reward settled and recorded in the leader file and audit log.',
          ar: 'تمت تسوية المكافأة بنجاح.',
          zh: '奖励已成功结算。',
          ru: 'Вознаграждение успешно выплачено.',
        }));
        setData((prev) =>
          prev.map((r) => (r.id === row.id ? { ...r, settlementStatus: 'SETTLED' } : r))
        );
      } else {
        toast.error(res.error || 'خطا در ثبت تسویه');
      }
    } catch {
      toast.error('خطای ارتباط با سرور');
    } finally {
      setSettlingId(null);
    }
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    // Picker selection wins; otherwise accept a pasted User ID directly
    // (the server validates existence with a clear message).
    const leaderId = pickedLeader?.id || createLeaderId.trim();
    if (!createCode.trim() || !leaderId) {
      toast.error('کد معرف و انتخاب سرگروه الزامی هستند');
      return;
    }

    let resolvedCapIrr: number | null = 50_000_000;
    if (createCapType === 'uncapped') resolvedCapIrr = null;
    else if (createCapType === 'double') resolvedCapIrr = 100_000_000;
    else if (createCapType === 'custom') {
      const num = parseInt(createCustomCapIrr, 10);
      resolvedCapIrr = !isNaN(num) && num >= 0 ? num : null;
    }

    let resolvedMaxUses: number | null = null;
    if (createMaxUsesType !== 'unlimited') {
      const num = createMaxUsesType === 'custom' ? parseInt(createCustomMaxUses, 10) : parseInt(createMaxUsesType, 10);
      if (!isNaN(num) && num > 0) resolvedMaxUses = num;
    }

    const jsonConfig = showCreateAdvanced
      ? buildTierConfigJson({
          discountPercent: createDiscountPercent,
          capIrr: resolvedCapIrr,
          maxUses: resolvedMaxUses,
          presetKey: createTierPresetKey,
        })
      : undefined;

    setIsSubmitting(true);
    try {
      const payload: { code: string; leaderId: string; customTierConfig?: string } = {
        code: createCode.trim(),
        leaderId,
      };
      if (jsonConfig) {
        payload.customTierConfig = jsonConfig;
      }

      const res = await createReferralCodeAction(payload);
      if (res.success) {
        toast.success(
          (res.resolvedUnmatched ?? 0) > 0
            ? `کد معرف ایجاد شد؛ ${res.resolvedUnmatched} رزرو قبلی به آن لینک شد`
            : 'کد معرف سرگروه با موفقیت ایجاد شد'
        );
        setShowCreateModal(false);
        setCreateCode('');
        setCreateLeaderId('');
        setLeaderSearch('');
        setLeaderResults([]);
        setPickedLeader(null);
        router.refresh();
      } else {
        toast.error(res.error || 'خطا در ایجاد کد');
      }
    } catch {
      toast.error('خطای سرور');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeader) return;

    let resolvedCapIrr: number | null = 50_000_000;
    if (editCapType === 'uncapped') resolvedCapIrr = null;
    else if (editCapType === 'double') resolvedCapIrr = 100_000_000;
    else if (editCapType === 'custom') {
      const num = parseInt(editCustomCapIrr, 10);
      resolvedCapIrr = !isNaN(num) && num >= 0 ? num : null;
    }

    let resolvedMaxUses: number | null = null;
    if (editMaxUsesType !== 'unlimited') {
      const num = editMaxUsesType === 'custom' ? parseInt(editCustomMaxUses, 10) : parseInt(editMaxUsesType, 10);
      if (!isNaN(num) && num > 0) resolvedMaxUses = num;
    }

    const jsonConfig = buildTierConfigJson({
      discountPercent: editDiscountPercent,
      capIrr: resolvedCapIrr,
      maxUses: resolvedMaxUses,
      presetKey: editTierPresetKey,
    });

    setIsUpdating(true);
    try {
      const res = await updateReferralCodeAction({
        id: editingLeader.id,
        isActive: editIsActive,
        customTierConfig: jsonConfig || null,
      });

      if (res.success) {
        toast.success('متغیرهای کد معرف با موفقیت به‌روزرسانی شد');
        setData((prev) =>
          prev.map((r) =>
            r.id === editingLeader.id
              ? {
                  ...r,
                  isActive: editIsActive,
                  discountPercent: editDiscountPercent / 100,
                  maxDiscountCapIrr: resolvedCapIrr,
                  maxUses: resolvedMaxUses,
                  customTierConfig: jsonConfig || null,
                }
              : r
          )
        );
        setEditingLeader(null);
        router.refresh();
      } else {
        toast.error(res.error || 'خطا در به‌روزرسانی کد');
      }
    } catch {
      toast.error('خطای ارتباط با سرور');
    } finally {
      setIsUpdating(false);
    }
  };

  const columns: ColumnDef<LeaderDashboardRow>[] = [
    {
      key: 'code',
      header: lt(locale, { fa: 'کد معرف', en: 'Code', ar: 'الرمز', zh: '代码', ru: 'Код' }),
      sortable: true,
      csvAccessor: (r) => r.code,
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <span
            className={`font-mono font-black px-2.5 py-1 rounded-lg text-xs border ${
              r.isActive
                ? 'text-brand-dark bg-mint/50 border-brand/20'
                : 'text-zinc-400 bg-soft border-line line-through'
            }`}
          >
            {r.code}
          </span>
          {!r.isActive && (
            <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
              غیرفعال
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'leaderName',
      header: lt(locale, { fa: 'نام سرگروه', en: 'Leader Name', ar: 'اسم القائد', zh: '领队姓名', ru: 'Имя лидера' }),
      sortable: true,
      csvAccessor: (r) => r.leaderName,
      render: (r) => (
        <div>
          <div className="font-bold text-ink">{r.leaderName}</div>
          <div className="text-[11px] text-sub font-mono">{r.leaderPhone}</div>
        </div>
      ),
    },
    {
      key: 'discountConfig',
      header: lt(locale, { fa: 'تخفیف مسافر', en: 'Discount', ar: 'الخصم', zh: '折扣', ru: 'Скидка' }),
      sortable: true,
      csvAccessor: (r) => `${Math.round(r.discountPercent * 100)}%`,
      render: (r) => {
        const pct = Math.round(r.discountPercent * 100);
        return (
          <div className="text-xs">
            <span className="font-bold text-brand-dark font-mono bg-mint/40 px-2 py-0.5 rounded-md inline-block">
              {pct}٪ تخفیف
            </span>
            <div className="text-[10px] text-sub mt-0.5 font-mono">
              {r.maxDiscountCapIrr !== null
                ? `سقف ${Math.round(r.maxDiscountCapIrr / 10_000_000).toLocaleString(numFmt)} م.ت`
                : 'بدون سقف'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'usageQuota',
      header: lt(locale, { fa: 'ظرفیت و استفاده', en: 'Capacity & Uses', ar: 'السعة والاستخدام', zh: '名额与使用', ru: 'Лимит и использование' }),
      sortable: true,
      csvAccessor: (r) => (r.maxUses !== null ? `${r.usedCount}/${r.maxUses}` : `${r.usedCount}/∞`),
      render: (r) => {
        if (r.maxUses !== null) {
          const isFull = r.usedCount >= r.maxUses;
          return (
            <div className="text-xs">
              <span
                className={`font-bold font-mono px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
                  isFull ? 'bg-destructive/10 text-destructive' : 'bg-soft text-ink'
                }`}
              >
                <span>
                  {r.usedCount.toLocaleString(numFmt)} / {r.maxUses.toLocaleString(numFmt)}
                </span>
                {isFull && <span className="text-[10px] font-sans">(تکمیل)</span>}
              </span>
            </div>
          );
        }
        return (
          <span className="text-xs font-mono text-sub">
            {r.usedCount.toLocaleString(numFmt)} استفاده (نامحدود)
          </span>
        );
      },
    },
    {
      key: 'confirmedPax',
      header: lt(locale, { fa: 'نفرات تأییدشده', en: 'Confirmed Pax', ar: 'المؤكدون', zh: '已确认人数', ru: 'Подтверждено' }),
      sortable: true,
      csvAccessor: (r) => r.confirmedPax,
      render: (r) => (
        <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-lg font-mono text-xs">
          <CheckCircle2 size={13} />
          <span>{r.confirmedPax.toLocaleString(numFmt)} نفر</span>
        </span>
      ),
    },
    {
      key: 'pendingPax',
      header: lt(locale, { fa: 'در انتظار', en: 'Pending Pax', ar: 'قيد الانتظار', zh: '待付款人数', ru: 'В ожидании' }),
      sortable: true,
      csvAccessor: (r) => r.pendingPax,
      render: (r) => (
        <span className="inline-flex items-center gap-1 font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-lg font-mono text-xs">
          <Clock size={12} />
          <span>{r.pendingPax.toLocaleString(numFmt)}</span>
        </span>
      ),
    },
    {
      key: 'cancelledPax',
      header: lt(locale, { fa: 'کنسل‌شده', en: 'Cancelled Pax', ar: 'الملغيون', zh: '已取消人数', ru: 'Отменено' }),
      sortable: true,
      csvAccessor: (r) => r.cancelledPax,
      render: (r) => (
        <span className="inline-flex items-center gap-1 font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-lg font-mono text-xs">
          <XCircle size={12} />
          <span>{r.cancelledPax.toLocaleString(numFmt)}</span>
        </span>
      ),
    },
    {
      key: 'currentTier',
      header: lt(locale, { fa: 'پلهٔ فعلی', en: 'Current Tier', ar: 'المستوى الحالي', zh: '当前梯队', ru: 'Текущий уровень' }),
      sortable: true,
      csvAccessor: (r) => `${Math.round(r.rewardPercent * 100)}%`,
      render: (r) => {
        const pct = Math.round(r.rewardPercent * 100);
        return (
          <div className="flex items-center gap-1.5">
            <Award size={15} className={pct >= 50 ? 'text-amber-500' : 'text-sub'} />
            <span className="font-black text-xs font-mono">
              {pct > 0 ? `${pct}٪ استرداد` : 'بدون پاداش (<۵)'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'nextTierDistance',
      header: lt(locale, { fa: 'فاصله تا پله بعد', en: 'To Next Tier', ar: 'حتى المستوى التالي', zh: '距下一级', ru: 'До след. уровня' }),
      sortable: true,
      csvAccessor: (r) => r.nextTierDistance,
      render: (r) => (
        <div className="text-xs">
          {r.rewardPercent >= 1.0 ? (
            <span className="text-emerald-600 font-bold">حداکثر سقف (۱۰۰٪)</span>
          ) : (
            <span className="text-sub font-bold font-mono">
              {r.nextTierDistance} نفر تا {Math.round(r.nextTierPercent * 100)}٪
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'estimatedRewardAmount',
      header: lt(locale, { fa: 'مبلغ پاداش', en: 'Reward Amount', ar: 'مبلغ المكافأة', zh: '奖励金额', ru: 'Вознаграждение' }),
      sortable: true,
      csvAccessor: (r) => r.estimatedRewardAmount,
      render: (r) => (
        <span className="font-bold text-ink font-mono text-xs">
          {formatMoney(r.estimatedRewardAmount, 'IRR', locale)}
        </span>
      ),
    },
    {
      key: 'settlementStatus',
      header: lt(locale, { fa: 'وضعیت تسویه', en: 'Settlement', ar: 'حالة التسوية', zh: '结算状态', ru: 'Статус' }),
      sortable: true,
      csvAccessor: (r) => r.settlementStatus,
      render: (r) => {
        if (r.settlementStatus === 'SETTLED') {
          return (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600">
              تسویه شده
            </span>
          );
        }
        if (r.rewardPercent > 0 && r.estimatedRewardAmount > 0) {
          const armed = confirmingId === r.id;
          return (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={settlingId === r.id}
                onClick={() => handleSettle(r)}
                aria-live="polite"
                title={armed
                  ? lt(locale, { fa: `تأیید تسویه ${formatMoney(r.estimatedRewardAmount, 'IRR', locale)} برای ${r.leaderName}؟ دوباره بزنید`, en: `Confirm settling ${formatMoney(r.estimatedRewardAmount, 'IRR', locale)} for ${r.leaderName}? Click again`, ar: 'اضغط مرة أخرى للتأكيد', zh: '再次点击确认', ru: 'Нажмите ещё раз для подтверждения' })
                  : lt(locale, { fa: 'تسویه پاداش', en: 'Settle reward', ar: 'تسوية المكافأة', zh: '结算奖励', ru: 'Выплатить' })}
                className={`min-h-9 px-2.5 rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center gap-1 ${
                  armed ? 'bg-rose-600 text-surface hover:bg-rose-700' : 'bg-brand text-surface hover:bg-brand-dark'
                }`}
              >
                {settlingId === r.id ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <CreditCard size={12} aria-hidden="true" />}
                <span>{armed ? lt(locale, { fa: 'تأیید تسویه؟', en: 'Confirm?', ar: 'تأكيد؟', zh: '确认？', ru: 'Точно?' }) : 'تسویه پاداش'}</span>
              </button>
              {armed && settlingId !== r.id && (
                <button
                  type="button"
                  onClick={() => setConfirmingId(null)}
                  aria-label={lt(locale, { fa: 'انصراف از تسویه', en: 'Cancel settlement', ar: 'إلغاء التسوية', zh: '取消结算', ru: 'Отменить выплату' })}
                  className="min-h-[44px] min-w-[44px] min-w-9 min-h-9 grid place-items-center rounded-lg border border-line text-sub hover:text-ink"
                >
                  <X size={13} aria-hidden="true" />
                </button>
              )}
            </div>
          );
        }
        return <span className="text-sub text-xs">نصاب ناکافی</span>;
      },
    },
    {
      key: 'actions',
      header: lt(locale, { fa: 'عملیات', en: 'Actions', ar: 'العمليات', zh: '操作', ru: 'Действия' }),
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedLeader(r)}
            className="min-h-9 px-2 rounded-lg border border-line hover:bg-soft text-sub hover:text-ink transition flex items-center gap-1 text-xs font-bold"
            title="مشاهده لیست مسافران"
          >
            <Eye size={14} />
            <span>{r.travelers.length}</span>
          </button>
          <button
            type="button"
            onClick={() => openEditModal(r)}
            className="min-h-9 px-2.5 rounded-lg border border-line hover:bg-brand/10 hover:border-brand/40 text-brand-dark transition flex items-center gap-1 text-xs font-bold"
            title="تنظیم متغیرها (تخفیف، ظرفیت، پاداش)"
          >
            <Sliders size={13} />
            <span>تنظیمات</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <ErpPageHeader
        eyebrow={lt(locale, { fa: 'رشد · سرگروه‌ها', en: 'Growth · Leaders', ar: 'النمو · القادة', zh: '增长 · 领队', ru: 'Рост · Лидеры' })}
        title={lt(locale, {
          fa: 'کدهای معرف و پاداش سرگروه‌ها',
          en: 'Referral Codes & Leader Rewards',
          ar: 'رموز الإحالة ومكافآت القادة',
          zh: '推荐码与领队奖励',
          ru: 'Рефералы и вознаграждения лидеров',
        })}
        description={
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span>{lt(locale, {
              fa: 'محاسبه پویای پله‌های پاداش بر اساس مسافران تأییدشده منهای کنسلی‌ها',
              en: 'Dynamic reward tiers from confirmed pax minus cancellations',
              ar: 'حساب ديناميكي للمكافآت بناءً على الركاب المؤكدين',
              zh: '根据已确认乘客扣除取消后动态计算奖励梯队',
              ru: 'Динамический расчёт вознаграждений лидеров',
            })}</span>
            <ErpHint label={lt(locale, { fa: 'پله پاداش چطور حساب می‌شود؟', en: 'How is the reward tier calculated?', ar: 'كيف يُحسب مستوى المكافأة؟', zh: '奖励梯队如何计算？', ru: 'Как считается уровень?' })}>
              {lt(locale, {
                fa: 'مسافران تأییدشده منهای کنسلی‌ها. هر چه گروه بزرگ‌تر، درصد استرداد سرگروه بیشتر — تا سقف ۱۰۰٪. با «تسویه پاداش» سند مالی ثبت می‌شود.',
                en: 'Confirmed travelers minus cancellations. The bigger the group, the higher the leader’s cashback percent — up to 100%. Settling posts a ledger voucher.',
                ar: 'المسافرون المؤكدون ناقص الملغين. كلما كبرت المجموعة زادت النسبة حتى 100٪.',
                zh: '已确认旅客减去取消。团队越大，领队返现比例越高 — 最高100%。结算会生成财务凭证。',
                ru: 'Подтверждённые минус отмены. Больше группа — выше процент, до 100%. Выплата создаёт voucher.',
              })}
            </ErpHint>
          </span>
        }
        icon={<Users size={20} aria-hidden="true" />}
        actions={
          <button type="button" onClick={openCreateModal} className={erpPrimaryBtnCls}>
            <Plus size={15} aria-hidden="true" />
            <span>{lt(locale, { fa: 'تعریف کد معرف جدید', en: 'Create Referral Code', ar: 'إنشاء رمز إحالة', zh: '创建推荐码', ru: 'Создать промокод' })}</span>
          </button>
        }
      />

      {/* Main ERP DataGrid with CSV / Excel Export */}
      <ERPDataGrid
        data={data}
        columns={columns}
        title={lt(locale, { fa: 'لیست سرگروه‌ها و نصاب پاداش', en: 'Group Leaders & Reward Quotas', ar: 'قائمة القادة', zh: '领队及配额列表', ru: 'Список лидеров' })}
        searchPlaceholder={lt(locale, { fa: 'جستجوی کد، نام سرگروه یا شماره تماس...', en: 'Search code, name or phone...', ar: 'بحث...', zh: '搜索...', ru: 'Поиск...' })}
        defaultPageSize={25}
        emptyStateMessage={lt(locale, { fa: 'هیچ کد معرفی یافت نشد', en: 'No referral codes found', ar: 'لا توجد رموز إحالة', zh: '未找到推荐码', ru: 'Промокоды не найдены' })}
      />

      {/* Modal: View Travelers for a Leader */}
      {selectedLeader && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedLeader(null)}>
          <div role="dialog" aria-modal="true" aria-label={`مسافران سرگروه: ${selectedLeader.leaderName}`} onClick={(e) => e.stopPropagation()} className="bg-surface rounded-3xl border border-line shadow-elev-3 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-line flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-ink flex items-center gap-2">
                  <span className="font-mono bg-mint/50 px-2 py-0.5 rounded text-sm text-brand-dark">
                    {selectedLeader.code}
                  </span>
                  <span>مسافران سرگروه: {selectedLeader.leaderName}</span>
                </h3>
                <p className="text-xs text-sub mt-0.5">
                  مجموع مسافران: {selectedLeader.travelers.length} رزرو ({selectedLeader.confirmedPax} نفر تأییدشده)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLeader(null)}
                className="w-8 h-8 rounded-full bg-soft hover:bg-line/60 grid place-items-center text-sub hover:text-ink transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 divide-y divide-line/60">
              {selectedLeader.travelers.length === 0 ? (
                <p className="text-center text-sub py-10 text-sm">هنوز مسافری با این کد ثبت نشده است.</p>
              ) : (
                selectedLeader.travelers.map((t, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-ink">{t.travelerName}</div>
                      <div className="text-[11px] text-sub font-mono mt-0.5">
                        کد رزرو: {t.bookingReference} • {t.paxCount} نفر
                      </div>
                    </div>
                    <div className="text-end">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          t.bookingStatus === 'CONFIRMED'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : t.bookingStatus === 'CANCELLED' || t.bookingStatus === 'REFUNDED'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-amber-500/10 text-amber-600'
                        }`}
                      >
                        {t.bookingStatus}
                      </span>
                      <div className="text-[11px] text-sub font-mono mt-1">
                        {formatMoney(t.bookingTotal, 'IRR', locale)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-line bg-soft/40 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLeader(null)}
                className="px-5 py-2 rounded-xl bg-surface border border-line hover:bg-soft text-ink font-bold text-xs transition"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Referral Code */}
      {showCreateModal && (
        <ErpModal
          title="تعریف کد معرف سرگروه جدید"
          onClose={() => setShowCreateModal(false)}
          footer={
            <>
              <button type="button" onClick={() => setShowCreateModal(false)} className={erpGhostBtnCls}>
                انصراف
              </button>
              <button type="submit" form="erp-referral-form" disabled={isSubmitting} className={erpPrimaryBtnCls}>
                {isSubmitting && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                <span>ایجاد کد</span>
              </button>
            </>
          }
        >
          <form id="erp-referral-form" onSubmit={handleCreateCode} className="space-y-4">
            <div>
              <label className={erpLabelCls} htmlFor="ref-code">کد معرف (یکتا و انگلیسی)</label>
              <input
                id="ref-code"
                type="text"
                required
                placeholder="DAMAVAND1403"
                value={createCode}
                onChange={(e) => setCreateCode(e.target.value.toUpperCase())}
                className={`${erpFieldCls} font-mono font-bold uppercase`}
                dir="ltr"
              />
            </div>
            <div>
              <label className={erpLabelCls} htmlFor="ref-leader-search">سرگروه (جستجو با نام یا موبایل)</label>
              {pickedLeader ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-brand/40 bg-mint/30 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-[13px] font-black text-ink truncate">{pickedDisplayName(pickedLeader)}</div>
                    <div className="text-[11px] text-sub font-mono" dir="ltr">{pickedLeader.id}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPickedLeader(null);
                      setLeaderSearch('');
                    }}
                    aria-label="حذف انتخاب سرگروه"
                    className="min-w-[44px] min-h-[44px] grid place-items-center rounded-lg text-sub hover:text-ink hover:bg-soft transition shrink-0"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    id="ref-leader-search"
                    type="text"
                    autoComplete="off"
                    placeholder="مثلاً علی رضایی یا 0912… (حداقل ۲ حرف)"
                    value={leaderSearch}
                    onChange={(e) => {
                      setLeaderSearch(e.target.value);
                      setCreateLeaderId(e.target.value);
                    }}
                    className={erpFieldCls}
                  />
                  {leaderSearching && (
                    <p className="mt-1.5 text-[11px] font-bold text-sub flex items-center gap-1.5">
                      <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                      در حال جستجو…
                    </p>
                  )}
                  {!leaderSearching && leaderResults.length > 0 && (
                    <ul className="mt-1.5 max-h-44 overflow-y-auto rounded-xl border border-line bg-surface shadow-elev-2 divide-y divide-line/60" role="listbox" aria-label="نتایج جستجوی سرگروه">
                      {leaderResults.map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected="false"
                            onClick={() => {
                              setPickedLeader(u);
                              setCreateLeaderId(u.id);
                              setLeaderResults([]);
                            }}
                            className="w-full min-h-[44px] px-3 py-2 flex items-center justify-between gap-2 text-start hover:bg-soft transition"
                          >
                            <span className="min-w-0">
                              <span className="block text-[13px] font-black text-ink truncate">{pickedDisplayName(u)}</span>
                              <span className="block text-[11px] text-sub font-mono" dir="ltr">{u.id}</span>
                            </span>
                            <CheckCircle2 size={16} className="text-brand-dark shrink-0" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!leaderSearching && leaderSearch.trim().length >= 2 && leaderResults.length === 0 && (
                    <p className="mt-1.5 text-[11px] font-bold text-sub">
                      کاربری یافت نشد — می‌توانی User ID را مستقیم بچسبانی؛ در صورت نامعتبر بودن، سرور خطای واضح می‌دهد.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Advanced Variables Toggle */}
            <div className="pt-2 border-t border-line/60">
              <button
                type="button"
                onClick={() => setShowCreateAdvanced(!showCreateAdvanced)}
                className="w-full flex items-center justify-between text-xs font-bold text-brand-dark py-1.5 hover:underline"
              >
                <span className="flex items-center gap-1.5">
                  <Sliders size={13} />
                  <span>
                    {lt(locale, {
                      fa: 'تنظیم متغیرهای تخفیف، ظرفیت و پاداش (پیشرفته)',
                      en: 'Configure discount, capacity & reward variables (advanced)',
                      ar: 'إعداد متغيرات الخصم والسعة والمكافأة (متقدم)',
                      zh: '配置折扣、名额及奖励变量（高级）',
                      ru: 'Настроить переменные скидки, лимита и вознаграждения (расширенно)',
                    })}
                  </span>
                </span>
                <span>{showCreateAdvanced ? '− بستن' : '+ تنظیم'}</span>
              </button>
            </div>

            {showCreateAdvanced && (
              <ReferralVariableFields
                discountPercent={createDiscountPercent}
                setDiscountPercent={setCreateDiscountPercent}
                capType={createCapType}
                setCapType={setCreateCapType}
                customCapIrr={createCustomCapIrr}
                setCustomCapIrr={setCreateCustomCapIrr}
                maxUsesType={createMaxUsesType}
                setMaxUsesType={setCreateMaxUsesType}
                customMaxUses={createCustomMaxUses}
                setCustomMaxUses={setCreateCustomMaxUses}
                tierPresetKey={createTierPresetKey}
                setTierPresetKey={setCreateTierPresetKey}
                locale={locale}
              />
            )}
          </form>
        </ErpModal>
      )}

      {/* Modal: Edit / Configure Referral Code */}
      {editingLeader && (
        <ErpModal
          title={lt(locale, {
            fa: `تنظیم متغیرهای کد معرف: ${editingLeader.code}`,
            en: `Configure Referral Code: ${editingLeader.code}`,
            ar: `ضبط متغيرات رمز الإحالة: ${editingLeader.code}`,
            zh: `设置推荐码变量：${editingLeader.code}`,
            ru: `Настройка реферального кода: ${editingLeader.code}`,
          })}
          onClose={() => setEditingLeader(null)}
          footer={
            <>
              <button type="button" onClick={() => setEditingLeader(null)} className={erpGhostBtnCls}>
                {lt(locale, { fa: 'انصراف', en: 'Cancel', ar: 'إلغاء', zh: '取消', ru: 'Отмена' })}
              </button>
              <button type="submit" form="erp-referral-edit-form" disabled={isUpdating} className={erpPrimaryBtnCls}>
                {isUpdating && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                <span>{lt(locale, { fa: 'ذخیره تغییرات', en: 'Save Changes', ar: 'حفظ التغييرات', zh: '保存更改', ru: 'Сохранить' })}</span>
              </button>
            </>
          }
        >
          <form id="erp-referral-edit-form" onSubmit={handleUpdateCode} className="space-y-4">
            {/* Header info */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-soft/60 border border-line">
              <div>
                <div className="text-[11px] text-sub font-bold">
                  {lt(locale, { fa: 'سرگروه', en: 'Leader', ar: 'القائد', zh: '领队', ru: 'Лидер' })}
                </div>
                <div className="font-bold text-ink text-sm">{editingLeader.leaderName}</div>
                <div className="text-[11px] text-sub font-mono">{editingLeader.leaderPhone}</div>
              </div>
              <div className="text-end">
                <div className="text-[11px] text-sub font-bold">
                  {lt(locale, { fa: 'کد معرف', en: 'Code', ar: 'الرمز', zh: '代码', ru: 'Код' })}
                </div>
                <div className="font-mono font-black text-brand-dark bg-mint/50 px-2.5 py-1 rounded-lg text-sm border border-brand/20">
                  {editingLeader.code}
                </div>
              </div>
            </div>

            {/* Active / Inactive switch */}
            <div className="flex items-center justify-between p-3 rounded-2xl border border-line bg-surface">
              <div>
                <div className="font-bold text-xs text-ink">
                  {lt(locale, { fa: 'وضعیت فعال بودن کد', en: 'Code Active Status', ar: 'حالة تفعيل الرمز', zh: '代码启用状态', ru: 'Статус активности кода' })}
                </div>
                <div className="text-[11px] text-sub">
                  {editIsActive
                    ? lt(locale, { fa: 'کد فعال است و مسافران می‌توانند تخفیف دریافت کنند', en: 'Code is active and discounts apply', ar: 'الرمز نشط ويتم تطبيق الخصم', zh: '代码有效并可享受折扣', ru: 'Код активен и скидка применяется' })
                    : lt(locale, { fa: 'کد غیرفعال است و تخفیفی اعمال نمی‌شود', en: 'Code is inactive — no discounts apply', ar: 'الرمز غير نشط — لا يتم تطبيق الخصم', zh: '代码已停用，不享受折扣', ru: 'Код неактивен — скидка не применяется' })}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditIsActive(!editIsActive)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  editIsActive
                    ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                    : 'bg-destructive/15 text-destructive border border-destructive/30'
                }`}
              >
                {editIsActive ? (
                  <>
                    <Check size={14} />
                    <span>{lt(locale, { fa: 'فعال', en: 'Active', ar: 'نشط', zh: '已启用', ru: 'Активен' })}</span>
                  </>
                ) : (
                  <>
                    <X size={14} />
                    <span>{lt(locale, { fa: 'غیرفعال', en: 'Inactive', ar: 'معطل', zh: '已停用', ru: 'Неактивен' })}</span>
                  </>
                )}
              </button>
            </div>

            {/* Configurable variables */}
            <ReferralVariableFields
              discountPercent={editDiscountPercent}
              setDiscountPercent={setEditDiscountPercent}
              capType={editCapType}
              setCapType={setEditCapType}
              customCapIrr={editCustomCapIrr}
              setCustomCapIrr={setEditCustomCapIrr}
              maxUsesType={editMaxUsesType}
              setMaxUsesType={setEditMaxUsesType}
              customMaxUses={editCustomMaxUses}
              setCustomMaxUses={setEditCustomMaxUses}
              tierPresetKey={editTierPresetKey}
              setTierPresetKey={setEditTierPresetKey}
              locale={locale}
            />
          </form>
        </ErpModal>
      )}
    </div>
  );
}
