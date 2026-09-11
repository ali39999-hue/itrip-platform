'use client';

import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
} from 'lucide-react';
import { lt } from '@/lib/lt';
import {
  ExpenseSplitterService,
  TripMember,
  TripExpenseItem,
} from '@/domains/trips/ExpenseSplitterService';

interface TripExpenseSplitterProps {
  initialMembers?: TripMember[];
  locale: string;
  className?: string;
}

export function TripExpenseSplitter({
  initialMembers = [
    { id: 'm1', name: 'علی (شما)' },
    { id: 'm2', name: 'سارا' },
    { id: 'm3', name: 'رضا' },
  ],
  locale,
  className = '',
}: TripExpenseSplitterProps) {
  const [members] = useState<TripMember[]>(initialMembers);
  const [expenses, setExpenses] = useState<TripExpenseItem[]>([
    {
      id: 'e1',
      title: 'شام در رستوران سنتی',
      amount: 6000000,
      currency: 'IRR',
      payerId: 'm1',
      participantIds: ['m1', 'm2', 'm3'],
      category: 'FOOD',
    },
    {
      id: 'e2',
      title: 'تاکسی فرودگاه به هتل',
      amount: 1500000,
      currency: 'IRR',
      payerId: 'm2',
      participantIds: ['m1', 'm2', 'm3'],
      category: 'TRANSPORT',
    },
  ]);

  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [payerId, setPayerId] = useState(members[0]?.id || 'm1');
  const [showAddForm, setShowAddForm] = useState(false);

  const summary = ExpenseSplitterService.calculateSplit(members, expenses);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(newAmount.replace(/,/g, ''));
    if (!newTitle.trim() || isNaN(amt) || amt <= 0) return;

    const newItem: TripExpenseItem = {
      id: `exp_${Date.now()}`,
      title: newTitle.trim(),
      amount: amt,
      currency: 'IRR',
      payerId,
      participantIds: members.map((m) => m.id),
      category: 'OTHER',
    };

    setExpenses((prev) => [newItem, ...prev]);
    setNewTitle('');
    setNewAmount('');
    setShowAddForm(false);
  };

  return (
    <div
      className={`rounded-3xl border border-line bg-surface p-6 shadow-xs space-y-6 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand/10 text-brand-dark grid place-items-center shrink-0">
            <Receipt size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-ink m-0">
              {lt(locale, {
                fa: 'حساب‌داری دنگی و تسویه هزینه همسفران',
                en: 'Group Expense Sharing & Settlement',
                ar: 'تقسيم مصاريف السفر والتسوية',
                zh: '同伴旅行账目分摊与清算',
                ru: 'Разделение расходов в поездке',
              })}
            </h3>
            <span className="text-xs text-sub font-bold">
              ثبت مخارج گروهی و محاسبه کمترین تعداد تراکنش برای تسویه
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="h-9 px-3.5 rounded-xl bg-brand hover:bg-brand-2 text-surface font-black text-xs transition flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
        >
          <Plus size={14} />
          <span>{showAddForm ? 'بستن فرم' : 'ثبت هزینه جدید'}</span>
        </button>
      </div>

      {/* Add Expense Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddExpense}
          className="p-4 rounded-2xl bg-soft border border-line space-y-3 animate-in fade-in"
        >
          <h4 className="text-xs font-black text-ink m-0">افزودن فاکتور / هزینه مشترک</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold">
            <div>
              <label className="text-sub block mb-1">شرح هزینه:</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="مثال: بلیط موزه، کرایه ماشین..."
                className="w-full h-9 px-3 rounded-xl bg-surface border border-line text-ink"
              />
            </div>

            <div>
              <label className="text-sub block mb-1">مبلغ (تومان):</label>
              <input
                type="text"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="مثال: 500000"
                className="w-full h-9 px-3 rounded-xl bg-surface border border-line text-ink font-mono"
              />
            </div>

            <div>
              <label className="text-sub block mb-1">پرداخت‌کننده:</label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-surface border border-line text-ink"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="submit"
              className="h-8 px-4 rounded-xl bg-brand text-surface font-black text-xs"
            >
              افزودن هزینه
            </button>
          </div>
        </form>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-soft/50 border border-line">
          <span className="text-[10px] text-sub font-bold block">مجموع مخارج ثبت‌شده</span>
          <span className="text-lg font-black font-mono text-ink">
            {summary.totalSpent.toLocaleString('fa-IR')} تومان
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-soft/50 border border-line">
          <span className="text-[10px] text-sub font-bold block">تعداد اعضای گروه</span>
          <span className="text-lg font-black font-mono text-brand-dark">
            {members.length} مسافر
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-soft/50 border border-line">
          <span className="text-[10px] text-sub font-bold block">میانگین سهم هر نفر</span>
          <span className="text-lg font-black font-mono text-ink">
            {Math.round(summary.totalSpent / members.length).toLocaleString('fa-IR')} تومان
          </span>
        </div>
      </div>

      {/* Minimal Settlements List (Who owes whom) */}
      <div>
        <h4 className="text-xs font-black text-ink mb-3 flex items-center gap-1.5">
          <TrendingUp size={14} className="text-emerald-600" />
          <span>پیشنهاد تسویه حساب نهایی بین همسفران:</span>
        </h4>

        {summary.settlements.length > 0 ? (
          <div className="space-y-2">
            {summary.settlements.map((st, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 flex items-center justify-between text-xs font-bold"
              >
                <div className="flex items-center gap-2">
                  <span className="font-black text-ink">{st.fromName}</span>
                  <span className="text-sub flex items-center gap-1">
                    باید پرداخت کند به
                    <ArrowLeft size={13} className="rtl:inline ltr:hidden text-emerald-700" />
                    <ArrowRight size={13} className="ltr:inline rtl:hidden text-emerald-700" />
                  </span>
                  <span className="font-black text-ink">{st.toName}</span>
                </div>

                <span className="font-mono text-sm font-black text-brand-dark dark:text-emerald-300">
                  {st.amount.toLocaleString('fa-IR')} تومان
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-soft text-center text-xs font-bold text-sub">
            تمام حساب‌های همسفران در وضعیت تراز و تسویه کامل قرار دارند.
          </div>
        )}
      </div>
    </div>
  );
}
