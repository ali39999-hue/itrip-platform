'use client';

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">{lt(locale, { fa: 'مدیریت تامین‌کنندگان و انبار', en: 'Suppliers & Inventory', ar: 'الموردون والمخزون', zh: '供应商与库存', ru: 'Поставщики и инвентарь' })}</h1>
          <p className="text-sm text-sub mt-1">{lt(locale, { fa: 'مدیریت APIهای خارجی و سهمیه‌های قراردادی (آلوتمنت)', en: 'Supplier APIs and Contract Allotments', ar: 'واجهات الموردين وحصص العقود', zh: '供应商 API 与合同配额', ru: 'API поставщиков и квоты контрактов' })}</p>
        </div>
        <button className="h-10 px-4 bg-brand text-surface rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-brand-2 transition shrink-0">
          <Plus size={16} aria-hidden="true" /> {lt(locale, { fa: 'افزودن تامین‌کننده', en: 'Add Supplier', ar: 'إضافة مورد', zh: '添加供应商', ru: 'Добавить поставщика' })}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {MOCK_SUPPLIERS.map((sup) => (
          <div key={sup.id} className="bg-surface rounded-2xl border border-line p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-start">
              <div className="p-2.5 bg-mint/50 text-brand-dark rounded-xl">
                <DatabaseZap size={20} aria-hidden="true" />
              </div>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                sup.status === 'Active' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
              }`}>
                {sup.status}
              </span>
            </div>
            <div>
              <h2 className="font-bold text-ink text-base">{sup.name}</h2>
              <p className="text-xs text-sub mt-0.5">{sup.type}</p>
            </div>
            <div className="pt-2 border-t border-line flex justify-between text-xs text-sub">
              <span className="flex items-center gap-1"><Wifi size={13} aria-hidden="true" /> {sup.latency}</span>
              <span className="flex items-center gap-1"><HardDrive size={13} aria-hidden="true" /> {sup.id}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
