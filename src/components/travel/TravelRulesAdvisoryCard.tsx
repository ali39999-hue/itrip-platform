'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  ChevronDown,
  Clock,
  Luggage,
  FileCheck2,
  Mountain,
  AlertTriangle,
  Compass,
  CheckCircle2,
  Info,
  CalendarCheck2,
} from 'lucide-react';
import { lt } from '@/lib/lt';

export type RouteDifficulty = 'easy' | 'moderate' | 'challenging' | 'demanding';

export interface TravelRulesAdvisoryCardProps {
  locale: string;
  defaultExpanded?: boolean;
  destinationCity?: string;
  routeDifficulty?: RouteDifficulty;
  isInternational?: boolean;
  className?: string;
}

export function TravelRulesAdvisoryCard({
  locale,
  defaultExpanded = false,
  destinationCity,
  routeDifficulty = 'moderate',
  isInternational = true,
  className = '',
}: TravelRulesAdvisoryCardProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const [activeTab, setActiveTab] = useState<'rules' | 'difficulty' | 'baggage' | 'refund'>('rules');

  const difficultyMeta: Record<RouteDifficulty, { label: string; color: string; desc: string }> = {
    easy: {
      label: lt(locale, { fa: 'آسان و خانوادگی', en: 'Easy & Family-Friendly', ar: 'سهل ومناسب للعائلات', zh: '轻松亲子', ru: 'Легкий и семейный' }),
      color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300',
      desc: lt(locale, {
        fa: 'مناسب برای تمامی سنین و کودکان؛ بدون نیاز به پیاده‌روی سنگین، دسترسی کامل به امکانات رفاهی و حمل‌ونقل عمومی.',
        en: 'Suitable for all ages & children; no heavy trekking, direct access to transit and urban facilities.',
        ar: 'مناسب لجميع الأعمار والأطفال، دون مسارات شاقة، مع وصول سهل للخدمات العامة.',
        zh: '老少皆宜，无高强度步行，公共交通与基础设施完善。',
        ru: 'Подходит для всех возрастов; без сложных переходов, развитая инфраструктура.',
      }),
    },
    moderate: {
      label: lt(locale, { fa: 'متوسط (نیازمند تحرک)', en: 'Moderate Activity', ar: 'متوسط النشاط', zh: '中等活动量', ru: 'Умеренная нагрузка' }),
      color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300',
      desc: lt(locale, {
        fa: 'شامل ۲ تا ۴ ساعت پیاده‌روی شهری، موزه‌گردی یا پله‌های تاریخی؛ کفش راحتی و بطری آب همراه داشته باشید.',
        en: 'Includes 2-4 hours of city walking, historic stairs or museum tours; comfortable shoes recommended.',
        ar: 'يشمل من ٢ إلى ٤ ساعات من المشي وزيارة المعالم؛ يُنصح بارتداء أحذية مريحة.',
        zh: '包含2至4小时城市步行或台阶游览，建议穿着舒适运动鞋。',
        ru: 'Включает 2-4 часа пеших прогулок и осмотра достопримечательностей.',
      }),
    },
    challenging: {
      label: lt(locale, { fa: 'چالش‌برانگیز (طبیعت‌گردی)', en: 'Challenging (Adventure)', ar: 'مغامرة مليئة بالتحدي', zh: '户外探险级', ru: 'Сложный активный' }),
      color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300',
      desc: lt(locale, {
        fa: 'مسیرهای کوهستانی یا کویری با تغییرات دمایی محسوس؛ نیازمند آمادگی جسمانی، کفش مناسب ترکینگ و وسایل حفاظت آفتاب/سرما.',
        en: 'Mountain or desert trails with temperature shifts; requires physical fitness and proper trekking gear.',
        ar: 'مسارات جبلية أو صحراوية مع تقلبات حرارية؛ تتطلب لياقة بدنية ومعدات مناسبة.',
        zh: '高原山地或沙漠徒步，温差大，需要良好体能与专业户外装备。',
        ru: 'Горные или пустынные маршруты с перепадами температур; требуется подготовка и экипировка.',
      }),
    },
    demanding: {
      label: lt(locale, { fa: 'سخت و تخصصی', en: 'Demanding & Technical', ar: 'شاق ومتقدم', zh: '高难度专业', ru: 'Экстремальный' }),
      color: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300',
      desc: lt(locale, {
        fa: 'ارتفاعات بالا یا مسیرهای آفرود فاقد اینترنت پایدار؛ مناسب ورزشکاران و علاقه‌مندان به تجربیات منحصربه‌فرد با راهنمای محلی مجرب.',
        en: 'High altitude or off-road conditions with limited connectivity; recommended with certified guide.',
        ar: 'ارتفاعات شاهقة أو مسارات وعرة؛ للمتمرسين مع مرشد محلي معتمد.',
        zh: '高海拔或偏远越野，通信受限，适合在资深向导陪同下的户外玩家。',
        ru: 'Высокогорье или бездорожье с ограниченной связью; рекомендуется с сертифицированным гидом.',
      }),
    },
  };

  const refundTiers = [
    {
      time: lt(locale, {
        fa: 'بیش از ۷۲ ساعت تا پرواز',
        en: 'More than 72 hours before departure',
        ar: 'أكثر من 72 ساعة قبل الرحلة',
        zh: '起飞前72小时以上',
        ru: 'Более 72 часов до вылета',
      }),
      fee: lt(locale, {
        fa: '۱۰٪ الی ۲۰٪ کسر جریمه (۸۰٪ تا ۹۰٪ استرداد)',
        en: '10% to 20% penalty (80-90% refunded)',
        ar: 'خصم 10% إلى 20% (استرداد 80-90%)',
        zh: '扣除10%-20%手续费（退款80%-90%）',
        ru: 'Штраф 10%-20% (возврат 80%-90%)',
      }),
      status: 'safe',
    },
    {
      time: lt(locale, {
        fa: 'بین ۲۴ تا ۷۲ ساعت تا پرواز',
        en: 'Between 24 to 72 hours before departure',
        ar: 'بين 24 إلى 72 ساعة قبل موعد الرحلة',
        zh: '起飞前24至72小时之间',
        ru: 'От 24 до 72 часов до вылета',
      }),
      fee: lt(locale, {
        fa: '۳۰٪ کسر جریمه مصوب سازمان هواپیمایی',
        en: '30% regulatory cancellation penalty',
        ar: 'خصم 30% رسوم إلغاء معتمدة',
        zh: '收取30%退票手续费',
        ru: 'Удержание 30% тарифа',
      }),
      status: 'moderate',
    },
    {
      time: lt(locale, {
        fa: 'از ۲۴ ساعت تا ۳ ساعت قبل از پرواز',
        en: 'From 24h up to 3 hours before departure',
        ar: 'من 24 ساعة حتى 3 ساعات قبل الإقلاع',
        zh: '起飞前24小时至前3小时内',
        ru: 'От 24 до 3 часов до вылета',
      }),
      fee: lt(locale, {
        fa: '۵۰٪ کسر جریمه کنسلی دیرهنگام',
        en: '50% late cancellation penalty',
        ar: 'خصم 50% رسوم إلغاء متأخر',
        zh: '收取50%临近退票费',
        ru: 'Штраф 50% за позднюю отмену',
      }),
      status: 'high',
    },
    {
      time: lt(locale, {
        fa: 'کمتر از ۳ ساعت تا پرواز یا عدم حضور (No-Show)',
        en: 'Under 3 hours or passenger No-Show',
        ar: 'أقل من 3 ساعات أو عدم الحضور (No-Show)',
        zh: '起飞前3小时内或误机（No-Show）',
        ru: 'Менее 3 часов или неявка на рейс',
      }),
      fee: lt(locale, {
        fa: '۶۵٪ الی ۱۰۰٪ جریمه (وابسته به کلاس نرخی و چارتری)',
        en: '65% to 100% fee (per fare bucket / charter terms)',
        ar: 'خصم 65% إلى 100% حسب فئة التذكرة',
        zh: '扣除65%-100%（根据舱位及包机条款）',
        ru: 'Штраф 65%-100% в зависимости от тарифа',
      }),
      status: 'none',
    },
  ];

  return (
    <div
      className={`rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-elev-1 transition-all ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-3 text-start cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-xl"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand-dark grid place-items-center shrink-0">
            <FileCheck2 size={20} aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-ink m-0">
                {lt(locale, {
                  fa: 'بررسی جامع قوانین صدور بلیت و راهنمای سختی مسیر',
                  en: 'Ticketing Rules, Route Difficulty & Travel Advisory',
                  ar: 'شروط إصدار التذاكر ودليل صعوبة المسار',
                  zh: '客票出票规则、行程难度与行前指南',
                  ru: 'Правила выписки билетов, сложность маршрута и памятка',
                })}
              </h3>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-mint text-brand-dark">
                <Info size={12} />
                {lt(locale, { fa: 'اطلاعات ضروری', en: 'Must Read', ar: 'معلومات هامة', zh: '必读须知', ru: 'Важно знать' })}
              </span>
            </div>
            <p className="text-xs text-sub font-medium mt-0.5 mb-0">
              {destinationCity
                ? lt(locale, {
                    fa: `نکات مهم سفر به ${destinationCity}، شرایط ابطال، میزان بار و مدارک گذرنامه`,
                    en: `Essential travel notes for ${destinationCity}: refund rules, baggage, passport`,
                    ar: `إرشادات السفر إلى ${destinationCity}: سياسة الإلغاء، الأمتعة والجواز`,
                    zh: `${destinationCity}出行提示：退改签政策、行李额度与护照要求`,
                    ru: `Памятка по поездке в ${destinationCity}: правила возврата, багаж, паспорт`,
                  })
                : lt(locale, {
                    fa: 'قوانین رسمی کنسلی، زمان‌بندی فرودگاه، بار مجاز و سختی سفر',
                    en: 'Official cancellation policies, airport check-in, luggage and pacing',
                    ar: 'سياسات الإلغاء، توقيت المطار، الأمتعة ومستوى صعوبة السفر',
                    zh: '退票规则、值机截止、托运行李与旅行强度指南',
                    ru: 'Официальные правила отмены, время в аэропорту, багаж и сложность',
                  })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-brand-dark hidden md:inline">
            {isOpen
              ? lt(locale, { fa: 'بستن راهنما', en: 'Collapse', ar: 'إخفاء', zh: '收起', ru: 'Свернуть' })
              : lt(locale, { fa: 'مشاهده جزئیات', en: 'View Details', ar: 'عرض التفاصيل', zh: '查看详情', ru: 'Подробнее' })}
          </span>
          <ChevronDown
            size={18}
            className={`text-sub transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </div>
      </button>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-line space-y-4 animate-in fade-in duration-150">
          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              type="button"
              onClick={() => setActiveTab('rules')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                activeTab === 'rules'
                  ? 'bg-brand text-brand-foreground shadow-xs'
                  : 'bg-soft text-sub hover:text-ink'
              }`}
            >
              <FileCheck2 size={14} />
              <span>
                {lt(locale, {
                  fa: 'قوانین صدور بلیت',
                  en: 'Issuance Rules',
                  ar: 'شروط التذاكر',
                  zh: '出票规则',
                  ru: 'Правила выписки',
                })}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('difficulty')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                activeTab === 'difficulty'
                  ? 'bg-brand text-brand-foreground shadow-xs'
                  : 'bg-soft text-sub hover:text-ink'
              }`}
            >
              <Mountain size={14} />
              <span>
                {lt(locale, {
                  fa: 'سختی مسیر و توصیه‌ها',
                  en: 'Route & Pacing',
                  ar: 'صعوبة المسار',
                  zh: '行程难度与建议',
                  ru: 'Сложность и советы',
                })}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('baggage')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                activeTab === 'baggage'
                  ? 'bg-brand text-brand-foreground shadow-xs'
                  : 'bg-soft text-sub hover:text-ink'
              }`}
            >
              <Luggage size={14} />
              <span>
                {lt(locale, {
                  fa: 'بار و زمان‌بندی فرودگاه',
                  en: 'Baggage & Timings',
                  ar: 'الأمتعة والتوقيت',
                  zh: '行李与机场时间',
                  ru: 'Багаж и тайминг',
                })}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('refund')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                activeTab === 'refund'
                  ? 'bg-brand text-brand-foreground shadow-xs'
                  : 'bg-soft text-sub hover:text-ink'
              }`}
            >
              <ShieldAlert size={14} />
              <span>
                {lt(locale, {
                  fa: 'جدول جریمه کنسلی',
                  en: 'Refund Schedule',
                  ar: 'جدول الإلغاء',
                  zh: '退票阶梯表',
                  ru: 'Таблица возврата',
                })}
              </span>
            </button>
          </div>

          {/* TAB 1: ISSUANCE RULES */}
          {activeTab === 'rules' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-soft border border-line space-y-1">
                  <div className="flex items-center gap-2 text-ink font-bold text-xs">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>{lt(locale, { fa: 'صدور آنی بلیت الکترونیکی (E-Ticket)', en: 'Instant E-Ticket Issuance', ar: 'إصدار فوري للتذكرة الإلكترونية', zh: '电子客票即时出票', ru: 'Мгновенная выписка электронного билета' })}</span>
                  </div>
                  <p className="text-[11px] text-sub leading-relaxed m-0">
                    {lt(locale, {
                      fa: 'بلیت الکترونیکی بلافاصله پس از پرداخت قطعی صادر شده و شناسه رزرو (PNR) به همراه فایل PDF بلیت پیامک و ایمیل می‌شود.',
                      en: 'Your e-ticket is issued immediately after payment confirmation, with PNR and PDF voucher dispatched via SMS and email.',
                      ar: 'تصدر التذكرة فور تأكيد الدفع مع إرسال رقم الحجز وملف التذكرة برسالة نصية وبريد إلكتروني.',
                      zh: '支付成功后系统即刻出票，PNR 预订代码及电子行程单同步通过短信与邮件送达。',
                      ru: 'Билет выписывается сразу после оплаты, PNR и PDF-ваучер отправляются по SMS и на e-mail.',
                    })}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-soft border border-line space-y-1">
                  <div className="flex items-center gap-2 text-ink font-bold text-xs">
                    <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                    <span>{lt(locale, { fa: 'عدم امکان تغییر نام و انتقال به غیر', en: 'Non-Transferable & Name Accuracy', ar: 'عدم إمكانية نقل التذكرة لشخص آخر', zh: '不得转让且姓名须严格一致', ru: 'Именной билет без права передачи' })}</span>
                  </div>
                  <p className="text-[11px] text-sub leading-relaxed m-0">
                    {lt(locale, {
                      fa: 'طبق مقررات بین‌المللی ایکائو، حروف لاتین نام و شماره گذرنامه باید دقیقاً مطابق پاسپورت باشد. هرگونه ویرایش نام نیازمند کنسلی و استرداد است.',
                      en: 'Under ICAO rules, Latin name spelling and passport number must match perfectly. Any name change requires cancellation and reissue.',
                      ar: 'وفق قوانين إيكاو الدولية، يجب تطابق حروف الاسم ورقم الجواز بدقة. أي تعديل يتطلب إلغاء التذكرة وإعادة إصدارها.',
                      zh: '根据国际民航组织规定，拼音姓名须与护照完全吻合，出票后不可更改乘机人。',
                      ru: 'Написание имени и номер паспорта должны строго совпадать с документом. Изменение имени невозможно.',
                    })}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-soft border border-line space-y-1">
                  <div className="flex items-center gap-2 text-ink font-bold text-xs">
                    <CalendarCheck2 size={15} className="text-brand-dark shrink-0" />
                    <span>{lt(locale, { fa: 'اعتبار حداقل ۶ ماهه گذرنامه', en: 'Minimum 6-Month Passport Validity', ar: 'صلاحية الجواز 6 أشهر على الأقل', zh: '护照有效期须在6个月以上', ru: 'Срок действия паспорта от 6 месяцев' })}</span>
                  </div>
                  <p className="text-[11px] text-sub leading-relaxed m-0">
                    {lt(locale, {
                      fa: 'برای پروازهای خارجی، داشتن حداقل ۶ ماه اعتبار پاسپورت از تاریخ سفر الزامی است. مسئولیت کنترل روادید و ویزای ترانزیت بر عهده مسافر است.',
                      en: 'For international flights, your passport must have at least 6 months validity. Visa and transit eligibility are passenger responsibility.',
                      ar: 'للرحلات الدولية، يجب أن يكون الجواز صالحاً لـ 6 أشهر على الأقل. التأشيرات وترتيبات الترانزيت تقع على عاتق المسافر.',
                      zh: '国际航班要求护照距返程日至少有6个月有效期，并请自行确保目的国签证或过境签有效。',
                      ru: 'Для международных рейсов паспорт должен действовать не менее 6 месяцев от даты поездки.',
                    })}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-soft border border-line space-y-1">
                  <div className="flex items-center gap-2 text-ink font-bold text-xs">
                    <Clock size={15} className="text-purple-600 shrink-0" />
                    <span>{lt(locale, { fa: 'شرایط بلیت نوزاد و کودک', en: 'Infant & Child Fares', ar: 'شروط تذاكر الأطفال والرضع', zh: '儿童与婴儿购票政策', ru: 'Детские и младенческие тарифы' })}</span>
                  </div>
                  <p className="text-[11px] text-sub leading-relaxed m-0">
                    {lt(locale, {
                      fa: 'نوزادان زیر ۲ سال بدون صندلی اختصاصی و با ۱۰٪ نرخ بزرگسال سفر می‌کنند. کودکان ۲ تا ۱۲ سال نیازمند صندلی جداگانه و مشمول نرخ کودک هستند.',
                      en: 'Infants under 2 fly on lap at 10% adult fare. Children 2-12 occupy their own seat at a reduced child rate.',
                      ar: 'يسافر الرضع دون سنتين في حضن الوالدين بـ 10% من الأجرة. الأطفال من 2-12 سنة يحصلون على مقعد مخصص بسعر مخفض.',
                      zh: '未满2岁婴儿无需单独占座（成人票价10%）；2至12岁儿童须单独占座并享受儿童优惠票价。',
                      ru: 'Младенцы до 2 лет без места (10% тарифа); дети от 2 до 12 лет на отдельном месте со скидкой.',
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ROUTE DIFFICULTY & TRAVEL ADVISORY */}
          {activeTab === 'difficulty' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-soft border border-line space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Compass size={18} className="text-brand-dark" />
                    <span className="text-xs font-bold text-ink">
                      {lt(locale, { fa: 'درجه سختی این مسیر گردشگری:', en: 'Estimated Route Difficulty:', ar: 'مستوى صعوبة المسار:', zh: '本路线难度等级：', ru: 'Уровень сложности маршрута:' })}
                    </span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${difficultyMeta[routeDifficulty].color}`}>
                    {difficultyMeta[routeDifficulty].label}
                  </span>
                </div>
                <p className="text-xs text-sub leading-relaxed m-0">
                  {difficultyMeta[routeDifficulty].desc}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-surface border border-line">
                  <h4 className="text-xs font-bold text-ink mb-1 flex items-center gap-1.5">
                    <span>☀️</span>
                    {lt(locale, { fa: 'پوشش و لباس مناسب فصل', en: 'Seasonal Clothing Gear', ar: 'الملابس المناسبة للموسم', zh: '季节着装建议', ru: 'Одежда по сезону' })}
                  </h4>
                  <p className="text-[11px] text-sub leading-relaxed m-0">
                    {lt(locale, {
                      fa: 'پیش از سفر پیش‌بینی هواشناسی ۷ روزه مقصد را بررسی نمایید. در فصل بهار و پاییز همراه داشتن لباس لایه‌ای و چتر مسافرتی ضروری است.',
                      en: 'Check the 7-day weather forecast before flying. Layered clothing and a compact umbrella are recommended in spring and autumn.',
                      ar: 'راجع توقعات الطقس لـ 7 أيام قبل السفر. احرص على ملابس متعددة الطبقات في فصلي الربيع والخريف.',
                      zh: '出行前请查阅目的地7天天气预报，春秋季节建议携带防风外套与便携雨伞。',
                      ru: 'Проверьте прогноз погоды на 7 дней. В межсезонье рекомендуется многослойная одежда.',
                    })}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-surface border border-line">
                  <h4 className="text-xs font-bold text-ink mb-1 flex items-center gap-1.5">
                    <span>🏥</span>
                    {lt(locale, { fa: 'بیمه مسافرتی و امداد بین‌المللی', en: 'Travel Insurance & SOS', ar: 'تأمين السفر والطوارئ', zh: '旅行救援与境外保险', ru: 'Страховка и экстренная помощь' })}
                  </h4>
                  <p className="text-[11px] text-sub leading-relaxed m-0">
                    {lt(locale, {
                      fa: 'بیمه مسافرتی سامان شامل پوشش هزینه‌های درمانی اورژانسی، تاخیر پرواز و گم شدن بار تا سقف ۳۰,۰۰۰ یورو است و فعال‌سازی آن توصیه اکید می‌شود.',
                      en: 'Comprehensive travel insurance covers emergency medical care, delays, and baggage loss up to €30,000. Strongly recommended.',
                      ar: 'يغطي تأمين السفر الحالات الطبية الطارئة، تأخير الرحلات وفقدان الأمتعة حتى 30,000 يورو.',
                      zh: '强烈建议附赠旅行保险，涵盖紧急医疗就医、航班延误及行李丢失保障（最高3万欧元）。',
                      ru: 'Медицинская страховка покрывает экстренную помощь, задержку рейсов и утерю багажа до 30 000 евро.',
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BAGGAGE & TIMINGS */}
          {activeTab === 'baggage' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-soft border border-line space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-xs text-ink">
                    <Luggage size={16} className="text-brand-dark" />
                    <span>{lt(locale, { fa: 'بار مجاز کابین و چمدان اصلی', en: 'Cabin & Checked Baggage', ar: 'أمتعة المقصورة والشحن', zh: '手提与托运行李额度', ru: 'Ручная кладь и багаж' })}</span>
                  </div>
                  <ul className="text-[11px] text-sub space-y-1 ps-4 list-disc m-0 leading-relaxed">
                    <li>{lt(locale, { fa: 'بار دستی کابین: ۱ بسته حداکثر ۵ تا ۷ کیلوگرم (۵۵×۴۰×۲۰ سانتی‌متر)', en: 'Cabin carry-on: 1 bag max 5-7 kg (55×40×20 cm)', ar: 'حقيبة يد للمقصورة: حتى 7 كغ (55×40×20 سم)', zh: '随身手提：1件不超过5-7公斤（55×40×20厘米）', ru: 'Ручная кладь: 1 место до 5-7 кг (55×40×20 см)' })}</li>
                    <li>{lt(locale, { fa: `چمدان پذیرش‌شده: ${isInternational ? '۲۵ الی ۳۰ کیلوگرم' : '۲۰ کیلوگرم'} برای هر مسافر بزرگسال`, en: `Checked luggage: ${isInternational ? '25-30 kg' : '20 kg'} per adult passenger`, ar: `الأمتعة المسجلة: ${isInternational ? '25-30 كغ' : '20 كغ'} لكل راكب`, zh: `托运行李：每位成人旅客${isInternational ? '25-30' : '20'}公斤`, ru: `Багаж: ${isInternational ? '25-30 кг' : '20 кг'} на взрослого пассажира` })}</li>
                    <li>{lt(locale, { fa: 'مایعات بیش از ۱۰۰ میلی‌لیتر و اشیای تیز در کابین ممنوع است.', en: 'Liquids over 100ml and sharp objects prohibited in cabin.', ar: 'تمنع السوائل التي تتجاوز 100 مل في المقصورة.', zh: '单件液体超过100ml及尖锐物品禁止随身携带。', ru: 'Жидкости более 100 мл запрещены в ручной клади.' })}</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-soft border border-line space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-xs text-ink">
                    <Clock size={16} className="text-amber-600" />
                    <span>{lt(locale, { fa: 'زمان‌بندی فرودگاه و بسته شدن گیت', en: 'Airport Arrival & Gate Closure', ar: 'توقيت المطار وإغلاق البوابات', zh: '机场值机与登机门关闭时间', ru: 'Прибытие в аэропорт и посадка' })}</span>
                  </div>
                  <ul className="text-[11px] text-sub space-y-1 ps-4 list-disc m-0 leading-relaxed">
                    <li>{lt(locale, { fa: `حضور در فرودگاه: ${isInternational ? 'حداقل ۳ ساعت قبل' : 'حداقل ۱.۵ ساعت قبل'} از ساعت پرواز`, en: `Airport check-in: ${isInternational ? 'At least 3 hours prior' : 'At least 90 mins prior'}`, ar: `التواجد بالمطار: ${isInternational ? 'قبل 3 ساعات على الأقل' : 'قبل ساعة ونصف'} من الإقلاع`, zh: `到达机场：国际航班至少提前3小时，国内提前1.5小时`, ru: `Прибытие в аэропорт: за 3 часа (междунар.) или 1.5 часа (внутр.)` })}</li>
                    <li>{lt(locale, { fa: 'بسته شدن کانتر پذیرش بار: ۴۵ تا ۶۰ دقیقه قبل از پرواز', en: 'Check-in counter close: 45-60 minutes before departure', ar: 'إغلاق كاونتر الأمتعة: 45-60 دقيقة قبل الرحلة', zh: '托运柜台关闭：起飞前45-60分钟准时截止', ru: 'Стойка регистрации закрывается за 45-60 минут' })}</li>
                    <li>{lt(locale, { fa: 'بسته شدن گیت سوار شدن: ۲۰ دقیقه قبل از پرواز', en: 'Boarding gate close: 20 minutes before departure', ar: 'إغلاق بوابة الصعود: قبل 20 دقيقة من الإقلاع', zh: '登机口关闭：起飞前20分钟准时关闭', ru: 'Выход на посадку закрывается за 20 минут' })}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: REFUND SCHEDULE */}
          {activeTab === 'refund' && (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-line">
                <table className="w-full text-xs text-start border-collapse">
                  <thead className="bg-soft text-sub font-black border-b border-line">
                    <tr>
                      <th className="p-2.5 text-start font-bold">{lt(locale, { fa: 'بازه زمانی درخواست کنسلی', en: 'Cancellation Window', ar: 'فترة الإلغاء', zh: '申请退订时间段', ru: 'Срок обращения' })}</th>
                      <th className="p-2.5 text-end font-bold">{lt(locale, { fa: 'میزان جریمه استرداد', en: 'Penalty Fee', ar: 'نسبة الغرامة', zh: '手续费扣除标准', ru: 'Размер штрафа' })}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-surface">
                    {refundTiers.map((tier, idx) => (
                      <tr key={`refund-tier-${idx}`} className="hover:bg-soft/40 transition-colors">
                        <td className="p-2.5 text-ink font-medium">{tier.time}</td>
                        <td className="p-2.5 text-end font-bold text-ink">{tier.fee}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-sub leading-relaxed m-0">
                {lt(locale, {
                  fa: 'نکته: در پروازهای چارتری طبق قوانین سازمان هواپیمایی، استرداد وجه تنها در صورت تاخیر بیش از ۲ ساعت توسط ایرلاین امکان‌پذیر خواهد بود.',
                  en: 'Note: For charter flights, refunds are restricted by civil aviation rules unless delayed >2 hours by the airline.',
                  ar: 'ملاحظة: بالنسبة لرحلات الشارتر، يخضع الاسترداد لقوانين الطيران المدني ما لم تتأخر الرحلة لأكثر من ساعتين.',
                  zh: '注：包机航班按民航规定非承运人原因原则上不予退票，遇航变或延误2小时以上可全额退款。',
                  ru: 'Примечание: чартерные билеты возвращаются по спецправилам перевозчика или при задержке более 2 часов.',
                })}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
