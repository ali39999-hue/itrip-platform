import { requirePermission } from '@/domains/identity/permission-service';
import { ExceptionCenterService } from '@/domains/erp/ExceptionCenterService';
import { getLocale } from 'next-intl/server';
import { lt } from '@/lib/lt';
import { AlertTriangle, AlertOctagon } from 'lucide-react';
import { ExceptionCenterClient } from './ExceptionCenterClient';

export const dynamic = 'force-dynamic';

export default async function ExceptionCenterPage() {
  await requirePermission(['booking:view:all', 'ops:override:cancel']);
  const locale = await getLocale();

  const [exceptions, stats] = await Promise.all([
    ExceptionCenterService.getExceptions(),
    ExceptionCenterService.getExceptionStats(),
  ]);

  return (
    <div className="space-y-6">
      {/* Exception Center Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-2xl border border-line shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <AlertTriangle size={20} />
            </span>
            <h1 className="text-xl font-black text-ink">
              {lt(locale, {
                fa: 'مرکز استثنائات عملیاتی (Exception Center)',
                en: 'Operational Exception Center',
                ar: 'مركز الاستثناءات التشغيلية',
                zh: '运营异常处理中心',
                ru: 'Центр операционных исключений',
              })}
            </h1>
          </div>
          <p className="text-xs text-sub font-medium mt-1">
            {lt(locale, {
              fa: 'پایش و حل اختلافات مالی، عدم تطابق قیمت، خطای درگاه، تایم‌اوت تأمین‌کننده و هشدارهای SLA (ERP-104)',
              en: 'Active resolution queues for price discrepancies, payment mismatches, supplier timeouts and SLA alerts',
              ar: 'طابور الحل النشط لتناقضات الأسعار وعدم تطابق الدفع وتوقف الموردين',
              zh: '实时排查价格差异、支付不一致、供应商超时及SLA警报',
              ru: 'Очередь обработки расхождений цен, платежей, тайм-аутов поставщиков и SLA',
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 text-xs font-black border border-amber-200">
            {stats.open} {lt(locale, { fa: 'مورد باز', en: 'Open Items', ar: 'حالة مفتوحة', zh: '待处理项', ru: 'открытых' })}
          </span>
          {stats.critical > 0 && (
            <span className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-black border border-rose-200 flex items-center gap-1">
              <AlertOctagon size={13} />
              {stats.critical} {lt(locale, { fa: 'اولویت بالا', en: 'High/Critical', ar: 'عالي/حرج', zh: '高危/严重', ru: 'критично' })}
            </span>
          )}
        </div>
      </div>

      {/* Interactive Queue Manager and ERP DataGrid */}
      <ExceptionCenterClient exceptions={exceptions} stats={stats} locale={locale} />
    </div>
  );
}
