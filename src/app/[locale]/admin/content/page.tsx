'use client';

import { useState } from 'react';
import { HOTELS, TOURS, CITIES } from '@/lib/data';
import { DatabaseZap, Eye, EyeOff, Plus } from 'lucide-react';

export default function AdminContentPage() {
  const [disabled, setDisabled] = useState<Record<string, boolean>>({});

  function toggle(key: string) {
    setDisabled((d) => ({ ...d, [key]: !d[key] }));
  }

  const rows = [
    ...HOTELS.map((h) => ({ key: `hotel-${h.id}`, type: 'هتل', name: h.name, city: h.city })),
    ...TOURS.map((t) => ({ key: `tour-${t.id}`, type: 'تور', name: t.title, city: t.city })),
    ...CITIES.map((c) => ({ key: `city-${c.id}`, type: 'مقصد', name: c.fa, city: c.en })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">محتوا و موجودی</h1>
          <p className="text-sm text-sub mt-1">فعال/غیرفعال کردن محصولات در ویترین</p>
        </div>
        <button className="hidden md:flex items-center gap-2 bg-brand hover:bg-brand-2 text-surface h-10 px-5 rounded-lg text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          <Plus size={16} aria-hidden="true" /> افزودن محصول
        </button>
      </div>

      <div className="bg-surface rounded-2xl border border-line overflow-hidden shadow-sm">
        <p className="p-4 font-bold text-ink border-b border-line flex items-center gap-2 text-sm">
          <DatabaseZap size={16} className="text-brand-dark" aria-hidden="true" />
          {rows.length.toLocaleString('fa-IR')} آیتم — {(rows.length - Object.values(disabled).filter(Boolean).length).toLocaleString('fa-IR')} فعال
        </p>
        <table className="w-full text-sm">
          <thead className="bg-soft text-sub text-xs">
            <tr>
              <th className="p-4 text-start font-medium">نوع</th>
              <th className="p-4 text-start font-medium">نام</th>
              <th className="p-4 text-start font-medium">شهر / کشور</th>
              <th className="p-4 text-center font-medium">نمایش</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={`border-t border-line ${disabled[r.key] ? 'opacity-40' : ''}`}>
                <td className="p-4">
                  <span className="bg-soft text-sub text-xs px-2 py-1 rounded-full">{r.type}</span>
                </td>
                <td className="p-4 font-medium text-ink">{r.name}</td>
                <td className="p-4 text-sub">{r.city}</td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => toggle(r.key)}
                    aria-label={disabled[r.key] ? `نمایش ${r.name}` : `مخفی کردن ${r.name}`}
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      disabled[r.key]
                        ? 'bg-rose-warm/10 text-rose-warm'
                        : 'bg-success/10 text-success'
                    }`}
                  >
                    {disabled[r.key] ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}
                    {disabled[r.key] ? 'مخفی' : 'فعال'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
