'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Building2, Link as LinkIcon, ShieldCheck, Activity, Plus, Save, RefreshCw, Loader2 } from 'lucide-react';
import { lt } from '@/lib/lt';
import { ErpPageHeader, ErpTabs, ErpSectionCard, ErpAlert, erpFieldCls, erpLabelCls, erpPrimaryBtnCls, ErpBadge } from '@/components/admin/erp-ui';
import { addSupplierConnection, rotateSupplierCredential } from '@/actions/admin-suppliers';

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

export default function SupplierDetailClient({ supplier }: SupplierProps) {
  const locale = useLocale();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('connections');

  // Connection Form State
  const [showAddConn, setShowAddConn] = useState(false);
  const [connForm, setConnForm] = useState({ productType: 'FLIGHT', baseUrl: '', environment: 'PRODUCTION', timeoutMs: 5000 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; msg: string } | null>(null);

  // Credential rotation state (connectionId currently rotating)
  const [rotatingConnId, setRotatingConnId] = useState<string | null>(null);

  const tabs = [
    { id: 'connections', label: lt(locale, { fa: 'اتصالات و کلیدها', en: 'Connections & Credentials' }), icon: <LinkIcon size={16} /> },
    { id: 'health', label: lt(locale, { fa: 'وضعیت سلامت', en: 'Health Dashboard' }), icon: <Activity size={16} /> },
    { id: 'contracts', label: lt(locale, { fa: 'قراردادها', en: 'Contracts' }), icon: <ShieldCheck size={16} /> },
  ];

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
      setConnForm({ productType: 'FLIGHT', baseUrl: '', environment: 'PRODUCTION', timeoutMs: 5000 });
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
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black text-ink">{lt(locale, { fa: 'اتصالات سیستم (SUP-002)', en: 'System Connections (SUP-002)' })}</h3>
            <button onClick={() => setShowAddConn(!showAddConn)} className={erpPrimaryBtnCls}>
              <Plus size={16} /> {lt(locale, { fa: 'افزودن اتصال جدید', en: 'Add Connection' })}
            </button>
          </div>

          {showAddConn && (
            <ErpSectionCard className="bg-soft/30 border-brand/20">
              <form onSubmit={handleAddConnection} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={erpLabelCls}>Product Type</label>
                  <select className={erpFieldCls} value={connForm.productType} onChange={e => setConnForm({...connForm, productType: e.target.value})}>
                    <option value="FLIGHT">FLIGHT</option>
                    <option value="HOTEL">HOTEL</option>
                    <option value="TRANSFER">TRANSFER</option>
                  </select>
                </div>
                <div>
                  <label className={erpLabelCls}>Base URL</label>
                  <input required type="url" className={erpFieldCls} value={connForm.baseUrl} onChange={e => setConnForm({...connForm, baseUrl: e.target.value})} placeholder="https://api.supplier.com/v1" />
                </div>
                <div>
                  <label className={erpLabelCls}>Environment</label>
                  <select className={erpFieldCls} value={connForm.environment} onChange={e => setConnForm({...connForm, environment: e.target.value})}>
                    <option value="PRODUCTION">PRODUCTION</option>
                    <option value="SANDBOX">SANDBOX</option>
                    <option value="DEMO">DEMO</option>
                  </select>
                </div>
                <div>
                  <label className={erpLabelCls}>Timeout (ms)</label>
                  <input required type="number" min="1000" className={erpFieldCls} value={connForm.timeoutMs} onChange={e => setConnForm({...connForm, timeoutMs: Number(e.target.value)})} />
                </div>
                <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                  <button type="button" onClick={() => setShowAddConn(false)} className="px-4 py-2 rounded-xl text-sub font-bold text-sm">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className={erpPrimaryBtnCls}>
                    <Save size={16} /> Save Connection
                  </button>
                </div>
              </form>
            </ErpSectionCard>
          )}

          {supplier.connections.length === 0 && !showAddConn && (
            <div className="p-8 text-center bg-surface border border-line rounded-2xl">
              <p className="text-sub font-bold text-sm">No connections configured yet.</p>
            </div>
          )}

          {supplier.connections.map((conn) => (
            <ErpSectionCard key={conn.id} className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-black text-ink flex items-center gap-2">
                    {conn.productType}
                    <ErpBadge tone={conn.environment === 'PRODUCTION' ? 'gold' : 'neutral'}>{conn.environment}</ErpBadge>
                  </h4>
                  <p className="text-xs font-mono text-sub mt-1">{conn.baseUrl}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-sub">Timeout: {conn.timeoutMs}ms</span>
                  <button
                    type="button"
                    onClick={() => handleRotate(conn.id)}
                    disabled={rotatingConnId === conn.id}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand/10 px-3 py-1.5 text-xs font-black text-brand-dark transition hover:bg-brand/20 disabled:opacity-60 cursor-pointer"
                    title={lt(locale, { fa: 'صدور کلید جدید و ابطال کلید فعلی', en: 'Issue a new key and deprecate the current one' })}
                  >
                    {rotatingConnId === conn.id ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    {lt(locale, { fa: 'چرخش کلید', en: 'Rotate key' })}
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
          ))}
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
                    <td className="px-4 py-3 font-mono text-xs">{new Date(record.windowStart).toLocaleString()}</td>
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
                  <div className="flex justify-between"><span className="text-sub font-bold">Credit Limit:</span><span className="font-mono font-black">{c.creditLimit.toLocaleString()} {c.currency}</span></div>
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
