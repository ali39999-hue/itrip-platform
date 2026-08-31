'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { HOTELS, TOURS, CITIES } from '@/lib/data';
import { DatabaseZap, Eye, EyeOff, Plus } from 'lucide-react';
import { lt } from '@/lib/lt';

export default function AdminContentPage() {
  const locale = useLocale();
  const numFmt = locale === 'fa' ? 'fa-IR' : 'en-US';
  const [disabled, setDisabled] = useState<Record<string, boolean>>({});

  function toggle(key: string) {
    setDisabled((d) => ({ ...d, [key]: !d[key] }));
  }

  const rows = [
    ...HOTELS.map((h) => ({ key: `hotel-${h.id}`, type: lt(locale, { fa: 'هتل', en: 'Hotel', ar: 'فندق', zh: '酒店', ru: 'Отель' }), name: h.name, city: h.city })),
    ...TOURS.map((t) => ({ key: `tour-${t.id}`, type: lt(locale, { fa: 'تور', en: 'Tour', ar: 'جولة', zh: '旅游', ru: 'Тур' }), name: t.title, city: t.city })),
    ...CITIES.map((c) => ({ key: `city-${c.id}`, type: lt(locale, { fa: 'مقصد', en: 'Destination', ar: 'وجهة', zh: '目的地', ru: 'Направление' }), name: c.fa, city: c.en })),
  ];

  const activeCount = rows.length - Object.values(disabled).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">{lt(locale, { fa: 'محتوا و موجودی', en: 'Content & Inventory', ar: 'المحتوى والمخزون', zh: '内容与库存', ru: 'Контент и инвентарь' })}</h1>
          <p className="text-sm text-sub mt-1">{lt(locale, { fa: 'فعال/غیرفعال کردن محصولات در ویترین', en: 'Enable/disable products in the storefront', ar: 'تنشيط/تعطيل المنتجات في الواجهة', zh: '在橱窗中启用/停用产品', ru: 'Включение/отключение товаров в витрине' })}</p>
        </div>
        <button className="hidden md:flex items-center gap-2 bg-brand hover:bg-brand-2 text-surface h-10 px-5 rounded-lg text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          <Plus size={16} aria-hidden="true" /> {lt(locale, { fa: 'افزودن محصول', en: 'Add Product', ar: 'إضافة منتج', zh: '添加产品', ru: 'Добавить товар' })}
        </button>
      </div>

      <div className="bg-surface rounded-2xl border border-line overflow-hidden shadow-sm">
        <p className="p-4 font-bold text-ink border-b border-line flex items-center gap-2 text-sm">
          <DatabaseZap size={16} className="text-brand-dark" aria-hidden="true" />
          {lt(locale, { fa: `${rows.length.toLocaleString(numFmt)} آیتم — ${activeCount.toLocaleString(numFmt)} فعال`, en: `${rows.length.toLocaleString(numFmt)} items — ${activeCount.toLocaleString(numFmt)} active`, ar: `${rows.length.toLocaleString(numFmt)} عنصر — ${activeCount.toLocaleString(numFmt)} نشط`, zh: `${rows.length.toLocaleString(numFmt)} 项 — ${activeCount.toLocaleString(numFmt)} 个启用`, ru: `Позиций: ${rows.length.toLocaleString(numFmt)} — активных: ${activeCount.toLocaleString(numFmt)}` })}
        </p>
        <table className="w-full text-sm">
          <thead className="bg-soft text-sub text-xs">
            <tr>
              <th className="p-4 text-start font-medium">{lt(locale, { fa: 'نوع', en: 'Type', ar: 'النوع', zh: '类型', ru: 'Тип' })}</th>
              <th className="p-4 text-start font-medium">{lt(locale, { fa: 'نام', en: 'Name', ar: 'الاسم', zh: '名称', ru: 'Название' })}</th>
              <th className="p-4 text-start font-medium">{lt(locale, { fa: 'شهر / کشور', en: 'City / Country', ar: 'المدينة / الدولة', zh: '城市 / 国家', ru: 'Город / страна' })}</th>
              <th className="p-4 text-center font-medium">{lt(locale, { fa: 'نمایش', en: 'Visibility', ar: 'العرض', zh: '显示', ru: 'Показ' })}</th>
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
                    aria-label={disabled[r.key] ? `${lt(locale, { fa: 'نمایش', en: 'Show', ar: 'إظهار', zh: '显示', ru: 'Показать' })} ${r.name}` : `${lt(locale, { fa: 'مخفی کردن', en: 'Hide', ar: 'إخفاء', zh: '隐藏', ru: 'Скрыть' })} ${r.name}`}
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      disabled[r.key]
                        ? 'bg-rose-warm/10 text-rose-warm'
                        : 'bg-success/10 text-success'
                    }`}
                  >
                    {disabled[r.key] ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}
                    {disabled[r.key] ? lt(locale, { fa: 'مخفی', en: 'Hidden', ar: 'مخفي', zh: '已隐藏', ru: 'Скрыт' }) : lt(locale, { fa: 'فعال', en: 'Active', ar: 'نشط', zh: '启用', ru: 'Активен' })}
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
