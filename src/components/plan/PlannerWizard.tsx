'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES, COUNTRY_ORDER, EXPERIENCE_CATEGORY_META, countryName, type CountryId, type ExperienceCategory } from '@/lib/countries';
import { num } from '@/lib/format';
import { CATEGORY_ICONS } from '@/components/shared/CountryExperiences';
import { 
  ArrowLeft, 
  ArrowRight, 
  Sun, 
  Sunset, 
  MoonStar, 
  Users, 
  User, 
  Heart, 
  Baby, 
  Sparkles,
  Check, 
  type LucideIcon 
} from 'lucide-react';
import { BUDGET_CAP, BUDGET_LABEL, type Answers, type BudgetTier, type Pace, type Who } from '@/hooks/usePlanner';
import { lt, type LText } from '@/lib/lt';

export const QUESTIONS = ['dest', 'who', 'days', 'interests', 'budget', 'pace'] as const;

const PACE_META: Record<Pace, { key: 'paceRelaxed' | 'paceBalanced' | 'pacePacked'; Icon: LucideIcon; desc: LText }> = {
  relaxed: { 
    key: 'paceRelaxed', 
    Icon: Sun,
    desc: { fa: '۱ برنامه در روز • استراحت کامل، کافه‌گردی و بدون عجله', en: '1 activity per day • Maximum relaxation & leisure', ar: '١ نشاط يومياً • راحة تامة واسترخاء', zh: '每天1个行程 • 彻底放松休闲', ru: '1 активность в день • Максимум отдыха' }
  },
  balanced: { 
    key: 'paceBalanced', 
    Icon: Sunset,
    desc: { fa: '۲ برنامه در روز • توازن ایده‌آل بین گشت و گذار و استراحت', en: '2 activities per day • Ideal mix of sightseeing & rest', ar: '٢ نشاط يومياً • توازن مثالي بين السياحة والراحة', zh: '每天2个行程 • 观光与休息的完美平衡', ru: '2 активности в день • Идеальный баланс экскурсий и отдыха' }
  },
  packed: { 
    key: 'pacePacked', 
    Icon: MoonStar,
    desc: { fa: '۳ برنامه در روز • دیدن بیشترین جاذبه‌ها و تجربه حداکثری', en: '3 activities per day • Comprehensive action-packed explore', ar: '٣ نشاطات يومياً • أقصى استكشاف وتجربة شاملة', zh: '每天3个行程 • 全面紧凑的探索之旅', ru: '3 активности в день • Максимум впечатлений' }
  },
};

const WHO_META: Record<Who, { Icon: LucideIcon; desc: LText }> = {
  solo: { Icon: User, desc: { fa: 'سفر تک‌نفره، مستقل و کشف آزادانه', en: 'Solo explorer, total freedom', ar: 'سفر تک‌نفره، مستقل و کشف آزادانه', zh: 'Solo explorer, total freedom', ru: 'Solo explorer, total freedom' } },
  duo: { Icon: Heart, desc: { fa: 'دونفره، رمانتیک و سرشار از خاطره', en: 'Couples & romantic escapes', ar: 'دونفره، رمانتیک و سرشار از خاطره', zh: 'Couples & romantic escapes', ru: 'Couples & romantic escapes' } },
  family: { Icon: Baby, desc: { fa: 'سفر خانوادگی، امن و مناسب کودکان', en: 'Family trip with kids friendly stays', ar: 'سفر خانوادگی، امن و مناسب کودکان', zh: 'Family trip with kids friendly stays', ru: 'Family trip with kids friendly stays' } },
  friends: { Icon: Users, desc: { fa: 'سفر گروهی با دوستان، تفریح و هیجان', en: 'Travel with best friends & adventure', ar: 'سفر گروهی با دوستان، تفریح و هیجان', zh: 'Travel with best friends & adventure', ru: 'Travel with best friends & adventure' } },
};

const DEST_TAGS: Record<CountryId, { fa: string; en: string }> = {
  iran: { fa: 'فرهنگ، شعر و تاریخ کهن', en: 'Culture, poetry & ancient history' },
  turkey: { fa: 'خرید، بسفر و خیابان‌های زنده', en: 'Shopping, Bosphorus & vibrant streets' },
  uae: { fa: 'مدرنیته، آسمان‌خراش‌ها و ساحل', en: 'Modernity, skyscrapers & sunny beaches' },
  georgia: { fa: 'کوهستان، طبیعت بکر و بافت تاریخی', en: 'Lush mountains & historic charm' },
  russia: { fa: 'کاخ‌های باشکوه و هنر کلاسیک', en: 'Imperial palaces & classical art' },
  oman: { fa: 'سواحل فیروزه‌ای، آرامش و سافاری', en: 'Turquoise waters, peace & desert safari' },
  china: { fa: 'تمدن عظیم، فناوری و دیوار بزرگ', en: 'Vast civilization, tech & Great Wall' },
};

interface PlannerWizardProps {
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  ans: Answers;
  setAns: React.Dispatch<React.SetStateAction<Answers>>;
  locale: string;
  setSeed: React.Dispatch<React.SetStateAction<number>>;
}

export function PlannerWizard({ step, setStep, ans, setAns, locale, setSeed }: PlannerWizardProps) {
  const t = useTranslations('Plan');
  const { country, setCountry } = useCountryStore();
  const isEn = locale === 'en';

  const poolCount = useMemo(() => {
    const c = COUNTRIES[ans.dest ?? country];
    const cap = BUDGET_CAP[ans.budget ?? 'balanced'];
    const interests = ans.interests ?? [];
    return c.signatureExperiences.filter((e) => {
      const catOk = interests.length === 0 || interests.includes(e.category);
      return catOk && e.fromPrice <= cap;
    }).length;
  }, [ans.dest, country, ans.budget, ans.interests]);

  const rail = (
    <div className="flex items-center gap-1.5 mb-3" aria-hidden>
      {QUESTIONS.map((q, j) => (
        <span 
          key={q} 
          className={`h-2 rounded-full transition-all duration-300 ${
            j === step 
              ? 'w-10 bg-brand shadow-sm shadow-brand/30' 
              : j < step 
              ? 'w-4 bg-brand/70' 
              : 'w-4 bg-line'
          }`} 
        />
      ))}
    </div>
  );

  const qHead = (title: string, sub: string) => (
    <div className="mb-6">
      {rail}
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <p className="m-0 text-xs font-bold text-sub">
          {t('progress', { i: num(Math.min(step + 1, QUESTIONS.length), locale), n: num(QUESTIONS.length, locale) })}
        </p>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-mint text-brand-dark text-xs font-black">
          <Sparkles size={12} />
          <span>{t('pool', { count: num(poolCount, locale) })}</span>
        </span>
      </div>
      <h1 className="text-2xl md:text-3xl font-black text-ink tracking-tight m-0 mb-2">{title}</h1>
      <p className="text-sub text-xs md:text-sm font-medium m-0">{sub}</p>
    </div>
  );

  const qFoot = (canBack: boolean) => (
    <div className="flex items-center justify-between gap-4 mt-8 pt-4 border-t border-line">
      {canBack ? (
        <button 
          onClick={() => setStep((s) => Math.max(0, s - 1))} 
          className="text-xs font-bold text-sub hover:text-brand-dark inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-lg px-2 py-1 transition"
        >
          <ArrowRight size={14} className="rtl:block ltr:hidden" />
          <ArrowLeft size={14} className="ltr:block rtl:hidden" /> 
          <span>{t('back')}</span>
        </button>
      ) : <div />}
      <button 
        onClick={() => setStep((s) => s + 1)} 
        className="text-xs font-bold text-sub hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-lg px-2 py-1 transition"
      >
        {t('skip')}
      </button>
    </div>
  );

  const q = QUESTIONS[step];

  return (
    <div className="max-w-[840px] mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-24">
      <div className="p-6 md:p-10 rounded-3xl bg-surface border border-line/80 shadow-elev-2">
        {/* STEP 1: DESTINATION */}
        {q === 'dest' && (
          <>
            {qHead(t('qDest'), t('qDestSub'))}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {COUNTRY_ORDER.map((id: CountryId) => {
                const isSelected = ans.dest === id;
                const c = COUNTRIES[id];
                const tag = DEST_TAGS[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { 
                      setAns((a) => ({ ...a, dest: id })); 
                      if (id !== country) setCountry(id); 
                      setStep(1); 
                    }}
                    className={`p-4 rounded-2xl border text-start flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                      isSelected 
                        ? 'border-brand bg-mint/40 ring-2 ring-brand/30 shadow-md shadow-brand/10' 
                        : 'border-line bg-surface hover:border-brand/60 hover:bg-soft/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{c.flag}</span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-brand text-surface flex items-center justify-center">
                            <Check size={12} />
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-black text-ink m-0">
                        {countryName(id, locale)}
                      </h3>
                      <p className="text-[11px] text-sub font-medium mt-1 line-clamp-1">
                        {isEn ? tag.en : tag.fa}
                      </p>
                    </div>

                    <div className="mt-4 pt-2 border-t border-line/50 flex items-center justify-between text-[11px] font-bold text-brand-dark">
                      <span>{num(c.signatureExperiences.length, locale)} {lt(locale, { fa: 'تجربه اختصاصی', en: 'experiences', ar: 'تجربة', zh: '个体验', ru: 'впечатлений' })}</span>
                      <span className="text-sub font-mono">{c.currency}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {qFoot(false)}
          </>
        )}

        {/* STEP 2: WHO */}
        {q === 'who' && (
          <>
            {qHead(t('qWho'), t('qWhoSub'))}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['solo', 'duo', 'family', 'friends'] as Who[]).map((w) => {
                const isSelected = ans.who === w;
                const meta = WHO_META[w];
                const Icon = meta.Icon;
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => { setAns((a) => ({ ...a, who: w })); setStep(2); }}
                    className={`p-4 sm:p-5 rounded-2xl border text-start flex items-start gap-4 transition-all duration-200 cursor-pointer ${
                      isSelected 
                        ? 'border-brand bg-mint/50 ring-2 ring-brand/30 shadow-md shadow-brand/10' 
                        : 'border-line bg-surface hover:border-brand/60 hover:bg-soft/50'
                    }`}
                  >
                    <span className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition ${
                      isSelected ? 'bg-brand text-surface shadow-sm' : 'bg-soft text-brand-dark'
                    }`}>
                      <Icon size={22} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <b className="text-base font-black text-ink">{t(`who${w[0].toUpperCase()}${w.slice(1)}`)}</b>
                        {isSelected && <Check size={16} className="text-brand shrink-0" />}
                      </div>
                      <p className="text-xs text-sub font-medium mt-1 leading-relaxed">
                        {lt(locale, meta.desc)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            {qFoot(true)}
          </>
        )}

        {/* STEP 3: DAYS */}
        {q === 'days' && (
          <>
            {qHead(t('qDays'), t('qDaysSub'))}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 mb-6">
              {[
                { n: 3, tagFa: 'آخر هفته', tagEn: 'Weekend' },
                { n: 4, tagFa: 'کوتاه و مفید', tagEn: 'Short' },
                { n: 5, tagFa: 'استاندارد', tagEn: 'Standard' },
                { n: 7, tagFa: 'یک هفته کامل', tagEn: '1 Week' },
                { n: 10, tagFa: 'جامع', tagEn: 'Extended' },
                { n: 14, tagFa: 'اکتشاف عمیق', tagEn: '2 Weeks' },
              ].map(({ n, tagFa, tagEn }) => {
                const isSelected = ans.days === n;
                return (
                  <button 
                    key={n} 
                    type="button"
                    onClick={() => { setAns((a) => ({ ...a, days: n })); setStep(3); }} 
                    className={`py-4 px-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-brand bg-brand text-surface shadow-md shadow-brand/20 scale-105' 
                        : 'border-line bg-soft/50 hover:bg-soft text-ink hover:border-brand/40'
                    }`}
                  >
                    <span className="text-2xl font-black block font-mono mb-1">{num(n, locale)}</span>
                    <span className="text-xs font-bold block">{t('qDays')}</span>
                    <span className={`text-[10px] font-bold block mt-1 ${isSelected ? 'text-surface/80' : 'text-sub'}`}>
                      {isEn ? tagEn : tagFa}
                    </span>
                  </button>
                );
              })}
            </div>
            {qFoot(true)}
          </>
        )}

        {/* STEP 4: INTERESTS */}
        {q === 'interests' && (
          <>
            {qHead(t('qInterests'), t('qInterestsSub'))}
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="text-xs font-bold text-sub">
                {ans.interests?.length 
                  ? lt(locale, { fa: `${num(ans.interests.length, locale)} دسته انتخاب شده`, en: `${num(ans.interests.length, locale)} categories selected`, ar: `${num(ans.interests.length, locale)} فئات مختارة`, zh: `已选 ${num(ans.interests.length, locale)} 项`, ru: `Выбрано: ${num(ans.interests.length, locale)}` })
                  : lt(locale, { fa: 'می‌توانید چند گزینه را هم‌زمان انتخاب کنید:', en: 'You can select multiple categories:', ar: 'يمكنك تحديد فئات متعددة:', zh: '可多选感兴趣的体验：', ru: 'Можно выбрать несколько категорий:' })
                }
              </span>
              <button
                type="button"
                onClick={() => setAns((a) => ({ ...a, interests: (a.interests?.length ?? 0) === Object.keys(EXPERIENCE_CATEGORY_META).length ? [] : Object.keys(EXPERIENCE_CATEGORY_META) as ExperienceCategory[] }))}
                className="text-xs font-bold text-brand hover:underline"
              >
                {(ans.interests?.length ?? 0) === Object.keys(EXPERIENCE_CATEGORY_META).length
                  ? lt(locale, { fa: 'پاک کردن همه', en: 'Clear all', ar: 'إلغاء التحديد', zh: '清空全选', ru: 'Сбросить' })
                  : lt(locale, { fa: 'انتخاب همه', en: 'Select all', ar: 'تحديد الكل', zh: '选择全部', ru: 'Выбрать все' })
                }
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {(Object.keys(EXPERIENCE_CATEGORY_META) as ExperienceCategory[]).map((cat) => {
                const Icon = CATEGORY_ICONS[cat];
                const on = (ans.interests ?? []).includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setAns((a) => {
                      const cur = a.interests ?? [];
                      return { ...a, interests: cur.includes(cat) ? cur.filter((x) => x !== cat) : [...cur, cat] };
                    })}
                    className={`p-3.5 rounded-xl text-xs font-black inline-flex items-center gap-2.5 transition-all text-start border cursor-pointer ${
                      on 
                        ? 'bg-brand text-surface border-brand shadow-sm shadow-brand/20' 
                        : 'bg-soft/70 border-line text-ink hover:border-brand/40 hover:bg-soft'
                    }`}
                  >
                    <Icon size={18} className={on ? 'text-surface' : 'text-brand'} />
                    <span className="truncate">
                      {lt(locale, { 
                        fa: EXPERIENCE_CATEGORY_META[cat].fa, 
                        en: EXPERIENCE_CATEGORY_META[cat].en, 
                        ar: EXPERIENCE_CATEGORY_META[cat].fa, 
                        zh: EXPERIENCE_CATEGORY_META[cat].en, 
                        ru: EXPERIENCE_CATEGORY_META[cat].en 
                      })}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setStep(4)}
              className="mt-8 w-full h-12 rounded-2xl bg-brand hover:bg-brand-dark text-surface font-black text-sm inline-flex items-center justify-center gap-2 shadow-md shadow-brand/20 transition cursor-pointer"
            >
              <span>{t('continue')}</span>
              <ArrowLeft size={16} className="rtl:block ltr:hidden" />
              <ArrowRight size={16} className="ltr:block rtl:hidden" />
            </button>
            {qFoot(true)}
          </>
        )}

        {/* STEP 5: BUDGET */}
        {q === 'budget' && (
          <>
            {qHead(t('qBudget'), t('qBudgetSub'))}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['economy', 'balanced', 'luxury'] as BudgetTier[]).map((b) => {
                const isSelected = ans.budget === b;
                return (
                  <button 
                    key={b} 
                    type="button"
                    onClick={() => { setAns((a) => ({ ...a, budget: b })); setStep(5); }} 
                    className={`p-5 rounded-2xl border text-center transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-brand bg-mint/60 ring-2 ring-brand/30 shadow-md shadow-brand/10' 
                        : 'border-line bg-surface hover:border-brand/40 hover:bg-soft/50'
                    }`}
                  >
                    <b className="block text-base font-black text-ink mb-1">
                      {lt(locale, { fa: BUDGET_LABEL[b].fa, en: BUDGET_LABEL[b].en, ar: BUDGET_LABEL[b].fa, zh: BUDGET_LABEL[b].en, ru: BUDGET_LABEL[b].en })}
                    </b>
                    <span className="text-xs text-sub block mb-3">
                      {b === 'economy' && lt(locale, { fa: 'هتل اقتصادی + پرواز استاندارد', en: 'Budget hotel + standard flight', ar: 'فندق اقتصادي + طيران قياسي', zh: '经济酒店+标准航班', ru: 'Эконом-отель + базовый рейс' })}
                      {b === 'balanced' && lt(locale, { fa: 'هتل ۴ ستاره + پرواز و گشت‌ها', en: '4-star stay + popular tours', ar: 'فندق 4 نجوم + جولات مميزة', zh: '四星酒店+精品游览', ru: 'Отель 4* + популярные туры' })}
                      {b === 'luxury' && lt(locale, { fa: 'هتل ۵ ستاره VIP + ترانسفر اختصاصی', en: '5-star VIP + private chauffeur', ar: 'فندق 5 نجوم VIP + سائق خاص', zh: '五星VIP+专车接送', ru: 'Отель 5* VIP + личный трансфер' })}
                    </span>
                    <div className="pt-3 border-t border-line/60">
                      <span className="block text-xs font-bold text-sub">{t('perPerson')}</span>
                      <span className="text-sm font-black text-price font-mono">
                        تا {num(BUDGET_CAP[b], locale)} <span className="text-[10px]">{lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'Toman' })}</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            {qFoot(true)}
          </>
        )}

        {/* STEP 6: PACE */}
        {q === 'pace' && (
          <>
            {qHead(t('qPace'), t('qPaceSub'))}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['relaxed', 'balanced', 'packed'] as Pace[]).map((p) => {
                const { key, Icon, desc } = PACE_META[p];
                const isSelected = ans.pace === p;
                return (
                  <button 
                    key={p} 
                    type="button"
                    onClick={() => { 
                      setAns((a) => ({ ...a, pace: p })); 
                      setStep(QUESTIONS.length); 
                      setSeed((s) => s + 1); 
                    }} 
                    className={`p-5 rounded-2xl border text-center flex flex-col items-center justify-between transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-brand bg-mint/60 ring-2 ring-brand/30 shadow-md shadow-brand/10' 
                        : 'border-line bg-surface hover:border-brand/40 hover:bg-soft/50'
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <span className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
                        isSelected ? 'bg-brand text-surface shadow-sm' : 'bg-mint text-brand-dark'
                      }`}>
                        <Icon size={22} />
                      </span>
                      <b className="text-base font-black text-ink mb-1">{t(key)}</b>
                      <p className="text-xs text-sub font-medium leading-relaxed mb-4">
                        {lt(locale, desc)}
                      </p>
                    </div>

                    <div className="w-full pt-3 border-t border-line/60 flex items-center justify-center gap-1">
                      <span className="text-xs font-black text-brand-dark">
                        {p === 'relaxed' && lt(locale, { fa: '۱ تجربه در روز', en: '1 per day', ar: '١ باليوم', zh: '每天1个', ru: '1 в день' })}
                        {p === 'balanced' && lt(locale, { fa: '۲ تجربه در روز', en: '2 per day', ar: '٢ باليوم', zh: '每天2个', ru: '2 в день' })}
                        {p === 'packed' && lt(locale, { fa: '۳ تجربه در روز', en: '3 per day', ar: '٣ باليوم', zh: '每天3个', ru: '3 в день' })}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            {qFoot(true)}
          </>
        )}
      </div>
    </div>
  );
}
