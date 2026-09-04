import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/domains/identity/permission-service';
import { AdminShell } from '@/components/admin/AdminShell';
import { getLocale } from 'next-intl/server';
import { lt } from '@/lib/lt';
import {
  AlertTriangle, CheckCircle2, AlertOctagon
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ExceptionCenterPage() {
  const user = await requirePermission(['booking:view:all', 'ops:override:cancel']);
  const locale = await getLocale();

  const exceptions = await prisma.operationalException.findMany({
    orderBy: [
      { severity: 'desc' },
      { detectedAt: 'desc' },
    ],
    take: 50,
  });

  const openCount = exceptions.filter((e) => e.status === 'OPEN').length;
  const criticalCount = exceptions.filter((e) => e.severity === 'CRITICAL' || e.severity === 'HIGH').length;

  return (
    <AdminShell userName={user.email || 'Admin'} role={user.role}>
      <div className="space-y-6">
        {/* Exception Center Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-2xl border border-line shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                <AlertTriangle size={20} />
              </span>
              <h1 className="text-xl font-black text-ink">
                {lt(locale, { fa: 'مرکز استثنائات عملیاتی (Exception Center)', en: 'Operational Exception Center', ar: 'مركز الاستثناءات التشغيلية', zh: '运营异常处理中心', ru: 'Центр операционных исключений' })}
              </h1>
            </div>
            <p className="text-xs text-sub font-medium mt-1">
              {lt(locale, {
                fa: 'پایش و حل اختلافات مالی، عدم تطابق قیمت، خطای درگاه، تایم‌اوت تأمین‌کننده و هشدارهای SLA (RECON-003)',
                en: 'Active resolution queue for price discrepancies, payment mismatches, supplier timeouts and SLA alerts',
                ar: 'طابور الحل النشط لتناقضات الأسعار وعدم تطابق الدفع وتوقف الموردين',
                zh: '实时排查价格差异、支付不一致、供应商超时及SLA警报',
                ru: 'Очередь обработки расхождений цен, платежей, тайм-аутов поставщиков и SLA'
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 text-xs font-black border border-amber-200">
              {openCount} {lt(locale, { fa: 'مورد باز', en: 'Open Items', ar: 'حالة مفتوحة', zh: '待处理项', ru: 'открытых' })}
            </span>
            {criticalCount > 0 && (
              <span className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-black border border-rose-200 flex items-center gap-1">
                <AlertOctagon size={13} />
                {criticalCount} {lt(locale, { fa: 'اولویت بالا', en: 'High/Critical', ar: 'عالي/حرج', zh: '高危/严重', ru: 'критично' })}
              </span>
            )}
          </div>
        </div>

        {/* Exceptions Table / List */}
        {exceptions.length === 0 ? (
          <div className="bg-surface p-12 rounded-2xl border border-line text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 grid place-items-center mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-base font-black text-ink">
              {lt(locale, { fa: 'هیچ مغایرت یا استثنای فعالی ثبت نشده است', en: 'No Active Operational Exceptions', ar: 'لا توجد استثناءات تشغيلية نشطة', zh: '无活跃的运营异常', ru: 'Нет активных операционных исключений' })}
            </h3>
            <p className="text-xs text-sub max-w-md mx-auto">
              {lt(locale, {
                fa: 'تمام تراکنش‌های رزرو، اعتبارسنجی مبالغ درگاه و کدهای تأمین‌کننده به طور متوازن و بدون خطای مغایرت در حال انجام هستند.',
                en: 'All booking transactions, gateway webhooks and supplier reconciliation lines are currently balanced.',
                ar: 'جميع معاملات الحجز وتسوية البوابات ومطابقة الموردين متوازنة تماماً حالياً.',
                zh: '所有预订交易、支付回调验证及供应商对账目前均完全平衡。',
                ru: 'Все транзакции бронирования, проверки вебхуков и сверки с поставщиками сбалансированы.'
              })}
            </p>
          </div>
        ) : (
          <div className="bg-surface rounded-2xl border border-line overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="border-b border-line bg-soft/50 text-sub font-black">
                    <th className="p-3.5 text-start">{lt(locale, { fa: 'نوع خطا', en: 'Type', ar: 'النوع', zh: '类型', ru: 'Тип' })}</th>
                    <th className="p-3.5 text-start">{lt(locale, { fa: 'اولویت', en: 'Severity', ar: 'الأهمية', zh: '严重级别', ru: 'Приоритет' })}</th>
                    <th className="p-3.5 text-start">{lt(locale, { fa: 'موجودیت هدف', en: 'Entity', ar: 'الكيان', zh: '目标实体', ru: 'Объект' })}</th>
                    <th className="p-3.5 text-start">{lt(locale, { fa: 'عنوان و شرح', en: 'Title & Description', ar: 'العنوان والتفاصيل', zh: '标题与描述', ru: 'Описание' })}</th>
                    <th className="p-3.5 text-start">{lt(locale, { fa: 'زمان رخداد', en: 'Detected', ar: 'الوقت', zh: '检测时间', ru: 'Время' })}</th>
                    <th className="p-3.5 text-start">{lt(locale, { fa: 'وضعیت', en: 'Status', ar: 'الحالة', zh: '状态', ru: 'Статус' })}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {exceptions.map((exc) => (
                    <tr key={exc.id} className="hover:bg-soft/30 transition">
                      <td className="p-3.5 font-bold text-ink whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-soft text-[11px] font-black">{exc.type}</span>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          exc.severity === 'CRITICAL' || exc.severity === 'HIGH'
                            ? 'bg-rose-100 text-rose-800'
                            : exc.severity === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {exc.severity}
                        </span>
                      </td>
                      <td className="p-3.5 text-sub font-mono whitespace-nowrap">
                        {exc.entityType}: {exc.entityId}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-ink">{exc.title}</div>
                        {exc.description && <p className="text-sub text-[11px] mt-0.5">{exc.description}</p>}
                      </td>
                      <td className="p-3.5 text-sub whitespace-nowrap">
                        {new Date(exc.detectedAt).toLocaleTimeString(locale)}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded font-black text-[11px] bg-surface border border-line text-ink">
                          {exc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
