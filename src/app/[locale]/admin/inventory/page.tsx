'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import {
  Boxes, Plus, RefreshCw, Calendar,
  Lock, Building2, LockOpen
} from 'lucide-react';
import { lt } from '@/lib/lt';
import {
  getAdminInventory,
  createAdminInventoryItem,
  updateAllotment,
  getAdminSuppliers
} from '@/actions/admin';
import { ErpAlert, ErpBadge, ErpEmptyState, ErpHint, ErpModal, ErpPageHeader, ErpSectionCard, erpFieldCls, erpLabelCls, erpPrimaryBtnCls, erpGhostBtnCls } from '@/components/admin/erp-ui';
import { cn } from '@/lib/utils';

interface InventoryItemData {
  id: string;
  supplierId: string;
  supplierName: string;
  type: string;
  code: string | null;
  name: string;
  basePrice: number;
  currency: string;
  activeHoldsCount: number;
  allotments: Array<{
    id: string;
    date: string;
    total: number;
    booked: number;
    available: number;
    stopSell: boolean;
  }>;
}

export default function AdminInventoryPage() {
  const locale = useLocale();
  const [items, setItems] = useState<InventoryItemData[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [supplierId, setSupplierId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('HOTEL_ROOM');
  const [code, setCode] = useState('');
  const [basePrice, setBasePrice] = useState('25000000');
  const [capacity, setCapacity] = useState('5');
  const [days, setDays] = useState('14');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [invData, supData] = await Promise.all([
        getAdminInventory(),
        getAdminSuppliers(),
      ]);
      setItems(invData);
      setSuppliers(supData);
      if (supData.length > 0) {
        setSupplierId((prev) => prev || supData[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !name.trim()) return;
    try {
      setCreating(true);
      await createAdminInventoryItem({
        supplierId,
        type,
        name,
        code: code || undefined,
        basePrice: Number(basePrice) || 0,
        dailyCapacity: Number(capacity) || 5,
        initialAllotmentDays: Number(days) || 7,
      });
      setShowModal(false);
      setName('');
      setCode('');
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating item');
    } finally {
      setCreating(false);
    }
  };

  const toggleStopSell = async (allotmentId: string, currentStatus: boolean) => {
    try {
      await updateAllotment(allotmentId, { stopSell: !currentStatus });
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update allotment');
    }
  };

  const totalCells = items.reduce((s, i) => s + i.allotments.length, 0);
  const blockedCells = items.reduce((s, i) => s + i.allotments.filter((a) => a.stopSell || a.available === 0).length, 0);

  return (
    <div className="space-y-4">
      <ErpPageHeader
        eyebrow={lt(locale, { fa: 'کاتالوگ · ظرفیت', en: 'Catalog · Capacity', ar: 'الكتالوج · السعة', zh: '目录 · 容量', ru: 'Каталог · Ёмкость' })}
        title={lt(locale, { fa: 'انبار و سهمیه‌ها', en: 'Inventory & Allotments', ar: 'المخزون والحصص', zh: '库存与配额', ru: 'Инвентарь и квоты' })}
        description={lt(locale, { fa: 'ظرفیت روزانه، قفل‌های موقت و جلوگیری از فروش بیش از ظرفیت', en: 'Daily capacity, active holds and oversell protection', ar: 'السعة اليومية والحجز المؤقت ومنع التجاوز', zh: '每日容量、临时锁定与防超卖', ru: 'Суточные квоты и защита от овербукинга' })}
        icon={<Boxes size={20} aria-hidden="true" />}
        meta={
          <>
            <ErpBadge tone="brand">{items.length} {lt(locale, { fa: 'آیتم', en: 'items', ar: 'عناصر', zh: '个项目', ru: 'позиций' })}</ErpBadge>
            <ErpBadge tone={blockedCells > 0 ? 'gold' : 'green'}>{blockedCells}/{totalCells} {lt(locale, { fa: 'روز مسدود', en: 'blocked days', ar: 'أيام محظورة', zh: '天受限', ru: 'дней закрыто' })}</ErpBadge>
          </>
        }
        actions={
          <>
            <button type="button" onClick={loadData} className={erpGhostBtnCls}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
              {lt(locale, { fa: 'بروزرسانی', en: 'Refresh', ar: 'تحديث', zh: '刷新', ru: 'Обновить' })}
            </button>
            <button type="button" onClick={() => setShowModal(true)} className={erpPrimaryBtnCls}>
              <Plus size={15} aria-hidden="true" />
              {lt(locale, { fa: 'آیتم جدید', en: 'Add Item', ar: 'إضافة عنصر', zh: '添加项目', ru: 'Добавить' })}
            </button>
          </>
        }
      />

      {error && <ErpAlert tone="error" onDismiss={() => setError(null)}>{error}</ErpAlert>}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl border border-line bg-surface" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <ErpSectionCard>
          <ErpEmptyState
            icon={<Boxes size={26} aria-hidden="true" />}
            title={lt(locale, { fa: 'هیچ آیتم انباری تعریف نشده است', en: 'No inventory items yet', ar: 'لا توجد عناصر مخزون', zh: '尚未创建库存项', ru: 'Инвентаря пока нет' })}
            description={lt(locale, { fa: 'اتاق هتل یا صندلی پرواز را با ظرفیت روزانه تعریف کنید.', en: 'Create a hotel room or flight allotment to enable live holds.', ar: 'أنشئ غرفة أو مقعدًا لتمكين الحجز.', zh: '创建酒店房间或航班配额以启用实时锁定。', ru: 'Создайте квоту для реального бронирования.' })}
            action={<button type="button" onClick={() => setShowModal(true)} className={erpPrimaryBtnCls}><Plus size={15} aria-hidden="true" />{lt(locale, { fa: 'تعریف آیتم', en: 'Add Item', ar: 'إضافة عنصر', zh: '添加项目', ru: 'Добавить' })}</button>}
          />
        </ErpSectionCard>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <ErpSectionCard
              key={item.id}
              title={
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <ErpBadge tone="brand">{item.type}</ErpBadge>
                  <span className="truncate text-[15px] font-black text-ink">{item.name}</span>
                  {item.code && <code className="rounded-md bg-soft px-2 py-0.5 font-mono text-[11px] text-sub" dir="ltr">{item.code}</code>}
                </span>
              }
              subtitle={
                <span className="inline-flex items-center gap-1.5">
                  <Building2 size={12} aria-hidden="true" /> {item.supplierName}
                </span>
              }
              actions={
                <>
                  <span className="hidden text-right text-[11px] font-bold text-sub sm:block">
                    {lt(locale, { fa: 'قفل فعال', en: 'Active holds', ar: 'الحجز النشط', zh: '活动锁定', ru: 'Холды' })}
                    <b className={cn('ms-1.5 font-black tabular-nums', item.activeHoldsCount > 0 ? 'text-price' : 'text-sub')}>{item.activeHoldsCount}</b>
                  </span>
                  <span className="text-right text-[11px] font-bold text-sub">
                    {lt(locale, { fa: 'پایه', en: 'Base', ar: 'الأساسي', zh: '基础价', ru: 'База' })}
                    <b className="num ms-1.5 text-[13px] font-black text-ink tabular-nums" dir="ltr">{item.basePrice.toLocaleString()} {item.currency}</b>
                  </span>
                </>
              }
            >
              <h4 className="mb-2.5 flex items-center gap-1.5 text-xs font-black text-sub">
                <Calendar size={14} aria-hidden="true" />
                {lt(locale, { fa: 'تقویم سهمیه و توقف فروش', en: 'Allotment calendar & stop-sell', ar: 'جدول الحصص وإيقاف البيع', zh: '配额日历与停售', ru: 'Квоты и стоп-продажи' })}
                <ErpHint label={lt(locale, { fa: 'توقف فروش چیست؟', en: 'What is stop-sell?', ar: 'ما هو إيقاف البيع؟', zh: '什么是停售？', ru: 'Что такое стоп-продажа?' })}>
                  {lt(locale, {
                    fa: 'با این دکمه فروش آن روز بسته می‌شود ولی رزروهای قبلی سر جایشان می‌مانند. برای روزهای پیک یا تعمیرات هتل استفاده کنید.',
                    en: 'This button closes sales for that day, while existing bookings stay untouched. Use it for peak days or hotel maintenance.',
                    ar: 'يغلق هذا الزر مبيعات ذلك اليوم مع بقاء الحجوزات السابقة. استخدمه لأيام الذروة أو الصيانة.',
                    zh: '此按钮关闭当天的销售，已有预订不受影响。适用于高峰日或酒店维护。',
                    ru: 'Кнопка закрывает продажи на этот день, старые брони остаются. Для пиковых дней или ремонта.',
                  })}
                </ErpHint>
              </h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
                {item.allotments.map((a) => {
                  const blocked = a.stopSell;
                  const soldOut = !blocked && a.available === 0;
                  return (
                    <div
                      key={a.id}
                      className={cn(
                        'space-y-1.5 rounded-xl border p-2.5 text-xs transition',
                        blocked ? 'border-destructive/25 bg-destructive/5'
                          : soldOut ? 'border-gold/30 bg-gold-soft/50'
                            : 'border-line bg-soft/40',
                      )}
                    >
                      <div className="flex items-center justify-between text-[11px] font-black">
                        <span className="tabular-nums" dir="ltr">{a.date.slice(5)}</span>
                        {blocked ? <Lock size={12} className="text-destructive" aria-hidden="true" /> : soldOut ? <span className="text-[9px] font-black text-price">FULL</span> : <LockOpen size={12} className="text-success" aria-hidden="true" />}
                      </div>
                      <div className="num flex justify-between text-[11px] tabular-nums">
                        <span className="font-bold text-sub">{a.total}</span>
                        <span className={cn('font-black', blocked ? 'text-destructive' : soldOut ? 'text-price' : 'text-success')}>{a.available}</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-surface" aria-hidden="true">
                        <div className={cn('h-full rounded-full', blocked ? 'bg-destructive' : soldOut ? 'bg-gold' : 'bg-success')} style={{ width: `${a.total ? Math.round((a.available / a.total) * 100) : 0}%` }} />
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleStopSell(a.id, a.stopSell)}
                        aria-pressed={a.stopSell}
                        className={cn(
                          'min-h-9 w-full rounded-lg py-1.5 text-[10px] font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                          a.stopSell ? 'bg-destructive text-white hover:brightness-95' : 'border border-line bg-surface text-sub hover:text-ink',
                        )}
                      >
                        {a.stopSell
                          ? lt(locale, { fa: 'مسدود · بازگشایی', en: 'Blocked · Reopen', ar: 'محظور · فتح', zh: '已停售·重开', ru: 'Закрыто · Открыть' })
                          : lt(locale, { fa: 'فعال · توقف فروش', en: 'Open · Stop-sell', ar: 'مفتوح · إيقاف', zh: '在售·停售', ru: 'Открыто · Стоп' })}
                      </button>
                    </div>
                  );
                })}
              </div>
            </ErpSectionCard>
          ))}
        </div>
      )}

      {showModal && (
        <ErpModal
          title={lt(locale, { fa: 'تعریف آیتم انبار جدید', en: 'Add Inventory Item', ar: 'إضافة عنصر مخزون', zh: '添加库存项', ru: 'Новая позиция' })}
          subtitle={lt(locale, { fa: 'سهمیه روزانه به‌صورت خودکار تخصیص می‌یابد', en: 'Daily allotment is allocated automatically', ar: 'يتم تخصيص الحصص تلقائيًا', zh: '每日配额将自动分配', ru: 'Суточные квоты выделятся автоматически' })}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button type="button" onClick={() => setShowModal(false)} className={erpGhostBtnCls}>
                {lt(locale, { fa: 'انصراف', en: 'Cancel', ar: 'إلغاء', zh: '取消', ru: 'Отмена' })}
              </button>
              <button type="submit" form="erp-inv-form" disabled={creating} className={erpPrimaryBtnCls}>
                {creating ? '…' : lt(locale, { fa: 'ثبت و تخصیص سهمیه', en: 'Save & Allocate', ar: 'حفظ وتخصيص', zh: '保存并分配', ru: 'Сохранить' })}
              </button>
            </>
          }
        >
          <form id="erp-inv-form" onSubmit={handleCreateItem} className="space-y-3.5">
            <div>
              <label className={erpLabelCls} htmlFor="inv-sup">{lt(locale, { fa: 'تامین‌کننده', en: 'Supplier', ar: 'المورد', zh: '供应商', ru: 'Поставщик' })}</label>
              <select id="inv-sup" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required className={erpFieldCls}>
                {suppliers.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </div>
            <div>
              <label className={erpLabelCls} htmlFor="inv-name">{lt(locale, { fa: 'عنوان اتاق یا صندلی', en: 'Item Name', ar: 'اسم العنصر', zh: '项目名称', ru: 'Название' })}</label>
              <input id="inv-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. اتاق دوتخته رویال" className={erpFieldCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={erpLabelCls} htmlFor="inv-type">{lt(locale, { fa: 'نوع آیتم', en: 'Item Type', ar: 'نوع العنصر', zh: '项目类型', ru: 'Тип' })}</label>
                <select id="inv-type" value={type} onChange={(e) => setType(e.target.value)} className={erpFieldCls} dir="ltr">
                  <option value="HOTEL_ROOM">HOTEL_ROOM</option>
                  <option value="FLIGHT_SEAT">FLIGHT_SEAT</option>
                  <option value="TOUR_SLOT">TOUR_SLOT</option>
                </select>
              </div>
              <div>
                <label className={erpLabelCls} htmlFor="inv-code">{lt(locale, { fa: 'کد مرجع', en: 'Reference Code', ar: 'رمز المرجع', zh: '参考代码', ru: 'Код' })}</label>
                <input id="inv-code" type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="ESP_DLX_01" className={erpFieldCls} dir="ltr" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={erpLabelCls} htmlFor="inv-price">{lt(locale, { fa: 'قیمت پایه', en: 'Base Price', ar: 'السعر الأساسي', zh: '基础价格', ru: 'Цена' })}</label>
                <input id="inv-price" type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className={erpFieldCls} dir="ltr" />
              </div>
              <div>
                <label className={erpLabelCls} htmlFor="inv-cap">{lt(locale, { fa: 'ظرفیت/روز', en: 'Capacity/day', ar: 'السعة اليومية', zh: '每日容量', ru: 'В день' })}</label>
                <input id="inv-cap" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} min="1" className={erpFieldCls} dir="ltr" />
              </div>
              <div>
                <label className={erpLabelCls} htmlFor="inv-days">{lt(locale, { fa: 'تعداد روز', en: 'Days', ar: 'الأيام', zh: '天数', ru: 'Дней' })}</label>
                <input id="inv-days" type="number" value={days} onChange={(e) => setDays(e.target.value)} min="1" max="60" className={erpFieldCls} dir="ltr" />
              </div>
            </div>
          </form>
        </ErpModal>
      )}
    </div>
  );
}
