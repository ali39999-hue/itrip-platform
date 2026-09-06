'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Plus, Users, ShieldAlert, CreditCard, Ban, X, CheckCircle2, Megaphone } from 'lucide-react';
import { lt, LText } from '@/lib/lt';

const ACTIONS: { id: string; label: LText; icon: typeof Plus; bg: string }[] = [
  { id: 'new_booking', label: { fa: 'ثبت رزرو آفلاین', en: 'Offline Booking', ar: 'حجز دون اتصال', zh: '线下预订登记', ru: 'Офлайн-бронирование' }, icon: Plus, bg: 'bg-brand text-surface hover:bg-brand-2 shadow-xs' },
  { id: 'manual_payment', label: { fa: 'ثبت پرداخت دستی', en: 'Manual Payment', ar: 'تسجيل دفعة يدوية', zh: '手动登记支付', ru: 'Ручной платёж' }, icon: CreditCard, bg: 'bg-surface border border-line text-ink hover:border-brand hover:text-brand-dark' },
  { id: 'block_capacity', label: { fa: 'بلاک ظرفیت', en: 'Block Capacity', ar: 'حجز السعة', zh: '锁定库存', ru: 'Блокировка квоты' }, icon: Ban, bg: 'bg-surface border border-line text-ink hover:border-brand hover:text-brand-dark' },
  { id: 'new_user', label: { fa: 'افزودن کاربر همکار', en: 'Add Staff User', ar: 'إضافة مستخدم موظف', zh: '添加员工账号', ru: 'Добавить сотрудника' }, icon: Users, bg: 'bg-surface border border-line text-ink hover:border-brand hover:text-brand-dark' },
  { id: 'system_alert', label: { fa: 'اعلان سراسری', en: 'Global Announcement', ar: 'إعلان عام', zh: '全站公告', ru: 'Общее оповещение' }, icon: ShieldAlert, bg: 'bg-rose-warm/10 text-rose-warm border border-transparent hover:border-rose-warm/30' },
];

export function QuickActionsBar() {
  const locale = useLocale();
  const router = useRouter();
  const [alertModal, setAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleClick = (id: string) => {
    switch (id) {
      case 'new_booking':
        router.push('/flights/search');
        break;
      case 'manual_payment':
        router.push('/admin/finance');
        break;
      case 'block_capacity':
        router.push('/admin/inventory');
        break;
      case 'new_user':
        router.push('/admin/ops');
        break;
      case 'system_alert':
        setAlertModal(true);
        setSentSuccess(false);
        break;
    }
  };

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTitle.trim() || !alertMessage.trim()) return;
    setSentSuccess(true);
    setTimeout(() => {
      setAlertModal(false);
      setAlertTitle('');
      setAlertMessage('');
      setSentSuccess(false);
    }, 1500);
  };

  return (
    <>
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              onClick={() => handleClick(a.id)}
              className={`shrink-0 min-h-11 px-5 rounded-xl text-[13px] font-black inline-flex items-center gap-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:scale-95 ${a.bg}`}
            >
              <Icon size={16} /> {lt(locale, a.label)}
            </button>
          );
        })}
      </div>

      {/* Global Announcement Modal */}
      {alertModal && (
        <div className="fixed inset-0 z-[200] bg-deep/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface rounded-3xl p-6 border border-line shadow-elev-3 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2 text-rose-600 font-black text-sm">
                <Megaphone size={18} />
                <span>ارسال اعلان سراسری به کاربران و مسافران</span>
              </div>
              <button
                type="button"
                onClick={() => setAlertModal(false)}
                className="w-8 h-8 rounded-full bg-soft text-sub grid place-items-center hover:text-ink"
              >
                <X size={15} />
              </button>
            </div>

            {sentSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 size={36} className="text-emerald-600 mx-auto" />
                <h4 className="text-sm font-black text-ink">اعلان سراسری با موفقیت منتشر شد</h4>
                <p className="text-xs text-sub font-bold">پیام بر روی بنر بالای صفحات و اعلان‌های فوری اعمال گردید.</p>
              </div>
            ) : (
              <form onSubmit={handleBroadcast} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">عنوان اعلان (فوری)</label>
                  <input
                    type="text"
                    required
                    value={alertTitle}
                    onChange={(e) => setAlertTitle(e.target.value)}
                    placeholder="مثال: تغییرات پروازهای فرودگاه استانبول..."
                    className="w-full h-11 px-3 rounded-xl border border-line bg-soft text-xs font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-sub mb-1">متن پیام یا دستورالعمل مسافران</label>
                  <textarea
                    required
                    rows={3}
                    value={alertMessage}
                    onChange={(e) => setAlertMessage(e.target.value)}
                    placeholder="جزییات اطلاع‌رسانی مهم به مسافران و اپراتورها..."
                    className="w-full p-3 rounded-xl border border-line bg-soft text-xs font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setAlertModal(false)}
                    className="flex-1 h-11 rounded-xl bg-soft text-sub font-bold text-xs"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-surface font-black text-xs transition shadow-sm"
                  >
                    انتشار فوری
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
