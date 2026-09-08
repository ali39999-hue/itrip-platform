'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import {
  Building2, Plus, CheckCircle2,
  AlertCircle, RefreshCw, Phone, Handshake
} from 'lucide-react';
import { lt } from '@/lib/lt';
import { getAdminSuppliers, createAdminSupplier } from '@/actions/admin';
import { ErpAlert, ErpBadge, ErpEmptyState, ErpModal, ErpPageHeader, ErpSectionCard, erpFieldCls, erpLabelCls, erpPrimaryBtnCls, erpGhostBtnCls } from '@/components/admin/erp-ui';

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
      setError(err instanceof Error ? err.message : 'Error creating supplier');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <ErpPageHeader
        eyebrow={lt(locale, { fa: 'کاتالوگ · تامین', en: 'Catalog · Supply', ar: 'الكتالوج · التوريد', zh: '目录 · 供应', ru: 'Каталог · Поставки' })}
        title={lt(locale, { fa: 'تامین‌کنندگان و شرکای تجاری', en: 'Suppliers & Partners', ar: 'الموردون والشركاء', zh: '供应商与合作伙伴', ru: 'Поставщики и партнёры' })}
        description={lt(locale, { fa: 'تعریف هتل‌ها، ایرلاین‌ها و کارگزاران به همراه قرارداد و کمیسیون', en: 'Define hotels, airlines and brokers with contracts and commissions', ar: 'تحديد الفنادق وشركات الطيران والوسطاء مع العقود والعمولات', zh: '定义酒店、航空公司及代理商合同与佣金', ru: 'Контракты и комиссии поставщиков' })}
        icon={<Handshake size={20} aria-hidden="true" />}
        meta={<ErpBadge tone="brand">{suppliers.length} {lt(locale, { fa: 'تامین‌کننده', en: 'suppliers', ar: 'مورد', zh: '个供应商', ru: 'поставщиков' })}</ErpBadge>}
        actions={
          <>
            <button type="button" onClick={loadSuppliers} className={erpGhostBtnCls}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
              {lt(locale, { fa: 'بروزرسانی', en: 'Refresh', ar: 'تحديث', zh: '刷新', ru: 'Обновить' })}
            </button>
            <button type="button" onClick={() => setShowModal(true)} className={erpPrimaryBtnCls}>
              <Plus size={15} aria-hidden="true" />
              {lt(locale, { fa: 'افزودن تامین‌کننده', en: 'Add Supplier', ar: 'إضافة مورد', zh: '添加供应商', ru: 'Добавить' })}
            </button>
          </>
        }
      />

      {error && (
        <ErpAlert tone="error" onDismiss={() => setError(null)}>{error}</ErpAlert>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl border border-line bg-surface" />
          ))}
        </div>
      ) : suppliers.length === 0 ? (
        <ErpSectionCard>
          <ErpEmptyState
            icon={<Building2 size={26} aria-hidden="true" />}
            title={lt(locale, { fa: 'هیچ تامین‌کننده‌ای ثبت نشده است', en: 'No suppliers yet', ar: 'لم يتم تسجيل موردين', zh: '尚未注册供应商', ru: 'Поставщиков пока нет' })}
            description={lt(locale, { fa: 'برای مدیریت سهمیه‌ها و انبار، ابتدا یک تامین‌کننده اضافه کنید.', en: 'Add a supplier first to manage allotments and inventory.', ar: 'لإدارة الحصص والمخزون، أضف موردًا أولاً.', zh: '要管理配额和库存，请先添加供应商。', ru: 'Сначала добавьте поставщика.' })}
            action={
              <button type="button" onClick={() => setShowModal(true)} className={erpPrimaryBtnCls}>
                <Plus size={15} aria-hidden="true" />
                {lt(locale, { fa: 'افزودن تامین‌کننده', en: 'Add Supplier', ar: 'إضافة مورد', zh: '添加供应商', ru: 'Добавить' })}
              </button>
            }
          />
        </ErpSectionCard>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {suppliers.map((sup) => (
            <article key={sup.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-line bg-surface p-5 shadow-elev-1 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-elev-2">
              <div className="flex items-start justify-between gap-2">
                <ErpBadge tone="brand">{sup.type}</ErpBadge>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${sup.isActive ? 'bg-success/10 text-success' : 'bg-soft text-sub'}`}>
                  <CheckCircle2 size={12} aria-hidden="true" />
                  {sup.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <h2 className="truncate text-[15px] font-black text-ink">{sup.name}</h2>
                <p className="mt-1 text-xs font-bold text-sub">
                  <span dir="ltr">{sup.mode}</span>
                  <span className="mx-1.5" aria-hidden="true">•</span>
                  <span>{sup.itemsCount} {lt(locale, { fa: 'آیتم انبار', en: 'inventory items', ar: 'عناصر المخزون', zh: '个库存项', ru: 'позиций' })}</span>
                </p>
                {sup.contact && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-sub">
                    <Phone size={13} aria-hidden="true" /> <span dir="ltr">{sup.contact}</span>
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-line/60 pt-3 text-xs">
                <span className="font-bold text-sub">{lt(locale, { fa: 'کمیسیون پیش‌فرض', en: 'Default commission', ar: 'العمولة الافتراضية', zh: '默认佣金', ru: 'Комиссия' })}</span>
                <span className="num rounded-lg bg-mint px-2 py-1 font-black text-brand-dark tabular-nums" dir="ltr">
                  {sup.contracts[0]?.commission ?? 0}%
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {showModal && (
        <ErpModal
          title={lt(locale, { fa: 'افزودن تامین‌کننده جدید', en: 'Add New Supplier', ar: 'إضافة مورد جديد', zh: '添加新供应商', ru: 'Новый поставщик' })}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button type="button" onClick={() => setShowModal(false)} className={erpGhostBtnCls}>
                {lt(locale, { fa: 'انصراف', en: 'Cancel', ar: 'إلغاء', zh: '取消', ru: 'Отмена' })}
              </button>
              <button type="submit" form="erp-supplier-form" disabled={creating} className={erpPrimaryBtnCls}>
                {creating ? '…' : lt(locale, { fa: 'ثبت تامین‌کننده', en: 'Save Supplier', ar: 'حفظ المورد', zh: '保存供应商', ru: 'Сохранить' })}
              </button>
            </>
          }
        >
          <form id="erp-supplier-form" onSubmit={handleCreate} className="space-y-3.5">
            <div>
              <label className={erpLabelCls} htmlFor="sup-name">
                {lt(locale, { fa: 'نام تامین‌کننده', en: 'Supplier Name', ar: 'اسم المورد', zh: '供应商名称', ru: 'Название' })}
              </label>
              <input id="sup-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. هتل اسپیناس پالاس" className={erpFieldCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={erpLabelCls} htmlFor="sup-type">{lt(locale, { fa: 'نوع خدمت', en: 'Service Type', ar: 'نوع الخدمة', zh: '服务类型', ru: 'Тип услуги' })}</label>
                <select id="sup-type" value={type} onChange={(e) => setType(e.target.value)} className={erpFieldCls} dir="ltr">
                  <option value="HOTEL">HOTEL</option>
                  <option value="AIRLINE">AIRLINE</option>
                  <option value="TOUR_OPERATOR">TOUR_OPERATOR</option>
                  <option value="INSURANCE">INSURANCE</option>
                </select>
              </div>
              <div>
                <label className={erpLabelCls} htmlFor="sup-mode">{lt(locale, { fa: 'نحوه اتصال', en: 'Mode', ar: 'طريقة الاتصال', zh: '模式', ru: 'Режим' })}</label>
                <select id="sup-mode" value={mode} onChange={(e) => setMode(e.target.value)} className={erpFieldCls} dir="ltr">
                  <option value="ALLOTMENT">ALLOTMENT</option>
                  <option value="REALTIME_API">REALTIME_API</option>
                  <option value="ON_REQUEST">ON_REQUEST</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={erpLabelCls} htmlFor="sup-contact">{lt(locale, { fa: 'تماس / ایمیل', en: 'Contact', ar: 'الاتصال', zh: '联系方式', ru: 'Контакты' })}</label>
                <input id="sup-contact" type="text" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="+9821…" className={erpFieldCls} dir="ltr" />
              </div>
              <div>
                <label className={erpLabelCls} htmlFor="sup-comm">{lt(locale, { fa: 'کمیسیون (٪)', en: 'Commission (%)', ar: 'العمولة (%)', zh: '佣金 (%)', ru: 'Комиссия (%)' })}</label>
                <input id="sup-comm" type="number" value={commission} onChange={(e) => setCommission(e.target.value)} min="0" max="100" className={erpFieldCls} dir="ltr" />
              </div>
            </div>
            {error ? null : (
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-sub">
                <AlertCircle size={12} aria-hidden="true" />
                {lt(locale, { fa: 'قرارداد پیش‌فرض با همین کمیسیون ساخته می‌شود.', en: 'A default contract is created with this commission.', ar: 'يتم إنشاء عقد افتراضي بهذه العمولة.', zh: '将按此佣金创建默认合同。', ru: 'Контракт по умолчанию создастся с этой комиссией.' })}
              </p>
            )}
          </form>
        </ErpModal>
      )}
    </div>
  );
}
