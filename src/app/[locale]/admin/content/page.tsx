'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { DatabaseZap, Plus, HardDrive, Wifi } from 'lucide-react';
import { lt } from '@/lib/lt';

// Hardcoded for now. In a real system, these would be fetched via Server Component / API
const MOCK_SUPPLIERS = [
  { id: 'sup-1', name: 'Amadeus (Mock)', type: 'GDS', status: 'Active', latency: '340ms' },
  { id: 'sup-2', name: 'Iran Air Direct', type: 'AIRLINE', status: 'Active', latency: '120ms' },
  { id: 'sup-3', name: 'SnappTrip (Hotels)', type: 'HOTEL', status: 'Degraded', latency: '850ms' },
];

export default function AdminContentPage() {
  const locale = useLocale();
  const numFmt = locale === 'fa' ? 'fa-IR' : 'en-US';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">{lt(locale, { fa: 'مدیریت تامین‌کنندگان و انبار', en: 'Suppliers & Inventory', ar: 'الموردون والمخزون', zh: '供应商与库存', ru: 'Поставщики и инвентарь' })}</h1>
          <p className="text-sm text-sub mt-1">{lt(locale, { fa: 'مدیریت APIهای خارجی و سهمیه‌های اختصاصی (آلوتمنت)', en: 'Supplier APIs and Contract Allotments', ar: 'واجهات الموردين وحصص العقود', zh: '供应商 API 和合同配额', ru: 'API поставщиков и квоты контрактов' })}</p>
        </div>
        <button className="h-10 px-4 bg-brand text-surface rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-brand-2 transition shrink-0">
          <Plus size={16} aria-hidden="true" /> {lt(locale, { fa: 'افزودن تامین‌کننده', en: 'Add Supplier', ar: 'إضافة مورد', zh: '添加供应商', ru: 'Добавить поставщика' })}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div className="bg-surface rounded-2xl border border-line p-5">
           <h3 className="font-bold flex items-center gap-2 mb-2 text-ink"><Wifi size={16} className="text-brand"/> Live APIs (Supplier Hub)</h3>
           <p className="text-sm text-sub">Connections to external GDS, NDCs, and Hotel Aggregators.</p>
           
           <div className="mt-4 space-y-3">
             {MOCK_SUPPLIERS.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 border border-line rounded-lg bg-soft/30 hover:bg-soft transition">
                   <div>
                     <p className="font-bold text-sm text-ink">{s.name}</p>
                     <p className="text-xs text-sub">{s.type} • Latency: {s.latency}</p>
                   </div>
                   <span className={`text-xs px-2 py-1 rounded-full font-bold ${s.status === 'Active' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                     {s.status}
                   </span>
                </div>
             ))}
           </div>
        </div>

        <div className="bg-surface rounded-2xl border border-line p-5 flex flex-col">
           <h3 className="font-bold flex items-center gap-2 mb-2 text-ink"><HardDrive size={16} className="text-cyan-500"/> Contracted Inventory (Allotments)</h3>
           <p className="text-sm text-sub">Locally managed inventory (Charters, Pre-purchased hotel rooms, etc).</p>
           
           <div className="mt-4 flex-1 flex flex-col items-center justify-center border-2 border-dashed border-line rounded-lg bg-soft/30 p-8 text-center min-h-[200px]">
              <DatabaseZap size={32} className="text-sub mb-3 opacity-50" />
              <p className="text-sm font-medium text-ink">No active allotments found for this branch.</p>
              <p className="text-xs text-sub mt-1">Add local inventory to bypass external APIs.</p>
           </div>
        </div>
      </div>
    </div>
  );
}
