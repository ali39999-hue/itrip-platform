'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useBookingStore } from '@/stores/booking-store';
import { CIP_AIRPORTS, CIP_VEHICLES } from '@/lib/cip-data';
import { CipService } from '@/services/cip-service';
import type { CipAirportOption } from '@/lib/types';
import type { FlightDirection, CipSuiteType } from '@/lib/validations';
import { Sheet, SheetContent } from '@/components/ui/Sheet';
import { lt } from '@/lib/lt';
import { num } from '@/lib/format';
import {
  Crown,
  PlaneTakeoff,
  PlaneLanding,
  Repeat,
  CarTaxiFront,
  ShieldCheck,
  CheckCircle2,
  Coffee,
  Users,
  Dog,
  Accessibility,
  BedDouble,
  ChevronDown,
  Sparkles,
  MapPin,
  CreditCard,
  Info,
  ArrowRight,
  Plus,
  Minus,
} from 'lucide-react';

export default function CipPage() {
  const locale = useLocale();
  const router = useRouter();
  const isRtl = ['fa', 'ar'].includes(locale);

  const addToCart = useBookingStore((s) => s.addToCart);
  const setBookingContext = useBookingStore((s) => s.setBookingContext);

  // Core selection state
  const [selectedAirportCode, setSelectedAirportCode] = useState<string>('IKA');
  const [flightDirection, setFlightDirection] = useState<FlightDirection>('DEPARTURE');
  const [airline, setAirline] = useState<string>('Mahan Air');
  const [flightNumber, setFlightNumber] = useState<string>('W5-061');
  const [flightDate, setFlightDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [flightTime, setFlightTime] = useState<string>('08:30');

  // Passenger counts
  const [adults, setAdults] = useState<number>(1);
  const [children, setChildren] = useState<number>(0);
  const [infants, setInfants] = useState<number>(0);

  // Add-ons
  const [accompanyingGuests, setAccompanyingGuests] = useState<number>(0);
  const [petCount, setPetCount] = useState<number>(0);
  const [wheelchairCount, setWheelchairCount] = useState<number>(0);
  const [suiteType, setSuiteType] = useState<CipSuiteType>('NONE');
  const [transferVehicleId, setTransferVehicleId] = useState<string>('NONE');
  const [transferAddress, setTransferAddress] = useState<string>('');

  // Mobile Bottom Sheet for Airport selection
  const [airportSheetOpen, setAirportSheetOpen] = useState<boolean>(false);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'booking' | 'facilities' | 'rules'>('booking');

  // Contact Info
  const [contactName, setContactName] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  // Current Airport
  const currentAirport = useMemo<CipAirportOption>(() => {
    return CipService.getAirportByCode(selectedAirportCode) || CIP_AIRPORTS[0];
  }, [selectedAirportCode]);

  // Live Price Calculation
  const priceResult = useMemo(() => {
    return CipService.calculatePrice({
      airportCode: currentAirport.airportCode,
      adults,
      children,
      infants,
      accompanyingGuests,
      petCount,
      wheelchairCount,
      suiteType,
      transferVehicleId,
      transferAddress,
    });
  }, [
    currentAirport,
    adults,
    children,
    infants,
    accompanyingGuests,
    petCount,
    wheelchairCount,
    suiteType,
    transferVehicleId,
    transferAddress,
  ]);

  // Format Toman currency
  const formatToman = (amount: number) => {
    return new Intl.NumberFormat(isRtl ? 'fa-IR' : 'en-US').format(amount);
  };

  // Submit and navigate to checkout
  const handleProceedToBooking = () => {
    setValidationError('');
    if (!contactName.trim() && adults < 1) {
      setValidationError(
        lt(locale, {
          fa: 'لطفاً مشخصات مسافر یا رزروکننده را بررسی فرمایید.',
          en: 'Please verify traveler/contact details.',
          ar: 'يرجى مراجعة بيانات المسافر أو الحجز.',
          zh: '请核对旅客/联系人信息。',
          ru: 'Пожалуйста, проверьте данные путешественника/контакта.',
        })
      );
    }

    const title = `${lt(locale, {
      fa: 'تشریفات اختصاصی CIP',
      en: 'Executive CIP Lounge',
      ar: 'تشريفات المطار الخاصة CIP',
      zh: '机场CIP贵宾室尊享服务',
      ru: 'VIP CIP сервис аэропорта',
    })} - ${isRtl ? currentAirport.airportNameFa : currentAirport.airportNameEn}`;

    const subtitle = `${flightDirection === 'DEPARTURE' ? 'پرواز خروجی' : flightDirection === 'ARRIVAL' ? 'پرواز ورودی' : 'ترانزیت'} • ${airline} ${flightNumber} • ${flightDate} ${flightTime}`;

    // 1. Set global booking context
    setBookingContext({
      type: 'cip',
      title,
      subtitle,
      amount: priceResult.totalRials,
      currency: 'IRR',
      travelDate: flightDate,
      adults: adults + accompanyingGuests,
      children,
      meta: {
        airportCode: currentAirport.airportCode,
        flightDirection,
        airline,
        flightNumber,
        flightTime,
        adults: String(adults),
        children: String(children),
        infants: String(infants),
        accompanyingGuests: String(accompanyingGuests),
        petCount: String(petCount),
        wheelchairCount: String(wheelchairCount),
        suiteType,
        transferVehicleId,
        transferAddress,
        contactName,
        contactPhone,
      },
    });

    // 2. Add to persistent cart
    addToCart({
      type: 'CIP',
      title,
      subtitle,
      supplier: `CIP-${currentAirport.airportCode}`,
      count: adults + children + accompanyingGuests,
      unitPrice: priceResult.totalRials,
      currency: 'IRR',
      travelDate: flightDate,
      inventoryItemId: `cip-${currentAirport.airportCode.toLowerCase()}`,
      details: {
        airportCode: currentAirport.airportCode,
        flightDirection,
        airline,
        flightNumber,
        flightTime,
        adults,
        children,
        infants,
        accompanyingGuests,
        petCount,
        wheelchairCount,
        suiteType,
        transferVehicleId,
        transferAddress,
        lineItems: priceResult.lineItems,
        totalToman: priceResult.totalToman,
      },
    });

    // 3. Navigate to checkout funnel
    router.push('/checkout');
  };

  return (
    <div className="min-h-screen bg-surface-subtle pb-28 md:pb-16" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* ─── Hero Header ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#034442] via-[#046E6B] to-[#00A9A5] text-white pt-10 pb-16 px-4 md:px-8">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#F0A62A_1px,transparent_1px)] [background-size:20px_20px]" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs md:text-sm font-medium text-[#F9D783] mb-3">
                <Crown className="w-4 h-4 text-[#F0A62A]" />
                <span>
                  {lt(locale, {
                    fa: 'جایگاه تشریفات اختصاصی فرودگاه‌های بین‌المللی (CIP & Fast-Track)',
                    en: 'Premier Executive Airport CIP & Fast-Track Service',
                    ar: 'خدمات تشريفات كبار الشخصيات بالمطار (CIP & Fast-Track)',
                    zh: '国际机场尊贵CIP通道与贵宾候机室',
                    ru: 'VIP-залы и ускоренный коридор в аэропортах',
                  })}
                </span>
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-3">
                {lt(locale, {
                  fa: 'رزرو تشریفات اختصاصی CIP فرودگاه امام خمینی و مقاصد منتخب',
                  en: 'Book Airport CIP Lounges & Luxury Fast-Track',
                  ar: 'حجز صالات تشريفات CIP لمطار الإمام الخميني والمطارات المختارة',
                  zh: '预订德黑兰伊玛目霍梅尼机场及主要枢纽CIP贵宾厅',
                  ru: 'Бронирование CIP залов в аэропорту Тегерана и других направлениях',
                })}
              </h1>
              <p className="text-sm md:text-base text-white/85 max-w-2xl leading-relaxed">
                {lt(locale, {
                  fa: 'تجربه سفری بی‌دغدغه و لوکس با گیت‌های اختصاصی گذرنامه و گمرک، ترانسفر تشریفاتی روی باند تا پای پلکان پرواز، بوفه سلف‌سرویس مجلل و تحویل اختصاصی بار.',
                  en: 'Fast-track immigration, private tarmac apron escort, all-inclusive gourmet dining, day suites, and luggage porter service.',
                  ar: 'تجربة سفر فاخرة خالية من الانتظار مع بوابات جوازات خاصة، ونقل على المدرج، وبوفيه مفتوح راقٍ.',
                  zh: '免排队独立边检与海关通道、专用停机坪礼宾车送达舷梯、无限量精致自助餐饮及行李管家服务。',
                  ru: 'Индивидуальный паспортный контроль, лимузин прямо к трапу, шведский стол и доставка багажа.',
                })}
              </p>
            </div>

            {/* Quick Stat Pill */}
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 md:p-5 flex items-center gap-4 self-start md:self-auto shrink-0 shadow-elev-2">
              <div className="w-12 h-12 rounded-xl bg-[#F0A62A]/20 flex items-center justify-center text-[#F0A62A]">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-white/80">
                  {lt(locale, {
                    fa: 'نرخ مصوب سالن CIP فرودگاه امام',
                    en: 'IKA Official Lounge Rate',
                    ar: 'التعرفة الرسمية لصالة الإمام',
                    zh: '伊玛目机场官方标准价格',
                    ru: 'Официальный тариф зала Тегерана',
                  })}
                </div>
                <div className="text-xl font-bold text-white font-price flex items-baseline gap-1">
                  <span>{formatToman(currentAirport.basePriceAdult)}</span>
                  <span className="text-xs font-normal text-white/80">{lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'Томан' })}</span>
                </div>
                <div className="text-[11px] text-emerald-300 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{lt(locale, { fa: 'کودکان زیر ۲ سال رایگان', en: 'Infants under 2 free', ar: 'الرضع مجاناً', zh: '2岁以下婴儿免费', ru: 'Дети до 2 лет бесплатно' })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 mt-8 border-b border-white/20 pb-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('booking')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all min-h-[44px] flex items-center gap-2 ${
                activeTab === 'booking'
                  ? 'bg-white text-[#046E6B] shadow-md'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              <Crown className="w-4 h-4" />
              <span>{lt(locale, { fa: 'رزرو آنلاین تشریفات', en: 'Online Booking', ar: 'الحجز المباشر', zh: '在线预订', ru: 'Онлайн бронирование' })}</span>
            </button>
            <button
              onClick={() => setActiveTab('facilities')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all min-h-[44px] flex items-center gap-2 ${
                activeTab === 'facilities'
                  ? 'bg-white text-[#046E6B] shadow-md'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              <Coffee className="w-4 h-4" />
              <span>{lt(locale, { fa: 'امکانات و گالری سالن', en: 'Facilities & Gallery', ar: 'المرافق والمعرض', zh: '设施与实景', ru: 'Услуги и галерея' })}</span>
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all min-h-[44px] flex items-center gap-2 ${
                activeTab === 'rules'
                  ? 'bg-white text-[#046E6B] shadow-md'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              <Info className="w-4 h-4" />
              <span>{lt(locale, { fa: 'قوانین و کنسلی', en: 'Terms & Cancellation', ar: 'الشروط والإلغاء', zh: '规则与取消政策', ru: 'Правила и отмена' })}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ─── Main Content Area ──────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 -mt-6 relative z-20">
        {activeTab === 'booking' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ─── Left 2 Columns: Configurator Form ─────────────────── */}
            <div className="lg:col-span-2 space-y-6">
              {/* Section 1: Airport & Flight Route Selection */}
              <div className="bg-surface rounded-2xl p-5 md:p-6 border border-border/80 shadow-elev-1 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base md:text-lg font-bold text-ink flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-brand" />
                    <span>{lt(locale, { fa: 'انتخاب فرودگاه و مسیر پروازی', en: 'Airport & Flight Route', ar: 'اختيار المطار ومسار الرحلة', zh: '选择机场与航向', ru: 'Выбор аэропорта и рейса' })}</span>
                  </h2>

                  {/* Mobile Airport Trigger Button */}
                  <button
                    onClick={() => setAirportSheetOpen(true)}
                    className="md:hidden flex items-center gap-1.5 px-3 py-1.5 bg-brand-light/20 text-brand rounded-xl text-xs font-semibold min-h-[44px] touch-target"
                  >
                    <span>{isRtl ? currentAirport.cityFa : currentAirport.cityEn} ({currentAirport.airportCode})</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Desktop Airport Selector Chips */}
                <div className="hidden md:grid grid-cols-3 gap-3">
                  {CIP_AIRPORTS.map((airport) => {
                    const isSelected = airport.airportCode === selectedAirportCode;
                    return (
                      <button
                        key={airport.id}
                        onClick={() => setSelectedAirportCode(airport.airportCode)}
                        className={`p-3.5 rounded-xl border text-start transition-all active:scale-[0.98] min-h-[72px] flex flex-col justify-between ${
                          isSelected
                            ? 'border-brand bg-brand-light/15 text-brand-dark ring-2 ring-brand/20 shadow-sm'
                            : 'border-border bg-surface-elevated hover:border-brand/40 text-sub'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-sm text-ink">
                            {isRtl ? airport.cityFa : airport.cityEn}
                          </span>
                          <span className="text-xs font-mono font-bold bg-ink/5 px-2 py-0.5 rounded text-sub">
                            {airport.airportCode}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted line-clamp-1 mt-1">
                          {isRtl ? airport.airportNameFa : airport.airportNameEn}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Flight Direction Segmented Control */}
                <div>
                  <label className="block text-xs font-semibold text-sub mb-2">
                    {lt(locale, { fa: 'نوع پرواز مسافر', en: 'Flight Direction', ar: 'اتجاه الرحلة', zh: '航向类型', ru: 'Направление рейса' })}
                  </label>
                  <div className="grid grid-cols-3 gap-2 p-1.5 bg-surface-subtle border border-border/70 rounded-xl">
                    <button
                      onClick={() => setFlightDirection('DEPARTURE')}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all min-h-[44px] ${
                        flightDirection === 'DEPARTURE'
                          ? 'bg-surface text-brand-dark shadow-sm border border-border font-bold'
                          : 'text-sub hover:text-ink'
                      }`}
                    >
                      <PlaneTakeoff className="w-4 h-4 text-brand" />
                      <span>{lt(locale, { fa: 'پرواز خروجی (Departure)', en: 'Departure', ar: 'المغادرة', zh: '出发离港', ru: 'Вылет' })}</span>
                    </button>
                    <button
                      onClick={() => setFlightDirection('ARRIVAL')}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all min-h-[44px] ${
                        flightDirection === 'ARRIVAL'
                          ? 'bg-surface text-brand-dark shadow-sm border border-border font-bold'
                          : 'text-sub hover:text-ink'
                      }`}
                    >
                      <PlaneLanding className="w-4 h-4 text-brand" />
                      <span>{lt(locale, { fa: 'پرواز ورودی (Arrival)', en: 'Arrival', ar: 'الوصول', zh: '到达进港', ru: 'Прилет' })}</span>
                    </button>
                    <button
                      onClick={() => setFlightDirection('TRANSIT')}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all min-h-[44px] ${
                        flightDirection === 'TRANSIT'
                          ? 'bg-surface text-brand-dark shadow-sm border border-border font-bold'
                          : 'text-sub hover:text-ink'
                      }`}
                    >
                      <Repeat className="w-4 h-4 text-brand" />
                      <span>{lt(locale, { fa: 'ترانزیت (Transit)', en: 'Transit', ar: 'الترانزيت', zh: '过境转机', ru: 'Транзит' })}</span>
                    </button>
                  </div>
                </div>

                {/* Flight Details Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-sub mb-1.5">
                      {lt(locale, { fa: 'شرکت هواپیمایی', en: 'Airline', ar: 'شركة الطيران', zh: '航空公司', ru: 'Авиакомпания' })}
                    </label>
                    <input
                      type="text"
                      value={airline}
                      onChange={(e) => setAirline(e.target.value)}
                      placeholder="e.g. Mahan, Emirates..."
                      className="w-full h-11 px-3 rounded-xl border border-border bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-sub mb-1.5">
                      {lt(locale, { fa: 'شماره پرواز', en: 'Flight Number', ar: 'رقم الرحلة', zh: '航班号', ru: 'Номер рейса' })}
                    </label>
                    <input
                      type="text"
                      value={flightNumber}
                      onChange={(e) => setFlightNumber(e.target.value)}
                      placeholder="e.g. W5-061, EK-971"
                      className="w-full h-11 px-3 rounded-xl border border-border bg-surface text-ink text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-sub mb-1.5">
                      {lt(locale, { fa: 'تاریخ پرواز', en: 'Flight Date', ar: 'تاريخ الرحلة', zh: '航班日期', ru: 'Дата рейса' })}
                    </label>
                    <input
                      type="date"
                      value={flightDate}
                      onChange={(e) => setFlightDate(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-border bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-sub mb-1.5">
                      {lt(locale, { fa: 'ساعت پرواز / فرود', en: 'Flight Time', ar: 'وقت الرحلة', zh: '起降时间', ru: 'Время' })}
                    </label>
                    <input
                      type="time"
                      value={flightTime}
                      onChange={(e) => setFlightTime(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-border bg-surface text-ink text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Passengers & Accompanying Stepper */}
              <div className="bg-surface rounded-2xl p-5 md:p-6 border border-border/80 shadow-elev-1 space-y-4">
                <h2 className="text-base md:text-lg font-bold text-ink flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand" />
                  <span>{lt(locale, { fa: 'مسافران و همراهان جایگاه', en: 'Passengers & Accompanying Guests', ar: 'المسافرون والمرافقون', zh: '旅客与送机/接机随行人员', ru: 'Пассажиры и сопровождающие' })}</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
                  {/* Adults */}
                  <div className="p-3.5 rounded-xl border border-border/80 bg-surface-subtle flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-ink">{lt(locale, { fa: 'بزرگسال (بالای ۱۲ سال)', en: 'Adult (>12yo)', ar: 'بالغ', zh: '成人', ru: 'Взрослый' })}</div>
                      <div className="text-xs text-muted font-price">{formatToman(currentAirport.basePriceAdult)} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'Томан' })}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setAdults((prev) => Math.max(1, prev - 1))}
                        disabled={adults <= 1}
                        className="w-10 h-10 rounded-lg border border-border bg-surface flex items-center justify-center text-ink disabled:opacity-40 min-h-[44px] min-w-[44px] touch-target active:scale-95"
                        aria-label="Decrease adults"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-bold text-base w-6 text-center font-price num">{num(adults, locale)}</span>
                      <button
                        onClick={() => setAdults((prev) => Math.min(20, prev + 1))}
                        className="w-10 h-10 rounded-lg border border-border bg-surface flex items-center justify-center text-ink min-h-[44px] min-w-[44px] touch-target active:scale-95"
                        aria-label="Increase adults"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Children */}
                  <div className="p-3.5 rounded-xl border border-border/80 bg-surface-subtle flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-ink">{lt(locale, { fa: 'کودک (۲ تا ۱۲ سال)', en: 'Child (2-12yo)', ar: 'طفل', zh: '儿童', ru: 'Ребенок' })}</div>
                      <div className="text-xs text-muted font-price">{formatToman(currentAirport.basePriceAdult)} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'Томан' })}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setChildren((prev) => Math.max(0, prev - 1))}
                        disabled={children <= 0}
                        className="w-10 h-10 rounded-lg border border-border bg-surface flex items-center justify-center text-ink disabled:opacity-40 min-h-[44px] min-w-[44px] touch-target active:scale-95"
                        aria-label="Decrease children"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-bold text-base w-6 text-center font-price num">{num(children, locale)}</span>
                      <button
                        onClick={() => setChildren((prev) => Math.min(10, prev + 1))}
                        className="w-10 h-10 rounded-lg border border-border bg-surface flex items-center justify-center text-ink min-h-[44px] min-w-[44px] touch-target active:scale-95"
                        aria-label="Increase children"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Infants */}
                  <div className="p-3.5 rounded-xl border border-border/80 bg-surface-subtle flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-ink">{lt(locale, { fa: 'نوزاد (زیر ۲ سال)', en: 'Infant (<2yo)', ar: 'رضيع', zh: '婴儿', ru: 'Младенец' })}</div>
                      <div className="text-xs text-emerald-600 font-semibold">{lt(locale, { fa: 'رایگان', en: 'Free', ar: 'مجاني', zh: '免费', ru: 'Бесплатно' })}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setInfants((prev) => Math.max(0, prev - 1))}
                        disabled={infants <= 0}
                        className="w-10 h-10 rounded-lg border border-border bg-surface flex items-center justify-center text-ink disabled:opacity-40 min-h-[44px] min-w-[44px] touch-target active:scale-95"
                        aria-label="Decrease infants"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-bold text-base w-6 text-center font-price num">{num(infants, locale)}</span>
                      <button
                        onClick={() => setInfants((prev) => Math.min(5, prev + 1))}
                        className="w-10 h-10 rounded-lg border border-border bg-surface flex items-center justify-center text-ink min-h-[44px] min-w-[44px] touch-target active:scale-95"
                        aria-label="Increase infants"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Accompanying Escort / المستقبل أو المشايع */}
                <div className="mt-3 p-3.5 rounded-xl border border-dashed border-brand/50 bg-brand-light/10 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-ink flex items-center gap-1.5">
                      <Coffee className="w-4 h-4 text-brand" />
                      <span>{lt(locale, { fa: 'مشایعت‌کننده یا استقبال‌کننده (همراه مسافر)', en: 'Accompanying Escort / Guest', ar: 'المستقبل أو المشايع', zh: '接送机陪同人员', ru: 'Провожающий / Встречающий' })}</span>
                    </div>
                    <p className="text-xs text-sub mt-0.5">
                      {lt(locale, {
                        fa: 'امکان حضور در سالن تشریفات و استفاده کامل از بوفه سلف‌سرویس تا ۳ ساعت.',
                        en: 'Full lounge access and unlimited buffet dining for up to 3 hours.',
                        ar: 'دخول كامل للصالة والبوفيه المفتوح حتى ٣ ساعات.',
                        zh: '享用贵宾室设施与自助餐饮最长3小时。',
                        ru: 'Пребывание в зале и питание по системе «шведский стол» до 3 часов.',
                      })}
                    </p>
                    <div className="text-xs text-brand font-bold mt-1 font-price">
                      {formatToman(currentAirport.basePriceGuest)} {lt(locale, { fa: 'تومان به ازای هر نفر', en: 'Toman / person', ar: 'تومان لكل شخص', zh: '图曼/人', ru: 'Томан / чел' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAccompanyingGuests((prev) => Math.max(0, prev - 1))}
                      disabled={accompanyingGuests <= 0}
                      className="w-10 h-10 rounded-lg border border-border bg-surface flex items-center justify-center text-ink disabled:opacity-40 min-h-[44px] min-w-[44px] touch-target active:scale-95"
                      aria-label="Decrease accompanying"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-bold text-base w-6 text-center font-price">{accompanyingGuests}</span>
                    <button
                      onClick={() => setAccompanyingGuests((prev) => Math.min(10, prev + 1))}
                      className="w-10 h-10 rounded-lg border border-border bg-surface flex items-center justify-center text-ink min-h-[44px] min-w-[44px] touch-target active:scale-95"
                      aria-label="Increase accompanying"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 3: Luxury Add-On Services */}
              <div className="bg-surface rounded-2xl p-5 md:p-6 border border-border/80 shadow-elev-1 space-y-4">
                <h2 className="text-base md:text-lg font-bold text-ink flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#F0A62A]" />
                  <span>{lt(locale, { fa: 'خدمات افزوده و تکمیلی تشریفات', en: 'Special Assistance & VIP Add-ons', ar: 'الخدمات الإضافية والخاصة', zh: '定制尊享与增值服务', ru: 'Дополнительные VIP услуги' })}</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pet Quarantine Service */}
                  <div className="p-4 rounded-xl border border-border bg-surface-elevated flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Dog className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-ink">{lt(locale, { fa: 'حمل و قرنطینه حیوان خانگی (PET)', en: 'Pet Quarantine Handling (AVIH)', ar: 'خدمات الحيوانات الأليفة', zh: '宠物托运与检疫服务', ru: 'Транспортировка питомцев' })}</div>
                        <p className="text-xs text-sub mt-0.5">
                          {lt(locale, {
                            fa: 'پیگیری امور گمرکی و بهداشتی مستقیماً در سالن CIP بدون نیاز به ترمینال شلوغ.',
                            en: 'Customs and veterinary quarantine processed directly at the CIP terminal.',
                            ar: 'إجراءات الجمارك والحجر الصحي للحيوان مباشرة في صالة CIP.',
                            zh: '在贵宾厅专属区域一站式办理海关检疫与航空托运手续。',
                            ru: 'Ветеринарный контроль и оформление прямо в CIP зале.',
                          })}
                        </p>
                        <div className="text-xs text-brand font-bold font-price mt-1">
                          {formatToman(currentAirport.petServicePrice)} {lt(locale, { fa: 'تومان / قلاده', en: 'Toman / pet', ar: 'تومان', zh: '图曼', ru: 'Томан' })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setPetCount((prev) => Math.max(0, prev - 1))}
                        disabled={petCount <= 0}
                        className="w-9 h-9 rounded-lg border border-border bg-surface flex items-center justify-center text-ink disabled:opacity-40 min-h-[44px] min-w-[44px] touch-target"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold text-sm w-5 text-center font-price">{petCount}</span>
                      <button
                        onClick={() => setPetCount((prev) => Math.min(4, prev + 1))}
                        className="w-9 h-9 rounded-lg border border-border bg-surface flex items-center justify-center text-ink min-h-[44px] min-w-[44px] touch-target"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Wheelchair & LOM Lift */}
                  <div className="p-4 rounded-xl border border-border bg-surface-elevated flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Accessibility className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-ink">{lt(locale, { fa: 'خدمات ویژه توان‌خواه و بالابر باند (LOM)', en: 'Wheelchair & Tarmac Lift (LOM)', ar: 'كرسي متحرك ورافعة المدرج', zh: '轮椅与升降客梯服务', ru: 'Инвалидное кресло и лифт' })}</div>
                        <p className="text-xs text-sub mt-0.5">
                          {lt(locale, {
                            fa: 'ویلچر اختصاصی جایگاه و دستگاه بالابر هیدرولیک باند جهت سوار شدن بدون پله.',
                            en: 'Special assistance wheelchair and hydraulic apron lift directly to aircraft doors.',
                            ar: 'كرسي متحرك مخصص ورافعة هيدروليكية للصعود إلى الطائرة بدون سلالم.',
                            zh: '提供CIP专属轮椅及机坪专用液压升降设备登机。',
                            ru: 'Инвалидное кресло и автолифт для комфортной посадки без ступеней.',
                          })}
                        </p>
                        <div className="text-xs text-brand font-bold font-price mt-1">
                          {formatToman(currentAirport.wheelchairPrice)} {lt(locale, { fa: 'تومان / نفر', en: 'Toman / pax', ar: 'تومان', zh: '图曼', ru: 'Томан' })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setWheelchairCount((prev) => Math.max(0, prev - 1))}
                        disabled={wheelchairCount <= 0}
                        className="w-9 h-9 rounded-lg border border-border bg-surface flex items-center justify-center text-ink disabled:opacity-40 min-h-[44px] min-w-[44px] touch-target"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold text-sm w-5 text-center font-price">{wheelchairCount}</span>
                      <button
                        onClick={() => setWheelchairCount((prev) => Math.min(4, prev + 1))}
                        className="w-9 h-9 rounded-lg border border-border bg-surface flex items-center justify-center text-ink min-h-[44px] min-w-[44px] touch-target"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Day Suite Selector */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-sub mb-2 flex items-center gap-1.5">
                    <BedDouble className="w-4 h-4 text-brand" />
                    <span>{lt(locale, { fa: 'سوئیت‌های اقامتی ساعتی و هتل فرودگاهی', en: 'Lounge Day Suites & Airport Hotel', ar: 'أجنحة الاستراحة وساعات الفندق', zh: '贵宾室钟点套房或机场酒店', ru: 'Дневные люксы и отель' })}</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                    {[
                      { id: 'NONE' as CipSuiteType, labelFa: 'بدون سوئیت اقامتی', labelEn: 'No Suite', price: 0 },
                      { id: '6_HOURS' as CipSuiteType, labelFa: 'سوئیت ۶ ساعته سالن', labelEn: '6-Hour Day Suite', price: currentAirport.suite6hPrice },
                      { id: '10_HOURS' as CipSuiteType, labelFa: 'سوئیت ۱۰ ساعته سالن', labelEn: '10-Hour Day Suite', price: currentAirport.suite10hPrice },
                      { id: 'OVERNIGHT' as CipSuiteType, labelFa: 'اقامت شبانه هتل فرودگاه', labelEn: 'Overnight Hotel Room', price: currentAirport.suiteOvernightPrice },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setSuiteType(opt.id)}
                        className={`p-3 rounded-xl border text-start transition-all min-h-[44px] flex flex-col justify-between ${
                          suiteType === opt.id
                            ? 'border-brand bg-brand-light/20 text-brand-dark ring-2 ring-brand/20 font-bold'
                            : 'border-border bg-surface hover:border-brand/40 text-sub'
                        }`}
                      >
                        <div className="text-xs text-ink">{isRtl ? opt.labelFa : opt.labelEn}</div>
                        <div className="text-xs font-price text-muted mt-1">
                          {opt.price > 0 ? `${formatToman(opt.price)} ${lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'Томан' })}` : '—'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Airport Dedicated Transfer Fleet */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-sub mb-2 flex items-center gap-1.5">
                    <CarTaxiFront className="w-4 h-4 text-brand" />
                    <span>{lt(locale, { fa: 'ترانسفر فرودگاهی اختصاصی درب تا درب (تهران و حومه)', en: 'Dedicated Door-to-Door Airport Transfer', ar: 'خدمة التوصيل من الباب إلى الباب', zh: '专车门到门机场接送车队', ru: 'Индивидуальный трансфер от двери до двери' })}</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <button
                      onClick={() => setTransferVehicleId('NONE')}
                      className={`p-3 rounded-xl border text-start transition-all min-h-[44px] flex items-center justify-between ${
                        transferVehicleId === 'NONE'
                          ? 'border-brand bg-brand-light/20 text-brand-dark font-bold ring-2 ring-brand/20'
                          : 'border-border bg-surface hover:border-brand/40 text-sub'
                      }`}
                    >
                      <span className="text-xs text-ink">{lt(locale, { fa: 'بدون ترانسفر خودرویی', en: 'No Transfer Needed', ar: 'بدون خدمة توصيل', zh: '不需要接送车', ru: 'Без трансфера' })}</span>
                      <span className="text-xs text-muted">—</span>
                    </button>
                    {CIP_VEHICLES.slice(0, 5).map((vehicle) => {
                      const isSelected = transferVehicleId === vehicle.id;
                      return (
                        <button
                          key={vehicle.id}
                          onClick={() => setTransferVehicleId(vehicle.id)}
                          className={`p-3 rounded-xl border text-start transition-all min-h-[44px] flex flex-col justify-between ${
                            isSelected
                              ? 'border-brand bg-brand-light/20 text-brand-dark font-bold ring-2 ring-brand/20'
                              : 'border-border bg-surface hover:border-brand/40 text-sub'
                          }`}
                        >
                          <div className="text-xs font-semibold text-ink line-clamp-1">
                            {isRtl ? vehicle.nameFa : vehicle.nameEn}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted font-price mt-1">
                            <span>{formatToman(vehicle.priceTehran)} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'Томан' })}</span>
                            <span className="text-[10px] text-brand">({vehicle.capacity} مسافر)</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {transferVehicleId !== 'NONE' && (
                    <div className="mt-3">
                      <input
                        type="text"
                        value={transferAddress}
                        onChange={(e) => setTransferAddress(e.target.value)}
                        placeholder={lt(locale, {
                          fa: 'آدرس دقیق مبدأ یا مقصد ترانسفر (تهران، کرج، لواسان و...)',
                          en: 'Exact pickup or drop-off address (Tehran, Karaj, etc.)',
                          ar: 'العنوان الدقيق للاستقبال أو التوصيل',
                          zh: '详细上下车地址（德黑兰、卡拉季等）',
                          ru: 'Точный адрес посадки или высадки',
                        })}
                        className="w-full h-11 px-3 rounded-xl border border-border bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ─── Right 1 Column: Invoice & Booking Summary ──────────── */}
            <div className="space-y-6">
              <div className="bg-surface rounded-2xl p-5 md:p-6 border border-border/80 shadow-elev-2 sticky top-24 space-y-5">
                <div className="flex items-center justify-between border-b border-border/80 pb-3">
                  <h3 className="font-bold text-base text-ink flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-brand" />
                    <span>{lt(locale, { fa: 'صورت‌حساب شفاف تشریفات', en: 'Itemized Pricing Breakdown', ar: 'تفاصيل الفاتورة الشفافة', zh: '费用透明明细', ru: 'Детализация расчета' })}</span>
                  </h3>
                  <span className="text-xs bg-[#F0A62A]/15 text-[#9C6209] font-bold px-2 py-0.5 rounded-full">
                    {lt(locale, { fa: 'نرخ رسمی مصوب', en: 'Official Tariff', ar: 'التعرفة الرسمية', zh: '官方定价', ru: 'Официальный тариф' })}
                  </span>
                </div>

                {/* Selected Airport Summary Header */}
                <div className="p-3 bg-surface-subtle rounded-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center font-mono font-bold">
                    {currentAirport.airportCode}
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-ink">{isRtl ? currentAirport.airportNameFa : currentAirport.airportNameEn}</div>
                    <div className="text-muted text-[11px]">{currentAirport.terminal}</div>
                  </div>
                </div>

                {/* Dynamic Line Items */}
                <div className="space-y-2.5 text-xs text-sub">
                  {priceResult.lineItems.map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-2">
                      <span className="text-ink line-clamp-1">{isRtl ? item.titleFa : item.titleEn}</span>
                      <span className="font-price font-semibold text-ink shrink-0">
                        {formatToman(item.totalPriceToman)} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'Томан' })}
                      </span>
                    </div>
                  ))}

                  <div className="border-t border-border/80 pt-3 mt-3 flex items-center justify-between font-bold text-sm text-ink">
                    <span>{lt(locale, { fa: 'مجموع نهایی قابل پرداخت', en: 'Total Payable Amount', ar: 'المجموع الإجمالي', zh: '应付总额', ru: 'Итого к оплате' })}</span>
                    <div className="text-end">
                      <div className="text-lg text-[#9C6209] font-price font-extrabold">
                        {formatToman(priceResult.totalToman)} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'Томан' })}
                      </div>
                      <div className="text-[10px] text-muted font-price">
                        ({new Intl.NumberFormat().format(priceResult.totalRials)} {lt(locale, { fa: 'ریال', en: 'Rials', ar: 'ريال', zh: '里亚尔', ru: 'Риалов' })})
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Contact Input */}
                <div className="space-y-3 pt-2 border-t border-border/60">
                  <div>
                    <label className="block text-[11px] font-semibold text-sub mb-1">
                      {lt(locale, { fa: 'نام و نام خانوادگی رزروکننده', en: 'Lead Traveler / Booker Name', ar: 'اسم المسؤول عن الحجز', zh: '预订人姓名', ru: 'ФИО контактного лица' })}
                    </label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="e.g. علیرضا بهرامی / Alireza Bahrami"
                      className="w-full h-10 px-3 rounded-xl border border-border bg-surface text-ink text-xs focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-sub mb-1">
                      {lt(locale, { fa: 'شماره موبایل جهت هماهنگی و ارسال واچر', en: 'Mobile Phone for Voucher SMS', ar: 'رقم الهاتف لاستلام القسيمة', zh: '接收凭证与确认短信的手机号', ru: 'Телефон для ваучера' })}
                    </label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="09123456789"
                      className="w-full h-10 px-3 rounded-xl border border-border bg-surface text-ink text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                  </div>
                </div>

                {validationError && (
                  <div className="p-2.5 rounded-xl bg-red-50 text-red-600 text-xs flex items-center gap-1.5">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}

                {/* Primary Booking CTA (Action Saffron #F0A62A) */}
                <button
                  onClick={handleProceedToBooking}
                  className="w-full h-12 rounded-xl bg-[#F0A62A] hover:bg-[#DC9018] text-[#3D2504] font-bold text-sm transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 touch-target"
                >
                  <Crown className="w-4 h-4" />
                  <span>{lt(locale, { fa: 'رزرو قطعی و ادامه فرایند خرید', en: 'Confirm & Proceed to Checkout', ar: 'تأكيد ومتابعة الدفع', zh: '确认并前往结算', ru: 'Подтвердить и перейти к оплате' })}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </button>

                {/* Trust Badges */}
                <div className="flex items-center justify-center gap-4 text-[11px] text-muted pt-1">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {lt(locale, { fa: 'صدور آنی واچر رسمی', en: 'Instant Voucher', ar: 'قسيمة فورية', zh: '即时出具电子凭证', ru: 'Мгновенный ваучер' })}
                  </span>
                  <span>•</span>
                  <span>{lt(locale, { fa: 'کنسلی بدون جریمه تا ۵ ساعت قبل', en: 'Free cancellation >5h', ar: 'إلغاء مجاني قبل ٥ ساعات', zh: '起飞前5小时可免罚金取消', ru: 'Бесплатная отмена за 5ч' })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Facilities & Gallery View ──────────────────────────────── */}
        {activeTab === 'facilities' && (
          <div className="bg-surface rounded-2xl p-6 md:p-8 border border-border shadow-elev-1 space-y-8">
            <div>
              <h2 className="text-xl font-bold text-ink mb-2">
                {lt(locale, {
                  fa: `امکانات و گالری سالن تشریفات اختصاصی ${currentAirport.airportNameFa}`,
                  en: `${currentAirport.airportNameEn} CIP Facilities`,
                  ar: `مرافق صالة كبار الشخصيات بمطار ${currentAirport.cityFa}`,
                  zh: `${currentAirport.cityEn}机场CIP贵宾室设施全景`,
                  ru: `Услуги и фотогалерея CIP зала аэропорта ${currentAirport.cityEn}`,
                })}
              </h2>
              <p className="text-sub text-sm leading-relaxed max-w-3xl">
                {currentAirport.descriptionFa}
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentAirport.featuresFa.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-subtle border border-border/70">
                  <CheckCircle2 className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                  <span className="text-sm font-medium text-ink">{feat}</span>
                </div>
              ))}
            </div>

            {/* Gallery Images */}
            {currentAirport.gallery && currentAirport.gallery.length > 0 && (
              <div>
                <h3 className="font-bold text-base text-ink mb-4">{lt(locale, { fa: 'تصاویر اختصاصی جایگاه تشریفات', en: 'Lounge Photo Gallery', ar: 'معرض صور الصالة', zh: '实拍图集', ru: 'Фотографии зала' })}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {currentAirport.gallery.map((img, i) => (
                    <div key={i} className="relative aspect-[4/3] rounded-xl overflow-hidden border border-border group shadow-sm">
                      <Image
                        src={img}
                        alt={`CIP Lounge ${i + 1}`}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Terms & Cancellation Rules View ────────────────────────── */}
        {activeTab === 'rules' && (
          <div className="bg-surface rounded-2xl p-6 md:p-8 border border-border shadow-elev-1 space-y-6">
            <h2 className="text-xl font-bold text-ink mb-2">
              {lt(locale, {
                fa: 'قوانین و ضوابط رسمی رزرواسیون جایگاه تشریفات CIP فرودگاه امام خمینی',
                en: 'Official Terms & Cancellation Guidelines',
                ar: 'الشروط والضوابط الرسمية لحجز صالة CIP',
                zh: '伊玛目机场CIP贵宾室官方规则与取消条例',
                ru: 'Официальные правила бронирования и отмены CIP',
              })}
            </h2>

            <div className="space-y-4 text-sm text-sub leading-relaxed">
              <div className="p-4 rounded-xl border border-border/80 bg-surface-subtle">
                <h4 className="font-bold text-ink mb-1">۱. مهلت زمان رزرو و حضور در جایگاه</h4>
                <p>امکان ثبت سفارش آنلاین تا ۵ ساعت قبل از پرواز وجود دارد. مسافران پروازهای خروجی موظف هستند حداقل ۲ ساعت و حداکثر ۴ ساعت قبل از پرواز در سالن تشریفات حضور یابند. حضور بیش از ۴ ساعت مشمول هزینه اقامت مازاد خواهد بود.</p>
              </div>

              <div className="p-4 rounded-xl border border-border/80 bg-surface-subtle">
                <h4 className="font-bold text-ink mb-1">۲. قوانین کنسلی و استرداد وجه تشریفات</h4>
                <p>کنسلی رزرو تشریفات CIP تا ۵ ساعت مانده به پرواز مشمول ۱۰۰٪ استرداد وجه (بدون هیچ‌گونه جریمه) می‌باشد. در صورت کنسلی کمتر از ۵ ساعت قبل از پرواز یا عدم حضور مسافر (No-Show)، کل وجه پرداختی سوخت خواهد شد.</p>
              </div>

              <div className="p-4 rounded-xl border border-border/80 bg-surface-subtle">
                <h4 className="font-bold text-ink mb-1">۳. قوانین کنسلی ترانسفر فرودگاهی</h4>
                <p>کنسلی سرویس ترانسفر خودرویی تا ۶ ساعت قبل از زمان حضور با کسر ۱۰٪ جریمه امکان‌پذیر است. کنسلی کمتر از ۶ ساعت قبل مشمول ۱۰۰٪ جریمه خواهد بود.</p>
              </div>

              <div className="p-4 rounded-xl border border-border/80 bg-surface-subtle">
                <h4 className="font-bold text-ink mb-1">۴. قوانین گمرکی و اقلام مجاز خروجی</h4>
                <p>خروج هرگونه سکه و مسکوکات طلا ممنوع است. سقف خروج زیورآلات طلا حداکثر ۱۵۰ گرم، فرش دستباف تا ۲۰ متر مربع، زعفران تا ۱۰۰ گرم به ازای هر پاسپورت، و ارز خروجی تا سقف ۵,۰۰۰ یورو (یا معادل آن به سایر ارزها) مجاز است.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── Mobile Sticky Bottom Conversion Bar (AGENTS.md Thumb Zone) ── */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-surface/95 backdrop-blur-md p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-border z-40 shadow-elev-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] text-muted">
              {lt(locale, { fa: 'مبلغ کل رزرو تشریفات', en: 'Total CIP Amount', ar: 'المجموع', zh: '总计金额', ru: 'Итого' })}
            </div>
            <div className="text-base font-extrabold text-[#9C6209] font-price">
              {formatToman(priceResult.totalToman)} <span className="text-xs font-normal">{lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'Тоمان' })}</span>
            </div>
          </div>

          <button
            onClick={handleProceedToBooking}
            className="flex-1 h-12 rounded-xl bg-[#F0A62A] hover:bg-[#DC9018] text-[#3D2504] font-bold text-sm transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 touch-target"
          >
            <Crown className="w-4 h-4" />
            <span>{lt(locale, { fa: 'ثبت و ادامه رزرو', en: 'Book Now', ar: 'حجز ومتابعة', zh: '立即预订', ru: 'Забронировать' })}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>
      </div>

      {/* ─── Mobile Airport Selector Bottom Sheet (< 768px) ─────────── */}
      <Sheet open={airportSheetOpen} onOpenChange={setAirportSheetOpen} side="bottom">
        <SheetContent className="space-y-4">
          <div className="text-center pb-2">
            <h3 className="font-bold text-base text-ink">
              {lt(locale, { fa: 'انتخاب جایگاه تشریفات فرودگاه', en: 'Select Airport CIP Lounge', ar: 'اختر مطار صالة التشريفات', zh: '选择机场贵宾室', ru: 'Выберите аэропорт' })}
            </h3>
            <p className="text-xs text-muted mt-0.5">
              {lt(locale, { fa: 'سالن‌های مجاز و رسمی تشریفات تحت پوشش فیروزه', en: 'Official authorized CIP lounges', ar: 'الصالات الرسمية المعتمدة', zh: '官方认证CIP贵宾候机厅', ru: 'Официальные CIP залы' })}
            </p>
          </div>

          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto">
            {CIP_AIRPORTS.map((airport) => {
              const isSelected = airport.airportCode === selectedAirportCode;
              return (
                <button
                  key={airport.id}
                  onClick={() => {
                    setSelectedAirportCode(airport.airportCode);
                    setAirportSheetOpen(false);
                  }}
                  className={`w-full p-4 rounded-2xl border text-start transition-all flex items-center justify-between min-h-[56px] touch-target ${
                    isSelected
                      ? 'border-brand bg-brand-light/15 text-brand-dark ring-2 ring-brand/20 font-bold'
                      : 'border-border bg-surface-elevated text-sub'
                  }`}
                >
                  <div>
                    <div className="font-bold text-sm text-ink flex items-center gap-2">
                      <span>{isRtl ? airport.cityFa : airport.cityEn}</span>
                      <span className="font-mono text-xs text-sub bg-ink/5 px-2 py-0.5 rounded">{airport.airportCode}</span>
                    </div>
                    <div className="text-xs text-muted mt-1">{isRtl ? airport.airportNameFa : airport.airportNameEn}</div>
                  </div>
                  <div className="text-end font-price font-bold text-brand text-xs">
                    {formatToman(airport.basePriceAdult)} {lt(locale, { fa: 'تومان', en: 'Toman', ar: 'تومان', zh: '图曼', ru: 'Томан' })}
                  </div>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
