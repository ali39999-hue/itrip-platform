'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import {
  Compass,
  Landmark,
  BookOpen,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  MapPin,
  Calendar,
  X,
  Loader2,
  Pencil,
  Wand2,
  Coins,
  Percent,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { num } from '@/lib/format';
import {
  TOUR_CURRENCIES,
  type TourCurrency,
  getCurrencyLabel,
  parsePriceInput,
  formatNumberWithCommas,
  getHumanAmountWords,
  getRialTomanConversionHint,
} from '@/lib/currencies';
import { ErpModal, ErpPageHeader, ErpTabs, erpDangerBtnCls, erpPrimaryBtnCls, erpGhostBtnCls } from '@/components/admin/erp-ui';
import { SiteContentTab } from '@/components/admin/SiteContentTab';
import {
  getAdminToursAction,
  createAdminTourAction,
  updateAdminTourAction,
  deleteAdminTourAction,
  toggleAdminTourPublishAction,
  getAdminExperiencesAction,
  createAdminExperienceAction,
  updateAdminExperienceAction,
  deleteAdminExperienceAction,
  toggleAdminExperienceActiveAction,
  getAdminTraveloguesAction,
  createAdminTravelogueAction,
  updateAdminTravelogueAction,
  deleteAdminTravelogueAction,
  toggleAdminTraveloguePublishAction,
  getAdminGuidesAction,
  createAdminGuideAction,
  updateAdminGuideAction,
  deleteAdminGuideAction,
  toggleAdminGuidePublishAction,
} from '@/actions/content';

type ContentTab = 'site' | 'tours' | 'experiences' | 'travelogues' | 'guides';

export interface TourAdminItem {
  id: string;
  title: string;
  titleEn?: string | null;
  city: string;
  country: string;
  durationDays: number;
  currency?: string | null;
  price: number | { toString(): string };
  childPrice?: number | { toString(): string } | null;
  originalPrice?: number | { toString(): string } | null;
  discountPercent?: number | null;
  category: string;
  isPublished?: boolean;
  heroImage?: string | null;
  summary?: string | null;
  description?: string | null;
  hotelName?: string | null;
  hotelStars?: number | null;
  transportType?: string | null;
  includes?: string[];
  highlights?: string[];
}

export interface ExperienceAdminItem {
  id: string;
  countryId: string;
  category: string;
  title: string;
  titleEn?: string | null;
  desc?: string | null;
  where?: string | null;
  when?: string | null;
  fromPrice: number | { toString(): string };
  isActive?: boolean;
}

export interface TravelogueAdminItem {
  id: string;
  titleFa: string;
  destFa: string;
  userName: string;
  contentFa: string;
  image?: string | null;
  isPublished?: boolean;
}

export interface GuideAdminItem {
  id: string;
  titleFa: string;
  categoryFa: string;
  readTime: string;
  excerptFa?: string | null;
  bodyFa: string;
  isPublished?: boolean;
}

export interface ContentClientPageProps {
  initialTours?: TourAdminItem[];
  initialExperiences?: ExperienceAdminItem[];
  initialTravelogues?: TravelogueAdminItem[];
  initialGuides?: GuideAdminItem[];
}

function AdminContentPageInner({
  initialTours = [],
  initialExperiences = [],
  initialTravelogues = [],
  initialGuides = [],
}: ContentClientPageProps) {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab') as ContentTab | null;
  const [activeTab, setActiveTab] = useState<ContentTab>(
    requestedTab && ['site', 'tours', 'experiences', 'travelogues', 'guides'].includes(requestedTab)
      ? requestedTab
      : 'tours'
  );

  useEffect(() => {
    if (requestedTab && ['site', 'tours', 'experiences', 'travelogues', 'guides'].includes(requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Data states initialized directly from server-rendered props (0ms first paint!)
  const [tours, setTours] = useState<TourAdminItem[]>(initialTours);
  const [experiences, setExperiences] = useState<ExperienceAdminItem[]>(initialExperiences);
  const [travelogues, setTravelogues] = useState<TravelogueAdminItem[]>(initialTravelogues);
  const [guides, setGuides] = useState<GuideAdminItem[]>(initialGuides);

  const isFirstMount = useRef(true);

  // Modals state
  const [tourModalOpen, setTourModalOpen] = useState(false);
  const [expModalOpen, setExpModalOpen] = useState(false);
  const [travelogueModalOpen, setTravelogueModalOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ kind: 'tour' | 'exp' | 'travelogue' | 'guide'; id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Editing state (null = create mode)
  const [editingTourId, setEditingTourId] = useState<string | null>(null);
  const [editingExpId, setEditingExpId] = useState<string | null>(null);
  const [editingTravelogueId, setEditingTravelogueId] = useState<string | null>(null);
  const [editingGuideId, setEditingGuideId] = useState<string | null>(null);

  // Per-item pending flags for inline toggles
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Submitting state
  const [submitting, setSubmitting] = useState(false);

  // Modal feedback state
  const [modalFeedback, setModalFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Tour modal tab state
  const [tourModalTab, setTourModalTab] = useState<'basic' | 'pricing' | 'services' | 'content'>('basic');

  // Form states: Tour
  const [tourTitle, setTourTitle] = useState('');
  const [tourTitleEn, setTourTitleEn] = useState('');
  const [tourCity, setTourCity] = useState('');
  const [tourCountry, setTourCountry] = useState('ایران');
  const [tourDurationDays, setTourDurationDays] = useState(3);
  const [tourCurrency, setTourCurrency] = useState<TourCurrency>('TOMAN');
  const [tourPriceStr, setTourPriceStr] = useState('85,000,000');
  const [tourChildPriceStr, setTourChildPriceStr] = useState('58,000,000');
  const [tourDiscountMode, setTourDiscountMode] = useState<'percent' | 'amount'>('percent');
  const [tourOriginalPriceStr, setTourOriginalPriceStr] = useState('');
  const [tourDiscountPercent, setTourDiscountPercent] = useState<number | ''>('');
  const [tourDiscountAmountStr, setTourDiscountAmountStr] = useState('');
  const [tourCategory, setTourCategory] = useState('cultural');
  const [tourHotel, setTourHotel] = useState('');
  const [tourHotelStars, setTourHotelStars] = useState(5);
  const [tourTransport, setTourTransport] = useState('');
  const [tourSummary, setTourSummary] = useState('');
  const [tourDescription, setTourDescription] = useState('');
  const [tourIncludes, setTourIncludes] = useState('');
  const [tourHighlights, setTourHighlights] = useState('');
  const [tourHeroImage, setTourHeroImage] = useState('');

  // Form states: Experience
  const [expCountry, setExpCountry] = useState('iran');
  const [expCategory, setExpCategory] = useState('culture');
  const [expTitle, setExpTitle] = useState('');
  const [expTitleEn, setExpTitleEn] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expWhere, setExpWhere] = useState('');
  const [expWhen, setExpWhen] = useState('');
  const [expFromPrice, setExpFromPrice] = useState(15000000);

  // Form states: Travelogue
  const [trvTitleFa, setTrvTitleFa] = useState('');
  const [trvDestFa, setTrvDestFa] = useState('');
  const [trvUserName, setTrvUserName] = useState('');
  const [trvImage, setTrvImage] = useState('');
  const [trvContentFa, setTrvContentFa] = useState('');

  // Form states: Guide
  const [gdTitleFa, setGdTitleFa] = useState('');
  const [gdCategoryFa, setGdCategoryFa] = useState('نکات سفر');
  const [gdReadTime, setGdReadTime] = useState('۵ دقیقه');
  const [gdExcerptFa, setGdExcerptFa] = useState('');
  const [gdBodyFa, setGdBodyFa] = useState('');

  const loadData = useCallback(async () => {
    if (activeTab === 'site') {
      // SiteContentTab fetches its own data — just clear the initial loading flag.
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (activeTab === 'tours') {
        const res = await getAdminToursAction();
        if (res.success) setTours(res.tours || []);
      } else if (activeTab === 'experiences') {
        const res = await getAdminExperiencesAction();
        if (res.success) setExperiences(res.experiences || []);
      } else if (activeTab === 'travelogues') {
        const res = await getAdminTraveloguesAction();
        if (res.success) setTravelogues(res.travelogues || []);
      } else if (activeTab === 'guides') {
        const res = await getAdminGuidesAction();
        if (res.success) setGuides(res.guides || []);
      }
    } catch (e: unknown) {
      console.error(e);
      setFeedback({ msg: e instanceof Error ? e.message : 'خطا در بارگذاری داده‌ها', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    loadData();
  }, [loadData]);

  // Escape closes any open creation modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setTourModalOpen(false);
      setExpModalOpen(false);
      setTravelogueModalOpen(false);
      setGuideModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);  // Handlers: Tour
  function openCreateTour() {
    setEditingTourId(null);
    setTourModalTab('basic');
    setModalFeedback(null);
    setTourTitle('');
    setTourTitleEn('');
    setTourCity('');
    setTourCountry('ایران');
    setTourDurationDays(3);
    setTourCurrency('TOMAN');
    setTourPriceStr(formatNumberWithCommas(85000000));
    setTourChildPriceStr(formatNumberWithCommas(58000000));
    setTourDiscountMode('percent');
    setTourOriginalPriceStr('');
    setTourDiscountPercent('');
    setTourDiscountAmountStr('');
    setTourCategory('cultural');
    setTourHotel('');
    setTourHotelStars(5);
    setTourTransport('');
    setTourSummary('');
    setTourDescription('');
    setTourIncludes('پرواز رفت و برگشت، هتل ۵ ستاره، بیمه مسافرتی، ترانسفر فرودگاهی');
    setTourHighlights('گشت شهری، بازدید از اماکن تاریخی، لیدر محلی');
    setTourHeroImage('');
    setTourModalOpen(true);
  }

  function openEditTour(t: TourAdminItem) {
    setEditingTourId(t.id);
    setTourModalTab('basic');
    setModalFeedback(null);
    setTourTitle(t.title);
    setTourTitleEn(t.titleEn || '');
    setTourCity(t.city);
    setTourCountry(t.country || 'ایران');
    setTourDurationDays(t.durationDays);
    setTourCurrency((t.currency as TourCurrency) || 'TOMAN');
    const p = Number(t.price);
    setTourPriceStr(formatNumberWithCommas(p));
    setTourChildPriceStr(t.childPrice != null ? formatNumberWithCommas(Number(t.childPrice)) : '');
    const orig = t.originalPrice != null ? Number(t.originalPrice) : 0;
    setTourOriginalPriceStr(orig > 0 ? formatNumberWithCommas(orig) : '');
    const discPct = t.discountPercent != null ? Number(t.discountPercent) : '';
    setTourDiscountPercent(discPct);
    if (orig > p) {
      setTourDiscountAmountStr(formatNumberWithCommas(orig - p));
    } else {
      setTourDiscountAmountStr('');
    }
    setTourDiscountMode('percent');
    setTourCategory(t.category);
    setTourHotel(t.hotelName || '');
    setTourHotelStars(t.hotelStars || 5);
    setTourTransport(t.transportType || '');
    setTourSummary(t.summary || '');
    setTourDescription(t.description || '');
    setTourIncludes(Array.isArray(t.includes) ? t.includes.join('، ') : '');
    setTourHighlights(Array.isArray(t.highlights) ? t.highlights.join('، ') : '');
    setTourHeroImage(t.heroImage || '');
    setTourModalOpen(true);
  }

  function handlePriceChange(val: string) {
    const raw = parsePriceInput(val);
    setTourPriceStr(val === '' ? '' : formatNumberWithCommas(raw));
    if (tourDiscountMode === 'percent' && tourDiscountPercent !== '' && Number(tourDiscountPercent) > 0) {
      const pct = Number(tourDiscountPercent);
      if (pct < 100 && raw > 0) {
        const orig = Math.round(raw / (1 - pct / 100));
        setTourOriginalPriceStr(formatNumberWithCommas(orig));
        setTourDiscountAmountStr(formatNumberWithCommas(orig - raw));
      }
    } else if (tourDiscountMode === 'amount' && tourDiscountAmountStr.trim() !== '') {
      const diff = parsePriceInput(tourDiscountAmountStr);
      if (diff > 0 && raw > 0) {
        const orig = raw + diff;
        setTourOriginalPriceStr(formatNumberWithCommas(orig));
        setTourDiscountPercent(Math.round((diff / orig) * 100));
      }
    } else if (tourOriginalPriceStr.trim() !== '') {
      const orig = parsePriceInput(tourOriginalPriceStr);
      if (orig > raw && raw > 0) {
        const diff = orig - raw;
        setTourDiscountAmountStr(formatNumberWithCommas(diff));
        setTourDiscountPercent(Math.round((diff / orig) * 100));
      }
    }
  }

  function handleDiscountPercentChange(val: string) {
    if (val === '') {
      setTourDiscountPercent('');
      setTourOriginalPriceStr('');
      setTourDiscountAmountStr('');
      return;
    }
    const pct = Math.min(99, Math.max(1, parsePriceInput(val)));
    setTourDiscountPercent(pct);
    const p = parsePriceInput(tourPriceStr);
    if (p > 0 && pct > 0 && pct < 100) {
      const orig = Math.round(p / (1 - pct / 100));
      const diff = orig - p;
      setTourOriginalPriceStr(formatNumberWithCommas(orig));
      setTourDiscountAmountStr(formatNumberWithCommas(diff));
    }
  }

  function handleDiscountAmountChange(val: string) {
    if (val === '') {
      setTourDiscountAmountStr('');
      setTourOriginalPriceStr('');
      setTourDiscountPercent('');
      return;
    }
    const diff = parsePriceInput(val);
    setTourDiscountAmountStr(formatNumberWithCommas(diff));
    const p = parsePriceInput(tourPriceStr);
    if (diff > 0 && p > 0) {
      const orig = p + diff;
      const pct = Math.round((diff / orig) * 100);
      setTourOriginalPriceStr(formatNumberWithCommas(orig));
      setTourDiscountPercent(pct);
    } else {
      setTourOriginalPriceStr('');
      setTourDiscountPercent('');
    }
  }

  function handleOriginalPriceChange(val: string) {
    if (val === '') {
      setTourOriginalPriceStr('');
      setTourDiscountAmountStr('');
      setTourDiscountPercent('');
      return;
    }
    const orig = parsePriceInput(val);
    setTourOriginalPriceStr(formatNumberWithCommas(orig));
    const p = parsePriceInput(tourPriceStr);
    if (orig > p && p > 0) {
      const diff = orig - p;
      const pct = Math.round((diff / orig) * 100);
      setTourDiscountAmountStr(formatNumberWithCommas(diff));
      setTourDiscountPercent(pct);
    } else {
      setTourDiscountAmountStr('');
      setTourDiscountPercent('');
    }
  }

  function handleClearDiscount() {
    setTourOriginalPriceStr('');
    setTourDiscountPercent('');
    setTourDiscountAmountStr('');
  }

  async function handleCreateTour(e: React.FormEvent) {
    e.preventDefault();
    setModalFeedback(null);

    const title = tourTitle.trim();
    if (!title) {
      setModalFeedback({ msg: 'لطفاً عنوان تور را وارد کنید.', type: 'error' });
      setTourModalTab('basic');
      return;
    }

    const city = tourCity.trim();
    if (!city) {
      setModalFeedback({ msg: 'لطفاً شهر مقصد را وارد کنید.', type: 'error' });
      setTourModalTab('basic');
      return;
    }

    const price = parsePriceInput(tourPriceStr);
    if (price <= 0) {
      setModalFeedback({ msg: 'مبلغ نهایی تور باید بزرگ‌تر از صفر باشد.', type: 'error' });
      setTourModalTab('pricing');
      return;
    }

    setSubmitting(true);
    try {
      const parsedIncludes = tourIncludes
        .split(/[،,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const parsedHighlights = tourHighlights
        .split(/[،,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const childPrice = tourChildPriceStr.trim() !== '' ? parsePriceInput(tourChildPriceStr) : null;
      const originalPrice = tourOriginalPriceStr.trim() !== '' ? parsePriceInput(tourOriginalPriceStr) : null;
      const discountPercent = tourDiscountPercent !== '' && Number(tourDiscountPercent) > 0 ? Number(tourDiscountPercent) : null;

      const payload = {
        title,
        titleEn: tourTitleEn.trim() || title,
        city,
        country: tourCountry.trim() || 'ایران',
        durationDays: tourDurationDays || 3,
        currency: tourCurrency || 'TOMAN',
        price,
        childPrice: editingTourId ? childPrice : (childPrice ?? undefined),
        originalPrice: editingTourId ? originalPrice : (originalPrice ?? undefined),
        discountPercent: editingTourId ? discountPercent : (discountPercent ?? undefined),
        category: tourCategory,
        hotelName: tourHotel.trim() || (editingTourId ? null : undefined),
        hotelStars: tourHotelStars || 5,
        transportType: tourTransport.trim() || (editingTourId ? null : undefined),
        summary: tourSummary.trim() || '',
        description: tourDescription.trim() || (editingTourId ? null : undefined),
        includes: parsedIncludes.length > 0 ? parsedIncludes : (editingTourId ? [] : undefined),
        highlights: parsedHighlights.length > 0 ? parsedHighlights : (editingTourId ? [] : undefined),
        heroImage: tourHeroImage.trim() || (editingTourId ? null : undefined),
      };

      const res = editingTourId
        ? await updateAdminTourAction(editingTourId, payload)
        : await createAdminTourAction(payload);

      if (res.success) {
        setFeedback({ msg: editingTourId ? 'تور با موفقیت ویرایش شد.' : 'تور جدید با موفقیت اضافه شد.', type: 'success' });
        setTourModalOpen(false);
        setEditingTourId(null);
        setModalFeedback(null);
        await loadData();
      } else {
        setModalFeedback({ msg: res.error || 'خطا در ثبت تور', type: 'error' });
      }
    } catch (err: unknown) {
      setModalFeedback({
        msg: err instanceof Error ? err.message : 'خطای غیرمنتظره در ثبت تور',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleTourPublish(t: TourAdminItem) {
    if (togglingId) return;
    setTogglingId(t.id);
    setFeedback(null);
    try {
      const res = await toggleAdminTourPublishAction(t.id, !t.isPublished);
      if (res.success) {
        setTours((prev) => prev.map((x) => (x.id === t.id ? { ...x, isPublished: !t.isPublished } : x)));
        setFeedback({ msg: t.isPublished ? `تور «${t.title}» به پیش‌نویس تبدیل شد.` : `تور «${t.title}» منتشر شد.`, type: 'success' });
      } else {
        setFeedback({ msg: res.error || 'خطا در تغییر وضعیت انتشار', type: 'error' });
      }
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDeleteTour(id: string) {
    const target = tours.find((t) => t.id === id);
    setPendingDelete({ kind: 'tour', id, title: target?.title || '' });
  }

  // Handlers: Experience
  function openCreateExp() {
    setEditingExpId(null);
    setExpCountry('iran');
    setExpCategory('culture');
    setExpTitle('');
    setExpTitleEn('');
    setExpDesc('');
    setExpWhere('');
    setExpWhen('');
    setExpFromPrice(15000000);
    setExpModalOpen(true);
  }

  function openEditExp(exp: ExperienceAdminItem) {
    setEditingExpId(exp.id);
    setExpCountry(exp.countryId);
    setExpCategory(exp.category);
    setExpTitle(exp.title);
    setExpTitleEn(exp.titleEn || '');
    setExpDesc(exp.desc || '');
    setExpWhere(exp.where || '');
    setExpWhen(exp.when || '');
    setExpFromPrice(Number(exp.fromPrice));
    setExpModalOpen(true);
  }

  async function handleCreateExp(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const payload = {
        countryId: expCountry,
        category: expCategory,
        title: expTitle,
        titleEn: expTitleEn || expTitle,
        desc: expDesc,
        where: expWhere,
        when: expWhen,
        fromPrice: expFromPrice,
      };
      const res = editingExpId
        ? await updateAdminExperienceAction(editingExpId, payload)
        : await createAdminExperienceAction(payload);

      if (res.success) {
        setFeedback({ msg: editingExpId ? 'ماجراجویی با موفقیت ویرایش شد.' : 'ماجراجویی با موفقیت اضافه شد.', type: 'success' });
        setExpModalOpen(false);
        if (!editingExpId) {
          setExpTitle('');
          setExpDesc('');
        }
        setEditingExpId(null);
        await loadData();
      } else {
        setFeedback({ msg: res.error || 'خطا در ثبت تجربه', type: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteExp(id: string) {
    const target = experiences.find((e) => e.id === id);
    setPendingDelete({ kind: 'exp', id, title: target?.title || '' });
  }

  async function handleToggleExpActive(exp: ExperienceAdminItem) {
    if (togglingId) return;
    setTogglingId(exp.id);
    setFeedback(null);
    try {
      const nextActive = exp.isActive === false ? true : false;
      const res = await toggleAdminExperienceActiveAction(exp.id, nextActive);
      if (res.success) {
        setExperiences((prev) => prev.map((x) => (x.id === exp.id ? { ...x, isActive: nextActive } : x)));
        setFeedback({ msg: nextActive ? `تجربه «${exp.title}» فعال شد.` : `تجربه «${exp.title}» غیرفعال شد.`, type: 'success' });
      } else {
        setFeedback({ msg: res.error || 'خطا در تغییر وضعیت تجربه', type: 'error' });
      }
    } finally {
      setTogglingId(null);
    }
  }

  // Handlers: Travelogue
  function openCreateTravelogue() {
    setEditingTravelogueId(null);
    setTrvTitleFa('');
    setTrvDestFa('');
    setTrvUserName('');
    setTrvImage('');
    setTrvContentFa('');
    setTravelogueModalOpen(true);
  }

  function openEditTravelogue(trv: TravelogueAdminItem) {
    setEditingTravelogueId(trv.id);
    setTrvTitleFa(trv.titleFa);
    setTrvDestFa(trv.destFa || '');
    setTrvUserName(trv.userName || '');
    setTrvImage(trv.image || '');
    setTrvContentFa(trv.contentFa || '');
    setTravelogueModalOpen(true);
  }

  async function handleCreateTravelogue(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const payload = {
        titleFa: trvTitleFa,
        destFa: trvDestFa,
        userName: trvUserName,
        image: trvImage || undefined,
        contentFa: trvContentFa,
      };
      const res = editingTravelogueId
        ? await updateAdminTravelogueAction(editingTravelogueId, payload)
        : await createAdminTravelogueAction(payload);

      if (res.success) {
        setFeedback({ msg: editingTravelogueId ? 'سفرنامه با موفقیت ویرایش شد.' : 'سفرنامه با موفقیت ثبت شد.', type: 'success' });
        setTravelogueModalOpen(false);
        if (!editingTravelogueId) {
          setTrvTitleFa('');
          setTrvContentFa('');
        }
        setEditingTravelogueId(null);
        await loadData();
      } else {
        setFeedback({ msg: res.error || 'خطا در ثبت سفرنامه', type: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteTravelogue(id: string) {
    const target = travelogues.find((t) => t.id === id);
    setPendingDelete({ kind: 'travelogue', id, title: target?.titleFa || '' });
  }

  async function handleToggleTraveloguePublish(trv: TravelogueAdminItem) {
    if (togglingId) return;
    setTogglingId(trv.id);
    setFeedback(null);
    try {
      const nextPub = trv.isPublished === false ? true : false;
      const res = await toggleAdminTraveloguePublishAction(trv.id, nextPub);
      if (res.success) {
        setTravelogues((prev) => prev.map((x) => (x.id === trv.id ? { ...x, isPublished: nextPub } : x)));
        setFeedback({ msg: nextPub ? `سفرنامه «${trv.titleFa}» منتشر شد.` : `سفرنامه «${trv.titleFa}» به پیش‌نویس تبدیل شد.`, type: 'success' });
      } else {
        setFeedback({ msg: res.error || 'خطا در تغییر وضعیت سفرنامه', type: 'error' });
      }
    } finally {
      setTogglingId(null);
    }
  }

  // Handlers: Guide
  function openCreateGuide() {
    setEditingGuideId(null);
    setGdTitleFa('');
    setGdCategoryFa('نکات سفر');
    setGdReadTime('۵ دقیقه');
    setGdExcerptFa('');
    setGdBodyFa('');
    setGuideModalOpen(true);
  }

  function openEditGuide(gd: GuideAdminItem) {
    setEditingGuideId(gd.id);
    setGdTitleFa(gd.titleFa);
    setGdCategoryFa(gd.categoryFa || 'نکات سفر');
    setGdReadTime(gd.readTime || '۵ دقیقه');
    setGdExcerptFa(gd.excerptFa || '');
    setGdBodyFa(gd.bodyFa || '');
    setGuideModalOpen(true);
  }

  async function handleCreateGuide(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const payload = {
        titleFa: gdTitleFa,
        categoryFa: gdCategoryFa,
        readTime: gdReadTime,
        excerptFa: gdExcerptFa,
        bodyFa: gdBodyFa,
      };
      const res = editingGuideId
        ? await updateAdminGuideAction(editingGuideId, payload)
        : await createAdminGuideAction(payload);

      if (res.success) {
        setFeedback({ msg: editingGuideId ? 'راهنمای سفر با موفقیت ویرایش شد.' : 'راهنمای سفر با موفقیت ثبت شد.', type: 'success' });
        setGuideModalOpen(false);
        if (!editingGuideId) {
          setGdTitleFa('');
          setGdExcerptFa('');
        }
        setEditingGuideId(null);
        await loadData();
      } else {
        setFeedback({ msg: res.error || 'خطا در ثبت راهنما', type: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteGuide(id: string) {
    const target = guides.find((g) => g.id === id);
    setPendingDelete({ kind: 'guide', id, title: target?.titleFa || '' });
  }

  async function handleToggleGuidePublish(gd: GuideAdminItem) {
    if (togglingId) return;
    setTogglingId(gd.id);
    setFeedback(null);
    try {
      const nextPub = gd.isPublished === false ? true : false;
      const res = await toggleAdminGuidePublishAction(gd.id, nextPub);
      if (res.success) {
        setGuides((prev) => prev.map((x) => (x.id === gd.id ? { ...x, isPublished: nextPub } : x)));
        setFeedback({ msg: nextPub ? `راهنما «${gd.titleFa}» منتشر شد.` : `راهنما «${gd.titleFa}» به پیش‌نویس تبدیل شد.`, type: 'success' });
      } else {
        setFeedback({ msg: res.error || 'خطا در تغییر وضعیت راهنما', type: 'error' });
      }
    } finally {
      setTogglingId(null);
    }
  }

  // One friendly in-app confirmation for all four delete flows.
  async function confirmPendingDelete() {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    setFeedback(null);
    try {
      if (pendingDelete.kind === 'tour') {
        const res = await deleteAdminTourAction(pendingDelete.id);
        setFeedback(res.success ? { msg: 'تور با موفقیت حذف شد.', type: 'success' } : { msg: res.error || 'خطا در حذف تور', type: 'error' });
      } else if (pendingDelete.kind === 'exp') {
        const res = await deleteAdminExperienceAction(pendingDelete.id);
        setFeedback(res.success ? { msg: 'تجربه با موفقیت حذف شد.', type: 'success' } : { msg: res.error || 'خطا در حذف تجربه', type: 'error' });
      } else if (pendingDelete.kind === 'travelogue') {
        const res = await deleteAdminTravelogueAction(pendingDelete.id);
        setFeedback(res.success ? { msg: 'سفرنامه حذف شد.', type: 'success' } : { msg: res.error || 'خطا در حذف سفرنامه', type: 'error' });
      } else {
        const res = await deleteAdminGuideAction(pendingDelete.id);
        setFeedback(res.success ? { msg: 'راهنمای سفر حذف شد.', type: 'success' } : { msg: res.error || 'خطا در حذف راهنما', type: 'error' });
      }
      setPendingDelete(null);
      await loadData();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <ErpPageHeader
        eyebrow="ERP CMS"
        title="مدیریت تورها، تجربه‌ها، سفرنامه‌ها و راهنمای سفر"
        description="افزودن و ویرایش پکیج‌های اختصاصی، تجربیات محلی و مقالات گردشگری با انتشار آنی در پرتال مسافران."
        icon={<Compass size={20} aria-hidden="true" />}
        actions={
          <>
            {activeTab !== 'site' && (
              <button type="button" onClick={loadData} className={erpGhostBtnCls}>
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
                <span>به‌روزرسانی</span>
              </button>
            )}
            {activeTab === 'tours' && (
              <button type="button" onClick={openCreateTour} className={erpPrimaryBtnCls}>
                <Plus size={15} aria-hidden="true" />
                <span>افزودن تور جدید</span>
              </button>
            )}
            {activeTab === 'experiences' && (
              <button type="button" onClick={openCreateExp} className={erpPrimaryBtnCls}>
                <Plus size={15} aria-hidden="true" />
                <span>افزودن تجربه اصیل</span>
              </button>
            )}
            {activeTab === 'travelogues' && (
              <button type="button" onClick={openCreateTravelogue} className={erpPrimaryBtnCls}>
                <Plus size={15} aria-hidden="true" />
                <span>افزودن سفرنامه</span>
              </button>
            )}
            {activeTab === 'guides' && (
              <button type="button" onClick={openCreateGuide} className={erpPrimaryBtnCls}>
                <Plus size={15} aria-hidden="true" />
                <span>افزودن راهنمای سفر</span>
              </button>
            )}
          </>
        }
      />

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-black flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-mint/60 border-brand/40 text-brand-dark'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.msg}</span>
        </div>
      )}

      <ErpTabs<ContentTab>
        ariaLabel="Content sections"
        value={activeTab}
        onChange={setActiveTab}
        options={[
          { id: 'site', label: `محتوای صفحات سایت`, icon: <Wand2 size={14} aria-hidden="true" /> },
          { id: 'tours', label: `تورهای مسافرتی`, count: tours.length, icon: <Compass size={14} aria-hidden="true" /> },
          { id: 'experiences', label: `تجربه‌های اصیل`, count: experiences.length, icon: <Landmark size={14} aria-hidden="true" /> },
          { id: 'travelogues', label: `سفرنامه‌ها`, count: travelogues.length, icon: <BookOpen size={14} aria-hidden="true" /> },
          { id: 'guides', label: `راهنمای سفر و مقالات`, count: guides.length, icon: <FileText size={14} aria-hidden="true" /> },
        ]}
      />

      {/* Tab Content */}
      {loading ? (
        <div className="p-16 text-center text-sub flex flex-col items-center justify-center gap-3 bg-surface rounded-3xl border border-line">
          <Loader2 size={32} className="animate-spin text-brand" />
          <span className="text-xs font-bold">در حال بارگذاری اطلاعات محتوایی از پایگاه داده...</span>
        </div>
      ) : (
        <>
          {/* TAB 0: SITE CONTENT */}
          {activeTab === 'site' && <SiteContentTab />}

          {/* TAB 1: TOURS */}
          {activeTab === 'tours' && (
            <div className="space-y-4">
              {tours.length === 0 ? (
                <div className="p-12 text-center text-sub bg-surface rounded-3xl border border-line flex flex-col items-center gap-3">
                  <Compass size={36} className="text-line" />
                  <p className="text-sm font-black text-ink">هنوز توری به صورت اختصاصی در دیتابیس ثبت نشده است.</p>
                  <p className="text-xs text-sub">سیستم هم‌اکنون تورهای پیش‌فرض را نمایش می‌دهد. با زدن «افزودن تور جدید» می‌توانید پکیج دلخواه ایجاد کنید.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tours.map((t) => (
                    <div
                      key={t.id}
                      className="p-5 rounded-3xl bg-surface border border-line shadow-xs flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full bg-mint text-brand-dark text-[11px] font-black">
                              {t.category}
                            </span>
                            {t.discountPercent != null && Number(t.discountPercent) > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                                {num(Number(t.discountPercent), locale)}٪ تخفیف
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col items-end">
                            {t.originalPrice != null && Number(t.originalPrice) > Number(t.price) && (
                              <span className="text-[10px] font-bold text-sub line-through decoration-rose-500">
                                {num(Number(t.originalPrice), locale)}
                              </span>
                            )}
                            <div className="flex items-center gap-1 text-xs font-black text-price font-price">
                              <span>{num(Number(t.price), locale)}</span>
                              <span className="text-[10px] text-sub font-bold">{getCurrencyLabel(t.currency || 'TOMAN', locale)}</span>
                            </div>
                          </div>
                        </div>

                        <h3 className="font-black text-sm sm:text-base text-ink leading-snug">
                          {t.title}
                        </h3>

                        <div className="flex items-center gap-2 text-xs font-bold text-sub flex-wrap">
                          <span className="flex items-center gap-1 text-brand-dark">
                            <MapPin size={12} /> {t.city}، {t.country}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar size={12} /> {num(t.durationDays, locale)} روزه
                          </span>
                        </div>

                        {t.summary && (
                          <p className="text-xs font-medium text-sub line-clamp-2 leading-relaxed">
                            {t.summary}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-line/60 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleTourPublish(t)}
                          disabled={togglingId === t.id}
                          className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition disabled:opacity-60 ${
                            t.isPublished ? 'bg-mint text-brand-dark' : 'bg-soft text-sub'
                          }`}
                        >
                          {togglingId === t.id ? <Loader2 size={13} className="animate-spin" /> : t.isPublished ? <Eye size={13} /> : <EyeOff size={13} />}
                          <span>{t.isPublished ? 'منتشر شده' : 'پیش‌نویس'}</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditTour(t)}
                            aria-label={`ویرایش تور: ${t.title}`}
                            title="ویرایش تور"
                            className="min-h-[44px] min-w-[44px] w-8 h-8 rounded-xl bg-brand/10 text-brand-dark hover:bg-brand/20 grid place-items-center transition cursor-pointer"
                          >
                            <Pencil size={14} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTour(t.id)}
                            aria-label={`حذف تور: ${t.title}`}
                            className="min-h-[44px] min-w-[44px] w-8 h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 grid place-items-center transition cursor-pointer"
                            title="حذف تور"
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXPERIENCES */}
          {activeTab === 'experiences' && (
            <div className="space-y-4">
              {experiences.length === 0 ? (
                <div className="p-12 text-center text-sub bg-surface rounded-3xl border border-line flex flex-col items-center gap-3">
                  <Landmark size={36} className="text-line" />
                  <p className="text-sm font-black text-ink">هنوز تجربه اصیلی در دیتابیس ثبت نشده است.</p>
                  <p className="text-xs text-sub">می‌توانید با دکمه «افزودن تجربه اصیل»، تجربه‌های گردشگری منحصربه‌فرد ثبت کنید.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {experiences.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-5 rounded-3xl bg-surface border border-line shadow-xs flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full bg-mint text-brand-dark text-[11px] font-black">
                            {exp.countryId} • {exp.category}
                          </span>
                          <span className="font-price text-xs font-black text-price">
                            {num(Number(exp.fromPrice), locale)} تومان
                          </span>
                        </div>

                        <h3 className="text-sm sm:text-base font-black text-ink leading-snug">
                          {exp.title}
                        </h3>

                        <p className="text-xs font-medium text-sub line-clamp-2 leading-relaxed">
                          {exp.desc}
                        </p>

                        <div className="flex items-center gap-2 text-[11.5px] font-bold text-sub">
                          <span>مکان: {exp.where}</span>
                          <span>•</span>
                          <span>زمان: {exp.when}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-line/60 flex items-center justify-between gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleExpActive(exp)}
                          disabled={togglingId === exp.id}
                          className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition disabled:opacity-60 ${
                            exp.isActive !== false ? 'bg-mint text-brand-dark' : 'bg-soft text-sub'
                          }`}
                        >
                          {togglingId === exp.id ? <Loader2 size={13} className="animate-spin" /> : exp.isActive !== false ? <Eye size={13} /> : <EyeOff size={13} />}
                          <span>{exp.isActive !== false ? 'فعال' : 'غیرفعال'}</span>
                        </button>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditExp(exp)}
                            aria-label={`ویرایش تجربه: ${exp.title}`}
                            title="ویرایش تجربه"
                            className="min-h-[44px] min-w-[44px] w-8 h-8 rounded-xl bg-brand/10 text-brand-dark hover:bg-brand/20 grid place-items-center transition cursor-pointer"
                          >
                            <Pencil size={14} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExp(exp.id)}
                            aria-label={`حذف تجربه: ${exp.title}`}
                            title="حذف تجربه"
                            className="min-h-[44px] min-w-[44px] w-8 h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 grid place-items-center transition cursor-pointer"
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TRAVELOGUES */}
          {activeTab === 'travelogues' && (
            <div className="space-y-4">
              {travelogues.length === 0 ? (
                <div className="p-12 text-center text-sub bg-surface rounded-3xl border border-line flex flex-col items-center gap-3">
                  <BookOpen size={36} className="text-line" />
                  <p className="text-sm font-black text-ink">هنوز سفرنامه‌ای در دیتابیس ثبت نشده است.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {travelogues.map((trv) => (
                    <div
                      key={trv.id}
                      className="p-5 rounded-3xl bg-surface border border-line shadow-xs flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-sub">نویسنده: {trv.userName}</span>
                          <span className="text-[11px] font-black text-brand-dark bg-mint px-2 py-0.5 rounded-full">{trv.destFa}</span>
                        </div>

                        <h3 className="font-black text-sm sm:text-base text-ink">{trv.titleFa}</h3>

                        <p className="text-xs font-medium text-sub line-clamp-3 leading-relaxed">
                          {trv.contentFa}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-line/60 flex items-center justify-between gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleTraveloguePublish(trv)}
                          disabled={togglingId === trv.id}
                          className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition disabled:opacity-60 ${
                            trv.isPublished !== false ? 'bg-mint text-brand-dark' : 'bg-soft text-sub'
                          }`}
                        >
                          {togglingId === trv.id ? <Loader2 size={13} className="animate-spin" /> : trv.isPublished !== false ? <Eye size={13} /> : <EyeOff size={13} />}
                          <span>{trv.isPublished !== false ? 'منتشر شده' : 'پیش‌نویس'}</span>
                        </button>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditTravelogue(trv)}
                            aria-label={`ویرایش سفرنامه: ${trv.titleFa}`}
                            title="ویرایش سفرنامه"
                            className="min-h-[44px] min-w-[44px] w-8 h-8 rounded-xl bg-brand/10 text-brand-dark hover:bg-brand/20 grid place-items-center transition cursor-pointer"
                          >
                            <Pencil size={14} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTravelogue(trv.id)}
                            aria-label={`حذف سفرنامه: ${trv.titleFa}`}
                            title="حذف سفرنامه"
                            className="min-h-[44px] min-w-[44px] w-8 h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 grid place-items-center transition cursor-pointer"
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: GUIDES */}
          {activeTab === 'guides' && (
            <div className="space-y-4">
              {guides.length === 0 ? (
                <div className="p-12 text-center text-sub bg-surface rounded-3xl border border-line flex flex-col items-center gap-3">
                  <FileText size={36} className="text-line" />
                  <p className="text-sm font-black text-ink">هنوز مقاله راهنمای سفری در دیتابیس ثبت نشده است.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {guides.map((gd) => (
                    <div
                      key={gd.id}
                      className="p-5 rounded-3xl bg-surface border border-line shadow-xs flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full bg-soft text-ink text-[11px] font-black">{gd.categoryFa}</span>
                          <span className="text-xs font-bold text-sub">{gd.readTime}</span>
                        </div>

                        <h3 className="font-black text-sm sm:text-base text-ink">{gd.titleFa}</h3>

                        <p className="text-xs font-medium text-sub line-clamp-3 leading-relaxed">
                          {gd.excerptFa}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-line/60 flex items-center justify-between gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleGuidePublish(gd)}
                          disabled={togglingId === gd.id}
                          className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition disabled:opacity-60 ${
                            gd.isPublished !== false ? 'bg-mint text-brand-dark' : 'bg-soft text-sub'
                          }`}
                        >
                          {togglingId === gd.id ? <Loader2 size={13} className="animate-spin" /> : gd.isPublished !== false ? <Eye size={13} /> : <EyeOff size={13} />}
                          <span>{gd.isPublished !== false ? 'منتشر شده' : 'پیش‌نویس'}</span>
                        </button>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditGuide(gd)}
                            aria-label={`ویرایش راهنما: ${gd.titleFa}`}
                            title="ویرایش راهنما"
                            className="min-h-[44px] min-w-[44px] w-8 h-8 rounded-xl bg-brand/10 text-brand-dark hover:bg-brand/20 grid place-items-center transition cursor-pointer"
                          >
                            <Pencil size={14} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteGuide(gd.id)}
                            aria-label={`حذف راهنما: ${gd.titleFa}`}
                            title="حذف راهنما"
                            className="min-h-[44px] min-w-[44px] w-8 h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 grid place-items-center transition cursor-pointer"
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ================= MODALS ================= */}

      {/* Modal 1: Create / Edit Tour */}
      {tourModalOpen && (() => {
        const parsedPrice = parsePriceInput(tourPriceStr);
        const parsedChildPrice = parsePriceInput(tourChildPriceStr);
        const parsedOriginalPrice = parsePriceInput(tourOriginalPriceStr);
        const currencyLabel = getCurrencyLabel(tourCurrency, locale);
        const discountDiff = parsedOriginalPrice > parsedPrice ? parsedOriginalPrice - parsedPrice : 0;
        const discountPct = tourDiscountPercent !== '' ? Number(tourDiscountPercent) : (parsedOriginalPrice > parsedPrice && parsedOriginalPrice > 0 ? Math.round((discountDiff / parsedOriginalPrice) * 100) : 0);

        return (
          <div className="fixed inset-0 z-[200] bg-ink/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" onClick={() => setTourModalOpen(false)}>
            <div role="dialog" aria-modal="true" aria-label="مدیریت پکیج تور مسافرتی" onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl bg-surface rounded-3xl p-6 border border-line shadow-2xl space-y-4 my-8 max-h-[92vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-action/15 text-ink">
                    <Compass size={18} />
                  </span>
                  <div>
                    <h3 className="font-black text-base text-ink">{editingTourId ? 'ویرایش پکیج تور' : 'افزودن پکیج تور مسافرتی جدید'}</h3>
                    <p className="text-[11px] text-sub font-medium">مشخصات، ارز، قیمت‌گذاری و محتوای پکیج را در ۴ بخش مدیریت کنید.</p>
                  </div>
                </div>
                <button type="button" onClick={() => { setTourModalOpen(false); setEditingTourId(null); setModalFeedback(null); }} className="w-8 h-8 rounded-full bg-soft text-sub hover:text-ink grid place-items-center cursor-pointer transition">
                  <X size={16} />
                </button>
              </div>

              {/* 4 Form Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-2xl bg-soft border border-line">
                {[
                  { id: 'basic', label: '۱. اطلاعات پایه', icon: Compass },
                  { id: 'pricing', label: '۲. قیمت و تخفیف', icon: Coins },
                  { id: 'services', label: '۳. خدمات و اقامت', icon: Landmark },
                  { id: 'content', label: '۴. محتوا و تصاویر', icon: FileText },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = tourModalTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setTourModalTab(tab.id as 'basic' | 'pricing' | 'services' | 'content')}
                      className={`h-9 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-surface text-brand-dark shadow-xs border border-line'
                          : 'text-sub hover:text-ink'
                      }`}
                    >
                      <Icon size={14} />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleCreateTour} className="flex flex-col flex-1 min-h-0 space-y-4">
                <div className="flex-1 overflow-y-auto space-y-4 pe-1">
                  {/* TAB 1: BASIC INFO */}
                  {tourModalTab === 'basic' && (
                    <div className="space-y-3.5 animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-black text-ink block mb-1">
                            عنوان تور (فارسی) <span className="text-rose-500">*</span>:
                          </label>
                          <input
                            type="text"
                            value={tourTitle}
                            onChange={(e) => setTourTitle(e.target.value)}
                            required
                            placeholder="مثال: تور VIP شیراز و تخت جمشید"
                            className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-black text-ink block mb-1">عنوان انگلیسی:</label>
                          <input
                            type="text"
                            value={tourTitleEn}
                            onChange={(e) => setTourTitleEn(e.target.value)}
                            placeholder="E.g. Shiraz & Persepolis VIP Tour"
                            className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-black text-ink block mb-1">
                            شهر مقصد <span className="text-rose-500">*</span>:
                          </label>
                          <input
                            type="text"
                            value={tourCity}
                            onChange={(e) => setTourCity(e.target.value)}
                            required
                            placeholder="شیراز"
                            className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-black text-ink block mb-1">کشور:</label>
                          <input
                            type="text"
                            value={tourCountry}
                            onChange={(e) => setTourCountry(e.target.value)}
                            placeholder="ایران"
                            className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-black text-ink block mb-1">
                            مدت اقامت (روز) <span className="text-rose-500">*</span>:
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={60}
                            value={tourDurationDays}
                            onChange={(e) => setTourDurationDays(Number(e.target.value) || 1)}
                            className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold"
                          />
                          <span className="text-[11px] text-sub block mt-1">
                            معادل {num(Math.max(1, tourDurationDays - 1), locale)} شب اقامت
                          </span>
                        </div>
                        <div>
                          <label className="text-xs font-black text-ink block mb-1">دسته‌بندی موضوعی تور:</label>
                          <select
                            value={tourCategory}
                            onChange={(e) => setTourCategory(e.target.value)}
                            className="w-full h-10 px-2 rounded-xl bg-soft border border-line text-xs font-bold"
                          >
                            <option value="cultural">فرهنگی و تاریخی</option>
                            <option value="nature">طبیعت‌گردی و کویر</option>
                            <option value="medical">سلامت و درمانی</option>
                            <option value="adventure">ماجراجویی و ورزشی</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: PRICING, CURRENCY & DISCOUNTS */}
                  {tourModalTab === 'pricing' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      {/* Currency Selector */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-ink block">
                          واحد پول تور (ارز مبنا):
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {TOUR_CURRENCIES.map((c) => {
                            const isSelected = tourCurrency === c.code;
                            return (
                              <button
                                key={c.code}
                                type="button"
                                onClick={() => setTourCurrency(c.code)}
                                className={`p-2.5 rounded-2xl border text-start flex items-center justify-between transition cursor-pointer ${
                                  isSelected
                                    ? 'bg-action/15 border-brand text-ink font-black shadow-xs ring-1 ring-brand'
                                    : 'bg-soft border-line text-sub hover:text-ink hover:bg-surface'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="text-xs font-bold truncate">{c.labelFa}</div>
                                  <div className="text-[10px] text-sub font-mono">{c.code}</div>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-lg font-black font-price ms-1 shrink-0 ${
                                  isSelected ? 'bg-brand text-white' : 'bg-surface text-sub border border-line'
                                }`}>
                                  {c.symbol}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Final Prices */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-black text-ink block mb-1">
                            قیمت نهایی بزرگسال ({currencyLabel}) <span className="text-rose-500">*</span>:
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={tourPriceStr}
                            onChange={(e) => handlePriceChange(e.target.value)}
                            required
                            placeholder="مثال: ۸۵,۰۰۰,۰۰۰"
                            className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold font-mono dir-ltr text-end"
                          />
                          {parsedPrice > 0 && (
                            <div className="mt-1.5 space-y-1">
                              <p className="text-[11px] font-bold text-ink bg-soft/70 px-2.5 py-1 rounded-lg">
                                خوانش مبلغ: <strong>{getHumanAmountWords(parsedPrice, tourCurrency)}</strong>
                              </p>
                              {getRialTomanConversionHint(parsedPrice, tourCurrency) && (
                                <p className="text-[10.5px] font-bold text-sky-800 dark:text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-lg">
                                  ℹ️ {getRialTomanConversionHint(parsedPrice, tourCurrency)}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="text-xs font-black text-ink block mb-1">
                            قیمت کودک ({currencyLabel}) - اختیاری:
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={tourChildPriceStr}
                            onChange={(e) => {
                              const raw = parsePriceInput(e.target.value);
                              setTourChildPriceStr(e.target.value === '' ? '' : formatNumberWithCommas(raw));
                            }}
                            placeholder="اختیاری (برای حذف مقدار را خالی کنید)"
                            className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold font-mono dir-ltr text-end"
                          />
                          {parsedChildPrice > 0 && (
                            <div className="mt-1.5 space-y-1">
                              <p className="text-[11px] font-bold text-ink bg-soft/70 px-2.5 py-1 rounded-lg">
                                خوانش مبلغ کودک: <strong>{getHumanAmountWords(parsedChildPrice, tourCurrency)}</strong>
                              </p>
                              {getRialTomanConversionHint(parsedChildPrice, tourCurrency) && (
                                <p className="text-[10.5px] font-bold text-sky-800 dark:text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-lg">
                                  ℹ️ {getRialTomanConversionHint(parsedChildPrice, tourCurrency)}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Discount & Strikethrough Price Setting */}
                      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="text-xs font-black text-ink flex items-center gap-1.5">
                            <span>🏷️</span>
                            <span>سیستم تخفیف و قیمت خط‌خورده قبلی</span>
                          </span>
                          <div className="flex items-center gap-2">
                            {discountPct > 0 && (
                              <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-black">
                                {num(discountPct, locale)}٪ تخفیف فعال
                              </span>
                            )}
                            {(tourOriginalPriceStr || tourDiscountPercent !== '' || tourDiscountAmountStr) && (
                              <button
                                type="button"
                                onClick={handleClearDiscount}
                                className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline font-bold cursor-pointer"
                              >
                                حذف تخفیف
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Discount Mode Switcher */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black text-sub block">نوع تعیین تخفیف:</label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setTourDiscountMode('percent')}
                              className={`flex-1 h-9 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                                tourDiscountMode === 'percent'
                                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                  : 'bg-surface text-sub border-line hover:text-ink'
                              }`}
                            >
                              <Percent size={14} />
                              <span>تخفیف درصدی (%)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setTourDiscountMode('amount')}
                              className={`flex-1 h-9 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                                tourDiscountMode === 'amount'
                                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                  : 'bg-surface text-sub border-line hover:text-ink'
                              }`}
                            >
                              <Coins size={14} />
                              <span>تخفیف عددی / مبلغی</span>
                            </button>
                          </div>
                        </div>

                        {/* Mode Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {tourDiscountMode === 'percent' ? (
                            <div>
                              <label className="text-[11px] font-black text-sub block mb-1">
                                درصد تخفیف (%):
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={99}
                                value={tourDiscountPercent}
                                onChange={(e) => handleDiscountPercentChange(e.target.value)}
                                placeholder="مثال: ۱۵ یا ۲۰"
                                className="w-full h-10 px-3 rounded-xl bg-surface border border-line text-xs font-bold font-mono dir-ltr text-end"
                              />
                            </div>
                          ) : (
                            <div>
                              <label className="text-[11px] font-black text-sub block mb-1">
                                مبلغ تخفیف ({currencyLabel}):
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={tourDiscountAmountStr}
                                onChange={(e) => handleDiscountAmountChange(e.target.value)}
                                placeholder="مثال: ۱۰,۰۰۰,۰۰۰"
                                className="w-full h-10 px-3 rounded-xl bg-surface border border-line text-xs font-bold font-mono dir-ltr text-end"
                              />
                            </div>
                          )}

                          <div>
                            <label className="text-[11px] font-black text-sub block mb-1">
                              قیمت اولیه قبل از تخفیف (خط‌خورده):
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={tourOriginalPriceStr}
                              onChange={(e) => handleOriginalPriceChange(e.target.value)}
                              placeholder="مثال: ۱۰۰,۰۰۰,۰۰۰"
                              className="w-full h-10 px-3 rounded-xl bg-surface border border-line text-xs font-bold font-mono dir-ltr text-end"
                            />
                          </div>
                        </div>

                        {/* Live Discount Preview Box */}
                        {parsedOriginalPrice > parsedPrice && parsedPrice > 0 && (
                          <div className="p-3 rounded-xl bg-surface border border-amber-500/30 text-xs space-y-1">
                            <div className="flex items-center gap-1.5 font-black text-amber-900 dark:text-amber-200">
                              <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                              <span>پیش‌نمایش زنده شفاف:</span>
                            </div>
                            <p className="text-[11.5px] font-medium leading-relaxed text-sub">
                              قیمت اولیه خط‌خورده: <strong className="font-mono text-ink">{formatNumberWithCommas(parsedOriginalPrice)} {currencyLabel}</strong> |
                              {' '}مبلغ تخفیف: <strong className="font-mono text-rose-600 dark:text-rose-400">{formatNumberWithCommas(discountDiff)} {currencyLabel}</strong> ({num(discountPct, locale)}٪) |
                              {' '}قیمت نهایی پرداختی: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{formatNumberWithCommas(parsedPrice)} {currencyLabel}</strong>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: SERVICES & ACCOMMODATION */}
                  {tourModalTab === 'services' && (
                    <div className="space-y-3.5 animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="text-xs font-black text-ink block mb-1">نام هتل و اقامتگاه:</label>
                          <input
                            type="text"
                            value={tourHotel}
                            onChange={(e) => setTourHotel(e.target.value)}
                            placeholder="مثال: هتل ۵ ستاره بزرگ شیراز"
                            className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-black text-ink block mb-1">ستاره هتل:</label>
                          <select
                            value={tourHotelStars}
                            onChange={(e) => setTourHotelStars(Number(e.target.value))}
                            className="w-full h-10 px-2 rounded-xl bg-soft border border-line text-xs font-bold"
                          >
                            <option value={5}>۵ ستاره لوکس</option>
                            <option value={4}>۴ ستاره عالی</option>
                            <option value={3}>۳ ستاره اقتصادی</option>
                            <option value={2}>۲ ستاره ساده</option>
                            <option value={1}>اقامتگاه بوم‌گردی</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-black text-ink block mb-1">ناوگان حمل‌ونقل و پرواز:</label>
                        <input
                          type="text"
                          value={tourTransport}
                          onChange={(e) => setTourTransport(e.target.value)}
                          placeholder="پرواز ایران‌ایر + خودروی تشریفاتی ون VIP"
                          className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-black text-ink block mb-1">
                          خدمات شامل پکیج (با کاما «،» جدا کنید):
                        </label>
                        <textarea
                          rows={2}
                          value={tourIncludes}
                          onChange={(e) => setTourIncludes(e.target.value)}
                          placeholder="پرواز رفت و برگشت، هتل ۵ ستاره با صبحانه، ترانسفر فرودگاهی، بیمه مسافرتی"
                          className="w-full p-3 rounded-xl bg-soft border border-line text-xs font-medium"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-black text-ink block mb-1">
                          جاذبه‌ها و نکات برجسته تور (با کاما «،» جدا کنید):
                        </label>
                        <textarea
                          rows={2}
                          value={tourHighlights}
                          onChange={(e) => setTourHighlights(e.target.value)}
                          placeholder="میدان نقش جهان، کاخ عالی‌قاپو، عصرانه در هتل عباسی، شب‌نشینی پل خواجو"
                          className="w-full p-3 rounded-xl bg-soft border border-line text-xs font-medium"
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 4: CONTENT & IMAGES */}
                  {tourModalTab === 'content' && (
                    <div className="space-y-3.5 animate-in fade-in duration-150">
                      <div>
                        <label className="text-xs font-black text-ink block mb-1">لینک تصویر شاخص (Hero Image):</label>
                        <input
                          type="url"
                          value={tourHeroImage}
                          onChange={(e) => setTourHeroImage(e.target.value)}
                          placeholder="https://images.unsplash.com/photo-..."
                          className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold font-mono dir-ltr text-start"
                        />
                        {tourHeroImage && (
                          <div className="mt-2 relative w-full h-32 rounded-xl overflow-hidden border border-line bg-soft">
                            {/* Raw <img> intentional: admin-entered arbitrary-host preview URL
                                in a fixed h-32 box (no CLS); next/image remotePatterns can't cover free-form input. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={tourHeroImage} alt="پیش‌نمایش تصویر" loading="lazy" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-black text-ink block mb-1">خلاصه معرفی کوتاه تور:</label>
                        <textarea
                          rows={2}
                          value={tourSummary}
                          onChange={(e) => setTourSummary(e.target.value)}
                          placeholder="شرح جاذبه‌های برگزیده و امکانات این سفر..."
                          className="w-full p-3 rounded-xl bg-soft border border-line text-xs font-medium"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-black text-ink block mb-1">توضیحات جامع و تفصیلی تور (نمایش در صفحه اختصاصی):</label>
                        <textarea
                          rows={4}
                          value={tourDescription}
                          onChange={(e) => setTourDescription(e.target.value)}
                          placeholder="شرح کامل جزئیات سفر، فضا و تمایزهای این تور..."
                          className="w-full p-3 rounded-xl bg-soft border border-line text-xs font-medium"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* In-Modal Alert Box */}
                {modalFeedback && (
                  <div
                    className={`p-3 rounded-2xl border flex items-center gap-2 text-xs font-bold animate-in fade-in duration-150 ${
                      modalFeedback.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/30'
                    }`}
                  >
                    {modalFeedback.type === 'success' ? (
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle size={16} className="text-rose-600 shrink-0" />
                    )}
                    <span>{modalFeedback.msg}</span>
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-line flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {tourModalTab !== 'basic' && (
                      <button
                        type="button"
                        onClick={() => {
                          const tabs: Array<'basic' | 'pricing' | 'services' | 'content'> = ['basic', 'pricing', 'services', 'content'];
                          const curIdx = tabs.indexOf(tourModalTab);
                          if (curIdx > 0) setTourModalTab(tabs[curIdx - 1]);
                        }}
                        className="h-10 px-3 rounded-xl bg-soft text-sub hover:text-ink font-bold text-xs flex items-center gap-1 cursor-pointer transition"
                      >
                        <ChevronRight size={14} className="rtl:inline ltr:hidden" />
                        <ChevronLeft size={14} className="ltr:inline rtl:hidden" />
                        <span>مرحله قبل</span>
                      </button>
                    )}
                    {tourModalTab !== 'content' && (
                      <button
                        type="button"
                        onClick={() => {
                          const tabs: Array<'basic' | 'pricing' | 'services' | 'content'> = ['basic', 'pricing', 'services', 'content'];
                          const curIdx = tabs.indexOf(tourModalTab);
                          if (curIdx < tabs.length - 1) setTourModalTab(tabs[curIdx + 1]);
                        }}
                        className="h-10 px-3 rounded-xl bg-soft text-ink font-bold text-xs flex items-center gap-1 cursor-pointer transition"
                      >
                        <span>مرحله بعد</span>
                        <ChevronLeft size={14} className="rtl:inline ltr:hidden" />
                        <ChevronRight size={14} className="ltr:inline rtl:hidden" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTourModalOpen(false);
                        setEditingTourId(null);
                        setModalFeedback(null);
                      }}
                      className="h-10 px-4 rounded-xl bg-soft text-ink font-bold text-xs cursor-pointer hover:bg-line/40 transition"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="h-10 px-5 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-xs transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {submitting && <Loader2 size={13} className="animate-spin" />}
                      <span>{editingTourId ? 'ذخیره تغییرات تور' : 'ثبت و انتشار تور'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Modal 2: Create Experience */}
      {expModalOpen && (
        <div className="fixed inset-0 z-[200] bg-ink/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" onClick={() => setExpModalOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="افزودن ماجراجویی جدید" onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-surface rounded-3xl p-6 border border-line shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-black text-base text-ink">{editingExpId ? 'ویرایش ماجراجویی' : 'افزودن ماجراجویی جدید'}</h3>
              <button type="button" onClick={() => { setExpModalOpen(false); setEditingExpId(null); }} className="w-8 h-8 rounded-full bg-soft text-sub grid place-items-center cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateExp} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-ink block mb-1">کشور:</label>
                  <select value={expCountry} onChange={(e) => setExpCountry(e.target.value)} className="w-full h-10 px-2 rounded-xl bg-soft border border-line text-xs font-bold">
                    <option value="iran">ایران</option>
                    <option value="turkey">ترکیه</option>
                    <option value="uae">امارات</option>
                    <option value="georgia">گرجستان</option>
                    <option value="russia">روسیه</option>
                    <option value="oman">عمان</option>
                    <option value="china">چین</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-ink block mb-1">دسته‌بندی:</label>
                  <select value={expCategory} onChange={(e) => setExpCategory(e.target.value)} className="w-full h-10 px-2 rounded-xl bg-soft border border-line text-xs font-bold">
                    <option value="culture">فرهنگ و تاریخ</option>
                    <option value="festival">جشنواره و رویداد</option>
                    <option value="nature">طبیعت‌گردی</option>
                    <option value="yacht">کروز و قایق‌رانی</option>
                    <option value="adventure">ماجراجویی</option>
                    <option value="wellness">اسپا و سلامتی</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-ink block mb-1">عنوان تجربه (فارسی):</label>
                  <input type="text" value={expTitle} onChange={(e) => setExpTitle(e.target.value)} required placeholder="مثال: بالون‌سواری در کویر کاشان" className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold" />
                </div>
                <div>
                  <label className="text-xs font-black text-ink block mb-1">عنوان انگلیسی:</label>
                  <input type="text" value={expTitleEn} onChange={(e) => setExpTitleEn(e.target.value)} placeholder="e.g. Desert Hot Air Balloon" className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold" />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-ink block mb-1">شرح تجربه:</label>
                <textarea rows={2} value={expDesc} onChange={(e) => setExpDesc(e.target.value)} required placeholder="تجربه‌ای به یادماندنی از طلوع خورشید..." className="w-full p-2.5 rounded-xl bg-soft border border-line text-xs font-medium" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-ink block mb-1">محل برگزاری:</label>
                  <input type="text" value={expWhere} onChange={(e) => setExpWhere(e.target.value)} placeholder="کاشان، مرنجاب" className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold" />
                </div>
                <div>
                  <label className="text-xs font-black text-ink block mb-1">زمان یا فصل:</label>
                  <input type="text" value={expWhen} onChange={(e) => setExpWhen(e.target.value)} placeholder="پاییز و زمستان" className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold" />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-ink block mb-1">قیمت شروع (تومان):</label>
                <input type="number" min={500000} step={500000} value={expFromPrice} onChange={(e) => setExpFromPrice(Number(e.target.value))} className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold font-mono" />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => { setExpModalOpen(false); setEditingExpId(null); }} className="h-10 px-4 rounded-xl bg-soft text-ink font-bold text-xs cursor-pointer">انصراف</button>
                <button type="submit" disabled={submitting} className="h-10 px-5 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer">
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  <span>{editingExpId ? 'ذخیره تغییرات' : 'ثبت تجربه'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Create Travelogue */}
      {travelogueModalOpen && (
        <div className="fixed inset-0 z-[200] bg-ink/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" onClick={() => setTravelogueModalOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="افزودن سفرنامه جدید" onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-surface rounded-3xl p-6 border border-line shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-black text-base text-ink">{editingTravelogueId ? 'ویرایش سفرنامه' : 'افزودن سفرنامه جدید'}</h3>
              <button type="button" onClick={() => { setTravelogueModalOpen(false); setEditingTravelogueId(null); }} className="w-8 h-8 rounded-full bg-soft text-sub grid place-items-center cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTravelogue} className="space-y-3">
              <div>
                <label className="text-xs font-black text-ink block mb-1">عنوان سفرنامه:</label>
                <input type="text" value={trvTitleFa} onChange={(e) => setTrvTitleFa(e.target.value)} required placeholder="سفر سه روزه به کویر لوت" className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-ink block mb-1">مقصد:</label>
                  <input type="text" value={trvDestFa} onChange={(e) => setTrvDestFa(e.target.value)} placeholder="کرمان، شهداد" className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold" />
                </div>
                <div>
                  <label className="text-xs font-black text-ink block mb-1">نام نویسنده:</label>
                  <input type="text" value={trvUserName} onChange={(e) => setTrvUserName(e.target.value)} required placeholder="علی موسوی" className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold" />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-ink block mb-1">لینک تصویر:</label>
                <input type="url" value={trvImage} onChange={(e) => setTrvImage(e.target.value)} placeholder="https://images.unsplash.com/..." className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold font-mono" />
              </div>

              <div>
                <label className="text-xs font-black text-ink block mb-1">متن سفرنامه:</label>
                <textarea rows={4} value={trvContentFa} onChange={(e) => setTrvContentFa(e.target.value)} required placeholder="شرح تجربه و خاطرات سفر..." className="w-full p-2.5 rounded-xl bg-soft border border-line text-xs font-medium" />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => { setTravelogueModalOpen(false); setEditingTravelogueId(null); }} className="h-10 px-4 rounded-xl bg-soft text-ink font-bold text-xs cursor-pointer">انصراف</button>
                <button type="submit" disabled={submitting} className="h-10 px-5 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer">
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  <span>{editingTravelogueId ? 'ذخیره تغییرات' : 'انتشار سفرنامه'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Create Guide */}
      {guideModalOpen && (
        <div className="fixed inset-0 z-[200] bg-ink/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" onClick={() => setGuideModalOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="افزودن راهنمای سفر و مقاله" onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-surface rounded-3xl p-6 border border-line shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-black text-base text-ink">{editingGuideId ? 'ویرایش راهنمای سفر' : 'افزودن راهنمای سفر و مقاله'}</h3>
              <button type="button" onClick={() => { setGuideModalOpen(false); setEditingGuideId(null); }} className="w-8 h-8 rounded-full bg-soft text-sub grid place-items-center cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateGuide} className="space-y-3">
              <div>
                <label className="text-xs font-black text-ink block mb-1">عنوان مقاله:</label>
                <input type="text" value={gdTitleFa} onChange={(e) => setGdTitleFa(e.target.value)} required placeholder="راهنمای جامع اخذ ویزای توریستی شنگن" className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-ink block mb-1">دسته‌بندی:</label>
                  <input type="text" value={gdCategoryFa} onChange={(e) => setGdCategoryFa(e.target.value)} placeholder="ویزای سفر" className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold" />
                </div>
                <div>
                  <label className="text-xs font-black text-ink block mb-1">زمان مطالعه:</label>
                  <input type="text" value={gdReadTime} onChange={(e) => setGdReadTime(e.target.value)} placeholder="۵ دقیقه" className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold" />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-ink block mb-1">چکیده و خلاصه متن:</label>
                <textarea rows={2} value={gdExcerptFa} onChange={(e) => setGdExcerptFa(e.target.value)} required placeholder="خلاصه‌ای کوتاه برای کارت مقاله..." className="w-full p-2.5 rounded-xl bg-soft border border-line text-xs font-medium" />
              </div>

              <div>
                <label className="text-xs font-black text-ink block mb-1">متن کامل مقاله:</label>
                <textarea rows={4} value={gdBodyFa} onChange={(e) => setGdBodyFa(e.target.value)} placeholder="متن کامل آموزش و راهنمای سفر..." className="w-full p-2.5 rounded-xl bg-soft border border-line text-xs font-medium" />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => { setGuideModalOpen(false); setEditingGuideId(null); }} className="h-10 px-4 rounded-xl bg-soft text-ink font-bold text-xs cursor-pointer">انصراف</button>
                <button type="submit" disabled={submitting} className="h-10 px-5 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer">
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  <span>{editingGuideId ? 'ذخیره تغییرات' : 'ثبت راهنما'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Friendly delete confirmation (replaces the native confirm dialog) */}
      {pendingDelete && (
        <ErpModal
          title="حذف قطعی شود؟"
          subtitle={
            pendingDelete.kind === 'tour' ? 'این تور از سایت مسافران برداشته می‌شود.' :
            pendingDelete.kind === 'exp' ? 'این تجربه از سایت مسافران برداشته می‌شود.' :
            pendingDelete.kind === 'travelogue' ? 'این سفرنامه از سایت حذف می‌شود.' :
            'این مقاله راهنما از سایت حذف می‌شود.'
          }
          onClose={() => { if (!deleting) setPendingDelete(null); }}
          footer={
            <>
              <button type="button" onClick={() => setPendingDelete(null)} disabled={deleting} className={erpGhostBtnCls}>
                انصراف، نگهش دار
              </button>
              <button type="button" onClick={confirmPendingDelete} disabled={deleting} className={erpDangerBtnCls}>
                {deleting && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                <span>بله، حذف کن</span>
              </button>
            </>
          }
        >
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-warm/10 text-rose-warm">
              <Trash2 size={19} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-ink" dir="auto">{pendingDelete.title || '—'}</p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-sub">
                این کار قابل بازگشت نیست. اگر فقط می‌خواهید موقتاً پنهان شود، به‌جای حذف از دکمه «پیش‌نویس» استفاده کنید.
              </p>
            </div>
          </div>
        </ErpModal>
      )}
    </div>
  );
}

export function ContentClientPage(props: ContentClientPageProps) {
  return (
    <Suspense
      fallback={
        <div className="p-16 text-center text-sub flex flex-col items-center justify-center gap-3 bg-surface rounded-3xl border border-line">
          <Loader2 size={32} className="animate-spin text-brand" />
          <span className="text-xs font-bold">در حال بارگذاری پنل مدیریت محتوا...</span>
        </div>
      }
    >
      <AdminContentPageInner {...props} />
    </Suspense>
  );
}
