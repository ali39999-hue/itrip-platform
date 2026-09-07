'use client';

import { Sparkles } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { lt } from '@/lib/lt';

interface PlanSearchFormProps {
  query: string;
  setQuery: (val: string) => void;
}

export function PlanSearchForm({ query, setQuery }: PlanSearchFormProps) {
  const t = useTranslations('Search');
  const locale = useLocale();

  const quickPicks = [
    { label: lt(locale, { fa: 'استانبول ۴ روزه', en: 'Istanbul 4d', ar: 'إسطنبول 4 أيام', zh: '伊斯坦布尔4天', ru: 'Стамбул 4 дня' }), q: lt(locale, { fa: 'سفر ۴ روزه به استانبول با هتل ۵ ستاره', en: '4-day trip to Istanbul with 5-star hotel', ar: 'رحلة 4 أيام إلى إسطنبول بفندق 5 نجوم', zh: '伊斯坦布尔4日游含五星级酒店', ru: '4-дневная поездка в Стамбул в 5* отель' }) },
    { label: lt(locale, { fa: 'دبی ۳ روزه لوکس', en: 'Dubai 3d luxury', ar: 'دبي 3 أيام فاخرة', zh: '迪拜3天奢华', ru: 'Дубай 3 дня люкс' }), q: lt(locale, { fa: 'سفر لوکس ۳ روزه به دبی', en: '3-day luxury trip to Dubai', ar: 'رحلة فاخرة 3 أيام إلى دبي', zh: '迪拜3日奢华游', ru: 'Роскошный 3-дневный тур в Дубай' }) },
    { label: lt(locale, { fa: 'کیش خانوادگی', en: 'Kish family', ar: 'کیش عائلي', zh: '基什家庭游', ru: 'Киш для семьи' }), q: lt(locale, { fa: 'سفر خانوادگی به کیش با تفریحات دریایی', en: 'Family trip to Kish with water sports', ar: 'رحلة عائلية إلى كيش مع أنشطة بحرية', zh: '基什家庭亲子游含水上活动', ru: 'Семейная поездка на Киш с водными активностями' }) },
    { label: lt(locale, { fa: 'شیراز و اصفهان', en: 'Shiraz & Isfahan', ar: 'شيراز وأصفهان', zh: '设拉子与伊斯法罕', ru: 'Шираз и Исфахан' }), q: lt(locale, { fa: 'سفر فرهنگی به اصفهان و شیراز', en: 'Cultural trip to Isfahan and Shiraz', ar: 'رحلة ثقافية إلى أصفهان وشيراز', zh: '伊斯法罕与设拉子文化之旅', ru: 'Культурный тур в Исфахан и Шираз' }) },
  ];

  return (
    <>
      <div className="col-span-1 sm:col-span-8 lg:col-span-9 flex flex-col gap-2">
        <div className="relative flex items-center min-h-[58px] px-4 rounded-2xl bg-surface border border-line/80 hover:border-brand focus-within:border-brand focus-within:ring-2 focus-within:ring-brand shadow-sm transition">
          <Sparkles size={20} className="text-gold shrink-0 animate-pulse me-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('promptPlaceholder')}
            className="w-full border-0 outline-0 p-0 text-[13.5px] font-bold text-ink placeholder:text-sub bg-transparent leading-tight"
            id="search-ai-prompt-input"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap px-1">
          <span className="text-[11px] font-bold text-sub">{lt(locale, { fa: 'پیشنهادها:', en: 'Suggestions:', ar: 'اقتراحات:', zh: '建议：', ru: 'Подсказки:' })}</span>
          {quickPicks.map((pick, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setQuery(pick.q)}
              className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-soft hover:bg-mint hover:text-brand-dark border border-line/60 transition cursor-pointer text-sub"
            >
              {pick.label}
            </button>
          ))}
        </div>
      </div>

      <div className="col-span-1 sm:col-span-4 lg:col-span-3 self-start">
        <button
          type="submit"
          className="w-full min-h-[58px] px-6 rounded-2xl bg-action hover:bg-action-hover text-ink text-[15px] font-black shadow-elev-1 hover:shadow-elev-2 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Sparkles size={18} />
          <span>{t('btnPlan')}</span>
        </button>
      </div>
    </>
  );
}
