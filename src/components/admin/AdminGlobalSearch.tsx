'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { Search, Loader2, X, Briefcase, User } from 'lucide-react';
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

  return (
    <div ref={containerRef} className="relative w-full max-w-xs md:max-w-sm">
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results) setOpen(true); }}
          placeholder={lt(locale, {
            fa: 'جستجوی سریع PNR، پرونده، مشتری…',
            en: 'Search PNR, Travel File, customer…',
            ar: 'بحث سريع عن PNR أو ملف أو عميل…',
            zh: '快速搜索PNR、行程或客户…',
            ru: 'Быстрый поиск PNR, досье, клиента…',
          })}
          className="w-full h-9 ps-9 pe-8 rounded-xl bg-soft/80 border border-line text-xs font-bold text-ink placeholder:text-sub focus:bg-surface focus:border-brand focus:outline-none transition"
        />
        <Search size={14} className="absolute start-3 text-sub pointer-events-none" />
        {loading ? (
          <Loader2 size={13} className="absolute end-3 text-brand animate-spin" />
        ) : query ? (
          <button
            onClick={() => { setQuery(''); setOpen(false); }}
            className="absolute end-2.5 w-4 h-4 rounded-full bg-sub/20 grid place-items-center text-sub hover:text-ink"
          >
            <X size={10} />
          </button>
        ) : null}
      </div>

      {/* Results Dropdown */}
      {open && results && (
        <div className="absolute top-full mt-2 inset-x-0 bg-surface rounded-2xl border border-line shadow-xl z-50 max-h-96 overflow-y-auto p-2 space-y-2 animate-in fade-in zoom-in-95 duration-150">
          {Object.values(results).every((arr) => !arr || arr.length === 0) ? (
            <div className="p-4 text-center text-xs text-sub">
              {lt(locale, { fa: 'موردی یافت نشد', en: 'No results found', ar: 'لم يتم العثور على نتائج', zh: '未找到结果', ru: 'Ничего не найдено' })}
            </div>
          ) : (
            <>
              {results.trips && results.trips.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-sub px-2">
                    {lt(locale, { fa: 'پرونده‌های سفر', en: 'Travel Files', ar: 'ملفات السفر', zh: '行程档案', ru: 'Файлы поездок' })}
                  </span>
                  {results.trips.map((t) => (
                    <Link
                      key={t.id}
                      href={t.url}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-soft transition text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Briefcase size={13} className="text-brand-dark" />
                        <span className="font-black text-ink">{t.reference}</span>
                        <span className="text-sub truncate max-w-[120px]">{t.title}</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface border border-line">{t.status}</span>
                    </Link>
                  ))}
                </div>
              )}

              {results.bookings && results.bookings.length > 0 && (
                <div className="space-y-1 border-t border-line/60 pt-1.5">
                  <span className="text-[10px] font-black uppercase text-sub px-2">
                    {lt(locale, { fa: 'رزروها و PNR', en: 'Bookings & PNR', ar: 'الحجوزات', zh: '预订', ru: 'Бронирования' })}
                  </span>
                  {results.bookings.map((b) => (
                    <Link
                      key={b.id}
                      href={b.url}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-soft transition text-xs"
                    >
                      <div>
                        <span className="font-black text-brand-dark">{b.reference}</span>
                        {b.externalPnr && <span className="ms-1.5 text-sub text-[11px]">PNR: {b.externalPnr}</span>}
                      </div>
                      <span className="text-[10px] font-bold">{Number(b.totalAmount).toLocaleString()} {b.currency}</span>
                    </Link>
                  ))}
                </div>
              )}

              {results.customers && results.customers.length > 0 && (
                <div className="space-y-1 border-t border-line/60 pt-1.5">
                  <span className="text-[10px] font-black uppercase text-sub px-2">
                    {lt(locale, { fa: 'مشتریان', en: 'Customers', ar: 'العملاء', zh: '客户', ru: 'Клиенты' })}
                  </span>
                  {results.customers.map((c) => (
                    <Link
                      key={c.id}
                      href={c.url}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-soft transition text-xs"
                    >
                      <div className="flex items-center gap-1.5">
                        <User size={13} className="text-sub" />
                        <span className="font-black text-ink">{c.name || c.email}</span>
                      </div>
                      <span className="text-sub text-[11px]" dir="ltr">{c.phone || c.email}</span>
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
