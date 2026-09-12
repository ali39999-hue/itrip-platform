'use client';

import { useState, useEffect } from 'react';
import {
  Home,
  Megaphone,
  Route as RouteIcon,
  HelpCircle,
  Bell,
  Headset,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Loader2,
  Code2,
  Wand2,
  CheckCircle2,
  UserRound,
  LifeBuoy,
} from 'lucide-react';
import { ErpSectionCard, ErpAlert, erpFieldCls, erpLabelCls, erpPrimaryBtnCls, erpGhostBtnCls, erpDangerBtnCls } from '@/components/admin/erp-ui';
import { getSiteContentAction, saveSiteContentAction, resetSiteContentAction } from '@/actions/content';
import { DEFAULT_PROMO_BANNERS } from '@/components/home/sections/PromotionalBanners';
import { DEFAULT_POPULAR_ROUTES } from '@/components/home/sections/PopularFlightsSection';
import { DEFAULT_FAQ } from '@/components/home/sections/FaqSection';
import { DEFAULT_ACCOUNT_SIDEBAR, DEFAULT_SUPPORT_PAGE } from '@/lib/account-panel-defaults';
import type {
  SiteContentKey,
  HeroOverride,
  PromoBannerOverride,
  PopularRouteOverride,
  FaqItemOverride,
  AnnouncementOverride,
  SupportOverride,
  AccountSidebarOverride,
  AccountHeroOverride,
  AccountLoyaltyOverride,
  SupportPageOverride,
} from '@/domains/content/SiteContentService';

type SiteTab = 'hero' | 'promos' | 'routes' | 'faq' | 'announcement' | 'support' | 'accounthero' | 'accountnav' | 'accountloyalty' | 'supportpage';

const SITE_TABS: Array<{ id: SiteTab; key: SiteContentKey; label: string; icon: React.ReactNode; hint: string }> = [
  { id: 'hero', key: 'home.hero', label: 'بنر اصلی (Hero)', icon: <Home size={14} aria-hidden="true" />, hint: 'عنوان، توضیح و تصویر بالای صفحه اصلی. هر فیلدی خالی بماند، همان متن پیش‌فرض فعلی نمایش داده می‌شود.' },
  { id: 'promos', key: 'home.promos', label: 'بنرهای تبلیغاتی', icon: <Megaphone size={14} aria-hidden="true" />, hint: 'سه کارت کمپین زیر نوار جستجو. متن‌ها جفت فارسی/انگلیسی هستند؛ سایر زبان‌ها از انگلیسی پیروی می‌کنند.' },
  { id: 'routes', key: 'home.routes', label: 'مسیرهای پرتردد', icon: <RouteIcon size={14} aria-hidden="true" />, hint: 'کارت‌های «پرفروش‌ترین پروازها» با قیمت شروع. با تغییر مسیرها، لینک جستجو هم خودکار ساخته می‌شود.' },
  { id: 'faq', key: 'home.faq', label: 'سوالات متداول', icon: <HelpCircle size={14} aria-hidden="true" />, hint: 'آکاردئون پاسخ به پرسش‌های پرتکرار انتهای صفحه اصلی.' },
  { id: 'announcement', key: 'site.announcement', label: 'اعلان سراسری', icon: <Bell size={14} aria-hidden="true" />, hint: 'بنر اطلاع‌رسانی بالای صفحه اصلی مسافران (همان که از «اقدامات سریع» داشبورد منتشر می‌شود). با «فعال» خاموش/روشن می‌شود.' },
  { id: 'support', key: 'home.support', label: 'تماس و پشتیبانی', icon: <Headset size={14} aria-hidden="true" />, hint: 'شماره تماس ۲۴ ساعته و متن بنر پشتیبانی انتهای صفحه اصلی مسافران.' },
  { id: 'accounthero', key: 'account.hero', label: 'پنل مشتری: خوش‌آمد', icon: <UserRound size={14} aria-hidden="true" />, hint: 'عنوان و توضیح هدر خوش‌آمدگویی داشبورد حساب کاربری مسافران. خالی = متن پیش‌فرض.' },
  { id: 'accountnav', key: 'account.sidebar', label: 'پنل مشتری: منو', icon: <UserRound size={14} aria-hidden="true" />, hint: 'منوی کنار پنل مشتری (داشبورد، سفرهای من، کیف پول و…). آیتم‌ها با ذخیره فوراً برای همه مسافران اعمال می‌شود.' },
  { id: 'accountloyalty', key: 'account.loyalty', label: 'پنل مشتری: باشگاه مشتریان', icon: <UserRound size={14} aria-hidden="true" />, hint: 'نمایش نوار سطح و امتیاز باشگاه مشتریان (داده امتیاز از سرور واقعی خوانده می‌شود؛ فقط متن مزیت و روشن/خاموش اینجاست).' },
  { id: 'supportpage', key: 'support.page', label: 'صفحه پشتیبانی', icon: <LifeBuoy size={14} aria-hidden="true" />, hint: 'کانال‌های تماس صفحه /support (تلفن، ایمیل، تلگرام) و در صورت تمایل جایگزین سوالات متداول.' },
];

interface StoredEntry {
  key: SiteContentKey;
  payload: unknown;
  updatedAt: string;
}

const heroTextCls = erpFieldCls;

export function SiteContentTab({ onChanged }: { onChanged?: () => void }) {
  const [activeSiteTab, setActiveSiteTab] = useState<SiteTab>('hero');
  const [entries, setEntries] = useState<Record<string, StoredEntry>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [rawJson, setRawJson] = useState('');

  // Draft states per key
  const [heroDraft, setHeroDraft] = useState<HeroOverride>({});
  const [promosDraft, setPromosDraft] = useState<PromoBannerOverride[]>(DEFAULT_PROMO_BANNERS);
  const [routesDraft, setRoutesDraft] = useState<PopularRouteOverride[]>(DEFAULT_POPULAR_ROUTES);
  const [faqDraft, setFaqDraft] = useState<FaqItemOverride[]>(DEFAULT_FAQ);
  const [supportDraft, setSupportDraft] = useState<SupportOverride>({});
  const [accountHeroDraft, setAccountHeroDraft] = useState<AccountHeroOverride>({});
  const [accountNavDraft, setAccountNavDraft] = useState<AccountSidebarOverride>(DEFAULT_ACCOUNT_SIDEBAR);
  const [accountLoyaltyDraft, setAccountLoyaltyDraft] = useState<AccountLoyaltyOverride>({ enabled: true });
  const [supportPageDraft, setSupportPageDraft] = useState<SupportPageOverride>(DEFAULT_SUPPORT_PAGE);
  const [supportPageFaqDraft, setSupportPageFaqDraft] = useState<FaqItemOverride[]>(DEFAULT_FAQ);
  const [announcementDraft, setAnnouncementDraft] = useState<AnnouncementOverride>({
    title: { fa: '', en: '' },
    message: { fa: '', en: '' },
    tone: 'warn',
    active: false,
  });

  function applyDrafts(map: Record<string, StoredEntry>) {
    if (map['home.hero']?.payload) setHeroDraft(map['home.hero'].payload as HeroOverride);
    else setHeroDraft({});

    if (map['home.promos']?.payload) setPromosDraft(map['home.promos'].payload as PromoBannerOverride[]);
    else setPromosDraft(DEFAULT_PROMO_BANNERS);

    if (map['home.routes']?.payload) setRoutesDraft(map['home.routes'].payload as PopularRouteOverride[]);
    else setRoutesDraft(DEFAULT_POPULAR_ROUTES);

    if (map['home.faq']?.payload) setFaqDraft(map['home.faq'].payload as FaqItemOverride[]);
    else setFaqDraft(DEFAULT_FAQ);

    if (map['home.support']?.payload) setSupportDraft(map['home.support'].payload as SupportOverride);
    else setSupportDraft({});

    if (map['account.hero']?.payload) setAccountHeroDraft(map['account.hero'].payload as AccountHeroOverride);
    else setAccountHeroDraft({});

    if (map['account.sidebar']?.payload) setAccountNavDraft(map['account.sidebar'].payload as AccountSidebarOverride);
    else setAccountNavDraft(DEFAULT_ACCOUNT_SIDEBAR);

    if (map['account.loyalty']?.payload) setAccountLoyaltyDraft(map['account.loyalty'].payload as AccountLoyaltyOverride);
    else setAccountLoyaltyDraft({ enabled: true });

    if (map['support.page']?.payload) {
      const sp = map['support.page'].payload as SupportPageOverride;
      setSupportPageDraft({ ...DEFAULT_SUPPORT_PAGE, ...sp });
      setSupportPageFaqDraft(sp.faq ?? []);
    } else {
      setSupportPageDraft(DEFAULT_SUPPORT_PAGE);
      setSupportPageFaqDraft([]);
    }

    if (map['site.announcement']?.payload) setAnnouncementDraft(map['site.announcement'].payload as AnnouncementOverride);
    else
      setAnnouncementDraft({
        title: { fa: '', en: '' },
        message: { fa: '', en: '' },
        tone: 'warn',
        active: false,
      });
  }

  async function load() {
    setLoading(true);
    try {
      const res = await getSiteContentAction();
      if (res.success) {
        const map: Record<string, StoredEntry> = {};
        for (const e of res.entries || []) map[e.key] = { key: e.key, payload: e.payload, updatedAt: String(e.updatedAt) };
        setEntries(map);
        applyDrafts(map);
      } else {
        setFeedback({ msg: res.error || 'خطا در دریافت محتوای صفحات', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only fetch
  }, []);

  const currentMeta = SITE_TABS.find((t) => t.id === activeSiteTab)!;
  const isCustomized = Boolean(entries[currentMeta.key]);

  function draftFor(key: SiteContentKey): unknown {
    if (key === 'home.hero') return heroDraft;
    if (key === 'home.promos') return promosDraft;
    if (key === 'home.routes') return routesDraft;
    if (key === 'site.announcement') return announcementDraft;
    if (key === 'home.support') return supportDraft;
    if (key === 'account.hero') return accountHeroDraft;
    if (key === 'account.sidebar') return accountNavDraft;
    if (key === 'account.loyalty') return accountLoyaltyDraft;
    if (key === 'support.page') {
      return {
        ...supportPageDraft,
        faq: supportPageFaqDraft.length > 0 ? supportPageFaqDraft : undefined,
      };
    }
    return faqDraft;
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await saveSiteContentAction(currentMeta.key, draftFor(currentMeta.key));
      if (res.success) {
        setFeedback({ msg: `«${currentMeta.label}» با موفقیت ذخیره و در سایت اعمال شد.`, type: 'success' });
        await load();
        onChanged?.();
      } else {
        setFeedback({ msg: res.error || 'خطا در ذخیره‌سازی', type: 'error' });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await resetSiteContentAction(currentMeta.key);
      if (res.success) {
        setFeedback({ msg: `«${currentMeta.label}» به حالت پیش‌فرض بازگشت.`, type: 'success' });
        await load();
        onChanged?.();
      } else {
        setFeedback({ msg: res.error || 'خطا در بازگردانی', type: 'error' });
      }
    } finally {
      setSaving(false);
    }
  }

  function handleRawSave() {
    try {
      const parsed = JSON.parse(rawJson);
      if (currentMeta.key === 'home.hero') setHeroDraft(parsed as HeroOverride);
      else if (currentMeta.key === 'home.promos') setPromosDraft(parsed as PromoBannerOverride[]);
      else if (currentMeta.key === 'home.routes') setRoutesDraft(parsed as PopularRouteOverride[]);
      else if (currentMeta.key === 'site.announcement') setAnnouncementDraft(parsed as AnnouncementOverride);
      else if (currentMeta.key === 'home.support') setSupportDraft(parsed as SupportOverride);
      else if (currentMeta.key === 'account.hero') setAccountHeroDraft(parsed as AccountHeroOverride);
      else if (currentMeta.key === 'account.sidebar') setAccountNavDraft(parsed as AccountSidebarOverride);
      else if (currentMeta.key === 'account.loyalty') setAccountLoyaltyDraft(parsed as AccountLoyaltyOverride);
      else if (currentMeta.key === 'support.page') {
        const sp = parsed as SupportPageOverride;
        setSupportPageDraft({ ...DEFAULT_SUPPORT_PAGE, ...sp });
        setSupportPageFaqDraft(sp.faq ?? []);
      } else setFaqDraft(parsed as FaqItemOverride[]);
      setFeedback({ msg: 'JSON معتبر است و در فرم بارگذاری شد — برای اعمال، ذخیره کنید.', type: 'success' });
    } catch {
      setFeedback({ msg: 'JSON نامعتبر است — ساختار را بررسی کنید.', type: 'error' });
    }
  }

  function openAdvanced() {
    setRawJson(JSON.stringify(draftFor(currentMeta.key), null, 2));
    setAdvanced(true);
  }

  return (
    <div className="space-y-4">
      <ErpSectionCard
        title="محتوای صفحات سایت"
        subtitle="این بخش‌ها به‌صورت زنده روی صفحه اصلی مسافران اعمال می‌شوند. تا وقتی ذخیره نکنید هیچ تغییری در سایت دیده نمی‌شود و با «بازگردانی پیش‌فرض» هم می‌توانید هر بخش را به حالت اولیه برگردانید."
        icon={<Wand2 size={18} aria-hidden="true" />}
      >
        {/* Site section sub-tabs */}
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="بخش‌های محتوای سایت">
          {SITE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeSiteTab === t.id}
              onClick={() => { setActiveSiteTab(t.id); setAdvanced(false); setFeedback(null); }}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                activeSiteTab === t.id ? 'bg-brand text-surface shadow-sm' : 'bg-soft text-ink hover:bg-mint/40'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
              {entries[t.key] && <span className="w-1.5 h-1.5 rounded-full bg-action" title="سفارشی‌شده" />}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${isCustomized ? 'bg-mint text-brand-dark' : 'bg-soft text-sub'}`}>
            {isCustomized ? 'سفارشی‌شده در CMS' : 'محتوای پیش‌فرض (بدون سفارشی‌سازی)'}
          </span>
          <button type="button" onClick={openAdvanced} className="text-[11px] font-black text-brand-dark hover:underline flex items-center gap-1 cursor-pointer">
            <Code2 size={13} aria-hidden="true" />
            <span>ویرایش پیشرفته JSON</span>
          </button>
        </div>

        <p className="text-[11.5px] font-bold text-sub leading-relaxed bg-soft/60 p-3 rounded-2xl border border-line/60">
          {currentMeta.hint}
        </p>

        {feedback && <ErpAlert tone={feedback.type === 'success' ? 'success' : 'error'}>{feedback.msg}</ErpAlert>}

        {loading ? (
          <div className="p-10 text-center text-sub flex items-center justify-center gap-2 text-xs font-bold">
            <Loader2 size={20} className="animate-spin text-brand" aria-hidden="true" />
            <span>در حال بارگذاری محتوای فعلی...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {activeSiteTab === 'hero' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={erpLabelCls}>عنوان اصلی (فارسی):</label>
                  <input className={heroTextCls} value={heroDraft.title?.fa || ''} onChange={(e) => setHeroDraft({ ...heroDraft, title: { ...heroDraft.title, fa: e.target.value } })} placeholder="خالی = متن پیش‌فرض" />
                </div>
                <div>
                  <label className={erpLabelCls}>عنوان اصلی (انگلیسی):</label>
                  <input className={heroTextCls} value={heroDraft.title?.en || ''} onChange={(e) => setHeroDraft({ ...heroDraft, title: { ...heroDraft.title, en: e.target.value } })} placeholder="Leave empty for default" dir="ltr" />
                </div>
                <div>
                  <label className={erpLabelCls}>زیرعنوان (فارسی):</label>
                  <input className={heroTextCls} value={heroDraft.subtitle?.fa || ''} onChange={(e) => setHeroDraft({ ...heroDraft, subtitle: { ...heroDraft.subtitle, fa: e.target.value } })} placeholder="خالی = متن پیش‌فرض" />
                </div>
                <div>
                  <label className={erpLabelCls}>زیرعنوان (انگلیسی):</label>
                  <input className={heroTextCls} value={heroDraft.subtitle?.en || ''} onChange={(e) => setHeroDraft({ ...heroDraft, subtitle: { ...heroDraft.subtitle, en: e.target.value } })} placeholder="Leave empty for default" dir="ltr" />
                </div>
                <div className="sm:col-span-2">
                  <label className={erpLabelCls}>تصویر پس‌زمینه (URL — خالی = تصویر بر اساس کشور):</label>
                  <input className={heroTextCls} value={heroDraft.imageUrl || ''} onChange={(e) => setHeroDraft({ ...heroDraft, imageUrl: e.target.value })} placeholder="https://images.unsplash.com/..." dir="ltr" />
                </div>
              </div>
            )}

            {activeSiteTab === 'promos' && (
              <div className="space-y-3">
                {promosDraft.map((b, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl border border-line bg-soft/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-brand-dark">بنر {idx + 1}</span>
                      {promosDraft.length > 1 && (
                        <button type="button" onClick={() => setPromosDraft(promosDraft.filter((_, i) => i !== idx))} className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 grid place-items-center cursor-pointer" aria-label={`حذف بنر ${idx + 1}`}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input className={heroTextCls} value={b.tag.fa} onChange={(e) => updateArrayItem(promosDraft, setPromosDraft, idx, { tag: { ...b.tag, fa: e.target.value } })} placeholder="برچسب (فارسی)" />
                      <input className={heroTextCls} value={b.tag.en} onChange={(e) => updateArrayItem(promosDraft, setPromosDraft, idx, { tag: { ...b.tag, en: e.target.value } })} placeholder="Tag (EN)" dir="ltr" />
                      <input className={heroTextCls} value={b.title.fa} onChange={(e) => updateArrayItem(promosDraft, setPromosDraft, idx, { title: { ...b.title, fa: e.target.value } })} placeholder="عنوان (فارسی)" />
                      <input className={heroTextCls} value={b.title.en} onChange={(e) => updateArrayItem(promosDraft, setPromosDraft, idx, { title: { ...b.title, en: e.target.value } })} placeholder="Title (EN)" dir="ltr" />
                      <input className={heroTextCls} value={b.subtitle.fa} onChange={(e) => updateArrayItem(promosDraft, setPromosDraft, idx, { subtitle: { ...b.subtitle, fa: e.target.value } })} placeholder="توضیح (فارسی)" />
                      <input className={heroTextCls} value={b.subtitle.en} onChange={(e) => updateArrayItem(promosDraft, setPromosDraft, idx, { subtitle: { ...b.subtitle, en: e.target.value } })} placeholder="Subtitle (EN)" dir="ltr" />
                      <input className={heroTextCls} value={b.cta.fa} onChange={(e) => updateArrayItem(promosDraft, setPromosDraft, idx, { cta: { ...b.cta, fa: e.target.value } })} placeholder="متن دکمه (فارسی)" />
                      <input className={heroTextCls} value={b.cta.en} onChange={(e) => updateArrayItem(promosDraft, setPromosDraft, idx, { cta: { ...b.cta, en: e.target.value } })} placeholder="CTA (EN)" dir="ltr" />
                      <input className={heroTextCls} value={b.href} onChange={(e) => updateArrayItem(promosDraft, setPromosDraft, idx, { href: e.target.value })} placeholder="/flights/search?from=THR&to=IST" dir="ltr" />
                      <input className={heroTextCls} value={b.img} onChange={(e) => updateArrayItem(promosDraft, setPromosDraft, idx, { img: e.target.value })} placeholder="https://... (تصویر)" dir="ltr" />
                    </div>
                  </div>
                ))}
                {promosDraft.length < 6 && (
                  <button type="button" onClick={() => setPromosDraft([...promosDraft, structuredClone(DEFAULT_PROMO_BANNERS[0])])} className={erpGhostBtnCls}>
                    <Plus size={13} aria-hidden="true" />
                    <span>افزودن بنر جدید</span>
                  </button>
                )}
              </div>
            )}

            {activeSiteTab === 'routes' && (
              <div className="space-y-3">
                {routesDraft.map((r, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl border border-line bg-soft/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-brand-dark">
                        مسیر {idx + 1}: {r.fromFa} ➔ {r.toFa}
                      </span>
                      {routesDraft.length > 1 && (
                        <button type="button" onClick={() => setRoutesDraft(routesDraft.filter((_, i) => i !== idx))} className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 grid place-items-center cursor-pointer" aria-label={`حذف مسیر ${idx + 1}`}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <input className={heroTextCls} value={r.fromFa} onChange={(e) => updateArrayItem(routesDraft, setRoutesDraft, idx, { fromFa: e.target.value })} placeholder="مبدا (فارسی)" />
                      <input className={heroTextCls} value={r.fromEn} onChange={(e) => updateArrayItem(routesDraft, setRoutesDraft, idx, { fromEn: e.target.value })} placeholder="From (EN)" dir="ltr" />
                      <input className={heroTextCls} value={r.toFa} onChange={(e) => updateArrayItem(routesDraft, setRoutesDraft, idx, { toFa: e.target.value })} placeholder="مقصد (فارسی)" />
                      <input className={heroTextCls} value={r.toEn} onChange={(e) => updateArrayItem(routesDraft, setRoutesDraft, idx, { toEn: e.target.value })} placeholder="To (EN)" dir="ltr" />
                      <input className={heroTextCls} value={r.airlineFa} onChange={(e) => updateArrayItem(routesDraft, setRoutesDraft, idx, { airlineFa: e.target.value })} placeholder="ایرلاین (فارسی)" />
                      <input className={heroTextCls} value={r.airlineEn} onChange={(e) => updateArrayItem(routesDraft, setRoutesDraft, idx, { airlineEn: e.target.value })} placeholder="Airline (EN)" dir="ltr" />
                      <input className={heroTextCls} value={r.duration} onChange={(e) => updateArrayItem(routesDraft, setRoutesDraft, idx, { duration: e.target.value })} placeholder="مدت (فارسی)" />
                      <input className={heroTextCls} value={r.durationEn} onChange={(e) => updateArrayItem(routesDraft, setRoutesDraft, idx, { durationEn: e.target.value })} placeholder="Duration (EN)" dir="ltr" />
                      <input className={heroTextCls} type="number" value={r.price} onChange={(e) => updateArrayItem(routesDraft, setRoutesDraft, idx, { price: Number(e.target.value) || 0 })} placeholder="قیمت شروع (تومان)" />
                      <input className={`${heroTextCls} sm:col-span-3`} value={r.img} onChange={(e) => updateArrayItem(routesDraft, setRoutesDraft, idx, { img: e.target.value })} placeholder="https://... (تصویر شهر)" dir="ltr" />
                    </div>
                  </div>
                ))}
                {routesDraft.length < 12 && (
                  <button type="button" onClick={() => setRoutesDraft([...routesDraft, structuredClone(DEFAULT_POPULAR_ROUTES[0])])} className={erpGhostBtnCls}>
                    <Plus size={13} aria-hidden="true" />
                    <span>افزودن مسیر جدید</span>
                  </button>
                )}
              </div>
            )}

            {activeSiteTab === 'faq' && (
              <div className="space-y-3">
                {faqDraft.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl border border-line bg-soft/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-brand-dark">پرسش {idx + 1}</span>
                      {faqDraft.length > 1 && (
                        <button type="button" onClick={() => setFaqDraft(faqDraft.filter((_, i) => i !== idx))} className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 grid place-items-center cursor-pointer" aria-label={`حذف پرسش ${idx + 1}`}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input className={heroTextCls} value={item.q.fa} onChange={(e) => updateArrayItem(faqDraft, setFaqDraft, idx, { q: { ...item.q, fa: e.target.value } })} placeholder="سوال (فارسی)" />
                      <input className={heroTextCls} value={item.q.en} onChange={(e) => updateArrayItem(faqDraft, setFaqDraft, idx, { q: { ...item.q, en: e.target.value } })} placeholder="Question (EN)" dir="ltr" />
                      <textarea rows={3} className={`${heroTextCls} h-auto py-2`} value={item.a.fa} onChange={(e) => updateArrayItem(faqDraft, setFaqDraft, idx, { a: { ...item.a, fa: e.target.value } })} placeholder="پاسخ (فارسی)" />
                      <textarea rows={3} className={`${heroTextCls} h-auto py-2`} value={item.a.en} onChange={(e) => updateArrayItem(faqDraft, setFaqDraft, idx, { a: { ...item.a, en: e.target.value } })} placeholder="Answer (EN)" dir="ltr" />
                    </div>
                  </div>
                ))}
                {faqDraft.length < 20 && (
                  <button type="button" onClick={() => setFaqDraft([...faqDraft, structuredClone(DEFAULT_FAQ[0])])} className={erpGhostBtnCls}>
                    <Plus size={13} aria-hidden="true" />
                    <span>افزودن پرسش جدید</span>
                  </button>
                )}
              </div>
            )}

            {activeSiteTab === 'announcement' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={erpLabelCls}>عنوان اعلان (فارسی):</label>
                  <input className={heroTextCls} value={announcementDraft.title?.fa || ''} onChange={(e) => setAnnouncementDraft({ ...announcementDraft, title: { ...announcementDraft.title, fa: e.target.value } })} placeholder="مثال: تغییر ساعت کاری پشتیبانی" />
                </div>
                <div>
                  <label className={erpLabelCls}>عنوان اعلان (انگلیسی):</label>
                  <input className={heroTextCls} value={announcementDraft.title?.en || ''} onChange={(e) => setAnnouncementDraft({ ...announcementDraft, title: { ...announcementDraft.title, en: e.target.value } })} placeholder="Announcement title" dir="ltr" />
                </div>
                <div>
                  <label className={erpLabelCls}>متن اعلان (فارسی):</label>
                  <textarea rows={3} className={`${heroTextCls} h-auto py-2`} value={announcementDraft.message?.fa || ''} onChange={(e) => setAnnouncementDraft({ ...announcementDraft, message: { ...announcementDraft.message, fa: e.target.value } })} placeholder="متن پیام به مسافران..." />
                </div>
                <div>
                  <label className={erpLabelCls}>متن اعلان (انگلیسی):</label>
                  <textarea rows={3} className={`${heroTextCls} h-auto py-2`} value={announcementDraft.message?.en || ''} onChange={(e) => setAnnouncementDraft({ ...announcementDraft, message: { ...announcementDraft.message, en: e.target.value } })} placeholder="Message body" dir="ltr" />
                </div>
                <div>
                  <label className={erpLabelCls}>شدت نمایش:</label>
                  <select className={heroTextCls} value={announcementDraft.tone || 'warn'} onChange={(e) => setAnnouncementDraft({ ...announcementDraft, tone: e.target.value as 'info' | 'warn' | 'critical' })}>
                    <option value="info">اطلاعی (آبی)</option>
                    <option value="warn">هشدار (طلایی)</option>
                    <option value="critical">فوری (قرمز)</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-xs font-black text-ink cursor-pointer">
                    <input type="checkbox" checked={announcementDraft.active ?? false} onChange={(e) => setAnnouncementDraft({ ...announcementDraft, active: e.target.checked })} className="w-4 h-4 accent-[var(--brand)]" />
                    <span>نمایش فعال باشد (روی صفحه اصلی مسافران دیده شود)</span>
                  </label>
                </div>
              </div>
            )}

            {activeSiteTab === 'support' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={erpLabelCls}>شماره تماس تلفنی (مقدار لینک tel):</label>
                  <input className={heroTextCls} value={supportDraft.phone || ''} onChange={(e) => setSupportDraft({ ...supportDraft, phone: e.target.value })} placeholder="مثال: +982191000000" dir="ltr" />
                </div>
                <div>
                  <label className={erpLabelCls}>شماره تماس نمایشی (فارسی):</label>
                  <input className={heroTextCls} value={supportDraft.phoneDisplay?.fa || ''} onChange={(e) => setSupportDraft({ ...supportDraft, phoneDisplay: { ...supportDraft.phoneDisplay, fa: e.target.value } })} placeholder="مثال: ۰۲۱-۹۱۰۰۰۰۰۰" dir="ltr" />
                </div>
                <div>
                  <label className={erpLabelCls}>عنوان بنر پشتیبانی (فارسی):</label>
                  <input className={heroTextCls} value={supportDraft.title?.fa || ''} onChange={(e) => setSupportDraft({ ...supportDraft, title: { ...supportDraft.title, fa: e.target.value } })} placeholder="خالی = پیش‌فرض سیستم" />
                </div>
                <div>
                  <label className={erpLabelCls}>عنوان بنر پشتیبانی (انگلیسی):</label>
                  <input className={heroTextCls} value={supportDraft.title?.en || ''} onChange={(e) => setSupportDraft({ ...supportDraft, title: { ...supportDraft.title, en: e.target.value } })} placeholder="Leave empty for default" dir="ltr" />
                </div>
                <div className="sm:col-span-2">
                  <label className={erpLabelCls}>توضیحات تیم پشتیبانی (فارسی):</label>
                  <textarea rows={2} className={`${heroTextCls} h-auto py-2`} value={supportDraft.subtitle?.fa || ''} onChange={(e) => setSupportDraft({ ...supportDraft, subtitle: { ...supportDraft.subtitle, fa: e.target.value } })} placeholder="تیم پشتیبانی اختصاصی فیروز به ۵ زبان زنده دنیا..." />
                </div>
              </div>
            )}

            {activeSiteTab === 'accounthero' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={erpLabelCls}>عنوان خوش‌آمد (فارسی):</label>
                  <input className={heroTextCls} value={accountHeroDraft.title?.fa || ''} onChange={(e) => setAccountHeroDraft({ ...accountHeroDraft, title: { fa: e.target.value, en: accountHeroDraft.title?.en || '' } })} placeholder="خالی = «خوش آمدید،»" />
                </div>
                <div>
                  <label className={erpLabelCls}>عنوان خوش‌آمد (انگلیسی):</label>
                  <input className={heroTextCls} value={accountHeroDraft.title?.en || ''} onChange={(e) => setAccountHeroDraft({ ...accountHeroDraft, title: { fa: accountHeroDraft.title?.fa || '', en: e.target.value } })} placeholder="Leave empty for default" dir="ltr" />
                </div>
                <div>
                  <label className={erpLabelCls}>توضیح هدر (فارسی):</label>
                  <textarea rows={2} className={`${heroTextCls} h-auto py-2`} value={accountHeroDraft.subtitle?.fa || ''} onChange={(e) => setAccountHeroDraft({ ...accountHeroDraft, subtitle: { fa: e.target.value, en: accountHeroDraft.subtitle?.en || '' } })} placeholder="خالی = متن پیش‌فرض" />
                </div>
                <div>
                  <label className={erpLabelCls}>توضیح هدر (انگلیسی):</label>
                  <textarea rows={2} className={`${heroTextCls} h-auto py-2`} value={accountHeroDraft.subtitle?.en || ''} onChange={(e) => setAccountHeroDraft({ ...accountHeroDraft, subtitle: { fa: accountHeroDraft.subtitle?.fa || '', en: e.target.value } })} placeholder="Leave empty for default" dir="ltr" />
                </div>
              </div>
            )}

            {activeSiteTab === 'accountnav' && (
              <div className="space-y-3">
                {accountNavDraft.links.map((link, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl border border-line bg-soft/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-brand-dark">آیتم منو {idx + 1}</span>
                      {accountNavDraft.links.length > 3 && (
                        <button type="button" onClick={() => setAccountNavDraft({ ...accountNavDraft, links: accountNavDraft.links.filter((_, i) => i !== idx) })} className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 grid place-items-center cursor-pointer" aria-label={`حذف آیتم ${idx + 1}`}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input className={heroTextCls} value={link.label.fa} onChange={(e) => updateArrayItem(accountNavDraft.links, (newLinks) => setAccountNavDraft({ ...accountNavDraft, links: newLinks }), idx, { label: { ...link.label, fa: e.target.value } })} placeholder="برچسب (فارسی)" />
                      <input className={heroTextCls} value={link.label.en} onChange={(e) => updateArrayItem(accountNavDraft.links, (newLinks) => setAccountNavDraft({ ...accountNavDraft, links: newLinks }), idx, { label: { ...link.label, en: e.target.value } })} placeholder="Label (EN)" dir="ltr" />
                      <input className={heroTextCls} value={link.href} onChange={(e) => updateArrayItem(accountNavDraft.links, (newLinks) => setAccountNavDraft({ ...accountNavDraft, links: newLinks }), idx, { href: e.target.value })} placeholder="/my-trips" dir="ltr" />
                      <select className={heroTextCls} value={link.icon || 'LayoutGrid'} onChange={(e) => updateArrayItem(accountNavDraft.links, (newLinks) => setAccountNavDraft({ ...accountNavDraft, links: newLinks }), idx, { icon: e.target.value as AccountSidebarOverride['links'][number]['icon'] })}>
                        {['LayoutGrid', 'Users', 'PlaneTakeoff', 'Gift', 'Bot', 'Building', 'Star'].map((ic) => (
                          <option key={ic} value={ic}>{ic}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
                {accountNavDraft.links.length < 10 && (
                  <button type="button" onClick={() => setAccountNavDraft({ ...accountNavDraft, links: [...accountNavDraft.links, structuredClone(DEFAULT_ACCOUNT_SIDEBAR.links[0])] })} className={erpGhostBtnCls}>
                    <Plus size={13} aria-hidden="true" />
                    <span>افزودن آیتم منو</span>
                  </button>
                )}
              </div>
            )}

            {activeSiteTab === 'accountloyalty' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 flex items-end">
                  <label className="flex items-center gap-2 text-xs font-black text-ink cursor-pointer">
                    <input type="checkbox" checked={accountLoyaltyDraft.enabled} onChange={(e) => setAccountLoyaltyDraft({ ...accountLoyaltyDraft, enabled: e.target.checked })} className="w-4 h-4 accent-[var(--brand)]" />
                    <span>نوار سطح و امتیاز باشگاه مشتریان نمایش داده شود</span>
                  </label>
                </div>
                <div>
                  <label className={erpLabelCls}>متن مزیت باشگاه (فارسی):</label>
                  <input className={heroTextCls} value={accountLoyaltyDraft.perkText?.fa || ''} onChange={(e) => setAccountLoyaltyDraft({ ...accountLoyaltyDraft, perkText: { fa: e.target.value, en: accountLoyaltyDraft.perkText?.en || '' } })} placeholder="خالی = «امتیاز تا سطح بعد»" />
                </div>
                <div>
                  <label className={erpLabelCls}>متن مزیت باشگاه (انگلیسی):</label>
                  <input className={heroTextCls} value={accountLoyaltyDraft.perkText?.en || ''} onChange={(e) => setAccountLoyaltyDraft({ ...accountLoyaltyDraft, perkText: { fa: accountLoyaltyDraft.perkText?.fa || '', en: e.target.value } })} placeholder="Leave empty for default" dir="ltr" />
                </div>
              </div>
            )}

            {activeSiteTab === 'supportpage' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={erpLabelCls}>شماره تماس (مقدار لینک tel):</label>
                    <input className={heroTextCls} value={supportPageDraft.phone || ''} onChange={(e) => setSupportPageDraft({ ...supportPageDraft, phone: e.target.value })} placeholder="+982191000000" dir="ltr" />
                  </div>
                  <div>
                    <label className={erpLabelCls}>شماره نمایشی (فارسی):</label>
                    <input className={heroTextCls} value={supportPageDraft.phoneDisplay?.fa || ''} onChange={(e) => setSupportPageDraft({ ...supportPageDraft, phoneDisplay: { ...supportPageDraft.phoneDisplay, fa: e.target.value } })} placeholder="۰۲۱-۹۱۰۰۰۰۰۰" />
                  </div>
                  <div>
                    <label className={erpLabelCls}>ایمیل پشتیبانی:</label>
                    <input className={heroTextCls} dir="ltr" value={supportPageDraft.email || ''} onChange={(e) => setSupportPageDraft({ ...supportPageDraft, email: e.target.value })} placeholder="support@firuzo.com" />
                  </div>
                  <div>
                    <label className={erpLabelCls}>آیدی تلگرام (بدون @):</label>
                    <input className={heroTextCls} dir="ltr" value={supportPageDraft.telegram || ''} onChange={(e) => setSupportPageDraft({ ...supportPageDraft, telegram: e.target.value })} placeholder="firuzo_support" />
                  </div>
                </div>

                <div className="border-t border-line/60 pt-3">
                  <p className="text-[11px] font-black text-brand-dark mb-2">
                    جایگزین سوالات متداول صفحه پشتیبانی {supportPageFaqDraft.length === 0 ? '(خالی = سوالات پیش‌فرض)' : `(${supportPageFaqDraft.length} پرسش)`}
                  </p>
                  <div className="space-y-3">
                    {supportPageFaqDraft.map((item, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl border border-line bg-soft/40 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-brand-dark">پرسش {idx + 1}</span>
                          <button type="button" onClick={() => setSupportPageFaqDraft(supportPageFaqDraft.filter((_, i) => i !== idx))} className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 grid place-items-center cursor-pointer" aria-label={`حذف پرسش ${idx + 1}`}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <input className={heroTextCls} value={item.q.fa} onChange={(e) => updateArrayItem(supportPageFaqDraft, setSupportPageFaqDraft, idx, { q: { ...item.q, fa: e.target.value } })} placeholder="سوال (فارسی)" />
                          <input className={heroTextCls} value={item.q.en} onChange={(e) => updateArrayItem(supportPageFaqDraft, setSupportPageFaqDraft, idx, { q: { ...item.q, en: e.target.value } })} placeholder="Question (EN)" dir="ltr" />
                          <textarea rows={3} className={`${heroTextCls} h-auto py-2`} value={item.a.fa} onChange={(e) => updateArrayItem(supportPageFaqDraft, setSupportPageFaqDraft, idx, { a: { ...item.a, fa: e.target.value } })} placeholder="پاسخ (فارسی)" />
                          <textarea rows={3} className={`${heroTextCls} h-auto py-2`} value={item.a.en} onChange={(e) => updateArrayItem(supportPageFaqDraft, setSupportPageFaqDraft, idx, { a: { ...item.a, en: e.target.value } })} placeholder="Answer (EN)" dir="ltr" />
                        </div>
                      </div>
                    ))}
                    {supportPageFaqDraft.length < 20 && (
                      <button type="button" onClick={() => setSupportPageFaqDraft([...supportPageFaqDraft, structuredClone(DEFAULT_FAQ[0])])} className={erpGhostBtnCls}>
                        <Plus size={13} aria-hidden="true" />
                        <span>افزودن پرسش</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Advanced raw JSON editor */}
            {advanced && (
              <div className="space-y-2">
                <label className={erpLabelCls}>JSON خام کلید «{currentMeta.key}»:</label>
                <textarea rows={10} dir="ltr" value={rawJson} onChange={(e) => setRawJson(e.target.value)} className={`${heroTextCls} font-mono text-[11px] leading-relaxed`} />
                <button type="button" onClick={handleRawSave} className={erpGhostBtnCls}>
                  <CheckCircle2 size={13} aria-hidden="true" />
                  <span>اعتبار‌سنجی و بارگذاری در فرم</span>
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 border-t border-line/60 flex items-center justify-between gap-2 flex-wrap">
              <button type="button" onClick={handleReset} disabled={saving || !isCustomized} className={erpDangerBtnCls} title={isCustomized ? 'حذف سفارشی‌سازی و بازگشت به محتوای اولیه' : 'این بخش سفارشی‌سازی نشده است'}>
                <RotateCcw size={13} aria-hidden="true" />
                <span>بازگردانی پیش‌فرض</span>
              </button>
              <button type="button" onClick={handleSave} disabled={saving} className={erpPrimaryBtnCls}>
                {saving ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Save size={13} aria-hidden="true" />}
                <span>ذخیره و انتشار در سایت</span>
              </button>
            </div>
          </div>
        )}
      </ErpSectionCard>
    </div>
  );
}

function updateArrayItem<T>(arr: T[], setArr: (v: T[]) => void, idx: number, patch: Partial<T>) {
  setArr(arr.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
}
