'use client';

import { useState, useMemo, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useBookingStore } from '@/stores/booking-store';
import {
  DESTINATION_ZONES,
  DURATION_PACKAGES,
  AGE_BRACKETS,
  COVERAGE_LIMIT_OPTIONS,
  INSURANCE_COMPANIES,
  ASSISTANCE_PARTNERS,
} from '@/lib/insurance-data';
import { InsuranceService, type CalculatedInsuranceCard } from '@/services/insurance-service';
import type {
  TravelInsuranceZone,
  InsuranceAgeBracket,
  InsuranceCoverageLimitEur,
} from '@/lib/types';
import { Sheet, SheetContent } from '@/components/ui/Sheet';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';
import { daysFromNow } from '@/lib/utils';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Users,
  Zap,
  Star,
  ChevronDown,
  ChevronUp,
  Filter,
  Check,
  Globe,
  Info,
  Plus,
  Minus,
  Edit2,
  HelpCircle,
  X,
  CreditCard,
} from 'lucide-react';

export default function InsurancePage() {
  const locale = useLocale();
  const router = useRouter();
  const isRtl = ['fa', 'ar'].includes(locale);

  const setBookingContext = useBookingStore((s) => s.setBookingContext);
  const addToCart = useBookingStore((s) => s.addToCart);

  // Search Parameters
  const [selectedZoneId, setSelectedZoneId] = useState<TravelInsuranceZone>('ZONE_TURKEY_NEIGHBORS');
  const [selectedDurationId, setSelectedDurationId] = useState<string>('1-7');
  const [passengersAges, setPassengersAges] = useState<InsuranceAgeBracket[]>(['13-65']);

  // Filters State (matching Screenshot 2 & 3)
  const [selectedCoverageLimit, setSelectedCoverageLimit] = useState<InsuranceCoverageLimitEur | 'ALL'>('ALL');
  const [selectedAssistanceId, setSelectedAssistanceId] = useState<string>('ALL');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');

  // Mobile Bottom Sheets
  const [zoneSheetOpen, setZoneSheetOpen] = useState<boolean>(false);
  const [durationSheetOpen, setDurationSheetOpen] = useState<boolean>(false);
  const [passengersSheetOpen, setPassengersSheetOpen] = useState<boolean>(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState<boolean>(false);

  // Order Details Modal / Drawer (matching Screenshot 1)
  const [orderSheetOpen, setOrderSheetOpen] = useState<boolean>(false);
  const [selectedPlanForOrder, setSelectedPlanForOrder] = useState<CalculatedInsuranceCard | null>(null);
  const [showMoreDetails, setShowMoreDetails] = useState<boolean>(false);

  // If user selected a zone that requires min 30k (e.g. Schengen), auto-adjust coverage if 10k was active
  const currentZone = useMemo(() => {
    return InsuranceService.getZoneById(selectedZoneId) || DESTINATION_ZONES[0];
  }, [selectedZoneId]);

  const currentDuration = useMemo(() => {
    return InsuranceService.getDurationById(selectedDurationId) || DURATION_PACKAGES[0];
  }, [selectedDurationId]);

  useEffect(() => {
    if (currentZone.requiresMin30k && selectedCoverageLimit === 10000) {
      setSelectedCoverageLimit(30000);
    }
  }, [currentZone, selectedCoverageLimit]);

  // Query Results
  const comparisonResults = useMemo<CalculatedInsuranceCard[]>(() => {
    const coverageLimits = selectedCoverageLimit === 'ALL' ? undefined : [selectedCoverageLimit];
    const assistanceIds = selectedAssistanceId === 'ALL' ? undefined : [selectedAssistanceId];
    const companyIds = selectedCompanyId === 'ALL' ? undefined : [selectedCompanyId];

    return InsuranceService.searchPlans({
      zoneId: selectedZoneId,
      durationId: selectedDurationId,
      passengersAges,
      coverageLimits,
      assistanceIds,
      companyIds,
      sortBy: 'price_asc',
    });
  }, [
    selectedZoneId,
    selectedDurationId,
    passengersAges,
    selectedCoverageLimit,
    selectedAssistanceId,
    selectedCompanyId,
  ]);

  // Number format helper
  const formatToman = (amount: number) => {
    return new Intl.NumberFormat(isRtl ? 'fa-IR' : 'en-US').format(amount);
  };

  // Add passenger handler
  const handleAddPassenger = () => {
    if (passengersAges.length >= 10) return;
    setPassengersAges((prev) => [...prev, '13-65']);
  };

  // Remove passenger handler
  const handleRemovePassenger = (index: number) => {
    if (passengersAges.length <= 1) return;
    setPassengersAges((prev) => prev.filter((_, i) => i !== index));
  };

  // Update passenger age
  const handleUpdateAge = (index: number, newBracket: InsuranceAgeBracket) => {
    setPassengersAges((prev) => {
      const updated = [...prev];
      updated[index] = newBracket;
      return updated;
    });
  };

  // Open Order Drawer for a selected plan
  const handleSelectPlan = (plan: CalculatedInsuranceCard) => {
    setSelectedPlanForOrder(plan);
    setOrderSheetOpen(true);
  };

  // Final Order Confirmation -> routes to checkout
  const handleConfirmOrder = () => {
    if (!selectedPlanForOrder) return;

    const plan = selectedPlanForOrder;
    const title = `${lt(locale, { fa: 'بیمه مسافرتی', en: 'Travel Insurance', ar: 'تأمين السفر', zh: '境外旅行保险', ru: 'Туристическая страховка' })} ${plan.company.nameFa}`;
    const subtitle = `${currentZone.titleFa} • ${currentDuration.labelFa} • ${plan.passengersCount} مسافر • پوشش €${plan.coverageEur.toLocaleString('en-US')}`;

    // 1. Set global booking context
    setBookingContext({
      type: 'insurance',
      id: plan.id,
      title,
      subtitle,
      amount: plan.finalPriceRials,
      currency: 'IRR',
      travelDate: daysFromNow(1),
      adults: plan.passengersCount,
      children: 0,
      meta: {
        planId: plan.basePlanId,
        companyCode: plan.company.code,
        companyName: plan.company.nameFa,
        assistanceCode: plan.assistance.code,
        assistanceName: plan.assistance.nameFa,
        coverageEur: String(plan.coverageEur),
        zoneId: plan.zoneId,
        durationId: plan.durationId,
        passengersCount: String(plan.passengersCount),
        passengersAges: passengersAges.join(','),
        instantIssuance: String(plan.instantIssuance),
        schengenApproved: String(plan.schengenCompliant),
      },
    });

    // 2. Add to persistent cart
    addToCart({
      type: 'INSURANCE',
      title,
      subtitle,
      supplier: plan.company.nameFa,
      count: plan.passengersCount,
      unitPrice: plan.finalPriceRials,
      currency: 'IRR',
      travelDate: daysFromNow(1),
      inventoryItemId: plan.id,
      details: {
        planId: plan.basePlanId,
        company: plan.company.nameFa,
        assistance: plan.assistance.nameFa,
        coverageEur: plan.coverageEur,
        zone: currentZone.titleFa,
        duration: currentDuration.labelFa,
        passengersCount: plan.passengersCount,
        passengersAges,
        finalPriceToman: plan.finalPriceToman,
      },
    });

    setOrderSheetOpen(false);
    router.push('/checkout');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 md:pb-16" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* ─── Top Breadcrumb & Clean Header Bar ──────────────────────── */}
      <div className="bg-white border-b border-border/80 px-4 md:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-muted">
          <div className="flex items-center gap-1.5 font-medium">
            <span>{lt(locale, { fa: 'فیروزو', en: 'Firuzo', ar: 'فيروزو', zh: 'Firuzo', ru: 'Firuzo' })}</span>
            <span>/</span>
            <span>{lt(locale, { fa: 'بیمه اشخاص', en: 'Personal Insurance', ar: 'تأمين الأشخاص', zh: '个人保险', ru: 'Личное страхование' })}</span>
            <span>/</span>
            <span className="text-ink font-bold">{lt(locale, { fa: 'بیمه مسافرتی', en: 'Travel Insurance', ar: 'بیمه مسافرتی', zh: '旅行保险', ru: 'Страховка' })}</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-brand text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{lt(locale, { fa: 'سامانه رسمی مقایسه و صدور آنی بیمه‌نامه', en: 'Official Instant Travel Insurance Portal', ar: 'المنصة الرسمية لمقارنة التأمين', zh: '官方即时比价与出单平台', ru: 'Официальный портал страхования' })}</span>
          </div>
        </div>
      </div>

      {/* ─── Main Content Container ─────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-6 space-y-6">
        {/* ─── Header Search & Criteria Bar (منطبق بر اسکرین‌شات ۴ و ۵) ── */}
        <section className="bg-white rounded-2xl p-5 md:p-6 border border-border shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/70 pb-4">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-ink flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-brand" />
                <span>{lt(locale, { fa: 'خرید آنلاین بیمه مسافرتی', en: 'Buy Travel Insurance Online', ar: 'شراء تأمين السفر أونلاين', zh: '在线选购境外旅游保险', ru: 'Купить туристическую страховку онлайн' })}</span>
              </h1>
              <p className="text-xs md:text-sm text-sub mt-1">
                {lt(locale, {
                  fa: 'مقایسه قیمت، سقف تعهدات و صدور آنی معتبرترین شرکت‌های بیمه با تضمین تاییدیه سفارتخانه‌ها',
                  en: 'Compare coverage limits, prices and instant issuance from top-rated insurers',
                  ar: 'مقارنة الأسعار وسقف التغطيات وإصدار فوري معتمد من السفارات',
                  zh: '比对各家保险公司保障额度与价格，尊享即时出单与使领馆认证',
                  ru: 'Сравнение тарифов и мгновенный выпуск полисов с подтверждением посольств',
                })}
              </p>
            </div>

            {/* Mobile Filter Trigger Button */}
            <button
              onClick={() => setFilterSheetOpen(true)}
              className="md:hidden flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-subtle border border-border text-ink text-xs font-bold min-h-[44px] touch-target"
            >
              <Filter className="w-4 h-4 text-brand" />
              <span>{lt(locale, { fa: 'فیلتر شرکت‌ها و سقف تعهد', en: 'Filters', ar: 'تصفية النتائج', zh: '筛选条件', ru: 'Фильтры' })}</span>
              {(selectedCoverageLimit !== 'ALL' || selectedAssistanceId !== 'ALL' || selectedCompanyId !== 'ALL') && (
                <span className="w-2 h-2 rounded-full bg-brand" />
              )}
            </button>
          </div>

          {/* Controls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
            {/* 1. Destination Zone Selector */}
            <div>
              <label className="block text-xs font-bold text-sub mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-brand" />
                <span>{lt(locale, { fa: 'کشور یا منطقه مقصد سفر', en: 'Destination Country / Zone', ar: 'بلد أو منطقة الوجهة', zh: '出行目的地国家/区域', ru: 'Страна или регион поездки' })}</span>
              </label>

              <button
                onClick={() => setZoneSheetOpen(true)}
                className="w-full h-11 px-3 rounded-xl border border-border bg-surface text-ink text-xs md:text-sm font-semibold flex items-center justify-between text-start hover:border-brand/50 transition-colors focus:ring-2 focus:ring-brand/30 min-h-[44px] touch-target"
              >
                <div className="flex items-center gap-2 truncate">
                  <MapPin className="w-4 h-4 text-brand shrink-0" />
                  <span className="truncate">{isRtl ? currentZone.titleFa : currentZone.titleEn}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-muted shrink-0" />
              </button>
            </div>

            {/* 2. Duration Selector */}
            <div>
              <label className="block text-xs font-bold text-sub mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand" />
                <span>{lt(locale, { fa: 'مدت زمان اقامت در سفر', en: 'Trip Duration', ar: 'مدة الإقامة في السفر', zh: '在境外逗留时长', ru: 'Срок пребывания' })}</span>
              </label>

              <button
                onClick={() => setDurationSheetOpen(true)}
                className="w-full h-11 px-3 rounded-xl border border-border bg-surface text-ink text-xs md:text-sm font-semibold flex items-center justify-between text-start hover:border-brand/50 transition-colors focus:ring-2 focus:ring-brand/30 min-h-[44px] touch-target"
              >
                <div className="flex items-center gap-2 truncate">
                  <Clock className="w-4 h-4 text-brand shrink-0" />
                  <span>{isRtl ? currentDuration.labelFa : currentDuration.labelEn}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-muted shrink-0" />
              </button>
            </div>

            {/* 3. Passengers & Ages Selector */}
            <div>
              <label className="block text-xs font-bold text-sub mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-brand" />
                <span>{lt(locale, { fa: 'تعداد مسافران و رده سنی', en: 'Travelers & Age Brackets', ar: 'عدد المسافرين والأعمار', zh: '旅客人数与年龄段', ru: 'Количество и возраст пассажиров' })}</span>
              </label>

              <button
                onClick={() => setPassengersSheetOpen(true)}
                className="w-full h-11 px-3 rounded-xl border border-border bg-surface text-ink text-xs md:text-sm font-semibold flex items-center justify-between text-start hover:border-brand/50 transition-colors focus:ring-2 focus:ring-brand/30 min-h-[44px] touch-target"
              >
                <div className="flex items-center gap-2 truncate">
                  <Users className="w-4 h-4 text-brand shrink-0" />
                  <span className="font-bold">
                    {num(passengersAges.length, locale)} {lt(locale, { fa: 'مسافر', en: 'Traveler(s)', ar: 'مسافر', zh: '位旅客', ru: 'пассажир(ов)' })}
                  </span>
                  <span className="text-xs text-muted truncate max-w-[140px] sm:max-w-none">
                    ({passengersAges.map((a) => AGE_BRACKETS.find((b) => b.id === a)?.[isRtl ? 'labelFa' : 'labelEn'] || a).join(isRtl ? '، ' : ', ')})
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-muted shrink-0" />
              </button>
            </div>
          </div>

          {/* Legal Info Banner (دقیقاً مطابق باکس پایین تصویر ۴ و ۵) */}
          <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-center gap-2.5 text-blue-900 text-xs font-medium">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              {lt(locale, {
                fa: 'اعتبار بیمه‌نامه از زمان درج مهر خروج بر روی گذرنامه آغاز می‌گردد.',
                en: 'Policy coverage commences from the departure stamp on the passport.',
                ar: 'يبدأ سريان وثيقة التأمين من تاريخ ختم الخروج على جواز السفر.',
                zh: '保单保障自护照加盖出境验讫章时起正式生效。',
                ru: 'Действие полиса начинается с момента проставления штампа о выезде в паспорте.',
              })}
            </span>
          </div>
        </section>

        {/* ─── Two-Column Comparison View (مطابق تصویر ۲ و ۳) ─────────── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* ─── Right Column: Sidebar Filters (Desktop) ─────────────── */}
          <aside className="hidden md:block md:col-span-4 lg:col-span-3 space-y-4 sticky top-20">
            {/* Box 1: Summary Card with Edit Pencil (مطابق تصویر ۲) */}
            <div className="bg-white rounded-2xl p-4 border border-border shadow-sm space-y-3">
              <div className="text-xs font-bold text-ink">
                {lt(locale, { fa: 'بیمه مسافرتی', en: 'Travel Insurance', ar: 'تأمين السفر', zh: '旅行保险', ru: 'Страховка' })}
              </div>

              <div className="p-3 rounded-xl bg-surface-subtle border border-border/80 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-ink">{isRtl ? currentZone.titleFa : currentZone.titleEn}</div>
                  <div className="text-[11px] text-muted mt-0.5">
                    {currentDuration.labelFa} | {passengersAges.length} مسافر
                  </div>
                </div>

                <button
                  onClick={() => setZoneSheetOpen(true)}
                  className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-brand hover:bg-brand-light/20 transition-colors"
                  title="ویرایش مشخصات سفر"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Assistance Company Filter Dropdown (مطابق تصویر ۲) */}
              <div className="pt-2 border-t border-border/70">
                <label className="block text-xs font-bold text-sub mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>{lt(locale, { fa: 'شرکت کمک‌رسان', en: 'Assistance Partner', ar: 'شركة المساعدة', zh: '救援机构', ru: 'Ассистанс' })}</span>
                    <HelpCircle className="w-3.5 h-3.5 text-muted" />
                  </span>
                </label>
                <select
                  value={selectedAssistanceId}
                  onChange={(e) => setSelectedAssistanceId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-surface text-ink text-xs focus:ring-2 focus:ring-brand/30 focus:outline-none"
                >
                  <option value="ALL">{lt(locale, { fa: 'همه شرکت‌های کمک‌رسان', en: 'All Assistance Partners', ar: 'جميع الشركات', zh: '全部救援机构', ru: 'Все ассистансы' })}</option>
                  {Object.values(ASSISTANCE_PARTNERS).map((p) => (
                    <option key={p.id} value={p.id}>
                      {isRtl ? p.nameFa : p.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Coverage Limit Radio Options (مطابق تصویر ۲ و ۳) */}
              <div className="pt-2 border-t border-border/70">
                <label className="block text-xs font-bold text-sub mb-2 flex items-center gap-1">
                  <span>{lt(locale, { fa: 'سقف خسارت پرداختی', en: 'Coverage Limit', ar: 'سقف التغطية', zh: '最高保障额度', ru: 'Лимит покрытия' })}</span>
                  <HelpCircle className="w-3.5 h-3.5 text-muted" />
                </label>

                <div className="space-y-2">
                  {COVERAGE_LIMIT_OPTIONS.map((opt) => (
                    <label
                      key={opt.id}
                      className="flex items-center gap-2.5 text-xs text-ink cursor-pointer select-none py-0.5"
                    >
                      <input
                        type="radio"
                        name="coverage_desktop"
                        checked={selectedCoverageLimit === opt.id}
                        onChange={() => setSelectedCoverageLimit(opt.id)}
                        className="w-4 h-4 text-brand focus:ring-brand accent-[#00A9A5]"
                      />
                      <span>{isRtl ? opt.labelFa : opt.labelEn}</span>
                      {opt.id === 50000 && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                          شنگن
                        </span>
                      )}
                    </label>
                  ))}

                  <label className="flex items-center gap-2.5 text-xs text-ink cursor-pointer select-none py-0.5">
                    <input
                      type="radio"
                      name="coverage_desktop"
                      checked={selectedCoverageLimit === 'ALL'}
                      onChange={() => setSelectedCoverageLimit('ALL')}
                      className="w-4 h-4 text-brand focus:ring-brand accent-[#00A9A5]"
                    />
                    <span>{lt(locale, { fa: 'بدون فیلتر', en: 'All Limits', ar: 'بدون تصفية', zh: '不限额度', ru: 'Любой лимит' })}</span>
                  </label>
                </div>
              </div>

              {/* Insurer Company Filter */}
              <div className="pt-2 border-t border-border/70">
                <label className="block text-xs font-bold text-sub mb-1.5">
                  {lt(locale, { fa: 'شرکت‌های بیمه‌گر', en: 'Insurance Company', ar: 'شركة التأمين', zh: '保险公司', ru: 'Страховая компания' })}
                </label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-surface text-ink text-xs focus:ring-2 focus:ring-brand/30 focus:outline-none"
                >
                  <option value="ALL">{lt(locale, { fa: 'همه شرکت‌های بیمه', en: 'All Insurers', ar: 'جميع شركات التأمين', zh: '全部保险公司', ru: 'Все компании' })}</option>
                  {Object.values(INSURANCE_COMPANIES).map((c) => (
                    <option key={c.id} value={c.id}>
                      {isRtl ? c.nameFa : c.nameEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </aside>

          {/* ─── Left Column: Comparison Cards List ─────────────────── */}
          <div className="col-span-1 md:col-span-8 lg:col-span-9 space-y-4">
            {/* Instant Issuance Notice Banner (مطابق نوار بالای تصویر ۲) */}
            <div className="bg-white rounded-2xl px-4 py-3 border border-border shadow-xs flex items-center gap-2.5 text-xs font-semibold text-ink">
              <Zap className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                {lt(locale, {
                  fa: 'بیمه‌نامه‌ها با امکان صدور در لحظه خرید بلافاصله بعد از سفارش صادر می‌شوند.',
                  en: 'Policies with instant issuance are generated immediately upon order confirmation.',
                  ar: 'تصدر وثائق التأمين ذات الإصدار الفوري مباشرة بعد إتمام الطلب.',
                  zh: '支持即时出单的保单将在完成订单确认后立即可用。',
                  ru: 'Полисы с мгновенным оформлением выпускаются сразу после оплаты.',
                })}
              </span>
            </div>

            {/* Empty state if filtered out */}
            {comparisonResults.length === 0 && (
              <div className="bg-white rounded-2xl p-10 border border-border text-center space-y-3">
                <ShieldCheck className="w-12 h-12 text-muted mx-auto" />
                <h3 className="font-bold text-sm text-ink">
                  {lt(locale, { fa: 'هیچ طرحی با فیلترهای انتخابی یافت نشد', en: 'No plans match the selected filters', ar: 'لم يتم العثور على خطط مطابقة', zh: '未找到符合条件的保单', ru: 'По вашему запросу ничего не найдено' })}
                </h3>
                <p className="text-xs text-muted max-w-sm mx-auto">
                  {lt(locale, { fa: 'لطفاً فیلتر سقف خسارت یا شرکت کمک‌رسان را تغییر دهید تا نتایج نمایش داده شوند.', en: 'Please reset or loosen the filters to see options.', ar: 'يرجى تغيير شروط التصفية.', zh: '请尝试放宽筛选条件。', ru: 'Попробуйте сбросить фильтры.' })}
                </p>
                <button
                  onClick={() => {
                    setSelectedCoverageLimit('ALL');
                    setSelectedAssistanceId('ALL');
                    setSelectedCompanyId('ALL');
                  }}
                  className="px-4 py-2 bg-brand text-white rounded-xl text-xs font-bold"
                >
                  {lt(locale, { fa: 'حذف فیلترها و نمایش همه', en: 'Reset All Filters', ar: 'إلغاء التصفية', zh: '重置所有筛选', ru: 'Сбросить фильтры' })}
                </button>
              </div>
            )}

            {/* Comparison Cards List (دقیقاً با همان چیدمان و عناصر تصاویر ۲ و ۳) */}
            <div className="space-y-3.5">
              {comparisonResults.map((card) => (
                <div
                  key={card.id}
                  className="bg-white rounded-2xl p-4 md:p-5 border border-border/90 hover:border-brand/40 transition-all shadow-xs hover:shadow-elev-1 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5 group"
                >
                  {/* Left (RTL Right): Company, Assistance & Features */}
                  <div className="flex-1 space-y-3">
                    {/* Top row: Badge, Company Name & Rating */}
                    <div className="flex flex-wrap items-center gap-3">
                      {card.instantIssuance && (
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200">
                          {lt(locale, { fa: 'صدور در لحظه', en: 'Instant Issuance', ar: 'إصدار فوري', zh: '即时出单', ru: 'Мгновенный выпуск' })}
                        </span>
                      )}

                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm md:text-base text-ink">
                          {isRtl ? card.company.nameFa : card.company.nameEn}
                        </span>

                        <span className="flex items-center gap-1 text-xs text-muted">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="font-bold text-ink font-price">{card.company.rating}</span>
                          <span>({card.company.reviewsCount} نظر)</span>
                        </span>
                      </div>
                    </div>

                    {/* Middle row: Assistance Partner Name */}
                    <div className="flex items-center gap-2 text-xs text-sub">
                      <span className="text-muted">{lt(locale, { fa: 'شرکت کمک‌رسان:', en: 'Assistance Partner:', ar: 'شركة المساعدة:', zh: '境外救援机构:', ru: 'Ассистанс:' })}</span>
                      <span className="font-bold text-ink">{isRtl ? card.assistance.nameFa : card.assistance.nameEn}</span>
                      {card.schengenCompliant && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                          {lt(locale, { fa: 'تاییدیه رسمی سفارتخانه‌ها', en: 'Embassy Approved', ar: 'معتمد لدى السفارات', zh: '使领馆官方认可', ru: 'Одобрено посольствами' })}
                        </span>
                      )}
                    </div>

                    {/* Features checklist (مطابق تصویر ۲ و ۳) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-sub pt-0.5">
                      <div className="flex items-center gap-1.5 text-ink font-medium">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          {lt(locale, {
                            fa: `سقف خسارت پرداختی ${card.coverageEur.toLocaleString('fa-IR')} یورو`,
                            en: `Coverage Limit €${card.coverageEur.toLocaleString('en-US')}`,
                            ar: `سقف التعويض ${card.coverageEur} يورو`,
                            zh: `最高赔付保额 ${card.coverageEur} 欧元`,
                            ru: `Лимит покрытия €${card.coverageEur}`,
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-ink font-medium">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          {lt(locale, {
                            fa: 'جبران خسارت گم شدن چمدان و مدارک',
                            en: 'Lost baggage and passport coverage',
                            ar: 'تعويض فقدان الأمتعة والمستندات',
                            zh: '行李及随身证件丢失赔偿',
                            ru: 'Компенсация за утерю багажа и документов',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right (RTL Left): Price & Action CTA (مطابق تصویر ۲ و ۳) */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between border-t md:border-t-0 md:border-s border-border/80 pt-3 md:pt-0 md:ps-6 shrink-0 gap-3">
                    <div className="text-start md:text-end">
                      <div className="text-[11px] text-muted">
                        {lt(locale, { fa: 'مبلغ نهایی', en: 'Final Amount', ar: 'المبلغ الإجمالي', zh: '应付金额', ru: 'Итоговая цена' })}
                      </div>
                      <div className="text-lg md:text-xl font-black text-ink font-price flex items-baseline gap-1">
                        <span>{formatToman(card.finalPriceToman)}</span>
                        <span className="text-xs font-normal text-muted">{lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'Томан' })}</span>
                      </div>
                    </div>

                    {/* Blue Action Button (مطابق تصویر ۲ و ۳) */}
                    <button
                      onClick={() => handleSelectPlan(card)}
                      className="px-6 py-2.5 rounded-xl bg-[#0088FF] hover:bg-[#0070D4] text-white font-bold text-xs md:text-sm transition-all shadow-sm active:scale-95 min-h-[44px] min-w-[110px] touch-target flex items-center justify-center gap-1.5"
                    >
                      <span>{lt(locale, { fa: 'سفارش', en: 'Order Now', ar: 'طلب الوثيقة', zh: '立即订购', ru: 'Оформить' })}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* ─── Order Detail Drawer / Bottom Sheet (دقیقاً مطابق تصویر ۱) ─── */}
      <Sheet open={orderSheetOpen} onOpenChange={setOrderSheetOpen} side="bottom">
        <SheetContent className="max-w-xl mx-auto rounded-t-3xl p-5 md:p-6 space-y-5">
          {selectedPlanForOrder && (
            <div className="space-y-4">
              {/* Header Title with Close Icon */}
              <div className="flex items-center justify-between border-b border-border/80 pb-3">
                <h3 className="text-base font-extrabold text-ink">
                  {lt(locale, { fa: 'جزئیات و سفارش بیمه‌نامه', en: 'Policy Details & Order', ar: 'تفاصيل وطلب وثيقة التأمين', zh: '保单详情与确认订单', ru: 'Детали и оформление полиса' })}
                </h3>
                <button
                  onClick={() => setOrderSheetOpen(false)}
                  className="w-8 h-8 rounded-full bg-surface-subtle flex items-center justify-center text-muted hover:text-ink min-h-[44px] min-w-[44px] touch-target"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Specifications Box: مشخصات بیمه‌نامه جدید */}
              <div className="space-y-2.5 text-xs text-sub">
                <div className="font-bold text-ink text-sm pb-1">
                  {lt(locale, { fa: 'مشخصات بیمه‌نامه جدید', en: 'New Policy Specifications', ar: 'مواصفات الوثيقة الجديدة', zh: '新保单基本要素', ru: 'Параметры нового полиса' })}
                </div>

                <div className="flex items-center justify-between py-1 border-b border-border/60">
                  <span className="text-muted">{lt(locale, { fa: 'مدت سفر', en: 'Trip Duration', ar: 'مدة السفر', zh: '旅行时长', ru: 'Срок поездки' })}</span>
                  <span className="font-bold text-ink">{currentDuration.labelFa}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-border/60">
                  <span className="text-muted">{lt(locale, { fa: 'تعداد مسافران', en: 'Number of Travelers', ar: 'عدد المسافرين', zh: '出行人数', ru: 'Количество пассажиров' })}</span>
                  <span className="font-bold text-ink">{selectedPlanForOrder.passengersCount} نفر</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-border/60">
                  <span className="text-muted">{lt(locale, { fa: 'سطح پوشش', en: 'Coverage Level', ar: 'مستوى التغطية', zh: '保障级别', ru: 'Уровень покрытия' })}</span>
                  <span className="font-bold text-ink">{selectedPlanForOrder.coverageEur.toLocaleString('fa-IR')} یورو</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-border/60">
                  <span className="text-muted">{lt(locale, { fa: 'شرکت بیمه‌گر و کمک‌رسان', en: 'Insurer & Assistance', ar: 'الجهة المؤمنة والمسعفة', zh: '承保与救援公司', ru: 'Страховщик и ассистанс' })}</span>
                  <span className="font-bold text-ink">{selectedPlanForOrder.company.nameFa} • {selectedPlanForOrder.assistance.nameFa}</span>
                </div>

                {/* More Details Accordion (بیشتر v) */}
                <button
                  onClick={() => setShowMoreDetails((prev) => !prev)}
                  className="text-brand font-bold text-xs flex items-center gap-1 pt-1 min-h-[44px] touch-target"
                >
                  <span>{showMoreDetails ? 'بستن جزییات' : 'بیشتر'}</span>
                  {showMoreDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showMoreDetails && (
                  <div className="p-3 bg-surface-subtle rounded-xl space-y-2 text-[11px] text-muted border border-border/70">
                    <div>• جبران هزینه‌های پزشکی، جراحی و بستری بیمارستانی تا سقف بیمه‌نامه</div>
                    <div>• هزینه‌های فوریت دندانپزشکی در خارج از کشور تا سقف ۴۰۰ یورو</div>
                    <div>• ارسال فوری داروهای اضطراری مسافر از مبدا و بازگرداندن اضطراری همراه</div>
                    <div>• جبران خسارت مفقودی چمدان تا سقف ۱,۲۰۰ یورو و جبران تاخیر پرواز بیش از ۶ ساعت</div>
                  </div>
                )}
              </div>

              {/* Payment Method Box: روش پرداخت (مطابق تصویر ۱) */}
              <div className="space-y-2 pt-1">
                <div className="text-xs font-bold text-sub">
                  {lt(locale, { fa: 'روش پرداخت', en: 'Payment Method', ar: 'طريقة الدفع', zh: '支付方式', ru: 'Способ оплаты' })}
                </div>

                <div className="p-3.5 rounded-2xl border-2 border-[#0088FF] bg-blue-50/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#0088FF] text-white flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-ink">
                        {lt(locale, { fa: 'پرداخت نقدی', en: 'Cash / Card Payment', ar: 'الدفع المباشر', zh: '线上全额支付', ru: 'Оплата картой' })}
                      </div>
                      <div className="text-[11px] text-muted">
                        {lt(locale, { fa: 'با احتساب تخفیف خرید نقدی', en: 'Includes direct purchase discount', ar: 'شامل الخصم المباشر', zh: '享受立减优惠', ru: 'С учетом скидки' })}
                      </div>
                    </div>
                  </div>

                  <div className="text-base font-black text-ink font-price">
                    {formatToman(selectedPlanForOrder.finalPriceToman)} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'Тоمان' })}
                  </div>
                </div>
              </div>

              {/* Trust Box 1: Green Check (مطابق تصویر ۱) */}
              <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50/70 flex items-center gap-2.5 text-emerald-900 text-xs font-semibold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  {lt(locale, {
                    fa: 'این بیمه‌نامه بلافاصله پس از خرید صادر می‌شود.',
                    en: 'This policy is issued immediately upon purchase.',
                    ar: 'تصدر هذه الوثيقة فور إتمام الشراء.',
                    zh: '此保单在支付完成后将立即生效并生成。',
                    ru: 'Этот полис будет выпущен сразу после покупки.',
                  })}
                </span>
              </div>

              {/* Trust Box 2: Yellow Warning (مطابق تصویر ۱) */}
              <div className="p-3 rounded-xl border border-amber-300 bg-amber-50/70 flex items-center gap-2.5 text-amber-900 text-xs font-semibold">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>
                  {lt(locale, {
                    fa: 'این بیمه از تاریخ شروع سفر شما فعال می‌شود.',
                    en: 'Coverage starts from your travel start date.',
                    ar: 'يبدأ سريان التأمين من تاريخ بدء رحلتك.',
                    zh: '本保险保障自您正式启程出行之日起生效。',
                    ru: 'Страховка активируется с даты начала вашей поездки.',
                  })}
                </span>
              </div>

              {/* Action Buttons: تایید سفارش و انصراف (مطابق تصویر ۱) */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleConfirmOrder}
                  className="h-12 rounded-xl bg-[#0088FF] hover:bg-[#0070D4] text-white font-bold text-sm transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 touch-target"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{lt(locale, { fa: 'تایید سفارش', en: 'Confirm Order', ar: 'تأكيد الطلب', zh: '确认订单', ru: 'Подтвердить' })}</span>
                </button>

                <button
                  onClick={() => setOrderSheetOpen(false)}
                  className="h-12 rounded-xl border border-border bg-surface text-sub hover:text-ink font-bold text-sm transition-all active:scale-[0.98] touch-target"
                >
                  {lt(locale, { fa: 'انصراف', en: 'Cancel', ar: 'إلغاء', zh: '取消', ru: 'Отмена' })}
                </button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ─── Mobile Bottom Sheet: Destination Zone Selector ─────────── */}
      <Sheet open={zoneSheetOpen} onOpenChange={setZoneSheetOpen} side="bottom">
        <SheetContent className="space-y-4">
          <div className="text-center pb-2">
            <h3 className="font-bold text-base text-ink">
              {lt(locale, { fa: 'انتخاب کشور یا منطقه سفر', en: 'Select Destination Zone', ar: 'اختر وجهة السفر', zh: '选择目的地范围', ru: 'Выберите регион поездки' })}
            </h3>
            <p className="text-xs text-muted mt-0.5">
              {lt(locale, { fa: 'پهنه‌های جغرافیایی رسمی بیمه مرکزی', en: 'Official geographical travel zones', ar: 'المناطق الجغرافية للتأمين', zh: '标准旅游风险分区', ru: 'Официальные зоны' })}
            </p>
          </div>

          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto">
            {DESTINATION_ZONES.map((zone) => {
              const isSelected = zone.id === selectedZoneId;
              return (
                <button
                  key={zone.id}
                  onClick={() => {
                    setSelectedZoneId(zone.id);
                    setZoneSheetOpen(false);
                  }}
                  className={`w-full p-4 rounded-2xl border text-start transition-all flex items-start justify-between min-h-[56px] touch-target ${
                    isSelected
                      ? 'border-brand bg-brand-light/15 text-brand-dark ring-2 ring-brand/20 font-bold'
                      : 'border-border bg-surface text-sub'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-ink flex items-center gap-2">
                      <span>{isRtl ? zone.titleFa : zone.titleEn}</span>
                      {zone.requiresMin30k && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                          حداقل پوشش ۳۰k
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted leading-relaxed">
                      {isRtl ? zone.subtitleFa : zone.subtitleEn}
                    </div>
                  </div>

                  {isSelected && <Check className="w-5 h-5 text-brand shrink-0 mt-1" />}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── Mobile Bottom Sheet: Duration Package Selector ─────────── */}
      <Sheet open={durationSheetOpen} onOpenChange={setDurationSheetOpen} side="bottom">
        <SheetContent className="space-y-4">
          <div className="text-center pb-2">
            <h3 className="font-bold text-base text-ink">
              {lt(locale, { fa: 'انتخاب مدت اقامت و اعتبار بیمه', en: 'Select Duration Package', ar: 'اختر مدة الإقامة', zh: '选择出行时长', ru: 'Выберите срок поездки' })}
            </h3>
            <p className="text-xs text-muted mt-0.5">
              {lt(locale, { fa: 'بسته‌های زمانی مصوب بیمه مرکزی', en: 'Standard duration packages', ar: 'باقات المدة القياسية', zh: '标准保障周期', ru: 'Стандартные сроки' })}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[60vh] overflow-y-auto">
            {DURATION_PACKAGES.map((dur) => {
              const isSelected = dur.id === selectedDurationId;
              return (
                <button
                  key={dur.id}
                  onClick={() => {
                    setSelectedDurationId(dur.id);
                    setDurationSheetOpen(false);
                  }}
                  className={`p-3.5 rounded-xl border text-center transition-all min-h-[44px] touch-target flex flex-col items-center justify-center ${
                    isSelected
                      ? 'border-brand bg-brand-light/15 text-brand font-bold ring-2 ring-brand/20'
                      : 'border-border bg-surface text-ink hover:border-brand/40'
                  }`}
                >
                  <span className="text-xs md:text-sm font-bold">{isRtl ? dur.labelFa : dur.labelEn}</span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── Mobile Bottom Sheet: Passengers & Ages Picker ─────────── */}
      <Sheet open={passengersSheetOpen} onOpenChange={setPassengersSheetOpen} side="bottom">
        <SheetContent className="space-y-4">
          <div className="text-center pb-2">
            <h3 className="font-bold text-base text-ink">
              {lt(locale, { fa: 'مسافران و رده‌های سنی', en: 'Travelers & Age Categories', ar: 'المسافرون والفئات العمرية', zh: '旅客与年龄段设定', ru: 'Возрастные категории' })}
            </h3>
            <p className="text-xs text-muted mt-0.5">
              {lt(locale, { fa: 'حق بیمه بر اساس سن هر مسافر به طور دقیق محاسبه می‌شود', en: 'Exact actuarial premium calculated per traveler', ar: 'يتم احتساب القسط بدقة لكل مسافر', zh: '按各旅客年龄精准计算费率', ru: 'Расчет тарифа по возрасту' })}
            </p>
          </div>

          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {passengersAges.map((age, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-border bg-surface-subtle flex items-center justify-between gap-3"
              >
                <div className="font-bold text-xs text-ink">
                  {lt(locale, { fa: `مسافر ${idx + 1}`, en: `Traveler ${idx + 1}`, ar: `المسافر ${idx + 1}`, zh: `旅客 ${idx + 1}`, ru: `Пассажир ${idx + 1}` })}:
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={age}
                    onChange={(e) => handleUpdateAge(idx, e.target.value as InsuranceAgeBracket)}
                    className="h-10 px-2.5 rounded-xl border border-border bg-surface text-ink text-xs focus:ring-2 focus:ring-brand/30"
                  >
                    {AGE_BRACKETS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {isRtl ? b.labelFa : b.labelEn}
                      </option>
                    ))}
                  </select>

                  {passengersAges.length > 1 && (
                    <button
                      onClick={() => handleRemovePassenger(idx)}
                      className="w-9 h-9 rounded-lg border border-red-200 text-red-600 bg-red-50 flex items-center justify-center min-h-[44px] min-w-[44px] touch-target"
                      title="حذف مسافر"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={handleAddPassenger}
              disabled={passengersAges.length >= 10}
              className="flex-1 h-11 rounded-xl border-2 border-dashed border-brand text-brand bg-brand-light/10 font-bold text-xs flex items-center justify-center gap-2 min-h-[44px] touch-target disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
              <span>{lt(locale, { fa: 'افزودن مسافر دیگر', en: 'Add Another Traveler', ar: 'إضافة مسافر آخر', zh: '添加更多旅客', ru: 'Добавить пассажира' })}</span>
            </button>

            <button
              onClick={() => setPassengersSheetOpen(false)}
              className="h-11 px-6 rounded-xl bg-brand text-white font-bold text-xs min-h-[44px] touch-target"
            >
              {lt(locale, { fa: 'تایید', en: 'Apply', ar: 'تأكيد', zh: '应用', ru: 'Применить' })}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── Mobile Bottom Sheet: Advanced Filters ─────────────────── */}
      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen} side="bottom">
        <SheetContent className="space-y-4">
          <div className="text-center pb-2">
            <h3 className="font-bold text-base text-ink">
              {lt(locale, { fa: 'فیلتر شرکت‌ها و سقف تعهدات', en: 'Filter Insurers & Coverage', ar: 'تصفية الشركات والتغطية', zh: '筛选承保公司与额度', ru: 'Фильтры' })}
            </h3>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Coverage Limit Radio */}
            <div>
              <label className="block text-xs font-bold text-sub mb-2">
                {lt(locale, { fa: 'سقف خسارت پرداختی', en: 'Coverage Limit', ar: 'سقف التغطية', zh: '保障额度', ru: 'Лимит покрытия' })}
              </label>
              <div className="space-y-2">
                {COVERAGE_LIMIT_OPTIONS.map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2.5 text-xs text-ink cursor-pointer">
                    <input
                      type="radio"
                      name="coverage_mobile"
                      checked={selectedCoverageLimit === opt.id}
                      onChange={() => setSelectedCoverageLimit(opt.id)}
                      className="w-4 h-4 text-brand"
                    />
                    <span>{isRtl ? opt.labelFa : opt.labelEn}</span>
                  </label>
                ))}
                <label className="flex items-center gap-2.5 text-xs text-ink cursor-pointer">
                  <input
                    type="radio"
                    name="coverage_mobile"
                    checked={selectedCoverageLimit === 'ALL'}
                    onChange={() => setSelectedCoverageLimit('ALL')}
                    className="w-4 h-4 text-brand"
                  />
                  <span>{lt(locale, { fa: 'بدون فیلتر', en: 'All Limits', ar: 'بدون تصفية', zh: '不限', ru: 'Все' })}</span>
                </label>
              </div>
            </div>

            {/* Assistance Partner */}
            <div>
              <label className="block text-xs font-bold text-sub mb-1.5">
                {lt(locale, { fa: 'شرکت کمک‌رسان', en: 'Assistance Partner', ar: 'شركة المساعدة', zh: '救援机构', ru: 'Ассистанс' })}
              </label>
              <select
                value={selectedAssistanceId}
                onChange={(e) => setSelectedAssistanceId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-border bg-surface text-ink text-xs"
              >
                <option value="ALL">همه شرکت‌های کمک‌رسان</option>
                {Object.values(ASSISTANCE_PARTNERS).map((p) => (
                  <option key={p.id} value={p.id}>{isRtl ? p.nameFa : p.nameEn}</option>
                ))}
              </select>
            </div>

            {/* Insurer Company */}
            <div>
              <label className="block text-xs font-bold text-sub mb-1.5">
                {lt(locale, { fa: 'شرکت‌های بیمه‌گر', en: 'Insurance Company', ar: 'شركة التأمين', zh: '保险公司', ru: 'Компания' })}
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-border bg-surface text-ink text-xs"
              >
                <option value="ALL">همه شرکت‌های بیمه</option>
                {Object.values(INSURANCE_COMPANIES).map((c) => (
                  <option key={c.id} value={c.id}>{isRtl ? c.nameFa : c.nameEn}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setFilterSheetOpen(false)}
              className="w-full h-11 rounded-xl bg-brand text-white font-bold text-xs min-h-[44px] touch-target"
            >
              {lt(locale, { fa: 'مشاهده نتایج فیلترشده', en: 'Show Filtered Results', ar: 'عرض النتائج', zh: '查看筛选结果', ru: 'Показать результаты' })}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
