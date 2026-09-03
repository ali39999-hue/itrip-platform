'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import {
  Boxes, Plus, RefreshCw, AlertCircle, Calendar,
  Lock, Building2
} from 'lucide-react';
import { lt } from '@/lib/lt';
import {
  getAdminInventory,
  createAdminInventoryItem,
  updateAllotment,
  getAdminSuppliers
} from '@/actions/admin';

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

  // Form states
  const [supplierId, setSupplierId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('HOTEL_ROOM');
  const [code, setCode] = useState('');
  const [basePrice, setBasePrice] = useState('25000000');
  const [capacity, setCapacity] = useState('5');
  const [days, setDays] = useState('14');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [invData, supData] = await Promise.all([
        getAdminInventory(),
        getAdminSuppliers(),
      ]);
      setItems(invData);
      setSuppliers(supData);
      if (supData.length > 0 && !supplierId) {
        setSupplierId(supData[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      alert(err instanceof Error ? err.message : 'Error creating item');
    } finally {
      setCreating(false);
    }
  };

  const toggleStopSell = async (allotmentId: string, currentStatus: boolean) => {
    try {
      await updateAllotment(allotmentId, { stopSell: !currentStatus });
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update allotment');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <Boxes className="text-brand" size={24} />
            {lt(locale, { fa: 'مدیریت انبار و سهمیه‌ها (Allotment)', en: 'Inventory & Allotment Management', ar: 'إدارة المخزون والحصص', zh: '库存与配额管理', ru: 'Управление инвентарем и квотами' })}
          </h1>
          <p className="text-sm text-sub mt-1">
            {lt(locale, { fa: 'کنترل ظرفیت روزانه، قفل‌های موقت (Hold) و جلوگیری از Overbooking', en: 'Control daily capacity, active holds, and prevent overselling', ar: 'التحكم في السعة اليومية والحجوزات المؤقتة ومنع الحجز الزائد', zh: '控制每日容量、临时锁定并防止超卖', ru: 'Контроль суточной емкости и предотвращение овербукинга' })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadData}
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
            {lt(locale, { fa: 'افزودن آیتم انبار جدید', en: 'Add Inventory Item', ar: 'إضافة عنصر مخزون جديد', zh: '添加新库存项', ru: 'Добавить позицию' })}
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
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 bg-surface rounded-2xl border border-line animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-line p-12 text-center space-y-3">
          <Boxes size={40} className="mx-auto text-sub/40" />
          <h3 className="font-bold text-ink">
            {lt(locale, { fa: 'هیچ آیتم انباری تعریف نشده است', en: 'No inventory items created yet', ar: 'لم يتم إنشاء عناصر مخزون بعد', zh: '尚未创建库存项', ru: 'Инвентарь пока не создан' })}
          </h3>
          <p className="text-xs text-sub max-w-sm mx-auto">
            {lt(locale, { fa: 'اتاق هتل یا صندلی پرواز جدیدی را به همراه ظرفیت روزانه تعریف نمایید.', en: 'Create a hotel room or flight allotment to enable live booking holds.', ar: 'أنشئ غرفة فندقية أو مقعد طيران لتمكين الحجز الفعلي.', zh: '创建酒店房间或航班配额以启用实时预订锁定。', ru: 'Создайте квоту номеров или мест для реального бронирования.' })}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {items.map((item) => (
            <div key={item.id} className="bg-surface rounded-2xl border border-line p-5 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-line">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-black bg-mint text-brand-dark">
                      {item.type}
                    </span>
                    <h2 className="font-bold text-ink text-base">{item.name}</h2>
                    {item.code && (
                      <span className="text-xs text-sub bg-soft px-2 py-0.5 rounded-md font-mono">
                        {item.code}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-sub">
                    <Building2 size={13} />
                    <span>{item.supplierName}</span>
                    <span>•</span>
                    <span>{lt(locale, { fa: 'شناسه آیتم:', en: 'Item ID:', ar: 'معرف العنصر:', zh: '项目ID：', ru: 'ID:' })} <code className="font-mono text-ink">{item.id}</code></span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-sub block">{lt(locale, { fa: 'قیمت پایه', en: 'Base Price', ar: 'السعر الأساسي', zh: '基础价格', ru: 'Базовая цена' })}</span>
                    <span className="font-black text-ink text-sm">
                      {item.basePrice.toLocaleString()} {item.currency}
                    </span>
                  </div>
                  <div className="ps-4 border-s border-line">
                    <span className="text-sub block">{lt(locale, { fa: 'قفل‌های فعال (Hold)', en: 'Active Holds', ar: 'الحجوزات المؤقتة النشطة', zh: '活动锁定', ru: 'Активные холды' })}</span>
                    <span className={`font-black text-sm ${item.activeHoldsCount > 0 ? 'text-warning' : 'text-sub'}`}>
                      {item.activeHoldsCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Allotment Calendar Matrix */}
              <div>
                <h4 className="text-xs font-bold text-sub mb-2 flex items-center gap-1.5">
                  <Calendar size={14} />
                  {lt(locale, { fa: 'تقویم سهمیه روزانه و وضعیت توقف فروش (Stop-Sell)', en: 'Daily Allotment & Stop-Sell Status', ar: 'جدول الحصص اليومية وحالة إيقاف البيع', zh: '每日配额与停售状态', ru: 'Суточные квоты и статус остановки продаж' })}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {item.allotments.map((a) => (
                    <div
                      key={a.id}
                      className={`p-2.5 rounded-xl border text-xs space-y-1.5 transition ${
                        a.stopSell
                          ? 'bg-destructive/5 border-destructive/20 text-destructive'
                          : a.available === 0
                          ? 'bg-warning/5 border-warning/20 text-warning'
                          : 'bg-soft/40 border-line text-ink'
                      }`}
                    >
                      <div className="font-bold flex justify-between items-center text-[11px]">
                        <span>{a.date.slice(5)}</span>
                        {a.stopSell && <Lock size={12} className="text-destructive" />}
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-sub">{lt(locale, { fa: 'ظرفیت:', en: 'Total:', ar: 'الإجمالي:', zh: '总额:', ru: 'Всего:' })} {a.total}</span>
                        <span className="font-bold">{lt(locale, { fa: 'مانده:', en: 'Avail:', ar: 'المتاح:', zh: '可用:', ru: 'Доступно:' })} {a.available}</span>
                      </div>
                      <button
                        onClick={() => toggleStopSell(a.id, a.stopSell)}
                        className={`w-full py-1 text-[10px] font-bold rounded-md transition ${
                          a.stopSell
                            ? 'bg-destructive text-surface hover:bg-destructive/90'
                            : 'bg-surface border border-line text-sub hover:text-ink'
                        }`}
                      >
                        {a.stopSell ? 'Stop-Sell (بازگشایی)' : 'فعال (توقف فروش)'}
                      </button>
                    </div>
                  ))}
                </div>
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
              {lt(locale, { fa: 'تعریف آیتم انبار جدید', en: 'Add Inventory Item', ar: 'إضافة عنصر مخزون جديد', zh: '添加新库存项', ru: 'Добавить позицию' })}
            </h3>
            <form onSubmit={handleCreateItem} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-sub mb-1">
                  {lt(locale, { fa: 'تامین‌کننده مربوطه', en: 'Supplier', ar: 'المورد', zh: '供应商', ru: 'Поставщик' })}
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-line text-sm focus:border-brand outline-hidden bg-surface"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-sub mb-1">
                  {lt(locale, { fa: 'عنوان اتاق یا صندلی', en: 'Item Name', ar: 'اسم العنصر', zh: '项目名称', ru: 'Название' })}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. اتاق دوتخته رویال دلوکس"
                  className="w-full h-10 px-3 rounded-xl border border-line text-sm focus:border-brand outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">
                    {lt(locale, { fa: 'نوع آیتم', en: 'Item Type', ar: 'نوع العنصر', zh: '项目类型', ru: 'Тип' })}
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-line text-sm focus:border-brand outline-hidden bg-surface"
                  >
                    <option value="HOTEL_ROOM">HOTEL_ROOM</option>
                    <option value="FLIGHT_SEAT">FLIGHT_SEAT</option>
                    <option value="TOUR_SLOT">TOUR_SLOT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">
                    {lt(locale, { fa: 'کد مرجع (اختیاری)', en: 'Reference Code', ar: 'رمز المرجع', zh: '参考代码', ru: 'Код' })}
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. ESP_DLX_01"
                    className="w-full h-10 px-3 rounded-xl border border-line text-sm focus:border-brand outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">
                    {lt(locale, { fa: 'قیمت پایه (IRR)', en: 'Base Price', ar: 'السعر الأساسي', zh: '基础价格', ru: 'Цена' })}
                  </label>
                  <input
                    type="number"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-line text-sm focus:border-brand outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">
                    {lt(locale, { fa: 'ظرفیت در روز', en: 'Daily Capacity', ar: 'السعة اليومية', zh: '每日容量', ru: 'Емкость/день' })}
                  </label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    min="1"
                    className="w-full h-10 px-3 rounded-xl border border-line text-sm focus:border-brand outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">
                    {lt(locale, { fa: 'تعداد روزها', en: 'Days Ahead', ar: 'عدد الأيام', zh: '天数', ru: 'Дней' })}
                  </label>
                  <input
                    type="number"
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    min="1"
                    max="60"
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
                  {creating ? '...' : lt(locale, { fa: 'ثبت و تخصیص سهمیه', en: 'Save & Allocate', ar: 'حفظ وتخصيص', zh: '保存并分配', ru: 'Сохранить' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
