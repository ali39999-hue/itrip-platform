'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { Search, Loader2, X, Briefcase, User, TicketCheck, CornerDownLeft } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { lt } from '@/lib/lt';

export function AdminGlobalSearch() {
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<{
    bookings?: Array<{ id: string; reference: string; externalPnr?: string | null; status: string; totalAmount: number; currency: string; url: string }>;
    trips?: Array<{ id: string; reference: string; title: string; status: string; url: string }>;
    customers?: Array<{ id: string; name: string; email: string; phone: string; url: string }>;
    refunds?: Array<{ id: string; refundNumber: string; status: string; netRefundAmount: number; currency: string; url: string }>;
    invoices?: Array<{ id: string; invoiceNumber: string; status: string; totalAmount: number; currency: string; url: string }>;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onDocClick);
    return () => document.removeEventListener('pointerdown', onDocClick);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || {});
          setOpen(true);
        }
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const searchLabel = lt(locale, {
    fa: 'جستجوی PNR، پرونده، مشتری…',
    en: 'Search PNR, travel file, customer…',
    ar: 'بحث سريع عن PNR أو ملف أو عميل…',
    zh: '搜索PNR、行程或客户…',
    ru: 'Поиск PNR, досье, клиента…',
  });

  const totalCount =
    (results?.trips?.length || 0) +
    (results?.bookings?.length || 0) +
    (results?.customers?.length || 0);

  return (
    <div ref={containerRef} role="search" className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open && !!results}
          aria-controls="admin-global-search-results"
          aria-label={searchLabel}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { setFocused(true); if (results) setOpen(true); }}
          onBlur={() => setFocused(false)}
          placeholder={searchLabel}
          className="min-h-10 w-full rounded-xl border border-line bg-soft/60 py-2 pe-16 ps-9 text-[13px] font-medium text-ink transition placeholder:text-sub/70 focus:border-brand focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand/25"
        />
        <Search size={15} className="absolute start-3 text-sub/70 pointer-events-none" aria-hidden="true" />
        {loading ? (
          <Loader2 size={14} className="absolute end-3 text-brand-dark animate-spin" aria-hidden="true" />
        ) : query ? (
          <button
            type="button"
            onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus(); }}
            aria-label={lt(locale, { fa: 'پاک کردن جستجو', en: 'Clear search', ar: 'مسح البحث', zh: '清除搜索', ru: 'Очистить поиск' })}
            className="min-h-[44px] min-w-[44px] absolute end-2 grid h-7 w-7 place-items-center rounded-lg bg-line/40 text-sub transition hover:bg-line/70 hover:text-ink"
          >
            <X size={13} aria-hidden="true" />
          </button>
        ) : (
          <kbd className="absolute end-2 hidden items-center gap-0.5 rounded-lg border border-line bg-surface px-1.5 py-1 font-mono text-[10px] font-black text-sub shadow-xs sm:inline-flex" aria-hidden="true">
            ⌘K
          </kbd>
        )}
      </div>

      {/* Friendly nudge: tell the operator why nothing shows yet */}
      {focused && !open && query.trim().length > 0 && query.trim().length < 2 && (
        <div className="fade-soft absolute inset-x-0 top-full z-50 mt-2 rounded-2xl border border-dashed border-line bg-surface p-3.5 text-center shadow-elev-2">
          <p className="text-[11px] font-bold text-sub">
            {lt(locale, { fa: 'یک حرف دیگر هم تایپ کنید تا جستجو شروع شود…', en: 'Type one more character to start searching…', ar: 'اكتب حرفًا آخر لبدء البحث…', zh: '再输入一个字符开始搜索…', ru: 'Введите ещё символ для поиска…' })}
          </p>
        </div>
      )}

      {open && results && (        <div id="admin-global-search-results" role="listbox" aria-label={searchLabel} className="absolute inset-x-0 top-full z-50 mt-2 max-h-[420px] overflow-y-auto rounded-2xl border border-line bg-surface p-2 shadow-elev-3 animate-in fade-in zoom-in-95 duration-150">
          {totalCount === 0 ? (
            <div className="p-6 text-center">
              <Search size={20} className="mx-auto text-sub/40" aria-hidden="true" />
              <p className="mt-2 text-xs font-black text-ink">
                {lt(locale, { fa: 'موردی یافت نشد', en: 'No results found', ar: 'لم يتم العثور على نتائج', zh: '未找到结果', ru: 'Ничего не найдено' })}
              </p>
              <p className="mt-1 font-mono text-[11px] text-sub" dir="ltr">“{query}”</p>
            </div>
          ) : (
            <>
              <p className="flex items-center justify-between px-2 pt-1 pb-2 text-[10px] font-black tracking-wide text-sub uppercase">
                <span>{totalCount} {lt(locale, { fa: 'نتیجه', en: 'results', ar: 'نتائج', zh: '个结果', ru: 'результатов' })}</span>
                <span className="inline-flex items-center gap-1 normal-case"><CornerDownLeft size={10} aria-hidden="true" /> open</span>
              </p>
              {results.trips && results.trips.length > 0 && (
                <div className="space-y-0.5">
                  <span className="px-2 text-[10px] font-black uppercase tracking-wide text-brand-dark">
                    {lt(locale, { fa: 'پرونده‌های سفر', en: 'Travel Files', ar: 'ملفات السفر', zh: '行程档案', ru: 'Файлы поездок' })}
                  </span>
                  {results.trips.map((t) => (
                    <Link
                      key={t.id}
                      href={t.url}
                      role="option"
                      aria-selected="false"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between gap-2 rounded-xl p-2.5 transition hover:bg-mint/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-deep text-mint-bright">
                          <Briefcase size={13} aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-mono text-xs font-black text-ink" dir="ltr">{t.reference}</span>
                          <span className="block max-w-44 truncate text-[11px] font-medium text-sub">{t.title}</span>
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full border border-line bg-soft px-2 py-0.5 text-[10px] font-black text-sub">{t.status}</span>
                    </Link>
                  ))}
                </div>
              )}

              {results.bookings && results.bookings.length > 0 && (
                <div className="mt-2 space-y-0.5 border-t border-line/60 pt-2">
                  <span className="px-2 text-[10px] font-black uppercase tracking-wide text-brand-dark">
                    {lt(locale, { fa: 'رزروها و PNR', en: 'Bookings & PNR', ar: 'الحجوزات', zh: '预订', ru: 'Бронирования' })}
                  </span>
                  {results.bookings.map((b) => (
                    <Link
                      key={b.id}
                      href={b.url}
                      role="option"
                      aria-selected="false"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between gap-2 rounded-xl p-2.5 transition hover:bg-mint/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gold-soft text-price">
                          <TicketCheck size={13} aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-mono text-xs font-black text-brand-dark" dir="ltr">{b.reference}</span>
                          {b.externalPnr && <span className="block text-[11px] text-sub" dir="ltr">PNR: {b.externalPnr}</span>}
                        </span>
                      </span>
                      <span className="num shrink-0 text-[11px] font-black text-ink tabular-nums" dir="ltr">{Number(b.totalAmount).toLocaleString()} {b.currency}</span>
                    </Link>
                  ))}
                </div>
              )}

              {results.customers && results.customers.length > 0 && (
                <div className="mt-2 space-y-0.5 border-t border-line/60 pt-2">
                  <span className="px-2 text-[10px] font-black uppercase tracking-wide text-brand-dark">
                    {lt(locale, { fa: 'مشتریان', en: 'Customers', ar: 'العملاء', zh: '客户', ru: 'Клиенты' })}
                  </span>
                  {results.customers.map((c) => (
                    <Link
                      key={c.id}
                      href={c.url}
                      role="option"
                      aria-selected="false"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between gap-2 rounded-xl p-2.5 transition hover:bg-mint/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-soft text-sub">
                          <User size={13} aria-hidden="true" />
                        </span>
                        <span className="truncate text-xs font-black text-ink">{c.name || c.email}</span>
                      </span>
                      <span className="shrink-0 truncate text-[11px] text-sub" dir="ltr">{c.phone || c.email}</span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
