'use client';

import React, { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ERPDataGrid, ColumnDef } from '@/components/admin/ERPDataGrid';
import { LeaderDashboardRow } from '@/domains/referral/ReferralDomainService';
import { settleLeaderRewardAction, createReferralCodeAction } from '@/actions/admin';
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
  Mail,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface ReferralsClientPageProps {
  initialData: LeaderDashboardRow[];
}

export function ReferralsClientPage({ initialData }: ReferralsClientPageProps) {
  const locale = useLocale();
  const router = useRouter();
  const [data, setData] = useState<LeaderDashboardRow[]>(initialData);
  const [selectedLeader, setSelectedLeader] = useState<LeaderDashboardRow | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createCode, setCreateCode] = useState('');
  const [createLeaderId, setCreateLeaderId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const numFmt = locale === 'fa' ? 'fa-IR' : 'en-US';

  // Escape closes modals and disarms the two-step settle confirmation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setShowCreateModal(false);
      setSelectedLeader(null);
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
          fa: 'پاداش با موفقیت تسویه شد و سند مالی ثبت گردید.',
          en: 'Reward settled successfully and financial record logged.',
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
    if (!createCode.trim() || !createLeaderId.trim()) {
      toast.error('کد و آیدی کاربر الزامی هستند');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createReferralCodeAction({
        code: createCode.trim(),
        leaderId: createLeaderId.trim(),
      });
      if (res.success) {
        toast.success('کد معرف سرگروه با موفقیت ایجاد شد');
        setShowCreateModal(false);
        setCreateCode('');
        setCreateLeaderId('');
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

  const columns: ColumnDef<LeaderDashboardRow>[] = [
    {
      key: 'code',
      header: lt(locale, { fa: 'کد معرف', en: 'Code', ar: 'الرمز', zh: '代码', ru: 'Код' }),
      sortable: true,
      csvAccessor: (r) => r.code,
      render: (r) => (
        <span className="font-mono font-black text-brand-dark bg-mint/50 px-2.5 py-1 rounded-lg text-xs border border-brand/20">
          {r.code}
        </span>
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
                  className="min-w-9 min-h-9 grid place-items-center rounded-lg border border-line text-sub hover:text-ink"
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
      header: lt(locale, { fa: 'مسافران', en: 'Travelers', ar: 'المسافرون', zh: '旅客', ru: 'Пассажиры' }),
      render: (r) => (
        <button
          type="button"
          onClick={() => setSelectedLeader(r)}
          className="min-h-9 px-2 rounded-lg border border-line hover:bg-soft text-sub hover:text-ink transition flex items-center gap-1 text-xs font-bold"
          title="مشاهده لیست مسافران"
        >
          <Eye size={14} />
          <span>{r.travelers.length}</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-ink flex items-center gap-2">
            <Users className="text-brand-dark" size={26} />
            <span>
              {lt(locale, {
                fa: 'مدیریت کدهای معرف و پاداش سرگروه‌ها',
                en: 'Referral Codes & Group Leader Rewards',
                ar: 'إدارة رموز الإحالة ومكافآت القادة',
                zh: '推荐码与领队奖励管理',
                ru: 'Управление рефералами и вознаграждениями лидеров',
              })}
            </span>
          </h1>
          <p className="text-sub text-xs mt-1">
            {lt(locale, {
              fa: 'محاسبهٔ پویای پله‌های پاداش سرگروه‌ها براساس مسافران تأییدشده منهای کنسلی‌ها',
              en: 'Dynamic calculation of leader reward tiers based on confirmed passengers minus cancellations',
              ar: 'حساب ديناميكي لمستويات المكافآت بناءً على الركاب المؤكدين',
              zh: '根据已确认乘客扣除取消后动态计算领队奖励梯队',
              ru: 'Динамический расчёт вознаграждений на основе подтверждённых пассажиров',
            })}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-action hover:bg-action-hover text-ink text-sm font-black shadow-sm transition"
        >
          <Plus size={16} />
          <span>
            {lt(locale, {
              fa: 'تعریف کد معرف جدید',
              en: 'Create Referral Code',
              ar: 'إنشاء رمز إحالة جديد',
              zh: '创建新推荐码',
              ru: 'Создать промокод',
            })}
          </span>
        </button>
      </div>

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
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto" onClick={() => setShowCreateModal(false)}>
          <div role="dialog" aria-modal="true" aria-label="تعریف کد معرف سرگروه جدید" onClick={(e) => e.stopPropagation()} className="bg-surface rounded-3xl border border-line shadow-elev-3 w-full max-w-md overflow-hidden my-8">
            <div className="p-6 border-b border-line flex items-center justify-between">
              <h3 className="text-base font-black text-ink">تعریف کد معرف سرگروه جدید</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-soft hover:bg-line/60 grid place-items-center text-sub hover:text-ink transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCode} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">کد معرف (یکتا و انگلیسی)</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً DAMAVAND1403"
                  value={createCode}
                  onChange={(e) => setCreateCode(e.target.value.toUpperCase())}
                  className="w-full h-11 px-3 rounded-xl border border-line bg-paper/50 font-mono font-bold uppercase text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">شناسه کاربر سرگروه (User ID)</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً usr_12345"
                  value={createLeaderId}
                  onChange={(e) => setCreateLeaderId(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-line bg-paper/50 font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-line text-sub font-bold text-xs hover:bg-soft transition"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-xs shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  <span>ایجاد کد</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
