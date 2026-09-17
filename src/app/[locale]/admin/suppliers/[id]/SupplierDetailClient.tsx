'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  Building2,
  Link as LinkIcon,
  ShieldCheck,
  Activity,
  Plus,
  Save,
  RefreshCw,
  Loader2,
  Zap,
  Download,
  Trash2,
  Copy,
  Check,
  Upload,
  FileCode,
  FileText,
  Sparkles,
} from 'lucide-react';
import { lt } from '@/lib/lt';
import {
  ErpPageHeader,
  ErpTabs,
  ErpSectionCard,
  ErpAlert,
  erpFieldCls,
  erpLabelCls,
  erpPrimaryBtnCls,
  ErpBadge,
} from '@/components/admin/erp-ui';
import {
  addSupplierConnection,
  rotateSupplierCredential,
  testSupplierApiConnectionAction,
  syncSupplierCatalogAction,
  deleteSupplierConnectionAction,
} from '@/actions/admin-suppliers';

export type CredentialItem = {
  id: string;
  credentialRef: string;
  rotationState: string;
};

export type ConnectionItem = {
  id: string;
  productType: string;
  environment: string;
  baseUrl: string;
  timeoutMs: number;
  credentials: CredentialItem[];
};

export type ContractItem = {
  id: string;
  pricingType: string;
  commission: number;
  creditLimit: number;
  currency: string;
};

export type HealthRecordItem = {
  id: string;
  windowStart: string | Date;
  successRate: number;
  errorRate: number;
  timeoutRate: number;
  latencyP50: number;
  latencyP95: number;
};

type SupplierProps = {
  supplier: {
    id: string;
    name: string;
    type: string;
    mode: string;
    contact: string | null;
    isActive: boolean;
    connections: ConnectionItem[];
    contracts: ContractItem[];
    healthRecords: HealthRecordItem[];
    _count: { inventoryItems: number; statements: number };
  };
};

const initialConnForm = {
  productType: 'FLIGHT',
  protocol: 'REST_JSON',
  authType: 'API_KEY_HEADER',
  baseUrl: '',
  apiKey: '',
  officeId: '',
  environment: 'PRODUCTION',
  timeoutMs: 5000,
};

export default function SupplierDetailClient({ supplier }: SupplierProps) {
  const locale = useLocale();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('connections');

  // Connection Form State
  const [showAddConn, setShowAddConn] = useState(false);
  const [connForm, setConnForm] = useState(initialConnForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; msg: string } | null>(null);

  // Operations states
  const [testingConnId, setTestingConnId] = useState<string | null>(null);
  const [syncingConnId, setSyncingConnId] = useState<string | null>(null);
  const [deletingConnId, setDeletingConnId] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, {
    success: boolean;
    statusCode?: number;
    latencyMs?: number;
    protocol?: string;
    message?: string;
    error?: string;
  }>>({});

  // Credential rotation state (connectionId currently rotating)
  const [rotatingConnId, setRotatingConnId] = useState<string | null>(null);

  const tabs = [
    { id: 'connections', label: lt(locale, { fa: 'اتصالات و کلیدها', en: 'Connections & Credentials' }), icon: <LinkIcon size={16} /> },
    { id: 'health', label: lt(locale, { fa: 'وضعیت سلامت', en: 'Health Dashboard' }), icon: <Activity size={16} /> },
    { id: 'contracts', label: lt(locale, { fa: 'قراردادها', en: 'Contracts' }), icon: <ShieldCheck size={16} /> },
  ];

  async function handleTestConnection(connId: string, baseUrl: string, timeoutMs: number) {
    setTestingConnId(connId);
    try {
      const res = await testSupplierApiConnectionAction({ connectionId: connId, baseUrl, timeoutMs });
      setTestResults((prev) => ({
        ...prev,
        [connId]: res,
      }));
      if (res.success) {
        setFeedback({ tone: 'success', msg: `تست موفق: ${res.message} (زمان پاسخ: ${res.latencyMs}ms)` });
      } else {
        setFeedback({ tone: 'error', msg: `خطا در اتصال: ${res.error || 'عدم پاسخگویی'}` });
      }
    } catch {
      setFeedback({ tone: 'error', msg: 'خطا در اجرای تست ارتباط' });
    } finally {
      setTestingConnId(null);
    }
  }

  async function handleSyncCatalog(connId: string) {
    setSyncingConnId(connId);
    setFeedback(null);
    try {
      const res = await syncSupplierCatalogAction(supplier.id, connId);
      if (res.success) {
        setFeedback({ tone: 'success', msg: res.message || 'کاتالوگ با موفقیت همگام شد.' });
        router.refresh();
      } else {
        setFeedback({ tone: 'error', msg: res.error || 'خطا در همگام‌سازی کاتالوگ' });
      }
    } catch {
      setFeedback({ tone: 'error', msg: 'خطای سیستمی در همگام‌سازی' });
    } finally {
      setSyncingConnId(null);
    }
  }

  async function handleDeleteConnection(connId: string) {
    if (!window.confirm('آیا از حذف این اتصال اطمینان دارید؟')) return;
    setDeletingConnId(connId);
    try {
      const res = await deleteSupplierConnectionAction(connId, supplier.id);
      if (res.success) {
        setFeedback({ tone: 'success', msg: 'اتصال با موفقیت حذف شد.' });
        router.refresh();
      } else {
        setFeedback({ tone: 'error', msg: res.error || 'خطا در حذف اتصال' });
      }
    } catch {
      setFeedback({ tone: 'error', msg: 'خطا در حذف اتصال' });
    } finally {
      setDeletingConnId(null);
    }
  }

  const [origin, setOrigin] = useState('https://firuzo.com');
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location?.origin) {
      setOrigin(window.location.origin);
    }
  }, []);

  const webhookCallbackUrl = `${origin}/api/suppliers/${supplier.id}/callback`;

  function copyWebhookUrl() {
    navigator.clipboard.writeText(webhookCallbackUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  }

  // Ingestion Modes: FORM, PASTE_TEXT, UPLOAD_FILE
  const [inputMode, setInputMode] = useState<'FORM' | 'PASTE_TEXT' | 'UPLOAD_FILE'>('FORM');
  const [rawSnippet, setRawSnippet] = useState('');

  const PRESETS: Record<string, {
    label: string;
    productType: string;
    protocol: string;
    authType: string;
    baseUrl: string;
    officeId: string;
    timeoutMs: number;
    hint: string;
  }> = {
    PARTO_FLIGHT: {
      label: 'پارتو پرواز (Parto GDS SOAP)',
      productType: 'FLIGHT',
      protocol: 'SOAP_WSDL',
      authType: 'OFFICE_ID_PCC',
      baseUrl: 'https://api.partocrs.com/AirServices.asmx',
      officeId: 'THR-FZ-GDS',
      timeoutMs: 8000,
      hint: 'اتصال رسمی به وب‌سرویس پروازهای داخلی و خارجی پارتو (SOAP/XML)',
    },
    NADIA_FLIGHT: {
      label: 'نادیا پرواز (Nadia Flight REST)',
      productType: 'FLIGHT',
      protocol: 'REST_JSON',
      authType: 'API_KEY_HEADER',
      baseUrl: 'https://api.nadiacrs.ir/v1',
      officeId: 'NADIA-FZ-101',
      timeoutMs: 6000,
      hint: 'وب‌سرویس مدرن پروازهای چارتری و سیستمی نادیا (REST/JSON)',
    },
    EGHAMAT_HOTEL: {
      label: 'اقامت۲۴ هتل (Eghamat24 B2B)',
      productType: 'HOTEL',
      protocol: 'REST_JSON',
      authType: 'API_KEY_HEADER',
      baseUrl: 'https://b2b.eghamat24.com/api/v3',
      officeId: 'EGHAMAT-PARTNER',
      timeoutMs: 7000,
      hint: 'رزرو آنلاین و گارانتی بیش از ۱۲۰۰ هتل در ایران',
    },
    AMADEUS_GDS: {
      label: 'آمادئوس جهانی (Amadeus GDS)',
      productType: 'FLIGHT',
      protocol: 'REST_JSON',
      authType: 'BEARER_TOKEN',
      baseUrl: 'https://api.amadeus.com/v2',
      officeId: '1ASIROFZR',
      timeoutMs: 5000,
      hint: 'ارتباط مستقیم با خطوط هوایی بین‌المللی IATA',
    },
  };

  function applyPreset(presetKey: string) {
    const p = PRESETS[presetKey];
    if (!p) return;
    setConnForm((prev) => ({
      ...prev,
      productType: p.productType,
      protocol: p.protocol,
      authType: p.authType,
      baseUrl: p.baseUrl,
      officeId: p.officeId,
      timeoutMs: p.timeoutMs,
    }));
    setInputMode('FORM');
    setFeedback({
      tone: 'success',
      msg: `قالب پیش‌فرض ${p.label} اعمال شد. لطفاً کلید API و رمز اختصاصی خود را وارد و ذخیره کنید.`,
    });
  }

  function parseAndApplySnippet(text: string) {
    if (!text || !text.trim()) return;
    const clean = text.trim();

    try {
      if (clean.startsWith('{') && clean.endsWith('}')) {
        const json = JSON.parse(clean);
        setConnForm((prev) => ({
          ...prev,
          productType: json.productType || json.type || prev.productType,
          protocol: json.protocol || prev.protocol,
          authType: json.authType || prev.authType,
          baseUrl: json.baseUrl || json.url || json.endpoint || prev.baseUrl,
          apiKey: json.apiKey || json.token || json.secret || prev.apiKey,
          officeId: json.officeId || json.pcc || json.terminal || prev.officeId,
          environment: json.environment || prev.environment,
          timeoutMs: Number(json.timeoutMs || json.timeout || prev.timeoutMs),
        }));
        setInputMode('FORM');
        setFeedback({ tone: 'success', msg: 'کانفیگ JSON با موفقیت تحلیل و در فرم جایگذاری شد.' });
        return;
      }
    } catch {
      // Non-JSON snippet
    }

    if (clean.includes('curl')) {
      const urlMatch = clean.match(/https?:\/\/[^\s'"]+/i);
      const authMatch = clean.match(/(?:Authorization|X-Api-Key|token):\s*(?:Bearer\s+)?([A-Za-z0-9_\-\.]+)/i);
      if (urlMatch) {
        setConnForm((prev) => ({
          ...prev,
          baseUrl: urlMatch[0],
          apiKey: authMatch ? authMatch[1] : prev.apiKey,
        }));
        setInputMode('FORM');
        setFeedback({ tone: 'success', msg: 'فرمان cURL تحلیل شد و آدرس وب‌سرویس استخراج گردید.' });
        return;
      }
    }

    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      setConnForm((prev) => ({ ...prev, baseUrl: clean.split('\n')[0].trim() }));
      setInputMode('FORM');
      setFeedback({ tone: 'success', msg: 'آدرس وب‌سرویس با موفقیت ثبت شد.' });
      return;
    }

    setFeedback({ tone: 'error', msg: 'فرمت متن قابل تشخیص نبود. لطفاً JSON معتبر یا دستور cURL وارد کنید.' });
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        parseAndApplySnippet(content);
      }
    };
    reader.onerror = () => {
      setFeedback({ tone: 'error', msg: 'خطا در خواندن فایل بارگذاری‌شده' });
    };
    reader.readAsText(file);
  }

  async function handleAddConnection(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await addSupplierConnection({
        supplierId: supplier.id,
        ...connForm,
      });
      setFeedback({ tone: 'success', msg: lt(locale, { fa: 'اتصال جدید با موفقیت ثبت شد.', en: 'Connection saved successfully.' }) });
      setShowAddConn(false);
      setConnForm(initialConnForm);
      router.refresh(); // pick up the revalidated server data
    } catch (err) {
      setFeedback({ tone: 'error', msg: err instanceof Error ? err.message : lt(locale, { fa: 'خطا در ثبت اتصال', en: 'Failed to save connection.' }) });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRotate(connectionId: string) {
    if (rotatingConnId) return;
    setRotatingConnId(connectionId);
    setFeedback(null);
    try {
      await rotateSupplierCredential({ connectionId, supplierId: supplier.id });
      setFeedback({ tone: 'success', msg: lt(locale, { fa: 'کلید جدید صادر و کلید قبلی طی ۲۴ ساعت آینده باطل می‌شود.', en: 'New credential issued; the previous key is deprecated within 24h.' }) });
      router.refresh();
    } catch (err) {
      setFeedback({ tone: 'error', msg: err instanceof Error ? err.message : lt(locale, { fa: 'خطا در چرخش کلید', en: 'Credential rotation failed.' }) });
    } finally {
      setRotatingConnId(null);
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-[1400px] mx-auto space-y-6">
      <ErpPageHeader
        title={supplier.name}
        description={lt(locale, { fa: 'مدیریت اعتبارنامه‌ها و مانیتورینگ سلامت تامین‌کننده', en: 'Manage credentials and monitor supplier health' })}
        icon={<Building2 size={24} className="text-brand-dark" />}
        actions={
          <ErpBadge tone={supplier.isActive ? 'green' : 'neutral'}>
            {supplier.isActive ? 'ACTIVE' : 'INACTIVE'}
          </ErpBadge>
        }
      />

      <ErpTabs options={tabs} value={activeTab} onChange={setActiveTab} />

      {activeTab === 'connections' && (
        <div className="space-y-6">
          {feedback && (
            <ErpAlert tone={feedback.tone} onDismiss={() => setFeedback(null)}>{feedback.msg}</ErpAlert>
          )}
          {/* Inbound Webhook & Callback Card */}
          <div className="rounded-2xl border border-line bg-gradient-to-r from-soft/60 to-surface p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="space-y-1">
              <span className="text-xs font-black text-ink flex items-center gap-1.5">
                <LinkIcon size={14} className="text-brand" />
                {lt(locale, { fa: 'آدرس وب‌هوک و کال‌بک اختصاصی تأمین‌کننده', en: 'Inbound Webhook & Callback URL' })}
              </span>
              <p className="text-[11px] text-sub">
                {lt(locale, { fa: 'این آدرس را در پنل ایرلاین/هتل ثبت کنید تا وضعیت صدور بلیط و تغییرات ظرفیت فوراً به سرور تزریق شود.', en: 'Configure this URL in the supplier portal to receive real-time ticket issuance and inventory updates.' })}
              </p>
              <code
                dir="ltr"
                suppressHydrationWarning
                className="block text-xs font-mono font-bold text-brand-dark bg-surface px-2.5 py-1 rounded-lg border border-line w-fit"
              >
                {webhookCallbackUrl}
              </code>
            </div>
            <button
              type="button"
              onClick={copyWebhookUrl}
              className="self-start md:self-center min-h-[40px] px-3.5 py-1.5 rounded-xl border border-line bg-surface hover:bg-soft text-ink text-xs font-bold flex items-center gap-1.5 transition active:scale-[0.98] cursor-pointer"
            >
              {copiedWebhook ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copiedWebhook ? lt(locale, { fa: 'کپی شد ✓', en: 'Copied ✓' }) : lt(locale, { fa: 'کپی لینک وب‌هوک', en: 'Copy Webhook URL' })}</span>
            </button>
          </div>

          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black text-ink">{lt(locale, { fa: 'اتصالات سیستم (SUP-002)', en: 'System Connections (SUP-002)' })}</h3>
            <button onClick={() => setShowAddConn(!showAddConn)} className={erpPrimaryBtnCls}>
              <Plus size={16} /> {lt(locale, { fa: 'افزودن اتصال جدید', en: 'Add Connection' })}
            </button>
          </div>

          {showAddConn && (
            <ErpSectionCard className="bg-soft/30 border-brand/20 space-y-4">
              {/* Presets Bar */}
              <div>
                <span className="text-xs font-black text-ink flex items-center gap-1.5 mb-2">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>{lt(locale, { fa: 'بارگذاری سریع از قالب‌های آماده تأمین‌کنندگان سفر:', en: 'Quick load from pre-configured supplier templates:' })}</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(PRESETS).map(([key, p]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => applyPreset(key)}
                      className="px-3 py-1.5 rounded-xl border border-line bg-surface hover:border-brand/40 text-[11px] font-bold text-ink transition active:scale-[0.98] cursor-pointer"
                      title={p.hint}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode Tabs */}
              <div className="flex items-center gap-2 border-b border-line pb-2">
                <button
                  type="button"
                  onClick={() => setInputMode('FORM')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    inputMode === 'FORM' ? 'bg-brand text-white' : 'bg-surface text-sub hover:text-ink'
                  }`}
                >
                  {lt(locale, { fa: 'فرم تفکیک‌شده دستی', en: 'Manual Form' })}
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('PASTE_TEXT')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    inputMode === 'PASTE_TEXT' ? 'bg-brand text-white' : 'bg-surface text-sub hover:text-ink'
                  }`}
                >
                  <FileCode size={13} />
                  <span>{lt(locale, { fa: 'جایگذاری متن / JSON / cURL', en: 'Paste Text / cURL / JSON' })}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('UPLOAD_FILE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    inputMode === 'UPLOAD_FILE' ? 'bg-brand text-white' : 'bg-surface text-sub hover:text-ink'
                  }`}
                >
                  <Upload size={13} />
                  <span>{lt(locale, { fa: 'بارگذاری فایل کانفیگ (.json/.yaml)', en: 'Upload Config File' })}</span>
                </button>
              </div>

              {/* Paste Text Mode */}
              {inputMode === 'PASTE_TEXT' && (
                <div className="space-y-3">
                  <label className={erpLabelCls}>
                    {lt(locale, { fa: 'متن کانفیگ، JSON یا دستور cURL وب‌سرویس را اینجا قرار دهید:', en: 'Paste API JSON config or cURL request below:' })}
                  </label>
                  <textarea
                    rows={6}
                    dir="ltr"
                    value={rawSnippet}
                    onChange={(e) => setRawSnippet(e.target.value)}
                    placeholder={`{\n  "baseUrl": "https://api.partocrs.com/v2",\n  "protocol": "SOAP_WSDL",\n  "apiKey": "sk_live_123456",\n  "officeId": "THR-FZ-101"\n}\n\nیا دستور cURL:\ncurl 'https://api.supplier.com/v1' -H 'Authorization: Bearer token'`}
                    className={`${erpFieldCls} font-mono text-xs`}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => parseAndApplySnippet(rawSnippet)}
                      disabled={!rawSnippet.trim()}
                      className={erpPrimaryBtnCls}
                    >
                      <Sparkles size={14} />
                      <span>{lt(locale, { fa: 'تحلیل و جایگذاری خودکار در فرم', en: 'Parse & Populate Form' })}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* File Upload Mode */}
              {inputMode === 'UPLOAD_FILE' && (
                <div className="border-2 border-dashed border-line rounded-2xl p-8 text-center space-y-3 bg-surface">
                  <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand grid place-items-center mx-auto">
                    <Upload size={22} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-ink">
                      {lt(locale, { fa: 'فایل مشخصات یا کانفیگ API را انتخاب یا رها کنید', en: 'Upload API Specification or Config file' })}
                    </h4>
                    <p className="text-xs text-sub mt-1">
                      {lt(locale, { fa: 'پشتیبانی از فرمت‌های JSON, YAML, WSDL, Postman و متن', en: 'Supports JSON, YAML, WSDL, Postman and text files' })}
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-xs font-black cursor-pointer hover:bg-brand-dark transition active:scale-[0.98]">
                    <FileText size={14} />
                    <span>{lt(locale, { fa: 'انتخاب فایل از رایانه', en: 'Browse File' })}</span>
                    <input
                      type="file"
                      accept=".json,.yaml,.yml,.xml,.txt,.wsdl"
                      onChange={handleFileUpload}
                      className="sr-only"
                    />
                  </label>
                </div>
              )}

              {/* Manual Form */}
              <form onSubmit={handleAddConnection} className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${inputMode !== 'FORM' ? 'pt-4 border-t border-line' : ''}`}>
                <div>
                  <label className={erpLabelCls}>نوع محصول (Product Type)</label>
                  <select className={erpFieldCls} value={connForm.productType} onChange={e => setConnForm({...connForm, productType: e.target.value})}>
                    <option value="FLIGHT">پرواز (FLIGHT)</option>
                    <option value="HOTEL">هتل و اقامتگاه (HOTEL)</option>
                    <option value="TOUR">تور و گشت (TOUR)</option>
                    <option value="TRANSFER">ترانسفر و فرودگاهی (TRANSFER)</option>
                  </select>
                </div>
                <div>
                  <label className={erpLabelCls}>پروتکل اتصال (Connection Protocol)</label>
                  <select className={erpFieldCls} value={connForm.protocol} onChange={e => setConnForm({...connForm, protocol: e.target.value})}>
                    <option value="REST_JSON">REST / JSON API (Modern OTA)</option>
                    <option value="SOAP_WSDL">SOAP / XML / WSDL (GDS AirLowFare / Amadeus)</option>
                    <option value="GRAPHQL">GraphQL API</option>
                    <option value="PORTAL_BOT">Portal Session Bot (Human-in-the-loop)</option>
                  </select>
                </div>
                <div>
                  <label className={erpLabelCls}>روش احراز هویت (Auth Method)</label>
                  <select className={erpFieldCls} value={connForm.authType} onChange={e => setConnForm({...connForm, authType: e.target.value})}>
                    <option value="API_KEY_HEADER">API Key / Token (Header)</option>
                    <option value="BEARER_TOKEN">OAuth 2.0 / Bearer Token</option>
                    <option value="BASIC_AUTH">Basic Auth (Username / Password)</option>
                    <option value="OFFICE_ID_PCC">Office ID / Pseudo City Code (GDS)</option>
                  </select>
                </div>
                <div>
                  <label className={erpLabelCls}>آدرس اصلی وب‌سرویس (Base URL)</label>
                  <input required type="url" className={erpFieldCls} value={connForm.baseUrl} onChange={e => setConnForm({...connForm, baseUrl: e.target.value})} placeholder="https://api.partocrs.com/v2" />
                </div>
                <div>
                  <label className={erpLabelCls}>کلید محرمانه API / توکن دسترسی (Secret Key / Token)</label>
                  <input type="password" className={erpFieldCls} value={connForm.apiKey} onChange={e => setConnForm({...connForm, apiKey: e.target.value})} placeholder="sk_live_... / Token" />
                </div>
                <div>
                  <label className={erpLabelCls}>شناسه دفتر یا کد آژانس (Office ID / PCC / Terminal)</label>
                  <input type="text" className={erpFieldCls} value={connForm.officeId} onChange={e => setConnForm({...connForm, officeId: e.target.value})} placeholder="THR-FIRUZO-MAIN" />
                </div>
                <div>
                  <label className={erpLabelCls}>محیط استقرار (Environment)</label>
                  <select className={erpFieldCls} value={connForm.environment} onChange={e => setConnForm({...connForm, environment: e.target.value})}>
                    <option value="PRODUCTION">تولید واقعی (PRODUCTION)</option>
                    <option value="SANDBOX">آزمایشگاهی (SANDBOX)</option>
                    <option value="DEMO">شبیه‌ساز (DEMO)</option>
                  </select>
                </div>
                <div>
                  <label className={erpLabelCls}>حداکثر زمان انتظار (Timeout ms)</label>
                  <input required type="number" min="1000" max="30000" className={erpFieldCls} value={connForm.timeoutMs} onChange={e => setConnForm({...connForm, timeoutMs: Number(e.target.value)})} />
                </div>
                <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                  <button type="button" onClick={() => setShowAddConn(false)} className="px-4 py-2 rounded-xl text-sub font-bold text-sm">انصراف</button>
                  <button type="submit" disabled={isSubmitting} className={erpPrimaryBtnCls}>
                    <Save size={16} /> ذخیره و ثبت اتصال
                  </button>
                </div>
              </form>
            </ErpSectionCard>
          )}

          {supplier.connections.length === 0 && !showAddConn && (
            <div className="p-10 text-center bg-surface border border-dashed border-line rounded-3xl space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-brand/10 text-brand grid place-items-center mx-auto">
                <LinkIcon size={26} />
              </div>
              <div>
                <h4 className="text-sm font-black text-ink">
                  {lt(locale, { fa: 'هنوز وب‌سرویس یا کلید API برای این تأمین‌کننده تعریف نشده است', en: 'No API connection configured yet' })}
                </h4>
                <p className="text-xs text-sub mt-1 max-w-md mx-auto">
                  {lt(locale, { fa: 'می‌توانید اطلاعات وب‌سرویس را به صورت دستی وارد کنید، متن JSON یا cURL را پیست کنید، یا از قالب‌های آماده پارتو، نادیا و اقامت۲۴ استفاده نمایید.', en: 'You can configure manual endpoints, paste JSON/cURL, or use preset supplier templates.' })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddConn(true)}
                className={`${erpPrimaryBtnCls} mx-auto`}
              >
                <Plus size={16} />
                <span>{lt(locale, { fa: 'پیکربندی و بارگذاری اتصال API', en: 'Configure API Connection' })}</span>
              </button>
            </div>
          )}

          {supplier.connections.map((conn) => {
            const result = testResults[conn.id];
            const isTesting = testingConnId === conn.id;
            const isSyncing = syncingConnId === conn.id;
            const isDeleting = deletingConnId === conn.id;

            return (
              <ErpSectionCard key={conn.id} className="space-y-4">
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div>
                    <h4 className="font-black text-ink flex items-center gap-2">
                      {conn.productType}
                      <ErpBadge tone={conn.environment === 'PRODUCTION' ? 'gold' : 'neutral'}>{conn.environment}</ErpBadge>
                      {result && (
                        <span className={`px-2 py-0.5 rounded text-[10.5px] font-mono font-bold ${result.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {result.success ? `✓ ${result.statusCode} OK (${result.latencyMs}ms)` : `❌ ${result.statusCode || 'FAIL'}`}
                        </span>
                      )}
                    </h4>
                    <p className="text-xs font-mono text-sub mt-1" dir="ltr">{conn.baseUrl}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-sub font-mono me-2">Timeout: {conn.timeoutMs}ms</span>

                    {/* Test Connection Button */}
                    <button
                      type="button"
                      onClick={() => handleTestConnection(conn.id, conn.baseUrl, conn.timeoutMs)}
                      disabled={isTesting}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 text-xs font-black text-amber-800 dark:text-amber-300 transition cursor-pointer disabled:opacity-50"
                      title="ارسال درخواست آزمایشی برای پایش اتصال و اندازه‌گیری تاخیر"
                    >
                      {isTesting ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                      <span>{lt(locale, { fa: 'تست اتصال زنده', en: 'Test API' })}</span>
                    </button>

                    {/* Sync Offers Button */}
                    <button
                      type="button"
                      onClick={() => handleSyncCatalog(conn.id)}
                      disabled={isSyncing}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 text-xs font-black text-emerald-800 dark:text-emerald-300 transition cursor-pointer disabled:opacity-50"
                      title="دریافت آخرین ظرفیت‌ها و نرخ‌های پرواز/هتل از وب‌سرویس"
                    >
                      {isSyncing ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                      <span>{lt(locale, { fa: 'سینک کاتالوگ و نرخ‌ها', en: 'Sync Offers' })}</span>
                    </button>

                    {/* Key Rotation Button */}
                    <button
                      type="button"
                      onClick={() => handleRotate(conn.id)}
                      disabled={rotatingConnId === conn.id}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-brand/10 px-3 py-1.5 text-xs font-black text-brand-dark transition hover:bg-brand/20 disabled:opacity-60 cursor-pointer"
                      title={lt(locale, { fa: 'صدور کلید جدید و ابطال کلید فعلی', en: 'Issue a new key and deprecate the current one' })}
                    >
                      {rotatingConnId === conn.id ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                      <span>{lt(locale, { fa: 'چرخش کلید', en: 'Rotate key' })}</span>
                    </button>

                    {/* Delete Connection Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteConnection(conn.id)}
                      disabled={isDeleting}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1.5 text-xs font-black text-rose-600 dark:text-rose-400 transition cursor-pointer disabled:opacity-50"
                      title="حذف این اتصال از سیستم"
                    >
                      {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>

                <div className="bg-soft/50 rounded-xl p-4 border border-line/60">
                  <h5 className="text-xs font-black text-ink mb-3 uppercase tracking-wider">Active Credentials (Vault Refs)</h5>
                  {conn.credentials.length === 0 ? (
                    <p className="text-xs font-bold text-sub">No credentials configured.</p>
                  ) : (
                    <div className="space-y-2">
                      {conn.credentials.map((cred: CredentialItem) => (
                        <div key={cred.id} className="flex justify-between items-center bg-surface px-3 py-2 rounded-lg border border-line shadow-sm">
                          <span className="font-mono text-xs text-ink">{cred.credentialRef}</span>
                          <ErpBadge tone={cred.rotationState === 'ACTIVE' ? 'green' : 'neutral'}>{cred.rotationState}</ErpBadge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ErpSectionCard>
            );
          })}
        </div>
      )}

      {activeTab === 'health' && (
        <div className="space-y-6">
          <h3 className="text-lg font-black text-ink">{lt(locale, { fa: 'داشبورد سلامت (ERP-003)', en: 'Supplier Health Dashboard (ERP-003)' })}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ErpSectionCard>
              <h4 className="text-xs font-bold text-sub">Average Success Rate</h4>
              <p className="text-2xl font-black text-success mt-2">
                {supplier.healthRecords.length > 0 
                  ? (supplier.healthRecords.reduce((acc, r) => acc + r.successRate, 0) / supplier.healthRecords.length).toFixed(1)
                  : '100'}%
              </p>
            </ErpSectionCard>
            <ErpSectionCard>
              <h4 className="text-xs font-bold text-sub">Average P95 Latency</h4>
              <p className="text-2xl font-black text-ink mt-2">
                {supplier.healthRecords.length > 0 
                  ? Math.round(supplier.healthRecords.reduce((acc, r) => acc + r.latencyP95, 0) / supplier.healthRecords.length)
                  : '0'}ms
              </p>
            </ErpSectionCard>
            <ErpSectionCard>
              <h4 className="text-xs font-bold text-sub">Total Timeout Rate</h4>
              <p className="text-2xl font-black text-destructive mt-2">
                {supplier.healthRecords.length > 0 
                  ? (supplier.healthRecords.reduce((acc, r) => acc + r.timeoutRate, 0) / supplier.healthRecords.length).toFixed(2)
                  : '0.0'}%
              </p>
            </ErpSectionCard>
          </div>

          <div className="bg-surface rounded-2xl border border-line overflow-hidden">
            <table className="w-full text-start text-sm">
              <thead className="bg-soft border-b border-line text-xs uppercase text-sub font-black">
                <tr>
                  <th className="px-4 py-3">Window Start</th>
                  <th className="px-4 py-3">Success Rate</th>
                  <th className="px-4 py-3">Error Rate</th>
                  <th className="px-4 py-3">P50 Latency</th>
                  <th className="px-4 py-3">P95 Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {supplier.healthRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-soft/30 transition">
                    <td className="px-4 py-3 font-price text-xs">{new Date(record.windowStart).toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold text-success">{record.successRate.toFixed(1)}%</td>
                    <td className="px-4 py-3 font-bold text-destructive">{record.errorRate.toFixed(1)}%</td>
                    <td className="px-4 py-3 font-mono">{record.latencyP50}ms</td>
                    <td className="px-4 py-3 font-mono text-action">{record.latencyP95}ms</td>
                  </tr>
                ))}
                {supplier.healthRecords.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sub font-bold">No health telemetry available yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'contracts' && (
        <div className="space-y-6">
          <h3 className="text-lg font-black text-ink">{lt(locale, { fa: 'قراردادها', en: 'Contracts' })}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {supplier.contracts.map((c) => (
              <ErpSectionCard key={c.id}>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-black text-ink">{c.pricingType}</span>
                  <ErpBadge tone="green">Active</ErpBadge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-sub font-bold">Commission:</span><span className="font-mono font-black">{c.commission * 100}%</span></div>
                  <div className="flex justify-between"><span className="text-sub font-bold">Credit Limit:</span><span className="font-price font-black">{c.creditLimit.toLocaleString()} {c.currency}</span></div>
                </div>
              </ErpSectionCard>
            ))}
            {supplier.contracts.length === 0 && (
              <div className="col-span-2 p-8 text-center bg-surface border border-line rounded-2xl text-sub font-bold text-sm">
                No active contracts.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
