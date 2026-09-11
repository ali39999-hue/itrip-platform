'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Users,
  Printer,
  Calendar,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { getPassengerManifestAction } from '@/actions/admin';
import type { ManifestPassenger } from '@/domains/booking/PassengerManifestService';

export default function AdminManifestsPage() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedType, setSelectedType] = useState('ALL');
  const [manifest, setManifest] = useState<ManifestPassenger[]>([]);
  const [csvContent, setCsvContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchManifest = (date: string, type: string) => {
    startTransition(async () => {
      setError(null);
      const res = await getPassengerManifestAction(date, type);
      if (res.success) {
        setManifest(res.manifest);
        setCsvContent(res.csv);
      } else {
        setError(res.error || 'خطا در بارگذاری مانیفست');
        setManifest([]);
        setCsvContent('');
      }
    });
  };

  useEffect(() => {
    fetchManifest(selectedDate, selectedType);
  }, [selectedDate, selectedType]);

  const handleDownloadCsv = () => {
    if (!csvContent) return;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `manifest_${selectedType.toLowerCase()}_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = manifest.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.nationalId.includes(q) ||
      p.passportNo.toLowerCase().includes(q) ||
      p.bookingRef.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-dark dark:text-brand text-xs font-black mb-1">
            <Users size={16} />
            <span>مدیریت عملیات و اعزام مسافران</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-ink">
            مانیفست رسمی مسافران و لیست پرواز/تور
          </h1>
          <p className="text-xs text-sub font-bold mt-0.5">
            خروجی استاندارد لیست مسافران قطعی برای تحویل به ایرلاین‌ها، راهنمایان تور و کانترهای پرواز
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={!csvContent || isPending}
            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <FileSpreadsheet size={15} />
            <span>خروجی اکسل / CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            disabled={manifest.length === 0}
            className="h-10 px-4 rounded-xl bg-surface border border-line text-ink hover:bg-soft font-black text-xs transition flex items-center gap-1.5 shadow-2xs"
          >
            <Printer size={15} />
            <span>چاپ مانیفست رسمی</span>
          </button>
        </div>
      </div>

      {/* Filter & Date Controls */}
      <div className="bg-surface rounded-2xl p-4 border border-line shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-soft px-3 py-1.5 rounded-xl border border-line">
            <Calendar size={15} className="text-sub shrink-0" />
            <span className="text-xs font-bold text-sub">تاریخ سفر:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-mono font-black text-ink border-0 focus:ring-0 p-0"
            />
          </div>

          {/* Service Vertical Filter */}
          <div className="flex items-center gap-1 bg-soft p-1 rounded-xl border border-line text-xs font-bold">
            {['ALL', 'FLIGHT', 'TOUR', 'HOTEL'].map((vt) => (
              <button
                key={vt}
                type="button"
                onClick={() => setSelectedType(vt)}
                className={`px-3 py-1 rounded-lg transition ${
                  selectedType === vt
                    ? 'bg-brand text-surface font-black shadow-xs'
                    : 'text-sub hover:text-ink'
                }`}
              >
                {vt === 'ALL' ? 'همه' : vt === 'FLIGHT' ? 'پروازها' : vt === 'TOUR' ? 'تورها' : 'هتل‌ها'}
              </button>
            ))}
          </div>
        </div>

        {/* Search in Manifest */}
        <div className="relative min-w-[240px]">
          <Search size={14} className="absolute top-1/2 -translate-y-1/2 start-3 text-sub" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی نام، کدملی، شماره بلیت..."
            className="w-full h-9 ps-8 pe-3 rounded-xl bg-soft border border-line text-xs font-bold text-ink placeholder:text-sub focus:outline-none focus:border-brand"
          />
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Manifest Table */}
      <div className="bg-surface rounded-2xl border border-line overflow-hidden shadow-xs">
        <div className="p-4 border-b border-line flex items-center justify-between text-xs font-black text-sub bg-soft/40">
          <div className="flex items-center gap-2">
            <span>فهرست مسافران تاریخ {selectedDate}</span>
            <span className="bg-mint text-brand-dark px-2 py-0.5 rounded-md font-mono">
              {filtered.length} مسافر
            </span>
          </div>
          {isPending && <Loader2 size={16} className="animate-spin text-brand" />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead>
              <tr className="border-b border-line text-sub font-bold bg-soft/20">
                <th className="py-3 ps-3 text-start">ردیف</th>
                <th className="py-3 px-3 text-start">کد رزرو</th>
                <th className="py-3 px-3 text-start">نام و نام خانوادگی</th>
                <th className="py-3 px-3 text-start">کدملی / گذرنامه</th>
                <th className="py-3 px-3 text-start">تاریخ تولد</th>
                <th className="py-3 px-3 text-start">جنسیت</th>
                <th className="py-3 px-3 text-start">صندلی</th>
                <th className="py-3 px-3 text-start">تلفن تماس</th>
                <th className="py-3 px-3 text-start">خدمت</th>
                <th className="py-3 px-3 text-start">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 font-bold text-ink">
              {filtered.length > 0 ? (
                filtered.map((p) => (
                  <tr key={p.index} className="hover:bg-soft/50 transition">
                    <td className="py-3 ps-3 font-mono text-sub">{p.index}</td>
                    <td className="py-3 px-3 font-mono text-brand-dark font-black">
                      {p.bookingRef}
                    </td>
                    <td className="py-3 px-3">{p.fullName}</td>
                    <td className="py-3 px-3 font-mono text-sub">
                      {p.nationalId !== '-' ? p.nationalId : p.passportNo}
                    </td>
                    <td className="py-3 px-3 font-mono text-sub">{p.birthDate}</td>
                    <td className="py-3 px-3">{p.gender}</td>
                    <td className="py-3 px-3 font-mono text-ink">{p.seat}</td>
                    <td className="py-3 px-3 font-mono text-sub">{p.contactPhone}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-soft border border-line text-[10px] uppercase">
                        {p.serviceType}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-emerald-700 dark:text-emerald-400">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 size={13} />
                        <span>تایید قطعی</span>
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-sub">
                    {isPending
                      ? 'در حال بارگذاری اطلاعات مانیفست...'
                      : 'هیچ مسافر تاییدشده‌ای در این تاریخ یافت نشد.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
