'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import { CreateAutoBuyModal } from '@/components/autobuy/CreateAutoBuyModal';
import { getUserAutoBuyRulesAction, cancelAutoBuyRuleAction, testExecuteAutoBuyRuleAction } from '@/actions/autobuy';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';
import {
  Bot,
  Plus,
  Play,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Compass,
  Plane,
  Building2,
  Wallet,
  Users,
  ExternalLink,
  Sparkles,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export interface AutoBuyRuleItem {
  id: string;
  userId: string;
  title: string;
  serviceType: string;
  targetId?: string | null;
  origin?: string | null;
  destination?: string | null;
  targetDate: string;
  maxPrice: number | { toString(): string };
  currency: string;
  passengerCount: number;
  passengerDetails?: string;
  executionMode?: string;
  status: string;
  scheduledAt?: string | Date | null;
  lastCheckedAt?: string | Date | null;
  bookingId?: string | null;
  failureReason?: string | null;
  expiresAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
  booking?: { id: string; reference: string } | null;
}

export default function AutoBuyAccountPage() {
  const locale = useLocale();

  const [rules, setRules] = useState<AutoBuyRuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  async function loadRules() {
    setLoading(true);
    try {
      const res = await getUserAutoBuyRulesAction();
      if (res.success) {
        setRules((res.rules || []) as unknown as AutoBuyRuleItem[]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRules();
  }, []);

  async function handleCancel(ruleId: string) {
    setActionLoadingId(ruleId);
    setFeedback(null);
    try {
      const res = await cancelAutoBuyRuleAction(ruleId);
      if (res.success) {
        setFeedback({ msg: 'سفارش خرید خودکار با موفقیت لغو شد.', type: 'success' });
        await loadRules();
      } else {
        setFeedback({ msg: res.error || 'خطا در لغو سفارش', type: 'error' });
      }
    } catch (e: unknown) {
      setFeedback({ msg: e instanceof Error ? e.message : 'خطا در لغو سفارش', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleTestRun(ruleId: string) {
    setActionLoadingId(ruleId);
    setFeedback(null);
    try {
      const res = await testExecuteAutoBuyRuleAction(ruleId);
      if (res.success) {
        const r = res.result;
        if (r?.executed && r?.success) {
          setFeedback({ msg: `خرید با موفقیت انجام شد! کد پیگیری: ${r.reference}`, type: 'success' });
        } else if (r?.matched && !r?.success) {
          setFeedback({ msg: `شرایط محقق شد اما خرید انجام نشد: ${r.reason}`, type: 'error' });
        } else {
          setFeedback({ msg: `پایش انجام شد: ${r?.reason || 'شرایط هنوز محقق نشده است'}`, type: 'success' });
        }
        await loadRules();
      } else {
        setFeedback({ msg: res.error || 'خطا در پایش', type: 'error' });
      }
    } catch (e: unknown) {
      setFeedback({ msg: e instanceof Error ? e.message : 'خطا در پایش', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  }

  const activeCount = rules.filter((r) => r.status === 'ACTIVE').length;
  const fulfilledCount = rules.filter((r) => r.status === 'FULFILLED').length;
  const failedCount = rules.filter((r) => r.status === 'FAILED_FUNDS').length;

  return (
    <div className="bg-paper min-h-screen py-8">
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 flex flex-col lg:flex-row gap-8 items-start">
        {/* Account Navigation Sidebar */}
        <AccountSidebar activeSection="autobuy" />

        {/* Main Content */}
        <main className="flex-1 w-full min-w-0 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-surface border border-line shadow-xs">
            <div>
              <div className="flex items-center gap-2 text-brand-dark font-black text-xs sm:text-sm mb-1">
                <Bot size={18} />
                <span>{lt(locale, { fa: 'دستیار هوشمند خرید خودکار', en: 'Smart Auto-Buy Assistant', ar: 'مساعد الشراء التلقائي الذكي', zh: '智能自动订票助理', ru: 'Умный бот автопокупки' })}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-ink">
                {lt(locale, { fa: 'ربات‌های خرید خودکار (رزرو در تاریخ و شرایط مشخص)', en: 'My Auto-Buy Rules & Monitoring Bots', ar: 'طلبات الشراء التلقائي', zh: '我的自动订票规则与任务', ru: 'Мои правила автопокупки' })}
              </h1>
              <p className="text-xs sm:text-sm font-medium text-sub mt-1">
                {lt(locale, { fa: 'مقصد، تاریخ و بودجه خود را تعیین کنید؛ سیستم فیروزه به محض تحقق شروط، خرید را از کیف‌پول انجام می‌دهد.', en: 'Set your route, date and budget; Firuzo automatically secures the booking using your wallet as soon as conditions match.', ar: 'حدد التاريخ والوجهة والميزانية وسيقوم النظام بالشراء تلقائياً.', zh: '设定目的地、日期及预算，达到条件即刻自动从钱包扣款完成订票。', ru: 'Задайте маршрут, дату и бюджет — бот купит билет при выполнении условий.' })}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="h-11 px-5 rounded-2xl bg-action hover:bg-action-hover text-ink font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-action/25 transition active:scale-95 shrink-0 cursor-pointer"
            >
              <Plus size={16} />
              <span>{lt(locale, { fa: 'ثبت خرید خودکار جدید', en: 'New Auto-Buy Rule', ar: 'طلب شراء جديد', zh: '新建自动订票', ru: 'Новое правило' })}</span>
            </button>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div
              className={`p-4 rounded-2xl border text-xs font-black flex items-center gap-2.5 animate-in fade-in ${
                feedback.type === 'success'
                  ? 'bg-mint/60 border-brand/40 text-brand-dark'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{feedback.msg}</span>
            </div>
          )}

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-surface border border-line flex items-center gap-3.5 shadow-xs">
              <div className="w-10 h-10 rounded-2xl bg-brand/10 text-brand-dark grid place-items-center shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <span className="text-[11.5px] font-bold text-sub block">سفارش‌های فعال در حال پایش</span>
                <span className="text-xl font-black text-ink font-mono">{num(activeCount, locale)} ربات</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface border border-line flex items-center gap-3.5 shadow-xs">
              <div className="w-10 h-10 rounded-2xl bg-mint text-brand-dark grid place-items-center shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <span className="text-[11.5px] font-bold text-sub block">خریدهای موفق نهایی‌شده</span>
                <span className="text-xl font-black text-price font-mono">{num(fulfilledCount, locale)} خرید</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface border border-line flex items-center gap-3.5 shadow-xs">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 grid place-items-center shrink-0">
                <Wallet size={20} />
              </div>
              <div>
                <span className="text-[11.5px] font-bold text-sub block">نیازمند شارژ کیف‌پول</span>
                <span className="text-xl font-black text-amber-700 font-mono">{num(failedCount, locale)} مورد</span>
              </div>
            </div>
          </div>

          {/* Rules List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-ink flex items-center gap-2">
                <Sparkles size={16} className="text-brand" />
                <span>{lt(locale, { fa: 'لیست سفارش‌های خرید خودکار شما', en: 'Your Auto-Buy Requests', ar: 'قائمة طلباتك', zh: '您的自动订票列表', ru: 'Список правил' })}</span>
              </h2>

              <button
                type="button"
                onClick={loadRules}
                className="text-xs font-bold text-sub hover:text-ink flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                <span>به‌روزرسانی</span>
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center text-sub flex flex-col items-center gap-3 bg-surface rounded-3xl border border-line">
                <Loader2 size={32} className="animate-spin text-brand" />
                <span className="text-xs font-bold">در حال بارگذاری اطلاعات ربات‌ها...</span>
              </div>
            ) : rules.length === 0 ? (
              <div className="p-12 text-center text-sub flex flex-col items-center gap-4 bg-surface rounded-3xl border border-line shadow-xs">
                <div className="w-16 h-16 rounded-3xl bg-soft text-brand-dark grid place-items-center">
                  <Bot size={32} />
                </div>
                <div>
                  <h3 className="text-base font-black text-ink mb-1">
                    {lt(locale, { fa: 'هنوز هیچ ربات خرید خودکاری ثبت نکرده‌اید', en: 'No Auto-Buy rules registered yet', ar: 'لم تقم بإنشاء طلبات شراء بعد', zh: '暂无自动订票规则', ru: 'Правила автопокупки пока не созданы' })}
                  </h3>
                  <p className="text-xs font-medium text-sub max-w-md mx-auto">
                    {lt(locale, { fa: 'می‌توانید برای پروازهای لحظه آخری، تورهای پرطرفدار یا هتل‌ها ربات تنظیم کنید تا به محض افت قیمت یا باز شدن ظرفیت، خرید را قطعی کند.', en: 'Set up automated rules for flights, popular tours, or hotels to book instantly when prices drop or seats open.', ar: 'يمكنك إعداد روبوت لشراء التذاكر فور انخفاض السعر أو توفر المقاعد.', zh: '您可以为热门旅游、特价机票设置监控，一旦降价或出位即刻自动成交。', ru: 'Настройте автопокупку для туров и перелётов.' })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="h-11 px-6 rounded-2xl bg-brand text-surface font-black text-xs flex items-center gap-2 hover:bg-brand-dark transition cursor-pointer"
                >
                  <Plus size={15} />
                  <span>ثبت اولین ربات خرید خودکار</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {rules.map((rule) => {
                  const isTour = rule.serviceType === 'TOURS';
                  const isFlight = rule.serviceType === 'FLIGHTS';
                  const Icon = isTour ? Compass : isFlight ? Plane : Building2;

                  const statusConfig: Record<string, { label: string; badge: string }> = {
                    ACTIVE: { label: 'در حال پایش خودکار', badge: 'bg-mint text-brand-dark' },
                    TRIGGERED: { label: 'در حال انجام خرید...', badge: 'bg-amber-100 text-amber-800' },
                    FULFILLED: { label: 'خریداری و رزرو شد ✓', badge: 'bg-brand text-surface font-black' },
                    FAILED_FUNDS: { label: 'کسری موجودی کیف‌پول', badge: 'bg-rose-100 text-rose-700' },
                    CANCELLED: { label: 'لغو شده', badge: 'bg-soft text-sub' },
                    EXPIRED: { label: 'منقضی‌شده', badge: 'bg-soft text-sub' },
                  };

                  const currentStatus = statusConfig[rule.status] || { label: rule.status, badge: 'bg-soft text-ink' };

                  return (
                    <article
                      key={rule.id}
                      className="p-5 rounded-3xl bg-surface border border-line shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:border-brand/40"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-soft text-brand-dark grid place-items-center shrink-0 border border-line">
                          <Icon size={22} />
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${currentStatus.badge}`}>
                              {currentStatus.label}
                            </span>
                            <span className="text-[11px] font-bold text-sub font-mono">
                              تاریخ سفر: {rule.targetDate}
                            </span>
                          </div>

                          <h3 className="text-sm sm:text-base font-black text-ink leading-snug">
                            {rule.title}
                          </h3>

                          <div className="flex items-center gap-3 text-xs font-bold text-sub flex-wrap pt-0.5">
                            <span className="flex items-center gap-1 text-ink">
                              <Wallet size={13} className="text-brand" />
                              <span>سقف بودجه:</span>
                              <b className="font-mono text-price">{num(Number(rule.maxPrice), locale)} تومان</b>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Users size={13} className="text-brand" />
                              <span>{num(rule.passengerCount, locale)} مسافر</span>
                            </span>
                          </div>

                          {rule.failureReason && (
                            <p className="text-[11.5px] font-bold text-rose-600 bg-rose-50/70 p-2 rounded-xl border border-rose-200">
                              علت توقف: {rule.failureReason}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line/60 w-full sm:w-auto justify-end">
                        {rule.status === 'FULFILLED' && rule.booking && (
                          <Link
                            href="/my-trips"
                            className="h-10 px-4 rounded-xl bg-mint text-brand-dark hover:bg-mint/80 font-black text-xs flex items-center gap-1.5 transition"
                          >
                            <span>مشاهده بلیط</span>
                            <ExternalLink size={13} />
                          </Link>
                        )}

                        {rule.status === 'ACTIVE' && (
                          <>
                            <button
                              type="button"
                              disabled={actionLoadingId === rule.id}
                              onClick={() => handleTestRun(rule.id)}
                              className="h-10 px-3.5 rounded-xl border border-line bg-soft hover:bg-line/40 text-ink font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                              title="تست پایش و اجرای زنده همین الان"
                            >
                              {actionLoadingId === rule.id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Play size={13} className="text-mint-bright fill-mint-bright" />
                              )}
                              <span>بررسی آنی</span>
                            </button>

                            <button
                              type="button"
                              disabled={actionLoadingId === rule.id}
                              onClick={() => handleCancel(rule.id)}
                              className="h-10 px-3.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                              title="لغو این سفارش خودکار"
                            >
                              <XCircle size={14} />
                              <span>لغو</span>
                            </button>
                          </>
                        )}

                        {rule.status === 'FAILED_FUNDS' && (
                          <Link
                            href="/wallet"
                            className="h-10 px-4 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-xs flex items-center gap-1.5 shadow-sm transition"
                          >
                            <Wallet size={14} />
                            <span>شارژ کیف‌پول</span>
                          </Link>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal for creating new auto-buy rule */}
      <CreateAutoBuyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadRules}
      />
    </div>
  );
}
