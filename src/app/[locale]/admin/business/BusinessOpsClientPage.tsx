'use client';

import { useState, useTransition } from 'react';
import { grantBusinessRequest, reviewBusinessRequest } from '@/actions/business-ops';

export interface BusinessRequestRow {
  id: string;
  code: string;
  status: string;
  paxCount: number;
  totalAmount: number;
  depositAmount: number;
  grantAmount: number;
  paidAmount: number;
  companyName: string;
  repName: string;
  packageTitle: string;
  destination: string;
  departDate: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'پیش‌نویس',
  submitted: 'ارسال‌شده',
  deposit_paid: 'پیش‌پرداخت پرداخت شد',
  under_review: 'در بررسی',
  changes_requested: 'نیازمند اصلاح',
  approved: 'تاییدشده',
  issued: 'ووچر صادر شد',
  cancelled: 'لغو شده',
};

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  submitted: 'bg-sky-100 text-sky-700',
  deposit_paid: 'bg-emerald-100 text-emerald-700',
  under_review: 'bg-amber-100 text-amber-700',
  changes_requested: 'bg-orange-100 text-orange-700',
  approved: 'bg-blue-100 text-blue-700',
  issued: 'bg-emerald-600 text-white',
  cancelled: 'bg-red-100 text-red-700',
};

const RIAL = (n: number) => `${(n / 10).toLocaleString('fa-IR')} تومان`;

export function BusinessOpsClientPage({ rows }: { rows: BusinessRequestRow[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [grantInput, setGrantInput] = useState('');
  const [pending, startTransition] = useTransition();

  const selected = rows.find((r) => r.id === selectedId) || null;

  const runReview = (decision: 'approve' | 'request_changes') => {
    if (!selected) return;
    setMessage(null);
    startTransition(async () => {
      const res = await reviewBusinessRequest({
        requestId: selected.id,
        decision,
        note: decision === 'approve' ? undefined : 'لطفاً مدارک را اصلاح و مجدد بارگذاری کنید',
      });
      setMessage(res.success ? 'ثبت شد' : res.error || 'خطا');
    });
  };

  const runGrant = () => {
    if (!selected) return;
    const amount = Number(grantInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage('مبلغ یارانه نامعتبر است');
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const res = await grantBusinessRequest({ requestId: selected.id, grantAmountRial: amount });
      setMessage(res.success ? 'یارانه ثبت شد' : res.error || 'خطا');
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/80 bg-surface p-4">
        <h1 className="text-lg font-bold text-text-title">درخواست‌های تور تخصصی (فیروزو بیزنس)</h1>
        <p className="mt-1 text-sm text-text-muted">
          صف بررسی درخواست‌های شرکتی — تایید مدارک و اعمال کمک‌هزینه
        </p>
      </div>

      {message && (
        <div role="status" className="rounded-xl border border-border/80 bg-surface-sub p-3 text-sm text-text-body">
          {message}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border/80 bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-sub text-start text-xs text-text-muted">
            <tr>
              <th className="p-3 text-start">کد</th>
              <th className="p-3 text-start">شرکت</th>
              <th className="p-3 text-start">برنامه</th>
              <th className="p-3 text-start">مسافر</th>
              <th className="p-3 text-start">مبلغ کل</th>
              <th className="p-3 text-start">وضعیت</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-text-muted">
                  درخواستی ثبت نشده است
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className={`border-t border-border/60 ${selectedId === r.id ? 'bg-surface-sub' : ''}`}>
                <td className="p-3 font-mono text-xs">{r.code}</td>
                <td className="p-3">{r.companyName}</td>
                <td className="p-3">{r.packageTitle}</td>
                <td className="p-3">{r.paxCount}</td>
                <td className="p-3 whitespace-nowrap">{RIAL(r.totalAmount)}</td>
                <td className="p-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status] || 'bg-slate-100 text-slate-700'}`}>
                    {STATUS_LABELS[r.status] || r.status}
                  </span>
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => { setSelectedId(r.id); setMessage(null); }}
                    className="min-h-[44px] rounded-xl border border-border px-3 text-xs font-medium text-text-body transition active:scale-[0.98]"
                  >
                    جزئیات و اقدام
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="rounded-2xl border border-border/80 bg-surface p-4">
          <h2 className="font-bold text-text-title">
            درخواست {selected.code} — {selected.companyName} ({selected.repName})
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div><dt className="text-text-muted">مقصد</dt><dd>{selected.destination}</dd></div>
            <div><dt className="text-text-muted">حرکت</dt><dd>{new Date(selected.departDate).toLocaleDateString('fa-IR')}</dd></div>
            <div><dt className="text-text-muted">پیش‌پرداخت (۳۰٪)</dt><dd>{RIAL(selected.depositAmount)}</dd></div>
            <div><dt className="text-text-muted">پرداخت‌شده</dt><dd>{RIAL(selected.paidAmount)}</dd></div>
            <div><dt className="text-text-muted">یارانه فعلی</dt><dd>{RIAL(selected.grantAmount)}</dd></div>
            <div><dt className="text-text-muted">وضعیت</dt><dd>{STATUS_LABELS[selected.status] || selected.status}</dd></div>
          </dl>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() => runReview('approve')}
              className="min-h-[44px] rounded-xl bg-emerald-600 px-4 font-medium text-white transition active:scale-[0.98] disabled:opacity-50"
            >
              تایید مدارک
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => runReview('request_changes')}
              className="min-h-[44px] rounded-xl border border-border px-4 font-medium text-text-body transition active:scale-[0.98] disabled:opacity-50"
            >
              درخواست اصلاح مدارک
            </button>
            <div className="flex items-center gap-2">
              <input
                value={grantInput}
                onChange={(e) => setGrantInput(e.target.value)}
                inputMode="numeric"
                placeholder="یارانه (ریال)"
                aria-label="مبلغ کمک‌هزینه به ریال"
                className="min-h-[44px] w-40 rounded-xl border border-border bg-surface px-3 text-sm"
              />
              <button
                type="button"
                disabled={pending}
                onClick={runGrant}
                className="min-h-[44px] rounded-xl border border-border px-4 font-medium text-text-body transition active:scale-[0.98] disabled:opacity-50"
              >
                اعمال یارانه
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
