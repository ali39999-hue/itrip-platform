'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
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
} from 'lucide-react';
import { num } from '@/lib/format';
import {
  getAdminToursAction,
  createAdminTourAction,
  deleteAdminTourAction,
  toggleAdminTourPublishAction,
  getAdminExperiencesAction,
  createAdminExperienceAction,
  deleteAdminExperienceAction,
  getAdminTraveloguesAction,
  createAdminTravelogueAction,
  deleteAdminTravelogueAction,
  getAdminGuidesAction,
  createAdminGuideAction,
  deleteAdminGuideAction,
} from '@/actions/content';

type ContentTab = 'tours' | 'experiences' | 'travelogues' | 'guides';

export interface TourAdminItem {
  id: string;
  title: string;
  titleEn?: string | null;
  city: string;
  country: string;
  durationDays: number;
  price: number | { toString(): string };
  category: string;
  isPublished?: boolean;
  heroImage?: string | null;
  summary?: string | null;
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
}

export default function AdminContentPage() {
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<ContentTab>('tours');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Data states
  const [tours, setTours] = useState<TourAdminItem[]>([]);
  const [experiences, setExperiences] = useState<ExperienceAdminItem[]>([]);
  const [travelogues, setTravelogues] = useState<TravelogueAdminItem[]>([]);
  const [guides, setGuides] = useState<GuideAdminItem[]>([]);

  // Modals state
  const [tourModalOpen, setTourModalOpen] = useState(false);
  const [expModalOpen, setExpModalOpen] = useState(false);
  const [travelogueModalOpen, setTravelogueModalOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);

  // Submitting state
  const [submitting, setSubmitting] = useState(false);

  // Form states: Tour
  const [tourTitle, setTourTitle] = useState('');
  const [tourTitleEn, setTourTitleEn] = useState('');
  const [tourCity, setTourCity] = useState('');
  const [tourCountry, setTourCountry] = useState('ایران');
  const [tourDurationDays, setTourDurationDays] = useState(3);
  const [tourPrice, setTourPrice] = useState(85000000);
  const [tourCategory, setTourCategory] = useState('cultural');
  const [tourHotel, setTourHotel] = useState('');
  const [tourTransport, setTourTransport] = useState('');
  const [tourSummary, setTourSummary] = useState('');
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
  }, []);

  // Handlers: Tour
  async function handleCreateTour(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await createAdminTourAction({
        title: tourTitle,
        titleEn: tourTitleEn || tourTitle,
        city: tourCity,
        country: tourCountry,
        durationDays: tourDurationDays,
        price: tourPrice,
        category: tourCategory,
        hotelName: tourHotel || undefined,
        transportType: tourTransport || undefined,
        summary: tourSummary,
        heroImage: tourHeroImage || undefined,
      });

      if (res.success) {
        setFeedback({ msg: 'تور جدید با موفقیت اضافه شد.', type: 'success' });
        setTourModalOpen(false);
        setTourTitle('');
        setTourCity('');
        await loadData();
      } else {
        setFeedback({ msg: res.error || 'خطا در ثبت تور', type: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteTour(id: string) {
    if (!confirm('آیا از حذف این تور اطمینان دارید؟')) return;
    setFeedback(null);
    const res = await deleteAdminTourAction(id);
    if (res.success) {
      setFeedback({ msg: 'تور با موفقیت حذف شد.', type: 'success' });
      await loadData();
    } else {
      setFeedback({ msg: res.error || 'خطا در حذف تور', type: 'error' });
    }
  }

  // Handlers: Experience
  async function handleCreateExp(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await createAdminExperienceAction({
        countryId: expCountry,
        category: expCategory,
        title: expTitle,
        titleEn: expTitleEn || expTitle,
        desc: expDesc,
        where: expWhere,
        when: expWhen,
        fromPrice: expFromPrice,
      });

      if (res.success) {
        setFeedback({ msg: 'تجربه اصیل با موفقیت اضافه شد.', type: 'success' });
        setExpModalOpen(false);
        setExpTitle('');
        setExpDesc('');
        await loadData();
      } else {
        setFeedback({ msg: res.error || 'خطا در ثبت تجربه', type: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteExp(id: string) {
    if (!confirm('آیا از حذف این تجربه اطمینان دارید؟')) return;
    const res = await deleteAdminExperienceAction(id);
    if (res.success) {
      setFeedback({ msg: 'تجربه با موفقیت حذف شد.', type: 'success' });
      await loadData();
    }
  }

  // Handlers: Travelogue
  async function handleCreateTravelogue(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await createAdminTravelogueAction({
        titleFa: trvTitleFa,
        destFa: trvDestFa,
        userName: trvUserName,
        image: trvImage || 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&auto=format&fit=crop&q=80',
        contentFa: trvContentFa,
      });

      if (res.success) {
        setFeedback({ msg: 'سفرنامه با موفقیت ثبت شد.', type: 'success' });
        setTravelogueModalOpen(false);
        setTrvTitleFa('');
        setTrvContentFa('');
        await loadData();
      } else {
        setFeedback({ msg: res.error || 'خطا در ثبت سفرنامه', type: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteTravelogue(id: string) {
    if (!confirm('آیا از حذف این سفرنامه اطمینان دارید؟')) return;
    const res = await deleteAdminTravelogueAction(id);
    if (res.success) {
      setFeedback({ msg: 'سفرنامه حذف شد.', type: 'success' });
      await loadData();
    }
  }

  // Handlers: Guide
  async function handleCreateGuide(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await createAdminGuideAction({
        titleFa: gdTitleFa,
        categoryFa: gdCategoryFa,
        readTime: gdReadTime,
        excerptFa: gdExcerptFa,
        bodyFa: gdBodyFa,
      });

      if (res.success) {
        setFeedback({ msg: 'راهنمای سفر با موفقیت ثبت شد.', type: 'success' });
        setGuideModalOpen(false);
        setGdTitleFa('');
        setGdExcerptFa('');
        await loadData();
      } else {
        setFeedback({ msg: res.error || 'خطا در ثبت راهنما', type: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteGuide(id: string) {
    if (!confirm('آیا از حذف این راهنما اطمینان دارید؟')) return;
    const res = await deleteAdminGuideAction(id);
    if (res.success) {
      setFeedback({ msg: 'راهنمای سفر حذف شد.', type: 'success' });
      await loadData();
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-surface border border-line shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-brand-dark font-black text-xs sm:text-sm mb-1">
            <Compass size={18} />
            <span>سامانه مدیریت محتوا و موجودی فیروزو (ERP CMS)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-ink">
            مدیریت تورها، تجربه‌های اصیل، سفرنامه‌ها و راهنمای سفر
          </h1>
          <p className="text-xs sm:text-sm font-medium text-sub mt-1">
            افزودن و ویرایش پکیج‌های اختصاصی، تجربیات محلی و مقالات گردشگری با انتشار آنی در پرتال مسافران.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadData}
            className="h-10 px-3.5 rounded-xl border border-line bg-soft hover:bg-line/40 text-ink font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>به‌روزرسانی</span>
          </button>

          {activeTab === 'tours' && (
            <button
              type="button"
              onClick={() => setTourModalOpen(true)}
              className="h-10 px-4 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Plus size={15} />
              <span>افزودن تور جدید</span>
            </button>
          )}

          {activeTab === 'experiences' && (
            <button
              type="button"
              onClick={() => setExpModalOpen(true)}
              className="h-10 px-4 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Plus size={15} />
              <span>افزودن تجربه اصیل</span>
            </button>
          )}

          {activeTab === 'travelogues' && (
            <button
              type="button"
              onClick={() => setTravelogueModalOpen(true)}
              className="h-10 px-4 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Plus size={15} />
              <span>افزودن سفرنامه</span>
            </button>
          )}

          {activeTab === 'guides' && (
            <button
              type="button"
              onClick={() => setGuideModalOpen(true)}
              className="h-10 px-4 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Plus size={15} />
              <span>افزودن راهنمای سفر</span>
            </button>
          )}
        </div>
      </div>

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

      {/* Tabs */}
      <div role="tablist" aria-label="Content sections" className="flex items-center gap-2 border-b border-line pb-3 overflow-x-auto scrollbar-none [&>button]:shrink-0 [&>button]:whitespace-nowrap">
        <button
          type="button"
          role="tab" aria-selected={activeTab === 'tours'} onClick={() => setActiveTab('tours')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'tours'
              ? 'bg-brand text-surface shadow-xs'
              : 'bg-surface border border-line text-sub hover:text-ink'
          }`}
        >
          <Compass size={16} />
          <span>تورهای مسافرتی ({tours.length})</span>
        </button>

        <button
          type="button"
          role="tab" aria-selected={activeTab === 'experiences'} onClick={() => setActiveTab('experiences')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'experiences'
              ? 'bg-brand text-surface shadow-xs'
              : 'bg-surface border border-line text-sub hover:text-ink'
          }`}
        >
          <Landmark size={16} />
          <span>تجربه‌های اصیل ({experiences.length})</span>
        </button>

        <button
          type="button"
          role="tab" aria-selected={activeTab === 'travelogues'} onClick={() => setActiveTab('travelogues')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'travelogues'
              ? 'bg-brand text-surface shadow-xs'
              : 'bg-surface border border-line text-sub hover:text-ink'
          }`}
        >
          <BookOpen size={16} />
          <span>سفرنامه‌ها ({travelogues.length})</span>
        </button>

        <button
          type="button"
          role="tab" aria-selected={activeTab === 'guides'} onClick={() => setActiveTab('guides')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'guides'
              ? 'bg-brand text-surface shadow-xs'
              : 'bg-surface border border-line text-sub hover:text-ink'
          }`}
        >
          <FileText size={16} />
          <span>راهنمای سفر و مقالات ({guides.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="p-16 text-center text-sub flex flex-col items-center justify-center gap-3 bg-surface rounded-3xl border border-line">
          <Loader2 size={32} className="animate-spin text-brand" />
          <span className="text-xs font-bold">در حال بارگذاری اطلاعات محتوایی از پایگاه داده...</span>
        </div>
      ) : (
        <>
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
                          <span className="px-2.5 py-0.5 rounded-full bg-mint text-brand-dark text-[11px] font-black">
                            {t.category}
                          </span>
                          <div className="flex items-center gap-1 text-xs font-black text-price font-mono">
                            <span>{num(Number(t.price), locale)}</span>
                            <span className="text-[10px] text-sub font-bold">تومان</span>
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

                      <div className="pt-3 border-t border-line/60 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => toggleAdminTourPublishAction(t.id, !t.isPublished)}
                          className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition ${
                            t.isPublished ? 'bg-mint text-brand-dark' : 'bg-soft text-sub'
                          }`}
                        >
                          {t.isPublished ? <Eye size={13} /> : <EyeOff size={13} />}
                          <span>{t.isPublished ? 'منتشر شده' : 'پیش‌نویس'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteTour(t.id)}
                          className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 grid place-items-center transition cursor-pointer"
                          title="حذف تور"
                        >
                          <Trash2 size={14} />
                        </button>
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
                  <p className="text-sm font-black text-ink">هنوز تجربه سفارشی در دیتابیس ثبت نشده است.</p>
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
                          <span className="font-mono text-xs font-black text-price">
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

                      <div className="pt-2 border-t border-line/60 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleDeleteExp(exp.id)}
                          className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 grid place-items-center transition cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
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

                      <div className="pt-2 border-t border-line/60 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleDeleteTravelogue(trv.id)}
                          className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 grid place-items-center transition cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
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

                      <div className="pt-2 border-t border-line/60 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleDeleteGuide(gd.id)}
                          className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 grid place-items-center transition cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
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

      {/* Modal 1: Create Tour */}
      {tourModalOpen && (
        <div className="fixed inset-0 z-[200] bg-ink/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" onClick={() => setTourModalOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="افزودن پکیج تور مسافرتی جدید" onClick={(e) => e.stopPropagation()} className="w-full max-w-xl bg-surface rounded-3xl p-6 border border-line shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-black text-base text-ink">افزودن پکیج تور مسافرتی جدید</h3>
              <button type="button" onClick={() => setTourModalOpen(false)} className="w-8 h-8 rounded-full bg-soft text-sub grid place-items-center cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTour} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-ink block mb-1">عنوان تور (فارسی):</label>
                  <input type="text" value={tourTitle} onChange={(e) => setTourTitle(e.target.value)} required placeholder="مثال: تور VIP شیراز" className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold" />
                </div>
                <div>
                  <label className="text-xs font-black text-ink block mb-1">عنوان انگلیسی:</label>
                  <input type="text" value={tourTitleEn} onChange={(e) => setTourTitleEn(e.target.value)} placeholder="E.g. Shiraz VIP Tour" className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-ink block mb-1">شهر مقصد:</label>
                  <input type="text" value={tourCity} onChange={(e) => setTourCity(e.target.value)} required placeholder="شیراز" className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold" />
                </div>
                <div>
                  <label className="text-xs font-black text-ink block mb-1">کشور:</label>
                  <input type="text" value={tourCountry} onChange={(e) => setTourCountry(e.target.value)} placeholder="ایران" className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-black text-ink block mb-1">مدت (روز):</label>
                  <input type="number" min={1} value={tourDurationDays} onChange={(e) => setTourDurationDays(Number(e.target.value))} className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold" />
                </div>
                <div>
                  <label className="text-xs font-black text-ink block mb-1">قیمت (تومان):</label>
                  <input type="number" min={1000000} step={1000000} value={tourPrice} onChange={(e) => setTourPrice(Number(e.target.value))} className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold font-mono" />
                </div>
                <div>
                  <label className="text-xs font-black text-ink block mb-1">دسته‌بندی:</label>
                  <select value={tourCategory} onChange={(e) => setTourCategory(e.target.value)} className="w-full h-10 px-2 rounded-xl bg-soft border border-line text-xs font-bold">
                    <option value="cultural">فرهنگی و تاریخی</option>
                    <option value="nature">طبیعت‌گردی</option>
                    <option value="medical">درمانی</option>
                    <option value="adventure">ماجراجویی</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-ink block mb-1">نام هتل و اقامتگاه:</label>
                  <input type="text" value={tourHotel} onChange={(e) => setTourHotel(e.target.value)} placeholder="هتل بزرگ شیراز" className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold" />
                </div>
                <div>
                  <label className="text-xs font-black text-ink block mb-1">ناوگان حمل‌ونقل:</label>
                  <input type="text" value={tourTransport} onChange={(e) => setTourTransport(e.target.value)} placeholder="پرواز ایران‌ایر + ون VIP" className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold" />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-ink block mb-1">لینک تصویر شاخص (Hero Image):</label>
                <input type="url" value={tourHeroImage} onChange={(e) => setTourHeroImage(e.target.value)} placeholder="https://images.unsplash.com/photo-..." className="w-full h-10 px-3 rounded-xl bg-soft border border-line text-xs font-bold font-mono" />
              </div>

              <div>
                <label className="text-xs font-black text-ink block mb-1">خلاصه معرفی تور:</label>
                <textarea rows={3} value={tourSummary} onChange={(e) => setTourSummary(e.target.value)} placeholder="شرح جاذبه‌های برگزیده و امکانات این سفر..." className="w-full p-3 rounded-xl bg-soft border border-line text-xs font-medium" />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setTourModalOpen(false)} className="h-10 px-4 rounded-xl bg-soft text-ink font-bold text-xs cursor-pointer">انصراف</button>
                <button type="submit" disabled={submitting} className="h-10 px-5 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-xs transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer">
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  <span>ثبت و انتشار تور</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Create Experience */}
      {expModalOpen && (
        <div className="fixed inset-0 z-[200] bg-ink/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" onClick={() => setExpModalOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="افزودن تجربه اصیل محلی" onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-surface rounded-3xl p-6 border border-line shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-black text-base text-ink">افزودن تجربه اصیل محلی</h3>
              <button type="button" onClick={() => setExpModalOpen(false)} className="w-8 h-8 rounded-full bg-soft text-sub grid place-items-center cursor-pointer">
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
                <button type="button" onClick={() => setExpModalOpen(false)} className="h-10 px-4 rounded-xl bg-soft text-ink font-bold text-xs cursor-pointer">انصراف</button>
                <button type="submit" disabled={submitting} className="h-10 px-5 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer">
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  <span>ثبت تجربه</span>
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
              <h3 className="font-black text-base text-ink">افزودن سفرنامه جدید</h3>
              <button type="button" onClick={() => setTravelogueModalOpen(false)} className="w-8 h-8 rounded-full bg-soft text-sub grid place-items-center cursor-pointer">
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
                <button type="button" onClick={() => setTravelogueModalOpen(false)} className="h-10 px-4 rounded-xl bg-soft text-ink font-bold text-xs cursor-pointer">انصراف</button>
                <button type="submit" disabled={submitting} className="h-10 px-5 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer">
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  <span>انتشار سفرنامه</span>
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
              <h3 className="font-black text-base text-ink">افزودن راهنمای سفر و مقاله</h3>
              <button type="button" onClick={() => setGuideModalOpen(false)} className="w-8 h-8 rounded-full bg-soft text-sub grid place-items-center cursor-pointer">
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
                <button type="button" onClick={() => setGuideModalOpen(false)} className="h-10 px-4 rounded-xl bg-soft text-ink font-bold text-xs cursor-pointer">انصراف</button>
                <button type="submit" disabled={submitting} className="h-10 px-5 rounded-xl bg-action hover:bg-action-hover text-ink font-black text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer">
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  <span>ثبت راهنما</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
