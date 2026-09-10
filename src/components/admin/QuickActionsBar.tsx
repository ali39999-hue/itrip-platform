'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Plus, Users, ShieldAlert, CreditCard, Ban, CheckCircle2, Megaphone, Zap, Loader2, AlertCircle } from 'lucide-react';
import { lt, LText } from '@/lib/lt';
import { ErpModal, ErpAlert, erpFieldCls, erpLabelCls, erpGhostBtnCls } from './erp-ui';
import { cn } from '@/lib/utils';
import { saveSiteContentAction } from '@/actions/content';

const ACTIONS: { id: string; label: LText; hint: LText; icon: typeof Plus; primary?: boolean; danger?: boolean; soon?: boolean }[] = [
  { id: 'new_booking', label: { fa: 'ثبت رزرو آفلاین', en: 'Offline Booking', ar: 'حجز دون اتصال', zh: '线下预订登记', ru: 'Офлайн-бронирование' }, hint: { fa: 'رزرو تلفنی / حضوری', en: 'Phone / walk-in', ar: 'هاتفي / حضوري', zh: '电话/到店', ru: 'По телефону' }, icon: Plus, primary: true },
  { id: 'manual_payment', label: { fa: 'ثبت پرداخت دستی', en: 'Manual Payment', ar: 'تسجيل دفعة يدوية', zh: '手动登记支付', ru: 'Ручной платёж' }, hint: { fa: 'کارت‌خوان / حواله', en: 'POS / transfer', ar: 'نقطة بيع / تحويل', zh: 'POS/转账', ru: 'POS / перевод' }, icon: CreditCard },
  { id: 'block_capacity', label: { fa: 'بلاک ظرفیت', en: 'Block Capacity', ar: 'حجز السعة', zh: '锁定库存', ru: 'Блокировка квоты' }, hint: { fa: 'توقف فروش', en: 'Stop-sell', ar: 'إيقاف البيع', zh: '停售', ru: 'Стоп-продажа' }, icon: Ban },
  { id: 'new_user', label: { fa: 'افزودن همکار', en: 'Add Staff User', ar: 'إضافة مستخدم موظف', zh: '添加员工账号', ru: 'Добавить сотрудника' }, hint: { fa: 'تعریف اپراتور جدید', en: 'New staff member', ar: 'موظف جديد', zh: '新员工', ru: 'Новый сотрудник' }, icon: Users },
  { id: 'system_alert', label: { fa: 'اعلان سراسری', en: 'Global Announcement', ar: 'إعلان عام', zh: '全站公告', ru: 'Общее оповещение' }, hint: { fa: 'بنر فوری صفحه اصلی', en: 'Urgent homepage banner', ar: 'شريط عاجل', zh: '紧急横幅', ru: 'Срочный баннер' }, icon: ShieldAlert, danger: true },
];

export function QuickActionsBar() {
  const locale = useLocale();
  const router = useRouter();
  const [alertModal, setAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

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
        router.push('/admin/users');
        break;
      case 'system_alert':
        setAlertModal(true);
        setSentSuccess(false);
        setPublishError(null);
        break;
    }
  };

  // Publishes the announcement for real: stored via the CMS SiteContent service
  // and rendered on the traveler homepage until an admin unpublishes it.
  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTitle.trim() || !alertMessage.trim() || publishing) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const res = await saveSiteContentAction('site.announcement', {
        title: { fa: alertTitle, en: alertTitle },
        message: { fa: alertMessage, en: alertMessage },
        tone: 'warn',
        active: true,
      });
      if (!res.success) {
        setPublishError(res.error || 'خطا در انتشار اعلان');
        return;
      }
      setSentSuccess(true);
      setTimeout(() => {
        setAlertModal(false);
        setAlertTitle('');
        setAlertMessage('');
        setSentSuccess(false);
      }, 1500);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'خطا در انتشار اعلان');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-line bg-surface p-3 shadow-elev-1">
        <div className="mb-2.5 flex items-center gap-2 px-1">
          <Zap size={14} className="text-price" aria-hidden="true" />
          <span className="text-[11px] font-black tracking-wide text-sub uppercase">
            {lt(locale, { fa: 'اقدامات سریع', en: 'Quick actions', ar: 'إجراءات سريعة', zh: '快捷操作', ru: 'Быстрые действия' })}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          {ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                onClick={() => handleClick(a.id)}
                disabled={a.soon}
                title={a.soon ? lt(locale, { fa: 'این قابلیت هنوز در دسترس نیست', en: 'Not available yet' }) : undefined}
                className={cn(
                  'group flex min-h-[68px] items-center gap-3 rounded-xl border p-3 text-start transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:scale-[0.98]',
                  a.soon && 'cursor-not-allowed opacity-60',
                  a.primary
                    ? 'border-deep bg-deep text-surface shadow-elev-1 hover:bg-brand-dark'
                    : a.danger
                      ? 'border-rose-warm/25 bg-rose-warm/5 text-ink hover:border-rose-warm/50 hover:bg-rose-warm/10'
                      : 'border-line bg-soft/50 text-ink hover:border-brand/40 hover:bg-mint/60',
                )}
              >
                <span
                  className={cn(
                    'grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-105',
                    a.primary ? 'bg-surface/15 text-surface' : a.danger ? 'bg-rose-warm/10 text-rose-warm' : 'bg-surface text-brand-dark shadow-xs',
                  )}
                >
                  <Icon size={17} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className={cn('block truncate text-xs font-black', a.primary ? 'text-surface' : 'text-ink')}>
                    {lt(locale, a.label)}
                  </span>
                  <span className={cn('mt-0.5 block truncate text-[10px] font-bold', a.primary ? 'text-surface/70' : 'text-sub')}>
                    {lt(locale, a.hint)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {alertModal && (
        <ErpModal
          title={lt(locale, { fa: 'اعلان سراسری', en: 'Global announcement', ar: 'إعلان عام', zh: '全站公告', ru: 'Общее оповещение' })}
          subtitle={lt(locale, { fa: 'روی بنر بالای صفحه اصلی مسافران نمایش داده می‌شود تا زمانی که غیرفعالش کنید', en: 'Shown on the traveler homepage banner until unpublished', ar: 'يظهر في الشريط العلوي', zh: '显示在顶部横幅', ru: 'Показывается в верхнем баннере' })}
          onClose={() => setAlertModal(false)}
          footer={
            sentSuccess ? undefined : (
              <>
                <button type="button" onClick={() => setAlertModal(false)} className={erpGhostBtnCls}>
                  {lt(locale, { fa: 'انصراف', en: 'Cancel', ar: 'إلغاء', zh: '取消', ru: 'Отмена' })}
                </button>
                <button type="submit" form="erp-broadcast-form" disabled={publishing} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-warm px-4 py-2.5 text-xs font-black text-white transition hover:brightness-95 disabled:opacity-60">
                  {publishing ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Megaphone size={14} aria-hidden="true" />}
                  {lt(locale, { fa: 'انتشار فوری', en: 'Publish now', ar: 'نشر فوري', zh: '立即发布', ru: 'Опубликовать' })}
                </button>
              </>
            )
          }
        >
          {sentSuccess ? (
            <div className="py-6 text-center">
              <CheckCircle2 size={38} className="mx-auto text-success" aria-hidden="true" />
              <h4 className="mt-3 text-sm font-black text-ink">
                {lt(locale, { fa: 'اعلان منتشر شد و روی صفحه اصلی نمایش داده می‌شود', en: 'Announcement published to the homepage banner', ar: 'تم نشر الإعلان', zh: '公告已发布', ru: 'Оповещение опубликовано' })}
              </h4>
            </div>
          ) : (
            <form id="erp-broadcast-form" onSubmit={handleBroadcast} className="space-y-3.5">
              {publishError && <ErpAlert tone="error">{publishError}</ErpAlert>}
              <div>
                <label className={erpLabelCls} htmlFor="erp-alert-title">
                  {lt(locale, { fa: 'عنوان اعلان', en: 'Title', ar: 'العنوان', zh: '标题', ru: 'Заголовок' })}
                </label>
                <input
                  id="erp-alert-title"
                  type="text"
                  required
                  value={alertTitle}
                  onChange={(e) => setAlertTitle(e.target.value)}
                  placeholder={lt(locale, { fa: 'مثال: تغییر ساعت پروازهای استانبول…', en: 'e.g. Istanbul flight schedule change…', ar: 'مثال: تغيير مواعيد الرحلات…', zh: '例如：伊斯坦布尔航班时刻变更…', ru: 'Напр.: изменение рейсов в Стамбул…' })}
                  className={erpFieldCls}
                />
              </div>
              <div>
                <label className={erpLabelCls} htmlFor="erp-alert-msg">
                  {lt(locale, { fa: 'متن پیام', en: 'Message', ar: 'نص الرسالة', zh: '正文', ru: 'Текст' })}
                </label>
                <textarea
                  id="erp-alert-msg"
                  required
                  rows={3}
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  placeholder={lt(locale, { fa: 'جزئیات اطلاع‌رسانی به مسافران و اپراتورها…', en: 'Details for travelers and operators…', ar: 'تفاصيل الإشعار…', zh: '通知详情…', ru: 'Детали уведомления…' })}
                  className={erpFieldCls}
                />
              </div>
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-sub">
                <AlertCircle size={12} aria-hidden="true" />
                {lt(locale, { fa: 'برای برداشتن اعلان، در بخش CMS ← محتوای صفحات سایت آن را بازگردانی کنید.', en: 'To remove it later, reset it under CMS → Site Content.', ar: 'للإزالة لاحقاً استخدم CMS.', zh: '稍后可在 CMS 中撤下。', ru: 'Убрать можно через CMS.' })}
              </p>
            </form>
          )}
        </ErpModal>
      )}
    </>
  );
}
