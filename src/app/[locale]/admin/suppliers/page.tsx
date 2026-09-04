'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import {
  Building2, Plus, CheckCircle2,
  AlertCircle, RefreshCw, Phone
} from 'lucide-react';
import { lt } from '@/lib/lt';
import { getAdminSuppliers, createAdminSupplier } from '@/actions/admin';

interface SupplierData {
  id: string;
  name: string;
  type: string;
  mode: string;
  contact: string | null;
  isActive: boolean;
  itemsCount: number;
  contracts: Array<{
    id: string;
    pricingType: string;
    commission: number;
    creditLimit: number;
    currency: string;
  }>;
}

export default function AdminSuppliersPage() {
  const locale = useLocale();
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState('HOTEL');
  const [mode, setMode] = useState('ALLOTMENT');
  const [contact, setContact] = useState('');
  const [commission, setCommission] = useState('5');

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminSuppliers();
      setSuppliers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setCreating(true);
      await createAdminSupplier({
        name,
        type,
        mode,
        contact: contact || undefined,
        commission: Number(commission) || 0,
      });
      setShowModal(false);
      setName('');
      setContact('');
      await loadSuppliers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error creating supplier');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <Building2 className="text-brand" size={24} />
            {lt(locale, { fa: 'مدیریت تامین‌کنندگان و همکاران تجاری', en: 'Suppliers & Partner Management', ar: 'إدارة الموردين والشركاء', zh: '供应商与合作伙伴管理', ru: 'Управление поставщиками' })}
          </h1>
          <p className="text-sm text-sub mt-1">
            {lt(locale, { fa: 'تعریف هتل‌ها، ایرلاین‌ها و کارگزاران به همراه قرارداد و کمیسیون', en: 'Define hotels, airlines, and brokers with contracts and commissions', ar: 'تحديد الفنادق وشركات الطيران والوسطاء مع العقود والعمولات', zh: '定义酒店、航空公司及代理商合同与佣金', ru: 'Определение контрактов и комиссий поставщиков' })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadSuppliers}
            className="h-10 px-3 bg-surface border border-line text-sub rounded-xl hover:text-ink transition flex items-center gap-1.5 text-xs font-bold"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {lt(locale, { fa: 'بروزرسانی', en: 'Refresh', ar: 'تحديث', zh: '刷新', ru: 'Обновить' })}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="h-10 px-4 bg-brand text-surface rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 hover:bg-brand-dark transition shadow-sm"
          >
            <Plus size={16} />
            {lt(locale, { fa: 'افزودن تامین‌کننده جدید', en: 'Add Supplier', ar: 'إضافة مورد جديد', zh: '添加新供应商', ru: 'Добавить поставщика' })}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-bold flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-surface rounded-2xl border border-line animate-pulse" />
          ))}
        </div>
      ) : suppliers.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-line p-12 text-center space-y-3">
          <Building2 size={40} className="mx-auto text-sub/40" />
          <h3 className="font-bold text-ink">
            {lt(locale, { fa: 'هیچ تامین‌کننده‌ای ثبت نشده است', en: 'No suppliers registered yet', ar: 'لم يتم تسجيل موردين بعد', zh: '尚未注册供应商', ru: 'Поставщики еще не зарегистрированы' })}
          </h3>
          <p className="text-xs text-sub max-w-sm mx-auto">
            {lt(locale, { fa: 'برای مدیریت سهمیه‌ها و انبار، ابتدا یک تامین‌کننده اضافه کنید.', en: 'To manage allotments and inventory, please add a supplier first.', ar: 'لإدارة الحصص والمخزون، يرجى إضافة مورد أولاً.', zh: '要管理配额和库存，请先添加供应商。', ru: 'Для управления квотами сначала добавьте поставщика.' })}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {suppliers.map((sup) => (
            <div key={sup.id} className="bg-surface rounded-2xl border border-line p-5 shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-mint text-brand-dark rounded-xl font-black text-xs">
                  {sup.type}
                </div>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                  sup.isActive ? 'bg-success/10 text-success' : 'bg-sub/10 text-sub'
                }`}>
                  <CheckCircle2 size={12} />
                  {sup.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <h2 className="font-bold text-ink text-base">{sup.name}</h2>
                <div className="flex items-center gap-2 mt-1 text-xs text-sub">
                  <span>{sup.mode}</span>
                  <span>•</span>
                  <span>{sup.itemsCount} {lt(locale, { fa: 'آیتم انبار', en: 'Inventory items', ar: 'عناصر المخزون', zh: '库存项', ru: 'Элементов инвентаря' })}</span>
                </div>
              </div>

              {sup.contact && (
                <div className="text-xs text-sub flex items-center gap-1.5 pt-1">
                  <Phone size={13} /> {sup.contact}
                </div>
              )}

              <div className="pt-3 border-t border-line flex justify-between items-center text-xs">
                <span className="text-sub">{lt(locale, { fa: 'کمیسیون پیش‌فرض:', en: 'Default Commission:', ar: 'العمولة الافتراضية:', zh: '默认佣金：', ru: 'Комиссия:' })}</span>
                <span className="font-black text-brand-dark">
                  {sup.contracts[0]?.commission ?? 0}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-xs grid place-items-center p-4">
          <div className="bg-surface w-full max-w-md rounded-2xl border border-line p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-ink">
              {lt(locale, { fa: 'افزودن تامین‌کننده جدید', en: 'Add New Supplier', ar: 'إضافة مورد جديد', zh: '添加新供应商', ru: 'Добавить поставщика' })}
            </h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-sub mb-1">
                  {lt(locale, { fa: 'نام تامین‌کننده', en: 'Supplier Name', ar: 'اسم المورد', zh: '供应商名称', ru: 'Название поставщика' })}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. هتل اسپیناس پالاس یا ماهان ایر"
                  className="w-full h-10 px-3 rounded-xl border border-line text-sm focus:border-brand outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">
                    {lt(locale, { fa: 'نوع خدمت', en: 'Service Type', ar: 'نوع الخدمة', zh: '服务类型', ru: 'Тип услуги' })}
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-line text-sm focus:border-brand outline-hidden bg-surface"
                  >
                    <option value="HOTEL">HOTEL</option>
                    <option value="AIRLINE">AIRLINE</option>
                    <option value="TOUR_OPERATOR">TOUR_OPERATOR</option>
                    <option value="INSURANCE">INSURANCE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">
                    {lt(locale, { fa: 'نحوه اتصال', en: 'Mode', ar: 'طريقة الاتصال', zh: '模式', ru: 'Режим' })}
                  </label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-line text-sm focus:border-brand outline-hidden bg-surface"
                  >
                    <option value="ALLOTMENT">ALLOTMENT (سهمیه‌ای)</option>
                    <option value="REALTIME_API">REALTIME_API (وب‌سرویس)</option>
                    <option value="ON_REQUEST">ON_REQUEST (درخواست دستی)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">
                    {lt(locale, { fa: 'شماره تماس / ایمیل', en: 'Contact', ar: 'معلومات الاتصال', zh: '联系方式', ru: 'Контакты' })}
                  </label>
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="+9821..."
                    className="w-full h-10 px-3 rounded-xl border border-line text-sm focus:border-brand outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">
                    {lt(locale, { fa: 'نرخ کمیسیون (%)', en: 'Commission (%)', ar: 'نسبة العمولة (%)', zh: '佣金率 (%)', ru: 'Комиссия (%)' })}
                  </label>
                  <input
                    type="number"
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    min="0"
                    max="100"
                    className="w-full h-10 px-3 rounded-xl border border-line text-sm focus:border-brand outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-10 px-4 rounded-xl border border-line text-sub font-bold text-sm hover:bg-soft"
                >
                  {lt(locale, { fa: 'انصراف', en: 'Cancel', ar: 'إلغاء', zh: '取消', ru: 'Отмена' })}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="h-10 px-5 rounded-xl bg-brand text-surface font-bold text-sm hover:bg-brand-dark disabled:opacity-50"
                >
                  {creating ? '...' : lt(locale, { fa: 'ثبت تامین‌کننده', en: 'Save Supplier', ar: 'حفظ المورد', zh: '保存供应商', ru: 'Сохранить' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
