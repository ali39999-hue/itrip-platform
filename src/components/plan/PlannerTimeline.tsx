'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { num } from '@/lib/format';
import { EXPERIENCE_CATEGORY_META, type CountryId } from '@/lib/countries';
import { CATEGORY_ICONS } from '@/components/shared/CountryExperiences';
import { 
  Plane, 
  BedDouble, 
  Sparkles, 
  CalendarDays, 
  MapPin, 
  Sun, 
  Sunset, 
  MoonStar, 
  Clock, 
  Printer, 
  Compass, 
  Lightbulb, 
  Send, 
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  type LucideIcon 
} from 'lucide-react';
import type { PickedExperience, PlanPackage } from '@/hooks/usePlanner';
import { lt } from '@/lib/lt';

interface PlannerTimelineProps {
  plan: PlanPackage;
  days: number;
  locale: string;
  isEn: boolean;
  countryId?: CountryId;
  onRegenerate?: () => void;
  onEditAnswers?: () => void;
  onRefineWithPrompt?: (promptText: string) => void;
}

const slotIcon = (slot: number): LucideIcon => (slot === 1 ? Sun : slot === 2 ? Sunset : MoonStar);

const slotLabel = (slot: number, locale: string) => {
  if (slot === 1) return lt(locale, { fa: 'صبح', en: 'Morning', ar: 'الصباح', zh: '上午', ru: 'Утро' });
  if (slot === 2) return lt(locale, { fa: 'بعدازظهر', en: 'Afternoon', ar: 'بعد الظهر', zh: '下午', ru: 'День' });
  return lt(locale, { fa: 'عصر و شب', en: 'Evening', ar: 'المساء', zh: '晚上', ru: 'Вечер' });
};

export function PlannerTimeline({ 
  plan, 
  days, 
  locale, 
  isEn, 
  countryId = 'iran',
  onRegenerate, 
  onEditAnswers,
  onRefineWithPrompt 
}: PlannerTimelineProps) {
  const t = useTranslations('Plan');
  const [refineText, setRefineText] = useState('');
  const [justRefined, setJustRefined] = useState(false);

  const currencyLabel = lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'туманов' });

  const quickRefinePrompts = [
    { 
      label: lt(locale, { fa: '💰 اقتصادی‌تر و ارزان‌تر', en: '💰 Cheaper budget', ar: '💰 ميزانية اقتصادية', zh: '💰 更经济', ru: '💰 Экономнее' }), 
      text: 'اقتصادی و ارزان' 
    },
    { 
      label: lt(locale, { fa: '👑 لوکس و ۵ ستاره', en: '👑 5-star luxury', ar: '👑 فاخر 5 نجوم', zh: '👑 奢华五星', ru: '👑 Люкс 5*' }), 
      text: 'لوکس و پنج ستاره' 
    },
    { 
      label: lt(locale, { fa: '🏛️ گشت‌های تاریخی بیشتر', en: '🏛️ More culture', ar: '🏛️ تاريخ وثقافة أكثر', zh: '🏛️ 更多文化古迹', ru: '🏛️ Больше истории' }), 
      text: 'تاریخی و فرهنگی' 
    },
    { 
      label: lt(locale, { fa: '🌿 طبیعت‌گردی و فضای باز', en: '🌿 More nature', ar: '🌿 طبيعة أكثر', zh: '🌿 更多自然风光', ru: '🌿 Больше природы' }), 
      text: 'طبیعت و کوهستان' 
    },
    { 
      label: lt(locale, { fa: '🛍️ بازار و مراکز خرید', en: '🛍️ Shopping & malls', ar: '🛍️ تسوق ومراكز تجارية', zh: '🛍️ 购物与商场', ru: '🛍️ Больше шопинга' }), 
      text: 'خرید و بازار' 
    },
    { 
      label: lt(locale, { fa: '☕ برنامه آرامش‌بخش و سبک', en: '☕ Relaxed & easy pace', ar: '☕ وتيرة هادئة ومريحة', zh: '☕ 轻松闲适节奏', ru: '☕ Спокойный темп' }), 
      text: 'آرام و استراحت' 
    },
  ];

  const handleRefineSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (onRefineWithPrompt && refineText.trim()) {
      onRefineWithPrompt(refineText.trim());
      setRefineText('');
      setJustRefined(true);
      setTimeout(() => setJustRefined(false), 3000);
    } else if (onRegenerate) {
      onRegenerate();
    }
  };

  const handleQuickRefineClick = (prompt: string) => {
    if (onRefineWithPrompt) {
      onRefineWithPrompt(prompt);
      setJustRefined(true);
      setTimeout(() => setJustRefined(false), 3000);
    }
  };

  return (
    <div className="flex flex-col gap-6 min-w-0">
      {/* Destination Travel Tips Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-mint/70 via-surface to-soft border border-brand/20 p-5 shadow-sm flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand-dark flex items-center justify-center shrink-0 mt-0.5">
          <Lightbulb size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="text-sm font-black text-ink m-0">
              {lt(locale, { fa: 'توصیه هوشمند سفر فیروزه', en: 'Firuzo Smart Travel Insight', ar: 'نصيحة فيروزو الذكية للسفر', zh: 'Firuzo 智能出行锦囊', ru: 'Умный совет путешественникам' })}
            </h3>
            <button
              type="button"
              onClick={() => typeof window !== 'undefined' && window.print()}
              className="text-xs font-bold text-sub hover:text-brand-dark flex items-center gap-1.5 transition print:hidden"
              title="Print itinerary"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">{lt(locale, { fa: 'چاپ برنامه', en: 'Print Itinerary', ar: 'طباعة الخطة', zh: '打印行程', ru: 'Печать' })}</span>
            </button>
          </div>
          <p className="text-xs text-sub font-medium leading-relaxed m-0">
            {lt(locale, {
              fa: 'برنامه زیر با رعایت فاصله مکانی جاذبه‌ها و عدم تداخل ساعات پرواز و ورود به هتل چیده شده است. ترانسفر فرودگاهی و بیمه مسافرتی نیز به صورت خودکار محاسبه گردیده‌اند.',
              en: 'This itinerary is optimized for minimal transit time and synchronized check-in hours. Airport transfers and comprehensive insurance are integrated.',
              ar: 'تم ترتيب الخطة مع مراعاة المسافات الجغرافية وتوافق مواعيد الوصول والتسجيل في الفندق.',
              zh: '本行程已按地理距离优化，并自动匹配酒店入住与航班时间，含接送与旅行险。',
              ru: 'Маршрут оптимизирован с учетом времени в пути и расписания заселения в отель.',
            })}
          </p>
        </div>
      </div>

      {/* Flight Card */}
      <article className="rounded-2xl bg-surface border border-line/80 shadow-sm p-5 hover:border-brand/30 transition">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-brand text-surface grid place-items-center shrink-0 shadow-xs">
              <Plane size={18} />
            </span>
            <div>
              <h3 className="text-base font-black text-ink m-0">{t('arrivalDay')} — {t('flight')}</h3>
              <span className="text-xs font-bold text-sub">{plan.flight.airline} · {plan.flight.flightNo}</span>
            </div>
          </div>
          <div className="text-end">
            <span className="text-price font-black num text-base">{num(plan.flightTotal, locale)}</span>
            <span className="text-[11px] font-bold text-sub ms-1">{currencyLabel}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-soft/60 border border-line/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold text-ink">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-3 py-1 rounded-lg bg-surface border border-line text-ink font-bold shadow-2xs">
              {plan.flight.origin}
            </span>
            <span className="text-brand-dark flex items-center justify-center w-6 h-6 rounded-full bg-mint shrink-0 shadow-2xs">
              <ArrowLeft size={13} className="rtl:inline ltr:hidden" />
              <ArrowRight size={13} className="ltr:inline rtl:hidden" />
            </span>
            <span className="px-3 py-1 rounded-lg bg-surface border border-brand/40 text-brand-dark font-black shadow-2xs">
              {plan.flight.destination}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sub font-mono bg-surface px-3 py-1.5 rounded-lg border border-line/50 self-start sm:self-auto shadow-2xs" dir="ltr">
            <Clock size={14} className="text-brand-dark" />
            <span>{plan.flight.departureTime} — {plan.flight.arrivalTime}</span>
          </div>
        </div>
      </article>

      {/* Hotel Card */}
      <article className="rounded-2xl bg-surface border border-line/80 shadow-sm p-5 hover:border-brand/30 transition">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-hotel text-surface grid place-items-center shrink-0 shadow-xs">
              <BedDouble size={18} />
            </span>
            <div>
              <h3 className="text-base font-black text-ink m-0">{t('hotel')}</h3>
              <span className="text-xs font-bold text-sub flex items-center gap-1 mt-0.5">
                <MapPin size={12} className="text-brand-dark" />
                <span>{isEn ? plan.hotel.cityEn : plan.hotel.city}</span>
              </span>
            </div>
          </div>
          <div className="text-end">
            <span className="text-price font-black num text-base">{num(plan.hotelTotal, locale)}</span>
            <span className="text-[11px] font-bold text-sub ms-1">{currencyLabel}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-soft/60 border border-line/50 flex flex-wrap items-center justify-between gap-3 text-xs font-bold">
          <span className="text-ink font-black">{isEn ? plan.hotel.nameEn : plan.hotel.name}</span>
          <span className="text-sub">
            {t('hotelNights', { nights: num(plan.nights, locale), rooms: num(plan.rooms, locale) })}
          </span>
        </div>
      </article>

      {/* Daily Timeline Itinerary Cards */}
      <div className="space-y-4">
        {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
          const dayItems = plan.picked.filter((p: PickedExperience) => p.day === day);
          if (!dayItems.length) return null;
          return (
            <article key={day} className="rounded-2xl bg-surface border border-line/80 shadow-sm p-5 hover:border-brand/20 transition">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-line/60">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-brand-dark text-surface grid place-items-center text-sm font-black shrink-0 num shadow-xs">
                    {num(day, locale)}
                  </span>
                  <div>
                    <h3 className="text-base font-black text-ink m-0">
                      {t('day')} {num(day, locale)}
                    </h3>
                    <span className="text-[11px] text-sub font-medium">
                      {num(dayItems.length, locale)} {lt(locale, { fa: 'برنامه اختصاصی', en: 'curated activities', ar: 'نشاط منتقى', zh: '项精选体验', ru: 'активности' })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {dayItems.map(({ e, slot, why }: PickedExperience, idx: number) => {
                  const Icon = CATEGORY_ICONS[e.category];
                  const SIcon = slotIcon(slot);
                  return (
                    <div 
                      key={`${e.titleEn}-${idx}`} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-soft/50 border border-line/60 hover:bg-soft transition"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="w-10 h-10 rounded-xl bg-mint text-brand-dark grid place-items-center shrink-0 mt-0.5">
                          <Icon size={18} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <b className="text-sm font-black text-ink">{isEn ? e.titleEn : e.title}</b>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface border border-line text-brand-dark text-[10.5px] font-bold">
                              <SIcon size={11} /> 
                              <span>{slotLabel(slot, locale)}</span>
                            </span>
                          </div>

                          <span className="text-xs font-bold text-brand-dark bg-mint/70 rounded-md px-2 py-0.5 inline-block">
                            {why}
                          </span>

                          <div className="flex items-center gap-3 mt-2 text-[11px] text-sub font-medium flex-wrap">
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={11} className="text-brand-dark" />
                              <span>{isEn ? e.whereEn : e.where}</span>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays size={11} /> 
                              <span>{isEn ? e.whenEn : e.when}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="self-end sm:self-center text-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line/40 w-full sm:w-auto">
                        <span className="text-price text-sm font-black num block">
                          {num(e.fromPrice, locale)}
                        </span>
                        <span className="text-[10px] font-bold text-sub">
                          {currencyLabel} / نفر
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>

      {!plan.picked.length && (
        <div className="text-center py-14 bg-surface rounded-2xl border border-dashed border-line">
          <Sparkles size={40} className="mx-auto text-line mb-3" />
          <p className="text-sub font-bold text-xs m-0">{t('emptyCats')}</p>
        </div>
      )}

      {/* Smart AI Refinement & Custom Itinerary Assistant */}
      <div className="rounded-3xl border-2 border-brand/30 bg-surface p-6 shadow-elev-1">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h4 className="text-base font-black text-ink m-0 flex items-center gap-2">
            <Sparkles size={18} className="text-brand animate-pulse" />
            <span>{lt(locale, { fa: 'ویرایش و بازآفرینی هوشمند برنامه با هوش مصنوعی', en: 'Refine Itinerary with AI Copilot', ar: 'تعديل وإعادة صياغة الخطة بالذكاء الاصطناعي', zh: '使用 AI 智能助手微调行程', ru: 'Умная доработка маршрута с AI' })}</span>
          </h4>
          {justRefined && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold animate-in fade-in">
              <CheckCircle2 size={13} />
              <span>{lt(locale, { fa: 'برنامه به‌روزرسانی شد!', en: 'Plan updated!', ar: 'تم تحديث الخطة!', zh: '行程已更新！', ru: 'Маршрут обновлен!' })}</span>
            </span>
          )}
        </div>

        <p className="text-xs text-sub font-medium mb-4 leading-relaxed">
          {lt(locale, {
            fa: 'می‌توانید به زبان ساده تغییرات دلخواهتان را بنویسید؛ مثلاً بودجه را ارزان‌تر کن، هتل ۵ ستاره بذار، یا برنامه‌های تفریحی را افزایش بده.',
            en: 'Type any adjustment in natural language: e.g., make it cheaper, switch to luxury stays, or add more cultural walking tours.',
            ar: 'اكتب التعديلات المطلوبة بلغة طبيعية، مثلاً ميزانية أرخص أو فندق فاخر أو أنشطة إضافية.',
            zh: '您可以直接用自然语言描述需求，例如降低预算、升级五星酒店或增加文化游览。',
            ru: 'Напишите пожелания обычным языком: например, сделать тур дешевле или выбрать отель 5*.',
          })}
        </p>

        <form onSubmit={handleRefineSubmit} className="space-y-3">
          <div className="relative">
            <textarea
              value={refineText}
              onChange={(e) => setRefineText(e.target.value)}
              className="w-full bg-soft/50 border border-line rounded-2xl p-3.5 text-xs font-bold text-ink resize-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition"
              rows={2}
              placeholder={lt(locale, {
                fa: 'مثلاً: بودجه را ارزان‌تر کن، هتل لوکس‌تری می‌خوام، یا برنامه‌های فرهنگی را بیشتر کن...',
                en: 'E.g., Make it cheaper, select a luxury 5-star hotel, or add more museums...',
                ar: 'مثلاً: ميزانية أرخص، أو فندق فاخر، أو رحلات ثقافية أكثر...',
                zh: '例如：降低总预算、选用五星级酒店或增加博物馆行程...',
                ru: 'Например: сделай дешевле, выбери отель 5* или добавь музеи...',
              })}
            />
          </div>

          {/* Quick AI Refine Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {quickRefinePrompts.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleQuickRefineClick(p.text)}
                className="px-3 py-1 rounded-full bg-soft hover:bg-mint hover:text-brand-dark border border-line/60 text-xs font-bold text-sub transition cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-line/60">
            <button 
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-surface text-xs font-black shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles size={14} /> 
              <span>{lt(locale, { fa: 'اعمال تغییرات هوشمند', en: 'Apply AI Refinement', ar: 'تطبيق التعديل الذكي', zh: '应用智能调整', ru: 'Применить изменения' })}</span>
            </button>
            <button 
              type="button"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-line bg-surface hover:bg-soft text-ink text-xs font-bold transition cursor-pointer" 
              onClick={onRegenerate}
            >
              {lt(locale, { fa: 'پیشنهاد جایگزین (Shuffle)', en: 'Shuffle Picks', ar: 'اقتراح بديل', zh: '换一批推荐', ru: 'Другой вариант' })}
            </button>
            <button 
              type="button"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-line bg-surface hover:bg-soft text-ink text-xs font-bold transition cursor-pointer ms-auto"
              onClick={onEditAnswers}
            >
              {lt(locale, { fa: 'ویرایش پاسخ‌های پرسشنامه', en: 'Edit Wizard Answers', ar: 'تعديل الإجابات', zh: '修改向导选项', ru: 'Изменить ответы' })}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
