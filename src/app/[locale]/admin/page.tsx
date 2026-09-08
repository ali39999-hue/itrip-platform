import { getAdminDashboardData } from '@/actions/admin';
import { QuickActionsBar } from '@/components/admin/QuickActionsBar';
import { ActionWidgets } from '@/components/admin/ActionWidgets';
import { LiveActivityFeed } from '@/components/admin/LiveActivityFeed';
import {
  ErpBadge,
  ErpPageHeader,
  ErpStatCard,
} from '@/components/admin/erp-ui';
import { BriefcaseBusiness, Wallet as WalletIcon, ArrowDownRight, Percent, LayoutDashboard, TicketX, Undo2, TicketCheck, Siren, Unplug, Sparkles, Rocket, ArrowUpLeft, PartyPopper } from 'lucide-react';
import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { lt } from '@/lib/lt';
import { safeAuth } from '@/auth';
import { hasErpRole } from '@/domains/identity/permission-service';
import { redirect } from 'next/navigation';
import { cn } from '@/lib/utils';

export default async function AdminDashboard() {
  const locale = await getLocale();
  const session = await safeAuth();

  // Relational RBAC gate (IAM-001): the legacy role string never grants access.
  const authorized = session ? await hasErpRole(session.user.id) : false;
  if (!session || !authorized) {
    redirect('/' + locale + '/auth');
  }

  // Live Database Queries via Action Layer (BASE-006)
  const {
    confirmedBookingsCount,
    allBookings,
    ledgerEntries,
    pendingOutboxCount,
    openExceptionsCount,
    pendingRefundsCount,
    paymentExceptionsCount,
    supplierExceptionsCount,
    pendingExceptions,
    recentHistory,
    recentAudit,
  } = await getAdminDashboardData();

  // Server-side mapping: OperationalException -> Action Required widget items
  const pendingTasks = pendingExceptions.map((exc) => ({
    id: exc.id,
    exceptionType: exc.type,
    title: exc.title,
    subtitle: `${exc.entityType}: ${exc.entityId}`,
    severity: exc.severity,
    detectedAt: exc.detectedAt.toISOString(),
  }));

  // Server-side mapping: booking lifecycle transitions + audit trail -> Live Feed
  type LiveEventDTO = import('@/components/admin/LiveActivityFeed').LiveEventDTO;
  const historyEvents: LiveEventDTO[] = recentHistory.map((h) => ({
    id: `bh_${h.id}`,
    kind: 'booking' as const,
    title: h.reason || `${h.fromStatus} → ${h.toStatus} (${h.booking.reference})`,
    actor: h.actor,
    at: h.createdAt.toISOString(),
  }));
  const auditEvents: LiveEventDTO[] = recentAudit.map((a) => ({
    id: `au_${a.id}`,
    kind: (a.resource === 'PAYMENT' || a.resource === 'WALLET' ? 'payment' : a.resource === 'BOOKING' ? 'booking' : 'alert') as LiveEventDTO['kind'],
    title: `${a.action} — ${a.resource} ${a.resourceId}`,
    actor: a.userId ?? 'SYSTEM',
    at: a.createdAt.toISOString(),
  }));
  const liveEvents = [...historyEvents, ...auditEvents]
    .sort((x, y) => y.at.localeCompare(x.at))
    .slice(0, 8);

  const totalRevenue = allBookings
    .filter((b) => b.status === 'CONFIRMED')
    .reduce((acc, curr) => acc + Number(curr.totalAmount), 0);

  const totalRefunds = ledgerEntries
    .filter((e) => e.referenceType === 'REFUND' && e.direction === 'CREDIT')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const numFmt = locale === 'fa' ? 'fa-IR' : 'en-US';
  const today = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const needsAttention = openExceptionsCount + pendingOutboxCount + paymentExceptionsCount;

  // Friendly time-aware greeting in the operator's working timezone.
  const firstName = (session.user.name || '').trim().split(/\s+/)[0] || '';
  const tehranHour = Number(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Tehran' }).format(new Date()),
  );
  const greeting =
    tehranHour >= 5 && tehranHour < 12
      ? lt(locale, { fa: 'صبح بخیر', en: 'Good morning', ar: 'صباح الخير', zh: '早上好', ru: 'Доброе утро' })
      : tehranHour >= 12 && tehranHour < 17
        ? lt(locale, { fa: 'ظهر بخیر', en: 'Good afternoon', ar: 'طاب يومك', zh: '中午好', ru: 'Добрый день' })
        : tehranHour >= 17 && tehranHour < 20
          ? lt(locale, { fa: 'عصر بخیر', en: 'Good evening', ar: 'مساء الخير', zh: '傍晚好', ru: 'Добрый вечер' })
          : lt(locale, { fa: 'شب بخیر', en: 'Good evening', ar: 'مساء الخير', zh: '晚上好', ru: 'Добрый вечер' });

  // Single "next best action": the one thing that matters most right now.
  const nextAction =
    paymentExceptionsCount > 0
      ? {
          icon: <TicketX size={19} aria-hidden="true" />,
          tile: 'bg-rose-warm/10 text-rose-warm',
          title: lt(locale, { fa: `${paymentExceptionsCount.toLocaleString(numFmt)} خطای پرداخت در انتظار است`, en: `${paymentExceptionsCount} payment errors waiting`, ar: `${paymentExceptionsCount} أخطاء دفع بانتظارك`, zh: `有 ${paymentExceptionsCount} 个支付错误待处理`, ru: `${paymentExceptionsCount} ошибок оплаты ждут` }),
          hint: lt(locale, { fa: 'پول مشتری وسط راه مانده — اول این‌ها را ببندید.', en: 'Customer money is stuck mid-way — close these first.', ar: 'أموال العملاء عالقة — أغلقها أولاً.', zh: '客户资金卡在半路 — 请优先处理。', ru: 'Деньги клиентов зависли — закройте их первыми.' }),
          href: '/admin/exceptions' as const,
          cta: lt(locale, { fa: 'بررسی مغایرت‌ها', en: 'Review mismatches', ar: 'مراجعة الفروقات', zh: '查看差异', ru: 'Разобрать расхождения' }),
        }
      : pendingOutboxCount > 0
        ? {
            icon: <TicketCheck size={19} aria-hidden="true" />,
            tile: 'bg-gold-soft text-price',
            title: lt(locale, { fa: `${pendingOutboxCount.toLocaleString(numFmt)} رویداد معلق در صف است`, en: `${pendingOutboxCount} events stuck in queue`, ar: `${pendingOutboxCount} أحداث عالقة`, zh: `队列中有 ${pendingOutboxCount} 个事件`, ru: `${pendingOutboxCount} событий в очереди` }),
            hint: lt(locale, { fa: 'بلیط یا پیامکی که نرفته، مسافر را معطل می‌کند.', en: 'An unsent ticket or SMS keeps the traveler waiting.', ar: 'التذكرة غير المرسلة تُبقي المسافر منتظرًا.', zh: '未发出的票或短信会让旅客等待。', ru: 'Неотправленный билет заставляет ждать.' }),
            href: '/admin/ops' as const,
            cta: lt(locale, { fa: 'رفتن به صف عملیات', en: 'Open ops queue', ar: 'فتح قائمة العمليات', zh: '打开运营队列', ru: 'Открыть очередь' }),
          }
        : pendingRefundsCount > 0
          ? {
              icon: <Undo2 size={19} aria-hidden="true" />,
              tile: 'bg-gold-soft text-price',
              title: lt(locale, { fa: `${pendingRefundsCount.toLocaleString(numFmt)} استرداد در انتظار است`, en: `${pendingRefundsCount} refunds waiting`, ar: `${pendingOutboxCount} استردادات معلقة`, zh: `有 ${pendingRefundsCount} 笔退款待处理`, ru: `${pendingRefundsCount} возвратов ждут` }),
              hint: lt(locale, { fa: 'هر روز تأخیر، یک تماس ناراضی بیشتر است.', en: 'Each delayed day is one more unhappy call.', ar: 'كل يوم تأخير يعني مكالمة غاضبة أخرى.', zh: '每拖一天，就多一通投诉电话。', ru: 'Каждый день задержки — лишний недовольный звонок.' }),
              href: '/admin/travel-files' as const,
              cta: lt(locale, { fa: 'مشاهده پرونده‌ها', en: 'View travel files', ar: 'عرض الملفات', zh: '查看档案', ru: 'Открыть досье' }),
            }
          : openExceptionsCount > 0
            ? {
                icon: <Siren size={19} aria-hidden="true" />,
                tile: 'bg-tour/10 text-tour',
                title: lt(locale, { fa: `${openExceptionsCount.toLocaleString(numFmt)} مغایرت باز دارید`, en: `${openExceptionsCount} open exceptions`, ar: `لديك ${openExceptionsCount} استثناءات مفتوحة`, zh: `有 ${openExceptionsCount} 项未结异常`, ru: `Открытых исключений: ${openExceptionsCount}` }),
                hint: lt(locale, { fa: 'از قدیمی‌ترین شروع کنید؛ معمولاً ریشه بقیه هم همان است.', en: 'Start with the oldest — it usually explains the rest.', ar: 'ابدأ بالأقدم — فهو يفسر البقية عادة.', zh: '从最早的开始 — 它通常能解释其余问题。', ru: 'Начните с самого старого — обычно оно объясняет остальные.' }),
                href: '/admin/exceptions' as const,
                cta: lt(locale, { fa: 'رفتن به مرکز خطا', en: 'Open exception center', ar: 'فتح مركز الاستثناءات', zh: '打开异常中心', ru: 'Открыть центр исключений' }),
              }
            : null;

  const isFreshWorkspace = allBookings.length === 0;
  const onboardingSteps = [
    { n: 1, title: lt(locale, { fa: 'تأمین‌کننده اضافه کنید', en: 'Add a supplier', ar: 'أضف موردًا', zh: '添加供应商', ru: 'Добавьте поставщика' }), hint: lt(locale, { fa: 'هتل یا ایرلاین طرف قرارداد', en: 'Your contracted hotel or airline', ar: 'الفندق أو شركة الطيران المتعاقدة', zh: '签约酒店或航司', ru: 'Ваш отель или авиакомпания' }), href: '/admin/suppliers' as const },
    { n: 2, title: lt(locale, { fa: 'سهمیه تعریف کنید', en: 'Define allotment', ar: 'حدد الحصص', zh: '定义配额', ru: 'Задайте квоты' }), hint: lt(locale, { fa: 'ظرفیت روزانه اتاق یا صندلی', en: 'Daily room or seat capacity', ar: 'السعة اليومية للغرف أو المقاعد', zh: '每日房间或座位容量', ru: 'Суточная ёмкость номеров/мест' }), href: '/admin/inventory' as const },
    { n: 3, title: lt(locale, { fa: 'تور منتشر کنید', en: 'Publish a tour', ar: 'انشر جولة', zh: '发布旅游线路', ru: 'Опубликуйте тур' }), hint: lt(locale, { fa: 'اولین پکیج قابل فروش در سایت', en: 'First bookable package on the site', ar: 'أول باقة قابلة للحجز', zh: '网站上第一个可售套餐', ru: 'Первый пакет для продажи' }), href: '/admin/content' as const },
  ];

  const attention = [
    { label: lt(locale, { fa: 'خطای پرداخت', en: 'Payment errors', ar: 'أخطاء الدفع', zh: '支付错误', ru: 'Ошибки оплаты' }), count: paymentExceptionsCount, href: '/admin/exceptions', tone: 'rose' as const, icon: <TicketX size={17} aria-hidden="true" /> },
    { label: lt(locale, { fa: 'در انتظار استرداد', en: 'Pending refunds', ar: 'استرداد معلق', zh: '待退款', ru: 'Возвраты' }), count: pendingRefundsCount, href: '/admin/travel-files', tone: 'gold' as const, icon: <Undo2 size={17} aria-hidden="true" /> },
    { label: lt(locale, { fa: 'صدور بلیط دستی', en: 'Manual ticketing', ar: 'إصدار يدوي', zh: '手动出票', ru: 'Ручная выдача' }), count: pendingOutboxCount, href: '/admin/ops', tone: 'gold' as const, icon: <TicketCheck size={17} aria-hidden="true" /> },
    { label: lt(locale, { fa: 'مغایرت باز', en: 'Open exceptions', ar: 'استثناءات مفتوحة', zh: '未结异常', ru: 'Открытые исключения' }), count: openExceptionsCount, href: '/admin/exceptions', tone: 'violet' as const, icon: <Siren size={17} aria-hidden="true" /> },
    { label: lt(locale, { fa: 'خطای تامین‌کننده', en: 'Supplier errors', ar: 'أخطاء المورد', zh: '供应商错误', ru: 'Ошибки поставщика' }), count: supplierExceptionsCount, href: '/admin/exceptions', tone: 'sky' as const, icon: <Unplug size={17} aria-hidden="true" /> },
  ];

  const kpis = [
    {
      title: lt(locale, { fa: 'رزروهای قطعی', en: 'Confirmed bookings', ar: 'الحجوزات المؤكدة', zh: '已确认预订', ru: 'Подтверждённые брони' }),
      value: confirmedBookingsCount.toLocaleString(numFmt),
      icon: <BriefcaseBusiness size={17} aria-hidden="true" />,
      tone: 'brand' as const,
      hint: lt(locale, { fa: 'مشاهده لیست', en: 'View list', ar: 'عرض القائمة', zh: '查看列表', ru: 'Список' }),
      href: '/admin/bookings',
    },
    {
      title: lt(locale, { fa: 'درآمد کل (تومان)', en: 'Total revenue (Toman)', ar: 'إجمالي الإيرادات', zh: '总收入（图曼）', ru: 'Общий доход' }),
      value: totalRevenue.toLocaleString(numFmt),
      icon: <WalletIcon size={17} aria-hidden="true" />,
      tone: 'green' as const,
      hint: lt(locale, { fa: 'دفتر کل', en: 'Ledger', ar: 'دفتر الأستاذ', zh: '总账', ru: 'Книга' }),
      href: '/admin/finance',
    },
    {
      title: lt(locale, { fa: 'استردادهای ثبت‌شده', en: 'Processed refunds', ar: 'الاستردادات المسجلة', zh: '已处理退款', ru: 'Возвраты' }),
      value: totalRefunds.toLocaleString(numFmt),
      icon: <ArrowDownRight size={17} aria-hidden="true" />,
      tone: 'rose' as const,
      hint: lt(locale, { fa: 'ثبت DB', en: 'DB log', ar: 'سجل', zh: '数据库记录', ru: 'База данных' }),
      href: '/admin/bookings',
    },
    {
      title: lt(locale, { fa: 'رویدادهای معلق', en: 'Pending outbox', ar: 'أحداث معلقة', zh: '待处理事件', ru: 'События Outbox' }),
      value: pendingOutboxCount.toLocaleString(numFmt),
      icon: <Percent size={17} aria-hidden="true" />,
      tone: 'gold' as const,
      hint: lt(locale, { fa: 'صف کارها', en: 'Queue', ar: 'طابور', zh: '队列', ru: 'Очередь' }),
      href: '/admin/ops',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      <ErpPageHeader
        eyebrow={lt(locale, { fa: 'ERP · نمای زنده عملیات', en: 'ERP · Live operations', ar: 'ERP · العمليات المباشرة', zh: 'ERP · 实时运营', ru: 'ERP · Операции' })}
        title={lt(locale, { fa: 'مرکز عملیات (Action Center)', en: 'Action Center', ar: 'مركز العمليات', zh: '运营中心', ru: 'Центр операций' })}
        description={
          <span>
            {greeting}{firstName ? `، ${firstName}` : ''}!{' '}
            {lt(locale, { fa: 'امروز قرار است چه چیزی را جلو ببریم؟', en: 'What shall we move forward today?', ar: 'ماذا سننجز اليوم؟', zh: '今天我们要推进什么？', ru: 'Что продвинем сегодня?' })}
          </span>
        }
        icon={<LayoutDashboard size={20} aria-hidden="true" />}
        meta={
          <>
            <ErpBadge tone="neutral">{today}</ErpBadge>
            <ErpBadge tone={needsAttention > 0 ? 'rose' : 'green'} dot>
              {needsAttention > 0
                ? lt(locale, { fa: `${needsAttention.toLocaleString(numFmt)} مورد نیازمند توجه`, en: `${needsAttention} items need attention`, ar: `${needsAttention} عناصر تحتاج اهتمام`, zh: `${needsAttention} 项需处理`, ru: `${needsAttention} требуют внимания` })
                : lt(locale, { fa: 'همه‌چیز آرام است', en: 'All clear', ar: 'كل شيء هادئ', zh: '一切正常', ru: 'Всё спокойно' })}
            </ErpBadge>
          </>
        }
      />

      {/* Next best action — one friendly nudge instead of a wall of numbers */}
      {nextAction ? (
        <div className="relative overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-l from-gold-soft via-surface to-surface p-4 shadow-elev-1 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface shadow-xs', nextAction.tile)}>
              {nextAction.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[11px] font-black tracking-wide text-price uppercase">
                <Sparkles size={12} aria-hidden="true" />
                {lt(locale, { fa: 'پیشنهاد بعدی شما', en: 'Your next best action', ar: 'خطوتك التالية المقترحة', zh: '您的下一步建议', ru: 'Ваше следующее действие' })}
              </p>
              <p className="mt-1 text-sm font-black text-ink">{nextAction.title}</p>
              <p className="mt-0.5 text-xs font-medium text-sub">{nextAction.hint}</p>
            </div>
            <Link
              href={nextAction.href}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-deep px-5 py-2.5 text-xs font-black text-surface shadow-elev-1 transition hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:scale-[0.98]"
            >
              <span>{nextAction.cta}</span>
              <ArrowUpLeft size={14} aria-hidden="true" className="rtl:rotate-90" />
            </Link>
          </div>
        </div>
      ) : !isFreshWorkspace ? (
        <div className="flex items-center gap-3 rounded-2xl border border-success/25 bg-success/8 p-4">
          <PartyPopper size={19} className="shrink-0 text-success" aria-hidden="true" />
          <p className="text-xs font-bold text-ink">
            {lt(locale, { fa: 'صف‌ها خالی‌اند و همه‌چیز سر جایش است. وقت خوبی برای انتشار تور جدید یا مرور دفتر کل است.', en: 'Queues are clear and everything is in place. A good time to publish a new tour or review the ledger.', ar: 'القوائم فارغة وكل شيء في مكانه.', zh: '队列已清空，一切就绪。可以发布新线路或查看总账。', ru: 'Очереди пусты, всё на месте. Хорошее время для нового тура.' })}
          </p>
        </div>
      ) : null}

      {/* First-run onboarding — three steps to the first sale */}
      {isFreshWorkspace && (
        <div className="rounded-2xl border border-brand/25 bg-gradient-to-l from-mint via-surface to-surface p-4 shadow-elev-1 sm:p-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-deep text-mint-bright">
              <Rocket size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-black text-ink">
                {lt(locale, { fa: 'تازه شروع کرده‌اید؟ سه قدم تا اولین فروش', en: 'Just getting started? Three steps to your first sale', ar: 'هل بدأت للتو؟ ثلاث خطوات لأول عملية بيع', zh: '刚起步？三步实现首单', ru: 'Только начинаете? Три шага до первой продажи' })}
              </h2>
              <p className="mt-0.5 text-xs font-medium text-sub">
                {lt(locale, { fa: 'به ترتیب جلو بروید؛ هر قدم کمتر از دو دقیقه طول می‌کشد.', en: 'Go in order — each step takes under two minutes.', ar: 'اتبع الترتيب — كل خطوة تستغرق أقل من دقيقتين.', zh: '按顺序进行 — 每步不到两分钟。', ru: 'Идите по порядку — каждый шаг займёт меньше двух минут.' })}
              </p>
            </div>
          </div>
          <ol className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {onboardingSteps.map((s) => (
              <li key={s.n}>
                <Link
                  href={s.href}
                  className="group flex h-full items-center gap-3 rounded-xl border border-line bg-surface p-3 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-elev-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-deep text-sm font-black text-surface tabular-nums">
                    {s.n.toLocaleString(numFmt)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-black text-ink group-hover:text-brand-dark">{s.title}</span>
                    <span className="block truncate text-[11px] font-medium text-sub">{s.hint}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}

      <QuickActionsBar />

      <div aria-label={lt(locale, { fa: 'هشدارهای عملیاتی', en: 'Operational alerts', ar: 'تنبيهات تشغيلية', zh: '运营提醒', ru: 'Операционные оповещения' })} className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
        {attention.map((a) => (
          <ErpStatCard key={a.label} icon={a.icon} label={a.label} value={a.count.toLocaleString(numFmt)} tone={a.tone} href={a.href} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {kpis.map((k) => (
          <ErpStatCard key={k.title} icon={k.icon} label={k.title} value={k.value} hint={k.hint} tone={k.tone} href={k.href} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="min-h-[420px] xl:col-span-2">
          <ActionWidgets tasks={pendingTasks} />
        </div>
        <div className="min-h-[420px]">
          <LiveActivityFeed events={liveEvents} />
        </div>
      </div>
    </div>
  );
}
