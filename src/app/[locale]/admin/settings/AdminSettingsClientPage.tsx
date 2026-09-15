'use client';

import { useState, useTransition } from 'react';
import {
  Settings, MessageSquare, CreditCard, Globe, Send,
  CheckCircle2, AlertCircle, RefreshCw, Plus, Trash2,
  ToggleLeft, ToggleRight, ShieldCheck, Phone, Mail,
  Coins, KeyRound, Radio, ExternalLink
} from 'lucide-react';
import { lt } from '@/lib/lt';
import { Input } from '@/components/ui/input';
import { ErpBadge, ErpEmptyState, ErpPageHeader, ErpSectionCard } from '@/components/admin/erp-ui';
import {
  saveSmsSettingsAction,
  sendTestSmsAction,
  saveGeneralPlatformSettingsAction,
  createDestinationBankCardAction,
  toggleDestinationBankCardActiveAction,
  deleteDestinationBankCardAction,
  createDestinationCryptoWalletAction,
  toggleDestinationCryptoWalletActiveAction,
} from '@/actions/admin-settings';
import { setAdminPaymentModeAction } from '@/actions/admin-payment-mode';
import type {
  SmsSettingsDto,
  GeneralPlatformSettingsDto,
  BankCardAdminItem,
  CryptoWalletAdminItem,
} from '@/actions/admin-settings';

export function AdminSettingsClientPage({
  initialSmsSettings,
  initialGeneralSettings,
  initialBankCards,
  initialCryptoWallets,
  recentSmsLogs,
  initialPaymentMode,
  locale,
}: {
  initialSmsSettings: SmsSettingsDto;
  initialGeneralSettings: GeneralPlatformSettingsDto;
  initialBankCards: BankCardAdminItem[];
  initialCryptoWallets: CryptoWalletAdminItem[];
  recentSmsLogs: Array<{ id: string; eventType: string; status: string; createdAt: string; payload: string }>;
  initialPaymentMode: 'real' | 'demo';
  locale: string;
}) {
  const [activeTab, setActiveTab] = useState<'SMS' | 'BANK_ACCOUNTS' | 'GENERAL'>('SMS');

  // SMS Settings State
  const [smsSettings, setSmsSettings] = useState<SmsSettingsDto>(initialSmsSettings);
  const [customApiKey, setCustomApiKey] = useState('');
  const [isSavingSms, setIsSavingSms] = useState(false);
  const [smsFeedback, setSmsFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Test SMS State
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('پیام آزمایشی سامانه فیروزو — تست اتصال وب‌سرویس پیامک');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // General Settings State
  const [generalSettings, setGeneralSettings] = useState<GeneralPlatformSettingsDto>(initialGeneralSettings);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [generalFeedback, setGeneralFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Payment Mode
  const [paymentMode, setPaymentMode] = useState<'real' | 'demo'>(initialPaymentMode);
  const [isTogglingPayment, setIsTogglingPayment] = useState(false);

  // Bank Cards State
  const [bankCards, setBankCards] = useState<BankCardAdminItem[]>(initialBankCards);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newCard, setNewCard] = useState({
    bankName: '',
    accountHolder: '',
    cardNumber: '',
    iban: '',
    note: '',
  });
  const [cardError, setCardError] = useState('');
  const [isAddingCard, setIsAddingCard] = useState(false);

  // Crypto Wallets State
  const [cryptoWallets, setCryptoWallets] = useState<CryptoWalletAdminItem[]>(initialCryptoWallets);
  const [showAddWalletModal, setShowAddWalletModal] = useState(false);
  const [newWallet, setNewWallet] = useState({
    network: 'TRC20',
    currency: 'USDT',
    walletAddress: '',
    networkLabel: 'Tether TRC-20 (Tron)',
    memoOrTag: '',
  });
  const [walletError, setWalletError] = useState('');
  const [isAddingWallet, setIsAddingWallet] = useState(false);

  const numFmt = locale === 'fa' ? 'fa-IR' : 'en-US';

  // Handler: Save SMS Settings
  async function handleSaveSms(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingSms(true);
    setSmsFeedback(null);
    const res = await saveSmsSettingsAction({
      activeProvider: smsSettings.activeProvider,
      defaultSender: smsSettings.defaultSender,
      otpTemplate: smsSettings.otpTemplate,
      bookingPaidTemplate: smsSettings.bookingPaidTemplate,
      ticketReplyTemplate: smsSettings.ticketReplyTemplate,
      customApiKey: customApiKey.trim() || undefined,
    });
    setIsSavingSms(false);
    if (res.success) {
      setSmsFeedback({ type: 'success', text: 'تنظیمات وب‌سرویس پیامک با موفقیت ذخیره و اعمال شد.' });
      setCustomApiKey('');
    } else {
      setSmsFeedback({ type: 'error', text: res.error || 'خطا در ذخیره تنظیمات' });
    }
  }

  // Handler: Send Test SMS
  async function handleSendTestSms(e: React.FormEvent) {
    e.preventDefault();
    if (!testPhone.trim() || !testMessage.trim()) return;
    setIsSendingTest(true);
    setTestFeedback(null);
    const res = await sendTestSmsAction({ phone: testPhone, message: testMessage });
    setIsSendingTest(false);
    if (res.success) {
      setTestFeedback({
        type: 'success',
        text: `پیامک آزمایشی با موفقیت به درگاه تحویل داده شد (شناسه: ${res.messageId || 'OK'})`,
      });
    } else {
      setTestFeedback({ type: 'error', text: res.error || 'ارسال پیامک با خطا مواجه شد' });
    }
  }

  // Handler: Save General Settings
  async function handleSaveGeneral(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingGeneral(true);
    setGeneralFeedback(null);
    const res = await saveGeneralPlatformSettingsAction(generalSettings);
    setIsSavingGeneral(false);
    if (res.success) {
      setGeneralFeedback({ type: 'success', text: 'تنظیمات عمومی سامانه با موفقیت ذخیره شد.' });
    } else {
      setGeneralFeedback({ type: 'error', text: res.error || 'خطا در ذخیره تنظیمات' });
    }
  }

  // Handler: Toggle Payment Mode
  async function handleTogglePaymentMode(mode: 'real' | 'demo') {
    setIsTogglingPayment(true);
    const res = await setAdminPaymentModeAction(mode, { systemWide: true });
    setIsTogglingPayment(false);
    if (res.success) {
      setPaymentMode(mode);
    }
  }

  // Handler: Add Bank Card
  async function handleAddBankCard(e: React.FormEvent) {
    e.preventDefault();
    setIsAddingCard(true);
    setCardError('');
    const res = await createDestinationBankCardAction(newCard);
    setIsAddingCard(false);
    if (res.success && res.cardId) {
      setBankCards([
        ...bankCards,
        {
          id: res.cardId,
          bankName: newCard.bankName,
          accountHolder: newCard.accountHolder,
          cardNumber: newCard.cardNumber,
          iban: newCard.iban || null,
          isActive: true,
          sortOrder: bankCards.length,
          note: newCard.note || null,
          receiptsCount: 0,
          createdAt: new Date().toISOString(),
        },
      ]);
      setShowAddCardModal(false);
      setNewCard({ bankName: '', accountHolder: '', cardNumber: '', iban: '', note: '' });
    } else {
      setCardError(res.error || 'خطا در ثبت کارت');
    }
  }

  // Handler: Toggle Bank Card Active
  async function handleToggleCardActive(id: string, current: boolean) {
    const next = !current;
    setBankCards(bankCards.map((c) => (c.id === id ? { ...c, isActive: next } : c)));
    await toggleDestinationBankCardActiveAction(id, next);
  }

  // Handler: Delete Card
  async function handleDeleteCard(id: string) {
    if (!confirm('آیا از حذف یا غیرفعال‌سازی این کارت بانکی اطمینان دارید؟')) return;
    const res = await deleteDestinationBankCardAction(id);
    if (res.success) {
      setBankCards(bankCards.filter((c) => c.id !== id));
    }
  }

  // Handler: Add Crypto Wallet
  async function handleAddCryptoWallet(e: React.FormEvent) {
    e.preventDefault();
    setIsAddingWallet(true);
    setWalletError('');
    const res = await createDestinationCryptoWalletAction(newWallet);
    setIsAddingWallet(false);
    if (res.success && res.walletId) {
      setCryptoWallets([
        ...cryptoWallets,
        {
          id: res.walletId,
          network: newWallet.network,
          currency: newWallet.currency,
          walletAddress: newWallet.walletAddress,
          networkLabel: newWallet.networkLabel,
          memoOrTag: newWallet.memoOrTag || null,
          isActive: true,
          sortOrder: cryptoWallets.length,
          note: null,
          receiptsCount: 0,
          createdAt: new Date().toISOString(),
        },
      ]);
      setShowAddWalletModal(false);
      setNewWallet({ network: 'TRC20', currency: 'USDT', walletAddress: '', networkLabel: 'Tether TRC-20', memoOrTag: '' });
    } else {
      setWalletError(res.error || 'خطا در افزودن ولت');
    }
  }

  return (
    <div className="space-y-6">
      <ErpPageHeader
        eyebrow={lt(locale, { fa: 'سیستم · پیکربندی مرکزی', en: 'System · Central Config', ar: 'النظام · الإعدادات', zh: '系统 · 核心配置', ru: 'Система · Конфигурация' })}
        title={lt(locale, { fa: 'تنظیمات سامانه و سرویس‌های پایه', en: 'Platform Settings & Base Services', ar: 'إعدادات النظام والخدمات', zh: '平台设置与基础服务', ru: 'Настройки платформы и сервисы' })}
        description={lt(locale, {
          fa: 'مدیریت درگاه‌های پیامک و OTP، کارت‌های بانکی مقصد، کیف‌پول‌های دریافت ارزی و تنظیمات عمومی پلتفرم',
          en: 'Manage SMS/OTP gateways, company receiving accounts, crypto addresses and platform defaults',
          ar: 'إدارة بوابات الرسائل والحسابات البنكية ومحافظ العملات الرقمية',
          zh: '管理短信与OTP网关、公司收款银行卡、加密钱包及全站核心配置',
          ru: 'Управление шлюзами SMS, расчетными картами и общими настройками',
        })}
        icon={<Settings size={20} aria-hidden="true" />}
      />

      {/* Navigation Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-surface rounded-2xl border border-line shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('SMS')}
          className={`h-10 px-5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'SMS' ? 'bg-brand text-surface shadow-xs' : 'text-sub hover:text-ink hover:bg-soft'
          }`}
        >
          <MessageSquare size={16} />
          <span>{lt(locale, { fa: 'وب‌سرویس پیامک و اطلاع‌رسانی', en: 'SMS Gateway & Outbox', ar: 'بوابة الرسائل', zh: '短信网关与发件', ru: 'SMS-шлюз и рассылки' })}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('BANK_ACCOUNTS')}
          className={`h-10 px-5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'BANK_ACCOUNTS' ? 'bg-brand text-surface shadow-xs' : 'text-sub hover:text-ink hover:bg-soft'
          }`}
        >
          <CreditCard size={16} />
          <span>{lt(locale, { fa: 'کارت‌های بانکی و ولت‌های مقصد', en: 'Receiving Cards & Crypto', ar: 'الحسابات والمحافظ', zh: '收款银行卡与钱包', ru: 'Счета и криптокошельки' })}</span>
          <span className="px-2 py-0.5 rounded-full bg-soft text-ink text-[10px] font-bold">
            {bankCards.length + cryptoWallets.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('GENERAL')}
          className={`h-10 px-5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'GENERAL' ? 'bg-brand text-surface shadow-xs' : 'text-sub hover:text-ink hover:bg-soft'
          }`}
        >
          <Globe size={16} />
          <span>{lt(locale, { fa: 'اطلاعات عمومی و درگاه پرداخت', en: 'General & Payment Mode', ar: 'الإعدادات العامة والدفع', zh: '常规信息与支付模式', ru: 'Общие и режим оплаты' })}</span>
        </button>
      </div>

      {/* ==================== TAB 1: SMS & OUTBOX ==================== */}
      {activeTab === 'SMS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* SMS Config Form (7 cols) */}
          <div className="lg:col-span-7 bg-surface rounded-3xl p-6 sm:p-8 border border-line shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h3 className="font-black text-lg text-ink">پیکربندی ارائه‌دهنده پیامک</h3>
                <p className="text-xs font-bold text-sub">انتخاب درگاه فعال و تنظیم خطوط ارسال OTP و نوتیفیکیشن‌ها</p>
              </div>
              <ErpBadge tone={smsSettings.hasEnvKey ? 'green' : 'gold'}>
                {smsSettings.hasEnvKey ? 'دارای کلید وب‌سرویس معتبر' : 'حالت شبیه‌ساز کنسول'}
              </ErpBadge>
            </div>

            {smsFeedback && (
              <div
                className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  smsFeedback.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {smsFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{smsFeedback.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveSms} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-sub mb-2">درگاه پیامکی فعال (Active Gateway)</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'kavenegar', label: 'کاوه‌نگار (Kavenegar)', desc: 'وب‌سرویس REST و قالب خدماتی' },
                    { id: 'farazsms', label: 'فراز اس‌ام‌اس (IPPanel)', desc: 'پترن خدماتی سریع و خطوط ۳۰۰۰' },
                    { id: 'smswbs', label: 'SMS هوشمند (smswbs.ir)', desc: 'خطوط ۱۰۰۰ و ارسال به بلک‌لیست' },
                  ].map((p) => {
                    const isSelected = smsSettings.activeProvider === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSmsSettings({ ...smsSettings, activeProvider: p.id as 'kavenegar' | 'farazsms' | 'smswbs' })}
                        className={`p-3.5 rounded-2xl border text-start transition cursor-pointer ${
                          isSelected
                            ? 'bg-brand/10 border-brand text-brand-dark shadow-xs'
                            : 'bg-surface border-line text-ink hover:bg-soft'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-black text-xs">{p.label}</span>
                          <span className={`w-3 h-3 rounded-full border-2 ${isSelected ? 'border-brand bg-brand' : 'border-line'}`} />
                        </div>
                        <p className="text-[10px] text-sub font-medium">{p.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">شماره اختصاصی / خط ارسال‌کننده</label>
                  <Input
                    type="text"
                    value={smsSettings.defaultSender}
                    onChange={(e) => setSmsSettings({ ...smsSettings, defaultSender: e.target.value })}
                    placeholder="e.g. 10008888 or 3000505"
                    className="font-mono text-sm h-11 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">کلید وب‌سرویس جدید (اختیاری جهت تغییر)</label>
                  <Input
                    type="password"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    placeholder="در صورت عدم تغییر خالی بگذارید"
                    className="font-mono text-sm h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">کد قالب کد تایید OTP</label>
                  <Input
                    type="text"
                    value={smsSettings.otpTemplate}
                    onChange={(e) => setSmsSettings({ ...smsSettings, otpTemplate: e.target.value })}
                    className="font-mono text-xs h-10 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">کد قالب صدور بلیط</label>
                  <Input
                    type="text"
                    value={smsSettings.bookingPaidTemplate}
                    onChange={(e) => setSmsSettings({ ...smsSettings, bookingPaidTemplate: e.target.value })}
                    className="font-mono text-xs h-10 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">کد قالب پاسخ به تیکت</label>
                  <Input
                    type="text"
                    value={smsSettings.ticketReplyTemplate}
                    onChange={(e) => setSmsSettings({ ...smsSettings, ticketReplyTemplate: e.target.value })}
                    className="font-mono text-xs h-10 rounded-xl"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingSms}
                className="h-11 px-8 rounded-xl bg-brand hover:bg-brand-dark text-surface text-xs font-black transition active:scale-95 flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSavingSms ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                <span>ذخیره و اعمال تنظیمات پیامک</span>
              </button>
            </form>
          </div>

          {/* SMS Test Console & Outbox (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Live Test Box */}
            <div className="bg-surface rounded-3xl p-6 border border-line shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-line pb-3">
                <Send size={18} className="text-brand" />
                <h3 className="font-black text-sm text-ink">تست زنده وب‌سرویس پیامک</h3>
              </div>
              <p className="text-[11px] font-bold text-sub">
                یک شماره همراه وارد کنید تا وضعیت ارتباط و ارسال وب‌سرویس را به صورت آنی بررسی و لاگ نمایید.
              </p>

              {testFeedback && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-bold flex items-start gap-2 ${
                    testFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {testFeedback.type === 'success' ? <CheckCircle2 size={15} className="shrink-0 mt-0.5" /> : <AlertCircle size={15} className="shrink-0 mt-0.5" />}
                  <span>{testFeedback.text}</span>
                </div>
              )}

              <form onSubmit={handleSendTestSms} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-sub mb-1">شماره موبایل مقصد</label>
                  <Input
                    type="text"
                    required
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="09123456789"
                    className="font-mono text-sm h-10 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-sub mb-1">متن پیامک آزمایشی</label>
                  <textarea
                    rows={2}
                    required
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-line text-xs bg-surface text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="w-full h-10 rounded-xl bg-brand hover:bg-brand-dark text-surface text-xs font-black transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSendingTest ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>ارسال پیامک تست به درگاه</span>
                </button>
              </form>
            </div>

            {/* Recent Outbox Events */}
            <div className="bg-surface rounded-3xl p-6 border border-line shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <span className="font-black text-xs text-ink">آخرین رویدادهای اوت‌باکس (Outbox Events)</span>
                <span className="text-[10px] font-bold text-sub">{recentSmsLogs.length} رویداد</span>
              </div>

              <div className="divide-y divide-line/60 max-h-60 overflow-y-auto space-y-2">
                {recentSmsLogs.length === 0 ? (
                  <p className="text-xs text-sub text-center py-4">رویداد اخیری ثبت نشده است.</p>
                ) : (
                  recentSmsLogs.map((log) => (
                    <div key={log.id} className="pt-2 text-[11px]">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-mono font-black text-brand-dark">{log.eventType}</span>
                        <ErpBadge tone={log.status === 'PROCESSED' ? 'green' : log.status === 'FAILED' ? 'rose' : 'gold'}>
                          {log.status}
                        </ErpBadge>
                      </div>
                      <p className="truncate text-sub font-mono text-[10px]" dir="ltr">{log.payload}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: BANK CARDS & CRYPTO WALLETS ==================== */}
      {activeTab === 'BANK_ACCOUNTS' && (
        <div className="space-y-6">
          {/* Destination Bank Cards Section */}
          <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-line shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <div>
                <h3 className="font-black text-lg text-ink">کارت‌های بانکی شرکت (کارت‌به‌کارت پیمنتینو)</h3>
                <p className="text-xs font-bold text-sub">کارت‌های بانکی مقصد برای واریز وجه توسط مسافران و تطبیق فیش‌های واریزی</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCardModal(true)}
                className="h-10 px-5 rounded-xl bg-brand hover:bg-brand-dark text-surface text-xs font-black transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Plus size={15} />
                <span>تعریف کارت بانکی جدید</span>
              </button>
            </div>

            {/* Modal Add Card */}
            {showAddCardModal && (
              <div className="p-6 bg-soft rounded-2xl border border-brand/40 shadow-xs mb-4 animate-in fade-in duration-150">
                <h4 className="font-black text-sm text-ink mb-3">مشخصات کارت بانکی جدید</h4>
                {cardError && (
                  <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs font-bold mb-3">
                    {cardError}
                  </div>
                )}
                <form onSubmit={handleAddBankCard} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-sub mb-1">نام بانک</label>
                      <Input
                        required
                        value={newCard.bankName}
                        onChange={(e) => setNewCard({ ...newCard, bankName: e.target.value })}
                        placeholder="سامان، ملت، پاسارگاد..."
                        className="text-xs h-10 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-sub mb-1">نام دارنده حساب</label>
                      <Input
                        required
                        value={newCard.accountHolder}
                        onChange={(e) => setNewCard({ ...newCard, accountHolder: e.target.value })}
                        placeholder="شرکت خدمات مسافرت فیروزو"
                        className="text-xs h-10 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-sub mb-1">شماره ۱۶ رقمی کارت</label>
                      <Input
                        required
                        value={newCard.cardNumber}
                        onChange={(e) => setNewCard({ ...newCard, cardNumber: e.target.value })}
                        placeholder="62198610..."
                        className="font-mono text-xs h-10 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-sub mb-1">شماره شبا (اختیاری)</label>
                      <Input
                        value={newCard.iban}
                        onChange={(e) => setNewCard({ ...newCard, iban: e.target.value })}
                        placeholder="IR..."
                        className="font-mono text-xs h-10 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-sub mb-1">یادداشت داخلی</label>
                      <Input
                        value={newCard.note}
                        onChange={(e) => setNewCard({ ...newCard, note: e.target.value })}
                        placeholder="کارت اصلی گردشگری و پروازهای خارجی"
                        className="text-xs h-10 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isAddingCard}
                      className="h-10 px-6 rounded-xl bg-brand text-surface text-xs font-black transition disabled:opacity-50 cursor-pointer"
                    >
                      {isAddingCard ? 'در حال ثبت...' : 'ثبت نهایی کارت'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddCardModal(false)}
                      className="h-10 px-4 rounded-xl bg-surface border border-line text-sub text-xs font-bold"
                    >
                      انصراف
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Cards Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="border-b border-line text-sub font-black">
                    <th className="p-3 text-start">بانک و دارنده</th>
                    <th className="p-3 text-start">شماره کارت</th>
                    <th className="p-3 text-start">شبا</th>
                    <th className="p-3 text-start">وضعیت</th>
                    <th className="p-3 text-start">تراکنش‌های متصل</th>
                    <th className="p-3 text-end">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60 font-medium">
                  {bankCards.map((c) => (
                    <tr key={c.id} className="hover:bg-soft/50 transition">
                      <td className="p-3">
                        <div className="font-black text-ink">{c.bankName}</div>
                        <div className="text-[11px] text-sub">{c.accountHolder}</div>
                      </td>
                      <td className="p-3 font-mono font-black text-brand-dark" dir="ltr">
                        {c.cardNumber.replace(/(\d{4})/g, '$1 ').trim()}
                      </td>
                      <td className="p-3 font-mono text-sub" dir="ltr">{c.iban || '—'}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => handleToggleCardActive(c.id, c.isActive)}
                          className="cursor-pointer"
                        >
                          <ErpBadge tone={c.isActive ? 'green' : 'neutral'}>
                            {c.isActive ? 'فعال و قابل پرداخت' : 'غیرفعال'}
                          </ErpBadge>
                        </button>
                      </td>
                      <td className="p-3 num font-bold text-sub">
                        {c.receiptsCount} رسید ثبت‌شده
                      </td>
                      <td className="p-3 text-end">
                        <button
                          type="button"
                          onClick={() => handleDeleteCard(c.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                          title="حذف یا غیرفعال‌سازی"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Destination Crypto Wallets Section */}
          <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-line shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <div>
                <h3 className="font-black text-lg text-ink">کیف‌پول‌های رمزارز مقصد (دریافت تتر USDT)</h3>
                <p className="text-xs font-bold text-sub">آدرس‌های ولت شرکت برای واریزهای بین‌المللی و آن‌چین</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddWalletModal(true)}
                className="h-10 px-5 rounded-xl bg-brand hover:bg-brand-dark text-surface text-xs font-black transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Plus size={15} />
                <span>افزودن ولت رمزارز جدید</span>
              </button>
            </div>

            {/* Modal Add Wallet */}
            {showAddWalletModal && (
              <div className="p-6 bg-soft rounded-2xl border border-brand/40 shadow-xs mb-4 animate-in fade-in duration-150">
                <h4 className="font-black text-sm text-ink mb-3">مشخصات کیف‌پول جدید</h4>
                {walletError && (
                  <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs font-bold mb-3">{walletError}</div>
                )}
                <form onSubmit={handleAddCryptoWallet} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-sub mb-1">شبکه انتقال (Network)</label>
                      <select
                        value={newWallet.network}
                        onChange={(e) => setNewWallet({ ...newWallet, network: e.target.value })}
                        className="w-full h-10 rounded-xl border border-line bg-surface text-xs font-bold px-3"
                      >
                        <option value="TRC20">Tron (TRC-20) — کمترین کارمزد</option>
                        <option value="BEP20">BNB Chain (BEP-20)</option>
                        <option value="TON">The Open Network (TON)</option>
                        <option value="ERC20">Ethereum (ERC-20)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-sub mb-1">ارز پایه</label>
                      <Input
                        value={newWallet.currency}
                        onChange={(e) => setNewWallet({ ...newWallet, currency: e.target.value })}
                        placeholder="USDT"
                        className="font-mono text-xs h-10 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-sub mb-1">برچسب شبکه</label>
                      <Input
                        value={newWallet.networkLabel}
                        onChange={(e) => setNewWallet({ ...newWallet, networkLabel: e.target.value })}
                        placeholder="e.g. Tether TRC-20"
                        className="text-xs h-10 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-sub mb-1">آدرس عمومی ولت مقصد (Public Address)</label>
                    <Input
                      required
                      value={newWallet.walletAddress}
                      onChange={(e) => setNewWallet({ ...newWallet, walletAddress: e.target.value })}
                      placeholder="e.g. T..."
                      className="font-mono text-xs h-10 rounded-xl"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isAddingWallet}
                      className="h-10 px-6 rounded-xl bg-brand text-surface text-xs font-black transition disabled:opacity-50 cursor-pointer"
                    >
                      {isAddingWallet ? 'در حال ثبت...' : 'ثبت نهایی ولت'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddWalletModal(false)}
                      className="h-10 px-4 rounded-xl bg-surface border border-line text-sub text-xs font-bold"
                    >
                      انصراف
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Wallets Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="border-b border-line text-sub font-black">
                    <th className="p-3 text-start">ارز و شبکه</th>
                    <th className="p-3 text-start">آدرس ولت</th>
                    <th className="p-3 text-start">وضعیت</th>
                    <th className="p-3 text-start">رسیدهای پرداختی</th>
                    <th className="p-3 text-end">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60 font-medium">
                  {cryptoWallets.map((w) => (
                    <tr key={w.id} className="hover:bg-soft/50 transition">
                      <td className="p-3">
                        <div className="font-black text-ink">{w.currency} ({w.network})</div>
                        <div className="text-[11px] text-sub">{w.networkLabel}</div>
                      </td>
                      <td className="p-3 font-mono text-xs font-bold text-brand-dark select-all" dir="ltr">
                        {w.walletAddress}
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={async () => {
                            const next = !w.isActive;
                            setCryptoWallets(cryptoWallets.map((it) => (it.id === w.id ? { ...it, isActive: next } : it)));
                            await toggleDestinationCryptoWalletActiveAction(w.id, next);
                          }}
                          className="cursor-pointer"
                        >
                          <ErpBadge tone={w.isActive ? 'green' : 'neutral'}>
                            {w.isActive ? 'فعال' : 'غیرفعال'}
                          </ErpBadge>
                        </button>
                      </td>
                      <td className="p-3 num font-bold text-sub">
                        {w.receiptsCount} تراکنش
                      </td>
                      <td className="p-3 text-end">
                        <span className="text-[11px] text-sub font-bold">پیش‌فرض سیستم</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: GENERAL & PAYMENT MODE ==================== */}
      {activeTab === 'GENERAL' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* General Config Form (8 cols) */}
          <div className="lg:col-span-8 bg-surface rounded-3xl p-6 sm:p-8 border border-line shadow-xs space-y-6">
            <div className="border-b border-line pb-4">
              <h3 className="font-black text-lg text-ink">تنظیمات اصلی و اطلاعات تماس پلتفرم</h3>
              <p className="text-xs font-bold text-sub">نام سامانه، شماره‌های پشتیبانی مشتریان و قوانین پیش‌فرض مالیاتی</p>
            </div>

            {generalFeedback && (
              <div
                className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  generalFeedback.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                <CheckCircle2 size={16} />
                <span>{generalFeedback.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveGeneral} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-sub mb-1">عنوان کامل پلتفرم (Platform Title)</label>
                <Input
                  type="text"
                  value={generalSettings.siteTitle}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, siteTitle: e.target.value })}
                  className="font-bold text-sm h-11 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">شماره تماس پشتیبانی (tel:)</label>
                  <Input
                    type="text"
                    value={generalSettings.supportPhone}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, supportPhone: e.target.value })}
                    className="font-mono text-sm h-11 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">نمایش شماره تماس در سایت</label>
                  <Input
                    type="text"
                    value={generalSettings.supportPhoneDisplay}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, supportPhoneDisplay: e.target.value })}
                    className="font-bold text-sm h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">ایمیل رسمی پشتیبانی</label>
                  <Input
                    type="email"
                    value={generalSettings.supportEmail}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, supportEmail: e.target.value })}
                    className="font-mono text-sm h-11 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">آیدی ربات پشتیبانی تلگرام</label>
                  <Input
                    type="text"
                    value={generalSettings.telegramBotUsername}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, telegramBotUsername: e.target.value })}
                    placeholder="firuzo_bot"
                    className="font-mono text-sm h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">درصد مالیات بر ارزش افزوده قانونی (%)</label>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={generalSettings.standardTaxPercentage}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, standardTaxPercentage: Number(e.target.value) })}
                    className="font-bold text-sm h-11 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sub mb-1">ارز پایه پیش‌فرض پلتفرم</label>
                  <select
                    value={generalSettings.defaultCurrency}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, defaultCurrency: e.target.value as 'IRR' | 'TOMAN' | 'USDT' | 'AED' })}
                    className="w-full h-11 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-ink"
                  >
                    <option value="IRR">ریال ایران (IRR)</option>
                    <option value="TOMAN">تومان (TOMAN)</option>
                    <option value="USDT">تتر دلاری (USDT)</option>
                    <option value="AED">درهم امارات (AED)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingGeneral}
                className="h-11 px-8 rounded-xl bg-brand hover:bg-brand-dark text-surface text-xs font-black transition active:scale-95 flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSavingGeneral ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                <span>ذخیره تغییرات عمومی</span>
              </button>
            </form>
          </div>

          {/* Payment Mode Switcher Card (4 cols) */}
          <div className="lg:col-span-4 bg-surface rounded-3xl p-6 border border-line shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <ShieldCheck size={18} className="text-brand" />
              <h3 className="font-black text-sm text-ink">حالت درگاه‌های پرداخت سامانه</h3>
            </div>
            <p className="text-[11px] font-bold text-sub leading-relaxed">
              سوییچ سریع میان درگاه‌های پرداخت بانکی واقعی (شاپرک/سامان) و حالت شبیه‌ساز امن (Sandbox/Demo) برای تست گردش‌کارهای مالی
            </p>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => handleTogglePaymentMode('real')}
                disabled={isTogglingPayment}
                className={`w-full p-4 rounded-2xl border text-start transition flex items-center justify-between cursor-pointer ${
                  paymentMode === 'real'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-900 shadow-xs'
                    : 'bg-surface border-line text-ink hover:bg-soft'
                }`}
              >
                <div>
                  <div className="font-black text-xs">درگاه واقعی شاپرک (Live Gateway)</div>
                  <div className="text-[10px] text-sub">اتصال به شاپرک و درگاه بانکی سامان</div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${paymentMode === 'real' ? 'border-emerald-500 bg-emerald-500' : 'border-line'}`} />
              </button>

              <button
                type="button"
                onClick={() => handleTogglePaymentMode('demo')}
                disabled={isTogglingPayment}
                className={`w-full p-4 rounded-2xl border text-start transition flex items-center justify-between cursor-pointer ${
                  paymentMode === 'demo'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-900 shadow-xs'
                    : 'bg-surface border-line text-ink hover:bg-soft'
                }`}
              >
                <div>
                  <div className="font-black text-xs">حالت شبیه‌ساز (Demo / Sandbox)</div>
                  <div className="text-[10px] text-sub">شبیه‌سازی تراکنش و صدور بدون کسر وجه واقعی</div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${paymentMode === 'demo' ? 'border-amber-500 bg-amber-500' : 'border-line'}`} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
