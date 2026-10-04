'use client';

import { useState, useTransition } from 'react';
import {
  saveContentDraft,
  publishContentPage,
  scheduleContentPage,
  restoreContentRevision,
} from '@/actions/business-content-ops';
import { BusinessContentRenderer } from '@/components/business/BusinessContentRenderer';
import type { SectionEntry } from '@/domains/business/core/BusinessContentService';

export interface ContentPageRow {
  id: string;
  slug: string;
  locale: string;
  title: string;
  status: string;
  scheduledAt: string | null;
  revisionCount: number;
  sections: SectionEntry[];
  seo: Record<string, unknown> | null;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'پیش‌نویس',
  scheduled: 'زمان‌بندی‌شده',
  published: 'منتشرشده',
  archived: 'آرشیو',
};

interface RevisionMeta {
  id: string;
  note: string | null;
  createdAt: string;
}

export function ContentEditorClient({
  initialPages,
  initialDetail,
  revisions,
}: {
  initialPages: ContentPageRow[];
  initialDetail: ContentPageRow | null;
  revisions: RevisionMeta[];
}) {
  const [pages, setPages] = useState(initialPages);
  const [current, setCurrent] = useState<ContentPageRow | null>(initialDetail);
  const [title, setTitle] = useState(initialDetail?.title ?? '');
  const [slug, setSlug] = useState(initialDetail?.slug ?? '');
  const [sections, setSections] = useState<SectionEntry[]>(initialDetail?.sections ?? []);
  const [metaTitle, setMetaTitle] = useState(String(initialDetail?.seo?.metaTitle ?? ''));
  const [metaDescription, setMetaDescription] = useState(
    String(initialDetail?.seo?.metaDescription ?? '')
  );
  const [ogImage, setOgImage] = useState(String(initialDetail?.seo?.ogImage ?? ''));
  const [scheduleAt, setScheduleAt] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [pending, startTransition] = useTransition();

  const refreshList = () => {
    // Re-fetch via listContentPages to reflect status changes.
    import('@/actions/business-content-ops').then(async ({ listContentPages }) => {
      const res = await listContentPages();
      if (res.success && res.pages) setPages(res.pages as unknown as ContentPageRow[]);
    });
  };

  const handleSave = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await saveContentDraft({
        pageId: current?.id,
        slug,
        title,
        sections,
        seo: {
          ...(current?.seo || {}),
          ...(metaTitle ? { metaTitle } : {}),
          ...(metaDescription ? { metaDescription } : {}),
          ...(ogImage ? { ogImage } : {}),
        },
      });
      if (res.success && res.page) {
        const p = res.page as unknown as ContentPageRow;
        setCurrent(p);
        setSlug(p.slug);
        setMessage('پیش‌نویس ذخیره شد (یک revision ثبت شد)');
        refreshList();
      } else {
        setMessage(res.error || 'خطا در ذخیره');
      }
    });
  };

  const handlePublish = () => {
    if (!current) return;
    setMessage(null);
    startTransition(async () => {
      const res = await publishContentPage(current.id);
      setMessage(res.success ? 'صفحه منتشر شد' : res.error || 'خطا در انتشار');
      refreshList();
    });
  };

  const handleSchedule = () => {
    if (!current || !scheduleAt) return;
    setMessage(null);
    startTransition(async () => {
      const res = await scheduleContentPage(current.id, new Date(scheduleAt).toISOString());
      setMessage(res.success ? 'زمان‌بندی شد' : res.error || 'خطا در زمان‌بندی');
      refreshList();
    });
  };

  const handleRestore = (revisionId: string) => {
    if (!current) return;
    setMessage(null);
    startTransition(async () => {
      const res = await restoreContentRevision(current.id, revisionId);
      if (res.success && res.page) {
        const p = res.page as unknown as ContentPageRow;
        setCurrent(p);
        setTitle(p.title);
        setSections(p.sections);
        setMessage('نسخه بازیابی شد (به پیش‌نویس برگشت)');
        refreshList();
      } else {
        setMessage(res.error || 'خطا در بازیابی');
      }
    });
  };

  const addSection = (key: string) => {
    const defaults: Record<string, Record<string, unknown>> = {
      hero_banner: { title: 'عنوان بنر', subtitle: '' },
      itinerary_timeline: { days: [{ dayNumber: 1, title: 'روز اول' }] },
      included_services: { items: ['خدمت نمونه'], excluded: [] },
      faq_accordion: { questions: [{ q: 'سوال نمونه', a: 'پاسخ نمونه' }] },
    };
    setSections([...sections, { key, props: defaults[key] || {} }]);
  };

  const updateSection = (index: number, props: Record<string, unknown>) => {
    setSections(sections.map((s, i) => (i === index ? { ...s, props } : s)));
  };

  const removeSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const sectionLabel: Record<string, string> = {
    hero_banner: 'بنر اصلی',
    itinerary_timeline: 'برنامه روزانه',
    included_services: 'خدمات شامل',
    faq_accordion: 'سوالات متداول',
  };

  /** T0504: upload an image through the guarded CMS endpoint and return its public URL. */
  const uploadImage = async (file: File): Promise<string | null> => {
    const body = new FormData();
    body.append('file', file);
    const res = await fetch('/api/v1/business/cms/upload', { method: 'POST', body });
    const json = (await res.json()) as { success?: boolean; data?: { url?: string }; error?: string };
    if (json.success && json.data?.url) return json.data.url;
    setMessage(json.error || 'خطا در بارگذاری تصویر');
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/80 bg-surface p-4">
        <h1 className="text-lg font-bold text-text-title">مدیریت محتوای تخصصی</h1>
        <p className="mt-1 text-sm text-text-muted">
          ساخت، پیش‌نمایش، زمان‌بندی و انتشار صفحات فرود vertical — بدون تغییر کد
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        {/* Page list */}
        <aside className="space-y-2 rounded-2xl border border-border/80 bg-surface p-3">
          {pages.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setCurrent(p);
                setTitle(p.title);
                setSlug(p.slug);
                setSections(p.sections);
                setMetaTitle(String(p.seo?.metaTitle ?? ''));
                setMetaDescription(String(p.seo?.metaDescription ?? ''));
                setPreview(false);
                setMessage(null);
              }}
              className={`min-h-[44px] w-full rounded-xl border p-3 text-start transition active:scale-[0.98] ${
                current?.id === p.id ? 'border-[var(--fz-brand)] bg-surface-sub' : 'border-border/60'
              }`}
            >
              <p className="text-sm font-medium text-text-body">{p.title}</p>
              <p className="mt-1 text-xs text-text-muted">
                /{p.slug} · {p.locale} · {STATUS_LABELS[p.status] || p.status} · {p.revisionCount} نسخه
              </p>
            </button>
          ))}
          <div className="border-t border-border/60 pt-3">
            <button
              type="button"
              onClick={() => {
                setCurrent(null);
                setTitle('');
                setSlug('');
                setSections([]);
                setMetaTitle('');
                setMetaDescription('');
                setMessage(null);
              }}
              className="min-h-[44px] w-full rounded-xl border border-dashed border-border px-3 text-sm font-medium text-text-body transition active:scale-[0.98]"
            >
              + صفحه جدید
            </button>
          </div>
        </aside>

        {/* Editor */}
        <div className="space-y-4">
          {message && (
            <div role="status" className="rounded-xl border border-border/80 bg-surface-sub p-3 text-sm text-text-body">
              {message}
            </div>
          )}

          <div className="space-y-3 rounded-2xl border border-border/80 bg-surface p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                <span className="text-text-muted">عنوان صفحه</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-surface px-3"
                />
              </label>
              <label className="text-sm">
                <span className="text-text-muted">اسلاگ (آدرس: /business/content/…)</span>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  disabled={!!current}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-surface px-3 disabled:opacity-60"
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                <span className="text-text-muted">Meta Title (حداکثر ۶۰)</span>
                <input
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-surface px-3"
                />
              </label>
              <label className="text-sm">
                <span className="text-text-muted">Meta Description (حداکثر ۱۵۵)</span>
                <input
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-surface px-3"
                />
              </label>
            </div>
            <div className="flex items-end gap-2">
              <label className="flex-1 text-sm">
                <span className="text-text-muted">تصویر OG (اشتراک‌گذاری اجتماعی)</span>
                <input
                  value={ogImage}
                  onChange={(e) => setOgImage(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-border bg-surface px-3"
                />
              </label>
              <label className="flex min-h-[44px] cursor-pointer items-center rounded-xl border border-border px-3 text-xs font-medium text-text-body transition active:scale-[0.98]">
                بارگذاری تصویر OG
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  aria-label="انتخاب فایل تصویر OG"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = await uploadImage(file);
                    if (url) setOgImage(url);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-border/80 bg-surface p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-text-title">بخش‌ها</h2>
              <div className="flex gap-2">
                {Object.keys(sectionLabel).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => addSection(key)}
                    className="min-h-[44px] rounded-xl border border-border px-3 text-xs font-medium text-text-body transition active:scale-[0.98]"
                  >
                    + {sectionLabel[key]}
                  </button>
                ))}
              </div>
            </div>

            {sections.length === 0 && (
              <p className="py-6 text-center text-sm text-text-muted">
                هنوز بخشی اضافه نشده — انتشار بدون حداقل یک بخش ممکن نیست
              </p>
            )}

            {sections.map((s, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-text-body">{sectionLabel[s.key] || s.key}</p>
                  <button
                    type="button"
                    onClick={() => removeSection(i)}
                    aria-label={`حذف بخش ${sectionLabel[s.key] || s.key}`}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-text-muted transition hover:text-red-600 active:scale-[0.98]"
                  >
                    ✕
                  </button>
                </div>
                {s.key === 'hero_banner' && (
                  <div className="mt-2 grid gap-2">
                    <input
                      value={String(s.props.title ?? '')}
                      onChange={(e) => updateSection(i, { ...s.props, title: e.target.value })}
                      placeholder="عنوان بنر"
                      aria-label="عنوان بنر"
                      className="min-h-[44px] rounded-xl border border-border bg-surface px-3 text-sm"
                    />
                    <input
                      value={String(s.props.subtitle ?? '')}
                      onChange={(e) => updateSection(i, { ...s.props, subtitle: e.target.value })}
                      placeholder="زیرعنوان"
                      aria-label="زیرعنوان بنر"
                      className="min-h-[44px] rounded-xl border border-border bg-surface px-3 text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={String(s.props.ctaLabel ?? '')}
                        onChange={(e) => updateSection(i, { ...s.props, ctaLabel: e.target.value })}
                        placeholder="متن دکمه"
                        aria-label="متن دکمه بنر"
                        className="min-h-[44px] rounded-xl border border-border bg-surface px-3 text-sm"
                      />
                      <input
                        value={String(s.props.ctaUrl ?? '')}
                        onChange={(e) => updateSection(i, { ...s.props, ctaUrl: e.target.value })}
                        placeholder="لینک دکمه"
                        aria-label="لینک دکمه بنر"
                        className="min-h-[44px] rounded-xl border border-border bg-surface px-3 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        value={String(s.props.bgImageUrl ?? '')}
                        onChange={(e) => updateSection(i, { ...s.props, bgImageUrl: e.target.value })}
                        placeholder="تصویر پس‌زمینه (URL)"
                        aria-label="تصویر پس‌زمینه بنر"
                        className="min-h-[44px] flex-1 rounded-xl border border-border bg-surface px-3 text-sm"
                      />
                      <label className="flex min-h-[44px] cursor-pointer items-center rounded-xl border border-border px-3 text-xs font-medium text-text-body transition active:scale-[0.98]">
                        بارگذاری تصویر
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          aria-label="انتخاب فایل تصویر بنر"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const url = await uploadImage(file);
                            if (url) updateSection(i, { ...s.props, bgImageUrl: url });
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                  </div>
                )}
                {s.key === 'itinerary_timeline' && (
                  <textarea
                    value={((s.props.days as Array<{ title?: string }>) || [])
                      .map((d) => d.title)
                      .join('\n')}
                    onChange={(e) =>
                      updateSection(i, {
                        ...s.props,
                        days: e.target.value
                          .split('\n')
                          .filter(Boolean)
                          .map((t, idx) => ({ dayNumber: idx + 1, title: t })),
                      })
                    }
                    rows={4}
                    placeholder="عنوان هر روز در یک خط"
                    aria-label="برنامه روزانه — هر روز یک خط"
                    className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                  />
                )}
                {s.key === 'included_services' && (
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <textarea
                      value={((s.props.items as string[]) || []).join('\n')}
                      onChange={(e) =>
                        updateSection(i, {
                          ...s.props,
                          items: e.target.value.split('\n').filter(Boolean),
                        })
                      }
                      rows={4}
                      placeholder="خدمات شامل — هر مورد یک خط"
                      aria-label="خدمات شامل"
                      className="rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                    />
                    <textarea
                      value={((s.props.excluded as string[]) || []).join('\n')}
                      onChange={(e) =>
                        updateSection(i, {
                          ...s.props,
                          excluded: e.target.value.split('\n').filter(Boolean),
                        })
                      }
                      rows={4}
                      placeholder="شامل نمی‌شود — هر مورد یک خط"
                      aria-label="خدمات غیر شامل"
                      className="rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                    />
                  </div>
                )}
                {s.key === 'faq_accordion' && (
                  <textarea
                    value={((s.props.questions as Array<{ q?: string; a?: string }>) || [])
                      .map((qa) => `${qa.q ?? ''} | ${qa.a ?? ''}`)
                      .join('\n')}
                    onChange={(e) =>
                      updateSection(i, {
                        ...s.props,
                        questions: e.target.value
                          .split('\n')
                          .filter(Boolean)
                          .map((line) => {
                            const [q, a] = line.split('|');
                            return { q: (q || '').trim(), a: (a || '').trim() };
                          }),
                      })
                    }
                    rows={4}
                    placeholder="سوال | پاسخ — هر مورد یک خط"
                    aria-label="سوالات متداول"
                    className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Live preview */}
          {preview && (
            <div className="rounded-2xl border border-[var(--fz-brand)]/40 bg-surface p-4">
              <h2 className="mb-3 font-bold text-text-title">پیش‌نمایش زنده</h2>
              <BusinessContentRenderer sections={sections} />
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/80 bg-surface p-4">
            <button
              type="button"
              disabled={pending || !title || !slug}
              onClick={handleSave}
              className="min-h-[44px] rounded-xl bg-[var(--fz-brand)] px-4 font-medium text-white transition active:scale-[0.98] disabled:opacity-50"
            >
              ذخیره پیش‌نویس
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setPreview(!preview)}
              className="min-h-[44px] rounded-xl border border-border px-4 font-medium text-text-body transition active:scale-[0.98] disabled:opacity-50"
            >
              {preview ? 'بستن پیش‌نمایش' : 'پیش‌نمایش'}
            </button>
            {current && (
              <>
                <button
                  type="button"
                  disabled={pending || sections.length === 0}
                  onClick={handlePublish}
                  className="min-h-[44px] rounded-xl bg-[var(--fz-action)] px-4 font-medium text-white transition active:scale-[0.98] disabled:opacity-50"
                >
                  انتشار
                </button>
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                    aria-label="زمان انتشار"
                    className="min-h-[44px] rounded-xl border border-border bg-surface px-3 text-sm"
                  />
                  <button
                    type="button"
                    disabled={pending || !scheduleAt}
                    onClick={handleSchedule}
                    className="min-h-[44px] rounded-xl border border-border px-4 font-medium text-text-body transition active:scale-[0.98] disabled:opacity-50"
                  >
                    زمان‌بندی انتشار
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Revisions */}
          {current && revisions.length > 0 && (
            <div className="rounded-2xl border border-border/80 bg-surface p-4">
              <h2 className="mb-3 font-bold text-text-title">تاریخچه نسخه‌ها</h2>
              <ul className="space-y-2">
                {revisions.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-text-muted">
                      {new Date(r.createdAt).toLocaleString('fa-IR')} — {r.note || 'ذخیره'}
                    </span>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleRestore(r.id)}
                      className="min-h-[44px] rounded-xl border border-border px-3 text-xs font-medium text-text-body transition active:scale-[0.98] disabled:opacity-50"
                    >
                      بازیابی
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
