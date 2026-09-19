'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useAuthStore } from '@/stores/auth-store';
import {
  Phone, Mail, MessageSquare, Send, CheckCircle2, Headphones,
  ChevronDown, Clock, Zap, MessageSquareQuote, RefreshCw, AlertCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { lt } from '@/lib/lt';
import { getSupportPageConfigAction } from '@/actions/account-panel';
import {
  createSupportTicketAction,
  getUserTicketsAction,
  getTicketDetailsAction,
  addTicketReplyAction,
} from '@/actions/tickets';
import type { SupportTicketRecord, TicketSummaryItem } from '@/domains/tickets/TicketDomainService';

interface SupportCfg {
  phone: string;
  phoneDisplay: string;
  email: string;
  telegram: string;
  faqOverride: Array<{ q: string; a: string }> | null;
}

const FALLBACK_SUPPORT: SupportCfg = {
  phone: '+982191000000',
  phoneDisplay: '+98 (21) 9100-0000',
  email: 'support@firuzo.com',
  telegram: 'firuzo_support',
  faqOverride: null,
};

export default function SupportPage() {
  const t = useTranslations('Support');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const authUser = useAuthStore((s) => s.user);

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdTicket, setCreatedTicket] = useState<SupportTicketRecord | null>(null);

  // User Tickets History & Thread
  const [myTickets, setMyTickets] = useState<TicketSummaryItem[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketRecord | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [activeTab, setActiveTab] = useState<'NEW_TICKET' | 'MY_TICKETS'>('NEW_TICKET');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('flights');
  const [reference, setReference] = useState('');
  const [message, setMessage] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  // CMS-driven contact channels (support.page key) — shipped defaults until loaded
  const [cfg, setCfg] = useState<SupportCfg>(FALLBACK_SUPPORT);

  useEffect(() => {
    getUserTicketsAction().then((res) => {
      if (res.success && res.tickets) {
        setMyTickets(res.tickets);
        if (res.tickets.length > 0 && !submitted) {
          // Keep default as NEW_TICKET but let user switch
        }
      }
    });
  }, [authUser, submitted]);

  useEffect(() => {
    let cancelled = false;
    getSupportPageConfigAction()
      .then((res) => {
        if (cancelled || !res?.support) return;
        const s = res.support;
        const display =
          s.phoneDisplay && locale in s.phoneDisplay
            ? String(s.phoneDisplay[locale as keyof typeof s.phoneDisplay])
            : FALLBACK_SUPPORT.phoneDisplay;
        setCfg({
          phone: s.phone || FALLBACK_SUPPORT.phone,
          phoneDisplay: display,
          email: s.email || FALLBACK_SUPPORT.email,
          telegram: s.telegram || (process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || FALLBACK_SUPPORT.telegram),
          faqOverride:
            s.faq && s.faq.length > 0
              ? s.faq.map((f) => ({
                  q: String(f.q[locale as keyof typeof f.q] ?? f.q.en ?? f.q.fa),
                  a: String(f.a[locale as keyof typeof f.a] ?? f.a.en ?? f.a.fa),
                }))
              : null,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const telegramHref = `https://t.me/${cfg.telegram}`;

  useEffect(() => {
    const qRef = searchParams?.get('ref');
    const qCat = searchParams?.get('category');
    if (qRef) setReference(qRef.toUpperCase());
    if (qCat) setCategory(qCat);
    if (authUser) {
      const uName = locale === 'fa'
        ? `${authUser.firstNameFa || ''} ${authUser.lastNameFa || ''}`.trim()
        : `${authUser.firstNameEn || authUser.firstNameFa || ''} ${authUser.lastNameEn || authUser.lastNameFa || ''}`.trim();
      if (uName) setName(uName);
      if (authUser.email) setEmail(authUser.email);
    }
  }, [searchParams, authUser, locale]);

  const FAQS: Array<{ q: string; a: string }> = cfg.faqOverride ?? [
    {
      q: lt(locale, { fa: 'چگونه بلیت پرواز یا واچر هتل خود را لغو یا استرداد کنم؟', en: 'How do I cancel or request a refund for flights/hotels?', ar: 'كيف يمكنني إلغاء أو استرداد التذكرة أو الفندق؟', zh: '如何取消或申请机票/酒店退款？', ru: 'Как отменить или вернуть билет/отель?' }),
      a: lt(locale, { fa: 'وارد بخش «سفرهای من» شده و روی جزئیات سفر کلیک کنید. در صورت وجود شرایط کنسلی، دکمه «درخواست لغو و استرداد» فعال بوده و پس از کسر جریمه مصوب تأمین‌کننده، مانده وجه در کمتر از چند دقیقه به کیف پول شما مسترد می‌گردد.', en: 'Go to "My Trips" and select your booking. Click "Cancel & Refund". After applying supplier penalty rules, net credit is refunded to your Firuzo wallet in minutes.', ar: 'انتقل إلى "رحلاتي" واضغط على تفاصيل الحجز ثم اختر طلب الإلغاء والاسترداد.', zh: '进入“我的行程”点击订单详情中的“申请退订”，扣除手续费后余额将在数分钟内退至钱包。', ru: 'Перейдите в «Мои поездки», откройте детали бронирования и нажмите «Запрос на отмену».' }),
    },
    {
      q: lt(locale, { fa: 'چرا رزرو بلیت و پرداخت با کارت شتاب و تتر به صورت آنی صادر می‌شود؟', en: 'How are bookings instantly issued with Shetab and USDT payments?', ar: 'لماذا تصدر التذاكر فورياً مع الدفع بشتاب وتيثر؟', zh: '为什么通过 Shetab 和 USDT 可以即时出票？', ru: 'Почему билеты оформляются мгновенно при оплате Shetab и USDT?' }),
      a: lt(locale, { fa: 'پلتفرم فیروزو مستقیماً به سامانه تأمین‌کنندگان رسمی (GDS) و دفتر کل مالی متصل است. بلافاصله پس از تایید تراکنش درگاه شاپرک یا انتقال تتر TRC20، صندلی یا اتاق قطعی شده و کد رهگیری PNR صادر می‌شود.', en: 'Firuzo is directly integrated with official Global Distribution Systems (GDS) and automated ledgers, securing seats immediately upon gateway clearance.', ar: 'فيروزو متصل مباشرة بأنظمة التوزيع العالمية GDS وتصدر التذكرة فوراً بعد إتمام الدفع.', zh: 'Firuzo 直接连入全球分销系统 GDS 与自动化记账流水，支付成功后即刻锁定席位。', ru: 'Firuzo напрямую подключен к GDS и автоматически бронирует места сразу после оплаты.' }),
    },
    {
      q: lt(locale, { fa: 'آیا بیمه مسافرتی سامان مورد قبول سفارتخانه‌های اروپایی است؟', en: 'Is Saman Travel Insurance officially accepted by European embassies?', ar: 'هل تأمين سامان معتمد لدى السفارات الأوروبية؟', zh: 'Saman 旅行保险被欧洲使领馆认可吗？', ru: 'Принимается ли страховка Saman европейскими посольствами?' }),
      a: lt(locale, { fa: 'بله، تمامی بیمه‌نامه‌های صادره با سقف تعهد ۳۰,۰۰۰ تا ۵۰,۰۰۰ یورو شامل فوریت‌های پزشکی و خسارت بار بوده و با ضوابط رسمی سفارتخانه‌های حوزه شنگن، امارات، ترکیه و گرجستان انطباق ۱۰۰٪ دارد.', en: 'Yes, all policies meet full Schengen requirements with minimum €30,000 to €50,000 medical coverage and repatriation included.', ar: 'نعم، تغطي الوثائق متطلبات شنغن الطبية بالكامل حتى 50,000 يورو.', zh: '是的，所有保单均提供3万至5万欧元额度，完全符合申根签证使馆要求。', ru: 'Да, все полисы соответствуют требованиям Шенгена с покрытием до 50 000 €.' }),
    },
    {
      q: lt(locale, { fa: 'در صورت تاخیر یا لغو پرواز خارجی چه اقدامی انجام دهم؟', en: 'What should I do if my international flight is delayed or cancelled?', ar: 'ماذا أفعل في حال تأخر أو إلغاء رحلتي الدولية؟', zh: '国际航班延误或取消时我该怎么做？', ru: 'Что делать при задержке или отмене рейса?' }),
      a: lt(locale, { fa: 'تیم پشتیبانی ۲۴ ساعته فیروزو از طریق سامانه رصد تاخیر پرواز مطلع شده و به صورت فعال جهت جابجایی رایگان صندلی یا صدور گواهی استرداد بدون جریمه در کنار شما خواهد بود.', en: 'Our 24/7 concierge actively tracks your flight and assists with free re-booking or full refund waiver certificates.', ar: 'يتابع فريق الكونسيرج رحلتك على مدار الساعة لتسهيل التعديل أو الاسترداد بدون غرامة.', zh: '我们的24小时管家团队会自动跟踪航班动态，协助免手续费改签或退款。', ru: 'Наша служба поддержки 24/7 отслеживает рейсы и помогает с бесплатным переоформлением.' }),
    },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    setIsSubmitting(true);
    setSubmitError('');

    const categoryMap: Record<string, 'FLIGHTS' | 'HOTELS' | 'TOURS' | 'REFUNDS' | 'FINANCIAL' | 'GENERAL'> = {
      flights: 'FLIGHTS',
      hotels: 'HOTELS',
      wallet: 'FINANCIAL',
      visa: 'GENERAL',
      esim: 'GENERAL',
      refunds: 'REFUNDS',
    };

    const res = await createSupportTicketAction({
      name: name.trim(),
      email: email.trim() || undefined,
      phone: authUser?.phone || undefined,
      subject: `درخواست پشتیبانی (${categoryMap[category] || 'GENERAL'}): ${name}`,
      category: categoryMap[category] || 'GENERAL',
      bookingRef: reference.trim() || undefined,
      message: message.trim(),
    });

    setIsSubmitting(false);
    if (res.success && res.ticket) {
      setCreatedTicket(res.ticket);
      setSubmitted(true);
      getUserTicketsAction().then((r) => {
        if (r.success && r.tickets) setMyTickets(r.tickets);
      });
    } else {
      setSubmitError(res.error || 'خطا در ثبت تیکت پشتیبانی');
    }
  }

  async function handleOpenTicket(ticketId: string) {
    setLoadingDetails(true);
    const res = await getTicketDetailsAction(ticketId);
    setLoadingDetails(false);
    if (res.success && res.ticket) {
      setSelectedTicket(res.ticket);
    }
  }

  async function handleSendReply() {
    if (!selectedTicket || !replyText.trim()) return;
    setIsReplying(true);
    const res = await addTicketReplyAction(selectedTicket.id, replyText.trim());
    setIsReplying(false);
    if (res.success) {
      setReplyText('');
      const updated = await getTicketDetailsAction(selectedTicket.id);
      if (updated.success && updated.ticket) {
        setSelectedTicket(updated.ticket);
      }
      getUserTicketsAction().then((r) => {
        if (r.success && r.tickets) setMyTickets(r.tickets);
      });
    }
  }

  return (
    <div className="flex flex-col min-h-dvh bg-soft pb-24">
      {/* Mobile Action-First Header & Compact Hero */}
      <section className="relative w-full py-8 md:py-16 flex items-center justify-center overflow-hidden mb-6 md:mb-10 bg-gradient-to-b from-deep to-brand-dark text-surface">
        <div className="relative z-10 w-full max-w-4xl px-4 flex flex-col items-center text-center">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-surface/20 backdrop-blur-md grid place-items-center text-surface mb-2 border border-surface/20">
            <Headphones size={26} />
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-surface mb-1.5 tracking-tight drop-shadow-md">
            {t('title')}
          </h1>
          <p className="text-xs sm:text-base font-bold text-surface/90 max-w-xl mb-5">
            {t('subtitle')}
          </p>

          {/* Quick Action Grid for Mobile (Call, Chat, Booking, Refund, Payment) */}
          <div className="w-full max-w-xl grid grid-cols-3 gap-2 text-ink">
            <a
              href={`tel:${cfg.phone}`}
              className="min-h-[58px] p-2 rounded-2xl bg-surface hover:bg-mint border border-line flex flex-col items-center justify-center transition active:scale-95 shadow-sm"
            >
              <Phone size={18} className="text-action mb-1" />
              <span className="text-[11px] font-black">{lt(locale, { fa: 'تماس تلفنی', en: 'Call 24/7', ar: 'اتصال هاتفي', zh: '电话客服', ru: 'Позвонить' })}</span>
            </a>
            <a
              href={telegramHref}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[58px] p-2 rounded-2xl bg-surface hover:bg-mint border border-line flex flex-col items-center justify-center transition active:scale-95 shadow-sm"
            >
              <MessageSquare size={18} className="text-brand mb-1" />
              <span className="text-[11px] font-black">{lt(locale, { fa: 'چت و تلگرام', en: 'Online Chat', ar: 'دردشة حية', zh: '在线客服', ru: 'Чат' })}</span>
            </a>
            <button
              type="button"
              onClick={() => {
                setCategory('refunds');
                const el = document.getElementById('ticket-form');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="min-h-[58px] p-2 rounded-2xl bg-surface hover:bg-mint border border-line flex flex-col items-center justify-center transition active:scale-95 shadow-sm"
            >
              <Zap size={18} className="text-rose-500 mb-1" />
              <span className="text-[11px] font-black">{lt(locale, { fa: 'درخواست استرداد', en: 'Refunds', ar: 'طلب استرداد', zh: '申请退款', ru: 'Возврат' })}</span>
            </button>
          </div>
        </div>
      </section>

      <main className="w-full max-w-[1440px] mx-auto px-3 sm:px-4 md:px-6 2xl:px-8 space-y-8 md:space-y-10">
        
        {/* 24/7 SOS Emergency Concierge Bar for Active Travelers */}
        <section className="bg-gradient-to-r from-[#064e4d] to-[#043332] text-surface rounded-3xl p-6 sm:p-8 shadow-elev-3 border border-mint/20 relative overflow-hidden">
          <div className="absolute -end-16 -top-16 w-52 h-52 rounded-full border-[20px] border-mint-bright/10 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-action/20 border border-action/40 grid place-items-center text-action shrink-0 shadow-sm">
                <Zap size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full bg-action text-ink font-black text-[10.5px]">
                    {lt(locale, { fa: 'امداد ویژه مسافران در سفر', en: 'On-Trip Emergency Line', ar: 'طوارئ المسافرين', zh: '出行紧急热线', ru: 'Экстренная линия' })}
                  </span>
                  <span className="text-xs text-mint-bright font-bold flex items-center gap-1">
                    <Clock size={12} /> میانگین پاسخگویی: کمتر از ۳ دقیقه
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black">
                  {lt(locale, { fa: 'هم‌اکنون در سفر هستید و با مشکل فرودگاهی یا پذیرش هتل مواجه شدید؟', en: 'Currently traveling and experiencing check-in or transit issues?', ar: 'هل تواجه مشكلة حالياً أثناء سفرك؟', zh: '正在旅行中遇到值机或入住问题？', ru: 'Возникли проблемы при регистрации или в поездке?' })}
                </h3>
                <p className="text-xs sm:text-sm text-surface/80 font-medium mt-0.5">
                  {lt(locale, { fa: 'کانسیرژ فیروزو بدون وقفه از طریق تماس تلفنی و پیام‌رسان‌ها آماده راهبری و حل مشکل شماست.', en: 'Our concierge team resolves border, hotel, or flight issues instantly.', ar: 'فريقنا متاح فوراً لمساعدتك في أي طارئ سفر.', zh: 'Firuzo 专属旅行管家全天候协助解决行程问题。', ru: 'Служба консьерж-сервиса оперативно решит любой вопрос.' })}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
              <a
                href={`tel:${cfg.phone}`}
                className="h-11 px-5 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-xs transition flex items-center justify-center gap-2 shadow-md"
              >
                <Phone size={16} />
                <span>{cfg.phoneDisplay}</span>
              </a>
              <a
                href={telegramHref}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 px-4 rounded-xl bg-surface/15 hover:bg-surface/25 border border-surface/20 text-surface font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <MessageSquare size={16} className="text-mint-bright" />
                <span>{lt(locale, { fa: 'پشتیبانی تلگرام', en: 'Telegram Support', ar: 'دعم تلغرام', zh: 'Telegram 客服', ru: 'Telegram поддержка' })}</span>
              </a>
            </div>
          </div>
        </section>

        {/* Contact Cards & Ticket Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Quick Contact Cards */}
          <div className="flex flex-col gap-4">
            <div className="bg-surface rounded-2xl p-6 border border-line shadow-xs flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-mint grid place-items-center text-brand-dark shrink-0">
                <Phone size={24} />
              </div>
              <div>
                <h3 className="font-black text-base text-ink mb-1">{t('phone')}</h3>
                <p className="text-xs font-bold text-sub mb-2">{lt(locale, { fa: 'پاسخگویی ۲۴ ساعته در تمام روزهای هفته', en: '24/7 round-the-clock availability', ar: 'متاحون على مدار الساعة', zh: '全天候 24/7 在线', ru: 'Круглосуточно' })}</p>
                <a href={`tel:${cfg.phone}`} dir="ltr" className="text-sm font-black text-brand-dark hover:underline font-mono">
                  {cfg.phoneDisplay}
                </a>
              </div>
            </div>

            <div className="bg-surface rounded-2xl p-6 border border-line shadow-xs flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-mint grid place-items-center text-brand-dark shrink-0">
                <Mail size={24} />
              </div>
              <div>
                <h3 className="font-black text-base text-ink mb-1">{t('email')}</h3>
                <p className="text-xs font-bold text-sub mb-2">{lt(locale, { fa: 'پاسخگویی به سوالات و استردادها', en: 'Inquiries, vouchers & refunds', ar: 'الاستفسارات والقسائم والاسترداد', zh: '工单与退订申请', ru: 'Вопросы и возврат' })}</p>
                <a href={`mailto:${cfg.email}`} className="text-sm font-black text-brand-dark hover:underline font-mono">
                  {cfg.email}
                </a>
              </div>
            </div>

            <div className="bg-surface rounded-2xl p-6 border border-line shadow-xs flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-mint grid place-items-center text-brand-dark shrink-0">
                <MessageSquare size={24} />
              </div>
              <div>
                <h3 className="font-black text-base text-ink mb-1">{t('liveChat')}</h3>
                <p className="text-xs font-bold text-sub mb-2">{lt(locale, { fa: 'گفتگوی آنلاین با کارشناسان پشتیبانی', en: 'Chat instantly with dedicated experts', ar: 'دردش مع خبرائنا مباشرة', zh: '与在线客服即时沟通', ru: 'Мгновенный чат с экспертами' })}</p>
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 dark:text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-success animate-ping" />
                  {lt(locale, { fa: 'آنلاین — آماده پاسخگویی', en: 'Online — Ready to assist', ar: 'متصلون الآن', zh: '在线 — 随时待命', ru: 'Онлайн' })}
                </span>
              </div>
            </div>
          </div>

          {/* Ticket & Conversations Container */}
          <div className="lg:col-span-2 bg-surface rounded-3xl p-6 sm:p-8 border border-line shadow-xs">
            {/* Header Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4 mb-6">
              <div>
                <h2 className="font-black text-xl sm:text-2xl text-ink mb-1">{t('contactForm')}</h2>
                <p className="text-xs font-bold text-sub">
                  {lt(locale, {
                    fa: 'ثبت و پیگیری مستقیم درخواست‌ها و مکاتبات پشتیبانی ۲۴ ساعته',
                    en: 'Submit and track 24/7 support requests and live agent messages',
                    ar: 'تسجيل ومتابعة طلبات الدعم ورسائل الموظفين',
                    zh: '提交并跟踪全天候工单与在线客服回复',
                    ru: 'Создание и отслеживание обращений в службу поддержки',
                  })}
                </p>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-soft rounded-2xl border border-line">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('NEW_TICKET');
                    setSelectedTicket(null);
                  }}
                  className={`min-h-[44px] px-3.5 rounded-xl text-xs font-black transition ${
                    activeTab === 'NEW_TICKET'
                      ? 'bg-surface text-brand-dark shadow-xs'
                      : 'text-sub hover:text-ink'
                  }`}
                >
                  {lt(locale, { fa: 'ثبت تیکت جدید', en: 'New Ticket', ar: 'تذكرة جديدة', zh: '新建工单', ru: 'Новая заявка' })}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('MY_TICKETS')}
                  className={`min-h-[44px] px-3.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                    activeTab === 'MY_TICKETS'
                      ? 'bg-surface text-brand-dark shadow-xs'
                      : 'text-sub hover:text-ink'
                  }`}
                >
                  <span>{lt(locale, { fa: 'پیگیری تیکت‌های من', en: 'My Tickets', ar: 'تذاكري', zh: '我的工单', ru: 'Мои заявки' })}</span>
                  {myTickets.length > 0 && (
                    <span className="w-5 h-5 rounded-full bg-brand text-surface text-[10px] grid place-items-center font-bold">
                      {myTickets.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* TAB 1: NEW TICKET */}
            {activeTab === 'NEW_TICKET' && (
              <>
                {submitted && createdTicket ? (
                  <div className="p-8 text-center bg-mint/40 rounded-2xl border border-brand/30 flex flex-col items-center animate-in fade-in duration-200">
                    <CheckCircle2 size={46} className="text-brand-dark mb-3" />
                    <h3 className="font-black text-xl text-ink mb-1">
                      {lt(locale, { fa: 'تیکت شما با موفقیت در سیستم ثبت شد', en: 'Ticket Submitted Successfully', ar: 'تم استلام تذكرتك بنجاح', zh: '工单已成功提交', ru: 'Обращение успешно зарегистрировано' })}
                    </h3>
                    <p className="text-xs font-bold text-sub mb-4">
                      {lt(locale, {
                        fa: 'کد پیگیری رسمی تیکت شما صادر گردید. کارشناسان پشتیبانی ظرف حداکثر ۲ ساعت بررسی و پاسخ خواهند داد.',
                        en: 'Your official support ticket number has been generated. Our team will follow up within 2 hours.',
                        ar: 'تم إصدار رقم التذكرة الرسمي وسيتم الرد خلال ساعتين.',
                        zh: '官方工单跟踪号已生成，专员将在2小时内跟进并回复。',
                        ru: 'Официальный номер обращения создан. Мы ответим в течение 2 часов.',
                      })}
                    </p>

                    <div className="p-3 px-6 rounded-2xl bg-surface border border-brand/40 shadow-xs mb-6 flex flex-col items-center">
                      <span className="text-[11px] font-bold text-sub mb-0.5">
                        {lt(locale, { fa: 'شماره رهگیری تیکت:', en: 'Ticket Number:', ar: 'رقم التتبع:', zh: '工单编号：', ru: 'Номер обращения:' })}
                      </span>
                      <span className="font-mono text-xl font-black text-brand-dark tracking-wider" dir="ltr">
                        {createdTicket.ticketNumber}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTicket(createdTicket);
                          setActiveTab('MY_TICKETS');
                        }}
                        className="h-11 px-6 rounded-xl bg-brand hover:bg-brand-dark text-surface text-xs font-black transition active:scale-95 flex items-center gap-2 shadow-xs"
                      >
                        <MessageSquareQuote size={16} />
                        <span>{lt(locale, { fa: 'مشاهده گفتگو و ارسال پیام تکمیلی', en: 'View Conversation & Reply', ar: 'عرض المحادثة والرد', zh: '查看对话并补充信息', ru: 'Просмотр беседы и ответ' })}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSubmitted(false);
                          setCreatedTicket(null);
                          setName(authUser ? (locale === 'fa' ? `${authUser.firstNameFa || ''} ${authUser.lastNameFa || ''}`.trim() : `${authUser.firstNameEn || ''} ${authUser.lastNameEn || ''}`.trim()) : '');
                          setMessage('');
                          setReference('');
                        }}
                        className="h-11 px-6 rounded-xl bg-surface hover:bg-soft border border-line text-ink text-xs font-black transition active:scale-95"
                      >
                        {lt(locale, { fa: 'ثبت تیکت جدید دیگر', en: 'Submit Another Ticket', ar: 'إرسال تذكرة أخرى', zh: '提交新工单', ru: 'Создать ещё' })}
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {submitError && (
                      <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                        <AlertCircle size={16} className="shrink-0" />
                        <span>{submitError}</span>
                      </div>
                    )}

                    {reference && (
                      <div className="p-3.5 rounded-2xl bg-mint/40 border border-brand/30 flex items-center gap-2.5 text-xs font-bold text-brand-dark mb-4 animate-in fade-in duration-200">
                        <CheckCircle2 size={16} className="text-brand-dark shrink-0" />
                        <span>
                          {lt(locale, {
                            fa: `سفارش مسافرتی #${reference} به این درخواست متصل شد (کارشناس به سوابق پرواز/هتل دسترسی دارد).`,
                            en: `Travel booking #${reference} linked to this ticket (concierge has direct access to itinerary).`,
                            ar: `تم ربط الحجز #${reference} بهذا الطلب.`,
                            zh: `已关联旅行订单 #${reference}（客服可直接查阅行程）。`,
                            ru: `Бронирование #${reference} привязано к заявке.`,
                          })}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="support-name" className="block text-xs font-bold text-sub mb-1">
                          {lt(locale, { fa: 'نام و نام خانوادگی', en: 'Full Name', ar: 'الاسم الكامل', zh: '姓名', ru: 'ФИО' })}
                        </label>
                        <Input
                          id="support-name"
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder={lt(locale, { fa: 'علی رضایی', en: 'John Doe', ar: 'علي رضائي', zh: '阿里·雷扎伊', ru: 'Али Резаи' })}
                          className="font-bold text-sm h-11 rounded-xl"
                        />
                      </div>
                      <div>
                        <label htmlFor="support-email" className="block text-xs font-bold text-sub mb-1">
                          {t('email')}
                        </label>
                        <Input
                          id="support-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="font-bold text-sm font-mono h-11 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="support-category" className="block text-xs font-bold text-sub mb-1">
                          {lt(locale, { fa: 'دسته‌بندی موضوع', en: 'Subject Category', ar: 'التصنيف', zh: '问题类型', ru: 'Категория вопроса' })}
                        </label>
                        <select
                          id="support-category"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full h-11 rounded-xl border border-line px-3 text-xs font-bold bg-surface text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        >
                          <option value="flights">
                            {lt(locale, { fa: 'پرواز و استرداد بلیط', en: 'Flights & Ticket Refunds', ar: 'الطيران واسترداد التذاكر', zh: '机票与退订', ru: 'Рейсы и возврат билетов' })}
                          </option>
                          <option value="hotels">
                            {lt(locale, { fa: 'هتل و واچر اقامتگاه', en: 'Hotels & Accommodation Voucher', ar: 'الفنادق وقسائم الإقامة', zh: '酒店与住宿凭证', ru: 'Отели и ваучеры' })}
                          </option>
                          <option value="wallet">
                            {lt(locale, { fa: 'کیف پول و درگاه پرداخت', en: 'Wallet & Payment Gateways', ar: 'المحفظة وبوابات الدفع', zh: '钱包与支付网关', ru: 'Кошелек и оплата' })}
                          </option>
                          <option value="visa">
                            {lt(locale, { fa: 'ویزا و خدمات ورود', en: 'Visa & Entry Services', ar: 'التأشيرات وخدمات الدخول', zh: '签证与入境服务', ru: 'Визы и въезд' })}
                          </option>
                          <option value="esim">
                            {lt(locale, { fa: 'سیم‌کارت بین‌المللی eSIM', en: 'International eSIM', ar: 'شريحة eSIM الدولية', zh: '国际 eSIM 卡', ru: 'Международная eSIM' })}
                          </option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="support-reference" className="block text-xs font-bold text-sub mb-1">
                          {lt(locale, { fa: 'کد پیگیری یا شماره رزرو (اختیاری)', en: 'Booking PNR (Optional)', ar: 'رقم الحجز (اختياري)', zh: '预订参考号（选填）', ru: 'Код PNR (опционально)' })}
                        </label>
                        <Input
                          id="support-reference"
                          type="text"
                          value={reference}
                          onChange={(e) => setReference(e.target.value)}
                          placeholder="e.g. #THR-8842"
                          className="font-mono text-sm h-11 rounded-xl"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="support-message" className="block text-xs font-bold text-sub mb-1">
                        {lt(locale, { fa: 'متن پیام یا شرح مشکل', en: 'Message Details', ar: 'تفاصيل الرسالة', zh: '问题详情', ru: 'Описание проблемы' })}
                      </label>
                      <textarea
                        id="support-message"
                        required
                        rows={4}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={lt(locale, { fa: 'جزییات درخواست، شماره پرواز یا سوال خود را اینجا یادداشت کنید...', en: 'Describe your question or issue in detail...', ar: 'اكتب تفاصيل استفسارك هنا...', zh: '请详细描述您的问题...', ru: 'Подробно опишите ваш вопрос...' })}
                        className="w-full p-3.5 rounded-xl border border-line text-xs sm:text-sm font-bold bg-surface text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto h-11 px-8 rounded-xl bg-brand hover:bg-brand-dark text-surface font-black text-xs transition active:scale-95 flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw size={15} className="animate-spin" />
                          <span>{lt(locale, { fa: 'در حال ثبت در پایگاه داده...', en: 'Submitting Ticket...', ar: 'جارٍ التسجيل...', zh: '正在提交...', ru: 'Регистрация...' })}</span>
                        </>
                      ) : (
                        <>
                          <Send size={15} />
                          <span>{t('submit')}</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </>
            )}

            {/* TAB 2: MY TICKETS & LIVE CONVERSATION */}
            {activeTab === 'MY_TICKETS' && (
              <div className="space-y-4">
                {selectedTicket ? (
                  /* Conversation Thread View */
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-soft rounded-2xl border border-line">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-black text-brand-dark" dir="ltr">
                            {selectedTicket.ticketNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-brand/10 text-brand-dark">
                            {selectedTicket.category}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300">
                            {selectedTicket.status}
                          </span>
                        </div>
                        <h4 className="font-black text-sm text-ink">{selectedTicket.subject}</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedTicket(null)}
                        className="px-3 py-1.5 rounded-xl bg-surface border border-line text-xs font-bold text-sub hover:text-ink transition"
                      >
                        {lt(locale, { fa: 'بازگشت به لیست', en: 'Back to List', ar: 'رجوع للقائمة', zh: '返回列表', ru: 'Назад к списку' })}
                      </button>
                    </div>

                    {/* Messages Bubble Stream */}
                    <div className="p-4 bg-soft/50 rounded-2xl border border-line space-y-3 max-h-[420px] overflow-y-auto">
                      {selectedTicket.messages.map((m) => {
                        const isStaff = m.senderType === 'STAFF';
                        const isSys = m.senderType === 'SYSTEM';

                        if (isSys) {
                          return (
                            <div key={m.id} className="text-center text-[10px] text-sub font-mono py-1">
                              {m.message}
                            </div>
                          );
                        }

                        return (
                          <div
                            key={m.id}
                            className={`flex flex-col ${isStaff ? 'items-start' : 'items-end'}`}
                          >
                            <div
                              className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-xs sm:text-sm font-medium ${
                                isStaff
                                  ? 'bg-surface text-ink border border-line shadow-xs rounded-se-xs'
                                  : 'bg-brand text-surface shadow-xs rounded-ss-xs'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3 text-[10px] font-bold opacity-80 mb-1 border-b border-current/15 pb-1">
                                <span>{m.authorName}</span>
                                <span dir="ltr">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Reply Input Form */}
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={lt(locale, {
                          fa: 'پاسخ یا پیام جدید خود را برای پشتیبانی بنویسید...',
                          en: 'Type your reply message to support...',
                          ar: 'اكتب ردك هنا...',
                          zh: '输入您对客服的回复...',
                          ru: 'Напишите ваш ответ в поддержку...',
                        })}
                        className="w-full p-3 rounded-xl border border-line text-xs sm:text-sm bg-surface text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      />
                      <button
                        type="button"
                        onClick={handleSendReply}
                        disabled={isReplying || !replyText.trim()}
                        className="h-10 px-6 rounded-xl bg-brand hover:bg-brand-dark text-surface text-xs font-black transition active:scale-95 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {isReplying ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Send size={14} />
                        )}
                        <span>{lt(locale, { fa: 'ارسال پاسخ', en: 'Send Reply', ar: 'إرسال الرد', zh: '发送回复', ru: 'Отправить ответ' })}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Tickets List */
                  <div className="space-y-3">
                    {loadingDetails ? (
                      <div className="p-8 text-center text-sub text-xs">
                        <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-brand" />
                        <span>{lt(locale, { fa: 'در حال بارگذاری گفتگو...', en: 'Loading conversation...', ar: 'جارٍ التحميل...', zh: '加载中...', ru: 'Загрузка...' })}</span>
                      </div>
                    ) : myTickets.length === 0 ? (
                      <div className="p-8 text-center bg-soft rounded-2xl border border-line flex flex-col items-center">
                        <MessageSquareQuote size={36} className="text-sub/50 mb-2" />
                        <h4 className="font-black text-sm text-ink mb-1">
                          {lt(locale, { fa: 'تیکتی یافت نشد', en: 'No Tickets Found', ar: 'لا توجد تذاكر', zh: '未找到工单', ru: 'Заявок не найдено' })}
                        </h4>
                        <p className="text-xs font-bold text-sub mb-4">
                          {lt(locale, {
                            fa: 'تاکنون تیکت پشتیبانی با این مشخصات ثبت نکرده‌اید.',
                            en: 'You have not submitted any support tickets yet.',
                            ar: 'لم تسجل أي تذكرة حتى الآن.',
                            zh: '您尚未提交过任何客服工单。',
                            ru: 'Вы пока не создавали обращений.',
                          })}
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveTab('NEW_TICKET')}
                          className="px-4 py-2 rounded-xl bg-brand text-surface text-xs font-black transition"
                        >
                          {lt(locale, { fa: 'ثبت اولین تیکت', en: 'Create First Ticket', ar: 'تسجيل أول تذكرة', zh: '创建第一个工单', ru: 'Создать первое обращение' })}
                        </button>
                      </div>
                    ) : (
                      myTickets.map((t) => (
                        <div
                          key={t.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleOpenTicket(t.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenTicket(t.id); } }}
                          className="p-4 bg-surface hover:bg-soft rounded-2xl border border-line transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-black text-brand-dark" dir="ltr">
                                {t.ticketNumber}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-brand/10 text-brand-dark">
                                {t.category}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300">
                                {t.status}
                              </span>
                            </div>
                            <h4 className="font-black text-sm text-ink">{t.subject}</h4>
                            <p className="text-xs text-sub truncate max-w-lg">{t.lastMessageSnippet}</p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[11px] font-bold text-sub" dir="ltr">
                              {new Date(t.updatedAt).toLocaleDateString()}
                            </span>
                            <button
                              type="button"
                              className="min-h-[44px] px-3.5 rounded-xl bg-brand/10 hover:bg-brand text-brand-dark hover:text-surface text-xs font-black transition"
                            >
                              {lt(locale, { fa: 'مشاهده گفتگو', en: 'View Chat', ar: 'عرض المحادثة', zh: '查看对话', ru: 'Открыть чат' })}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Searchable Comprehensive FAQ Accordion */}
        <section className="space-y-6 pt-4">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black text-ink mb-2">
              {lt(locale, { fa: 'سوالات متداول مسافران', en: 'Frequently Asked Questions', ar: 'الأسئلة الشائعة للمسافرين', zh: '旅客常见问题解答', ru: 'Часто задаваемые вопросы' })}
            </h2>
            <p className="text-xs sm:text-sm font-bold text-sub">
              {lt(locale, { fa: 'پاسخ به پرتکرارترین پرسش‌ها درباره استرداد، پروازها، هتل‌ها و پرداخت ارزی', en: 'Instant answers regarding refunds, flight rules, hotel check-ins and payments.', ar: 'إجابات فورية لأهم الاستفسارات حول الرحلات والاسترداد والدفع.', zh: '关于退订、机票规则、酒店入住与支付的快速解答。', ru: 'Ответы на популярные вопросы о возвратах, рейсах и оплате.' })}
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i} className="bg-surface rounded-2xl border border-line overflow-hidden shadow-xs transition">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full p-5 text-start flex items-center justify-between gap-4 font-black text-sm text-ink hover:text-brand-dark transition cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={16} className={`text-sub transition-transform ${isOpen ? 'rotate-180 text-brand-dark' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs font-bold text-sub leading-relaxed border-t border-line/50 pt-3 animate-in fade-in duration-150">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}
