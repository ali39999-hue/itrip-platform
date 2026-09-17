'use client';

import React, { useState, useTransition } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Search,
  Clock,
  Activity,
  Terminal,
  X,
  Zap,
  CheckCheck,
  Eye,
  Server,
  Monitor,
  Database,
  Layers,
} from 'lucide-react';
import {
  getSystemLogsAction,
  resolveSystemLogAction,
  resolveAllSystemLogsAction,
  deleteSystemLogAction,
  clearResolvedLogsAction,
  purgeOldSystemLogsAction,
  triggerTestSystemErrorAction,
} from '@/actions/system-logs';
import type { ErrorSeverity, ErrorSource } from '@/domains/observability/ErrorTrackerService';

export interface SerializedErrorLog {
  id: string;
  fingerprint: string;
  level: string;
  source: string;
  message: string;
  stackTrace: string | null;
  endpoint: string | null;
  method: string | null;
  statusCode: number | null;
  occurrences: number;
  status: string;
  userId: string | null;
  userRole: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt: string | null;
}

export interface ErrorStatsDto {
  total24h: number;
  unresolvedCount: number;
  criticalCount: number;
  sourcesBreakdown: Record<string, number>;
  levelsBreakdown: Record<string, number>;
  systemHealthScore: number;
}

function formatLogDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('fa-IR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

interface Props {
  initialLogs: SerializedErrorLog[];
  initialTotal: number;
  initialStats: ErrorStatsDto;
  locale: string;
}

export function SystemLogsClientPage({
  initialLogs,
  initialTotal,
  initialStats,
  locale,
}: Props) {
  const [logs, setLogs] = useState<SerializedErrorLog[]>(initialLogs);
  const [total, setTotal] = useState<number>(initialTotal);
  const [stats, setStats] = useState<ErrorStatsDto>(initialStats);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'UNRESOLVED' | 'RESOLVED'>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  // Detail Modal / Drawer state
  const [selectedLog, setSelectedLog] = useState<SerializedErrorLog | null>(null);
  const [copied, setCopied] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showBanner = (text: string, type: 'success' | 'error' = 'success') => {
    setBannerMessage({ text, type });
    setTimeout(() => setBannerMessage(null), 4000);
  };

  const fetchLogs = (targetPage = page) => {
    startTransition(async () => {
      const res = await getSystemLogsAction({
        page: targetPage,
        pageSize: 25,
        status: selectedStatus,
        level: selectedLevel as ErrorSeverity | 'ALL',
        source: selectedSource as ErrorSource | 'ALL',
        query: searchQuery,
      });

      if (res.success) {
        setLogs(res.logs as SerializedErrorLog[]);
        setTotal(res.total);
        if (res.stats) setStats(res.stats);
      } else {
        showBanner(res.error || 'خطا در دریافت لاگ‌ها', 'error');
      }
    });
  };

  const handleResolveOne = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    startTransition(async () => {
      const res = await resolveSystemLogAction(id);
      if (res.success) {
        showBanner('خطای انتخابی به عنوان حل‌شده ثبت شد.');
        setLogs((prev) =>
          prev.map((l) => (l.id === id ? { ...l, status: 'RESOLVED', resolvedAt: new Date().toISOString() } : l)),
        );
        if (selectedLog?.id === id) {
          setSelectedLog((prev) => (prev ? { ...prev, status: 'RESOLVED' } : null));
        }
        setStats((prev) => ({
          ...prev,
          unresolvedCount: Math.max(0, prev.unresolvedCount - 1),
        }));
      } else {
        showBanner('خطا در حل لاگ', 'error');
      }
    });
  };

  const handleResolveAll = () => {
    if (!window.confirm('آیا از علامت‌گذاری تمام خطاهای باز به عنوان حل‌شده اطمینان دارید؟')) return;
    startTransition(async () => {
      const res = await resolveAllSystemLogsAction();
      if (res.success) {
        showBanner(`${res.count} خطا با موفقیت به عنوان حل‌شده علامت‌گذاری شدند.`);
        fetchLogs(1);
      }
    });
  };

  const handleDeleteLog = (id: string) => {
    if (!window.confirm('آیا از حذف قطعی این لاگ از پایگاه داده اطمینان دارید؟')) return;
    startTransition(async () => {
      const res = await deleteSystemLogAction(id);
      if (res.success) {
        showBanner('لاگ با موفقیت از پایگاه داده حذف شد.');
        setLogs((prev) => prev.filter((l) => l.id !== id));
        if (selectedLog?.id === id) {
          setSelectedLog(null);
        }
        setStats((prev) => ({
          ...prev,
          unresolvedCount: Math.max(0, prev.unresolvedCount - 1),
        }));
      } else {
        showBanner('خطا در حذف لاگ', 'error');
      }
    });
  };

  const handleClearResolved = () => {
    if (!window.confirm('آیا مایلید تمام لاگ‌های علامت‌گذاری‌شده به عنوان حل‌شده، بدون معطلی از پایگاه داده حذف شوند؟')) return;
    startTransition(async () => {
      const res = await clearResolvedLogsAction();
      if (res.success) {
        showBanner(`${res.count} لاگ حل‌شده فوراً از دیتابیس پاک شدند.`);
        fetchLogs(1);
      }
    });
  };

  const handlePurgeOld = () => {
    if (!window.confirm('آیا لاگ‌های حل‌شده و قدیمی‌تر از ۳۰ روز پاکسازی شوند؟')) return;
    startTransition(async () => {
      const res = await purgeOldSystemLogsAction(30);
      if (res.success) {
        showBanner(`${res.count} لاگ قدیمی از دیتابیس پاکسازی شدند.`);
        fetchLogs(1);
      }
    });
  };

  const handleSimulateError = () => {
    startTransition(async () => {
      const res = await triggerTestSystemErrorAction('ERROR');
      if (res.success) {
        showBanner('خطای آزمایشی شبیه‌سازی شد و لاگ آن فوراً ثبت گردید.');
        fetchLogs(1);
      } else {
        showBanner(res.error || 'خطا در ثبت خطای تستی', 'error');
      }
    });
  };

  const handleCopyStack = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isRtl = locale === 'fa' || locale === 'ar';

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <AlertOctagon size={13} />
            بحرانی (CRITICAL)
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle size={13} />
            خطا (ERROR)
          </span>
        );
      case 'WARN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
            <Info size={13} />
            هشدار (WARN)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <Info size={13} />
            اطلاعات (INFO)
          </span>
        );
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'DB_PRISMA':
        return <Database size={14} className="text-purple-500" />;
      case 'CLIENT_REACT':
        return <Monitor size={14} className="text-cyan-500" />;
      case 'SERVER_ACTION':
        return <Server size={14} className="text-emerald-500" />;
      case 'API_ROUTE':
        return <Layers size={14} className="text-blue-500" />;
      default:
        return <Terminal size={14} className="text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 pb-20" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Toast Banner */}
      {bannerMessage && (
        <div
          className={`fixed top-4 end-4 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-4 ${
            bannerMessage.type === 'success'
              ? 'bg-emerald-600/95 text-white border border-emerald-400/30'
              : 'bg-rose-600/95 text-white border border-rose-400/30'
          }`}
        >
          {bannerMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertOctagon size={18} />}
          <span>{bannerMessage.text}</span>
        </div>
      )}

      {/* Header & Quick Action Bar */}
      <div className="bg-surface border border-border/80 rounded-3xl p-6 shadow-sm backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
              <Terminal size={22} />
            </div>
            <h1 className="text-xl md:text-2xl font-black text-foreground">
              مرکز وقایع و خطاهای سیستم (System Error Hub)
            </h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
            مانیتورینگ بلادرنگ، ریشه‌یابی و رفع خطاهای سروری، دیتابیس Neon، اکشن‌ها و کرش‌های React
          </p>
        </div>

        {/* Global CTAs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSimulateError}
            disabled={isPending}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center gap-1.5 transition active:scale-[0.98] border border-purple-500/20 cursor-pointer"
          >
            <Zap size={15} />
            تست ثبت خطا
          </button>

          <button
            type="button"
            onClick={handleResolveAll}
            disabled={isPending || stats.unresolvedCount === 0}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition active:scale-[0.98] border border-emerald-500/20 cursor-pointer disabled:opacity-50"
          >
            <CheckCheck size={15} />
            حل همه ({stats.unresolvedCount})
          </button>

          <button
            type="button"
            onClick={handleClearResolved}
            disabled={isPending}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center gap-1.5 transition active:scale-[0.98] border border-rose-500/20 cursor-pointer"
            title="حذف فوری تمام لاگ‌های حل‌شده از دیتابیس"
          >
            <Trash2 size={15} />
            پاکسازی حل‌شده‌ها
          </button>

          <button
            type="button"
            onClick={handlePurgeOld}
            disabled={isPending}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-surface hover:bg-muted text-muted-foreground font-bold text-xs flex items-center gap-1.5 transition active:scale-[0.98] border border-border cursor-pointer"
            title="حذف لاگ‌های قدیمی‌تر از ۳۰ روز"
          >
            <Trash2 size={15} />
            پاکسازی ۳۰ روزه
          </button>

          <button
            type="button"
            onClick={() => fetchLogs()}
            disabled={isPending}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-brand text-brand-foreground font-bold text-xs flex items-center gap-1.5 transition active:scale-[0.98] cursor-pointer shadow-sm"
          >
            <RefreshCw size={15} className={isPending ? 'animate-spin' : ''} />
            بروزرسانی
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* System Health */}
        <div className="bg-surface border border-border/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-2">
            <span>شاخص سلامت پلتفرم</span>
            <Activity size={16} className={stats.systemHealthScore > 85 ? 'text-emerald-500' : 'text-amber-500'} />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl md:text-3xl font-black ${
                stats.systemHealthScore > 85
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : stats.systemHealthScore > 60
                  ? 'text-amber-500'
                  : 'text-rose-500'
              }`}
            >
              %{stats.systemHealthScore}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {stats.systemHealthScore === 100 ? 'عالی و پایدار' : 'نیازمند بررسی'}
            </span>
          </div>
          <div className="w-full bg-muted h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                stats.systemHealthScore > 85 ? 'bg-emerald-500' : stats.systemHealthScore > 60 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${stats.systemHealthScore}%` }}
            />
          </div>
        </div>

        {/* Unresolved Errors */}
        <div className="bg-surface border border-border/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-2">
            <span>خطاهای باز (حل‌نشده)</span>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-black text-amber-600 dark:text-amber-400">
              {stats.unresolvedCount.toLocaleString('fa-IR')}
            </span>
            <span className="text-[11px] text-muted-foreground">مورد باز</span>
          </div>
        </div>

        {/* Critical Incidents */}
        <div className="bg-surface border border-border/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-2">
            <span>رخدادهای بحرانی (Critical)</span>
            <AlertOctagon size={16} className="text-rose-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-black text-rose-600 dark:text-rose-400">
              {stats.criticalCount.toLocaleString('fa-IR')}
            </span>
            <span className="text-[11px] text-muted-foreground">اولویت آنی</span>
          </div>
        </div>

        {/* Total 24h Activity */}
        <div className="bg-surface border border-border/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-2">
            <span>ترافیک خطا در ۲۴ ساعت</span>
            <Clock size={16} className="text-sky-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-black text-foreground">
              {stats.total24h.toLocaleString('fa-IR')}
            </span>
            <span className="text-[11px] text-muted-foreground">تکرار</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-surface border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLogs(1)}
            placeholder="جستجو در پیام، مسیر، یا شناسه کاربر..."
            className="w-full h-11 ps-9 pe-4 rounded-xl bg-muted/50 border border-border text-xs md:text-sm focus:outline-none focus:border-brand focus:bg-surface transition"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex p-1 rounded-xl bg-muted/60 border border-border text-xs font-bold">
            {(['ALL', 'UNRESOLVED', 'RESOLVED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setSelectedStatus(st);
                  setTimeout(() => fetchLogs(1), 50);
                }}
                className={`px-3 py-1.5 rounded-lg transition ${
                  selectedStatus === st
                    ? 'bg-surface text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {st === 'ALL' ? 'همه' : st === 'UNRESOLVED' ? 'حل‌نشده' : 'حل‌شده'}
              </button>
            ))}
          </div>

          {/* Severity Select */}
          <select
            value={selectedLevel}
            onChange={(e) => {
              setSelectedLevel(e.target.value);
              setTimeout(() => fetchLogs(1), 50);
            }}
            className="h-11 px-3 rounded-xl bg-surface border border-border text-xs font-bold focus:outline-none focus:border-brand"
          >
            <option value="ALL">همه سطوح</option>
            <option value="CRITICAL">بحرانی (Critical)</option>
            <option value="ERROR">خطا (Error)</option>
            <option value="WARN">هشدار (Warn)</option>
            <option value="INFO">اطلاعات (Info)</option>
          </select>

          {/* Source Select */}
          <select
            value={selectedSource}
            onChange={(e) => {
              setSelectedSource(e.target.value);
              setTimeout(() => fetchLogs(1), 50);
            }}
            className="h-11 px-3 rounded-xl bg-surface border border-border text-xs font-bold focus:outline-none focus:border-brand"
          >
            <option value="ALL">همه منابع</option>
            <option value="SERVER_ACTION">Server Actions</option>
            <option value="DB_PRISMA">Prisma / دیتابیس</option>
            <option value="CLIENT_REACT">کلاینت / React</option>
            <option value="API_ROUTE">API Routes</option>
            <option value="MIDDLEWARE">Middleware</option>
          </select>
        </div>
      </div>

      {/* Logs Table / Cards */}
      <div className="bg-surface border border-border/80 rounded-3xl shadow-sm overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">هیچ خطای فعالی یافت نشد!</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              سامانه کاملاً پایدار است و تمامی سرویس‌ها بدون نقص گزارش‌شده در حال اجرا هستند.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {logs.map((log) => {
              const isResolved = log.status === 'RESOLVED';
              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`p-4 md:p-5 transition hover:bg-muted/30 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isResolved ? 'opacity-60 bg-muted/10' : ''
                  }`}
                >
                  {/* Left info */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="pt-0.5">{getLevelBadge(log.level)}</div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/70">
                          {getSourceIcon(log.source)}
                          {log.source}
                        </span>

                        {log.occurrences > 1 && (
                          <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                            {log.occurrences} بار تکرار
                          </span>
                        )}

                        {log.endpoint && (
                          <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[200px]" dir="ltr">
                            {log.endpoint}
                          </span>
                        )}

                        <span className="text-[11px] text-muted-foreground ms-auto">
                          {formatLogDate(log.lastSeenAt)}
                        </span>
                      </div>

                      <p className="text-xs md:text-sm font-bold text-foreground line-clamp-2 break-words leading-relaxed font-mono">
                        {log.message}
                      </p>
                    </div>
                  </div>

                  {/* Right actions */}
                  <div className="flex items-center gap-2 ms-auto md:ms-0">
                    {!isResolved && (
                      <button
                        type="button"
                        onClick={(e) => handleResolveOne(log.id, e)}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs transition flex items-center gap-1 border border-emerald-500/20 cursor-pointer"
                        title="علامت‌گذاری به عنوان حل‌شده"
                      >
                        <Check size={14} />
                        حل شد
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedLog(log)}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs transition flex items-center gap-1 border border-border cursor-pointer"
                    >
                      <Eye size={14} />
                      جزئیات
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLog(log.id);
                      }}
                      className="min-h-[38px] min-w-[38px] grid place-items-center rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs transition border border-rose-500/20 cursor-pointer"
                      title="حذف قطعی این لاگ از دیتابیس"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {total > 25 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
          <span>مجموع: {total.toLocaleString('fa-IR')} خطا</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                fetchLogs(page - 1);
              }}
              className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-muted disabled:opacity-40 cursor-pointer"
            >
              صفحه قبل
            </button>
            <span className="px-3 py-1.5 font-bold">صفحه {page}</span>
            <button
              type="button"
              disabled={page * 25 >= total}
              onClick={() => {
                setPage((p) => p + 1);
                fetchLogs(page + 1);
              }}
              className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-muted disabled:opacity-40 cursor-pointer"
            >
              صفحه بعد
            </button>
          </div>
        </div>
      )}

      {/* Detail Slide-Over Drawer / Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div
            className="bg-surface border border-border rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getLevelBadge(selectedLog.level)}
                <span className="text-xs font-bold text-muted-foreground">شناسه خطا:</span>
                <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono select-all">
                  {selectedLog.fingerprint.slice(0, 10)}
                </code>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-9 h-9 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs md:text-sm">
              {/* Message */}
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1.5 block">پیام خطا (Error Message):</label>
                <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 text-rose-700 dark:text-rose-300 font-mono text-xs leading-relaxed break-words">
                  {selectedLog.message}
                </div>
              </div>

              {/* Meta pills */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-muted/40 border border-border/80">
                  <span className="text-[11px] text-muted-foreground block mb-1">منبع رخداد</span>
                  <span className="font-bold flex items-center gap-1.5">
                    {getSourceIcon(selectedLog.source)}
                    {selectedLog.source}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-muted/40 border border-border/80">
                  <span className="text-[11px] text-muted-foreground block mb-1">تعداد تکرار</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {selectedLog.occurrences} بار
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-muted/40 border border-border/80">
                  <span className="text-[11px] text-muted-foreground block mb-1">اولین رخداد</span>
                  <span className="font-bold">{formatLogDate(selectedLog.firstSeenAt)}</span>
                </div>

                <div className="p-3 rounded-xl bg-muted/40 border border-border/80">
                  <span className="text-[11px] text-muted-foreground block mb-1">آخرین رخداد</span>
                  <span className="font-bold">{formatLogDate(selectedLog.lastSeenAt)}</span>
                </div>
              </div>

              {/* Context & Endpoint */}
              <div className="p-3.5 rounded-xl bg-muted/30 border border-border/70 space-y-2 text-xs">
                {selectedLog.endpoint && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">مسیر (Endpoint / Action):</span>
                    <span className="font-mono font-bold text-foreground truncate">{selectedLog.endpoint}</span>
                  </div>
                )}
                {selectedLog.userId && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">کاربر مرتبط:</span>
                    <span className="font-mono text-foreground">{selectedLog.userId}</span>
                  </div>
                )}
                {selectedLog.ipAddress && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">آدرس IP:</span>
                    <span className="font-mono text-foreground">{selectedLog.ipAddress}</span>
                  </div>
                )}
                {selectedLog.statusCode && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">کد وضعیت HTTP:</span>
                    <span className="font-mono font-bold text-rose-500">{selectedLog.statusCode}</span>
                  </div>
                )}
              </div>

              {/* Stack Trace */}
              {selectedLog.stackTrace && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-muted-foreground">استک‌ترس کد (Stack Trace):</label>
                    <button
                      type="button"
                      onClick={() => handleCopyStack(selectedLog.stackTrace || '')}
                      className="text-xs text-brand hover:underline flex items-center gap-1 font-bold cursor-pointer"
                    >
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                      {copied ? 'کپی شد!' : 'کپی استک'}
                    </button>
                  </div>
                  <pre
                    className="p-3.5 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-56 select-all"
                    dir="ltr"
                  >
                    {selectedLog.stackTrace}
                  </pre>
                </div>
              )}

              {/* Metadata */}
              {selectedLog.metadata && (
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                    متادیتای درخواست (PII-Redacted Parameters):
                  </label>
                  <pre
                    className="p-3.5 rounded-xl bg-muted/40 border border-border font-mono text-[11px] leading-relaxed overflow-x-auto max-h-40"
                    dir="ltr"
                  >
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs transition cursor-pointer"
                >
                  بستن
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteLog(selectedLog.id)}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs transition flex items-center gap-1.5 border border-rose-500/20 cursor-pointer"
                  title="حذف قطعی این لاگ از دیتابیس"
                >
                  <Trash2 size={14} />
                  حذف لاگ
                </button>
              </div>

              {selectedLog.status !== 'RESOLVED' ? (
                <button
                  type="button"
                  onClick={() => handleResolveOne(selectedLog.id)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  علامت‌گذاری به عنوان حل‌شده
                </button>
              ) : (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={16} />
                  حل‌شده در {selectedLog.resolvedAt ? formatLogDate(selectedLog.resolvedAt) : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
