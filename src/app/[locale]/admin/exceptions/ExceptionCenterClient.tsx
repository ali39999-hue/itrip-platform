'use client';

import React, { useState, useTransition } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Clock,
  UserCheck,
  Check,
  X,
  Filter,
} from 'lucide-react';
import { ERPDataGrid, ColumnDef } from '@/components/admin/ERPDataGrid';
import { ExceptionStats } from '@/domains/erp/ExceptionCenterService';
import { assignException, resolveException } from '@/actions/admin';
import { lt } from '@/lib/lt';

export interface ExceptionItem {
  id: string;
  type: string;
  severity: string;
  entityType: string;
  entityId: string;
  title: string;
  description: string | null;
  status: string;
  ownerId: string | null;
  slaDueAt: Date | null;
  detectedAt: Date;
  slaRemainingMinutes: number | null;
  isSlaBreached: boolean;
  slaStatus: 'ON_TRACK' | 'APPROACHING_BREACH' | 'BREACHED' | 'NO_SLA';
}

export function ExceptionCenterClient({
  exceptions,
  stats,
  locale,
}: {
  exceptions: ExceptionItem[];
  stats: ExceptionStats;
  locale: string;
}) {
  const [selectedQueue, setSelectedQueue] = useState<string>('ALL');
  const [isPending, startTransition] = useTransition();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [ownerInput, setOwnerInput] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const filteredByQueue = exceptions.filter((exc) => {
    if (selectedQueue === 'ALL') return true;
    return exc.type === selectedQueue;
  });

  const handleResolve = (id: string) => {
    if (!resolutionText.trim()) return;
    startTransition(async () => {
      try {
        await resolveException(id, resolutionText.trim());
        setFeedback('Exception marked as RESOLVED.');
        setResolvingId(null);
        setResolutionText('');
      } catch (err: unknown) {
        setFeedback(`Failed to resolve: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  };

  const handleAssign = (id: string) => {
    if (!ownerInput.trim()) return;
    startTransition(async () => {
      try {
        await assignException(id, ownerInput.trim());
        setFeedback(`Exception assigned to ${ownerInput.trim()}.`);
        setAssigningId(null);
        setOwnerInput('');
      } catch (err: unknown) {
        setFeedback(`Failed to assign: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  };

  const columns: ColumnDef<ExceptionItem>[] = [
    {
      key: 'type',
      header: 'Queue / Type',
      sortable: true,
      filterable: true,
      render: (row) => (
        <span className="px-2 py-0.5 rounded-md bg-ink text-surface text-[10px] font-black">
          {row.type}
        </span>
      ),
    },
    {
      key: 'severity',
      header: 'Severity',
      sortable: true,
      filterable: true,
      filterOptions: [
        { label: 'CRITICAL', value: 'CRITICAL' },
        { label: 'HIGH', value: 'HIGH' },
        { label: 'MEDIUM', value: 'MEDIUM' },
        { label: 'LOW', value: 'LOW' },
      ],
      render: (row) => {
        const isCritical = row.severity === 'CRITICAL' || row.severity === 'HIGH';
        return (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              isCritical
                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                : row.severity === 'MEDIUM'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {row.severity}
          </span>
        );
      },
    },
    {
      key: 'slaStatus',
      header: 'SLA Countdown',
      sortable: true,
      render: (row) => {
        if (!row.slaDueAt) {
          return <span className="text-sub text-[11px]">-</span>;
        }
        const isBreached = row.slaStatus === 'BREACHED';
        const isWarning = row.slaStatus === 'APPROACHING_BREACH';
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
              isBreached
                ? 'bg-rose-600 text-white animate-pulse'
                : isWarning
                ? 'bg-amber-500 text-white'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            <Clock size={11} />
            {isBreached
              ? `BREACHED (${Math.abs(row.slaRemainingMinutes || 0)}m)`
              : `${row.slaRemainingMinutes}m remaining`}
          </span>
        );
      },
    },
    {
      key: 'title',
      header: 'Title & Entity',
      sortable: true,
      render: (row) => (
        <div className="space-y-0.5 max-w-sm">
          <div className="font-bold text-ink">{row.title}</div>
          <div className="text-[11px] text-sub font-mono">
            {row.entityType}: {row.entityId}
          </div>
          {row.description && <p className="text-[11px] text-sub truncate">{row.description}</p>}
        </div>
      ),
    },
    {
      key: 'ownerId',
      header: 'Owner',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5">
          {assigningId === row.id ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={ownerInput}
                onChange={(e) => setOwnerInput(e.target.value)}
                placeholder="Owner ID"
                className="w-20 px-1.5 py-0.5 rounded border border-line text-[11px]"
              />
              <button
                type="button"
                onClick={() => handleAssign(row.id)}
                disabled={isPending}
                className="text-emerald-600 hover:text-emerald-700"
              >
                <Check size={13} />
              </button>
              <button
                type="button"
                onClick={() => setAssigningId(null)}
                className="text-sub hover:text-ink"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="font-medium text-[11px]">{row.ownerId || 'Unassigned'}</span>
              <button
                type="button"
                onClick={() => {
                  setAssigningId(row.id);
                  setOwnerInput(row.ownerId || '');
                }}
                className="p-0.5 text-sub hover:text-ink"
                title="Assign operator"
              >
                <UserCheck size={12} />
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      filterOptions: [
        { label: 'OPEN', value: 'OPEN' },
        { label: 'IN_PROGRESS', value: 'IN_PROGRESS' },
        { label: 'RESOLVED', value: 'RESOLVED' },
      ],
      render: (row) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-surface border border-line">
          {row.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (row) => {
        if (row.status === 'RESOLVED' || row.status === 'CLOSED') {
          return <span className="text-[11px] text-emerald-600 font-bold">Resolved</span>;
        }

        if (resolvingId === row.id) {
          return (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
                placeholder="Resolution note"
                className="w-28 px-1.5 py-0.5 rounded border border-line text-[11px]"
              />
              <button
                type="button"
                onClick={() => handleResolve(row.id)}
                disabled={isPending || !resolutionText.trim()}
                className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setResolvingId(null)}
                className="p-0.5 text-sub hover:text-ink"
              >
                <X size={13} />
              </button>
            </div>
          );
        }

        return (
          <button
            type="button"
            onClick={() => {
              setResolvingId(row.id);
              setResolutionText('');
            }}
            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-bold transition"
          >
            Resolve
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="p-3.5 rounded-2xl bg-brand/10 border border-brand/20 text-brand-dark text-xs font-bold flex items-center justify-between">
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback(null)} className="text-sub hover:text-ink">
            Dismiss
          </button>
        </div>
      )}

      {/* Standard Queue Tabs (ERP-104) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
        <button
          type="button"
          onClick={() => setSelectedQueue('ALL')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition ${
            selectedQueue === 'ALL'
              ? 'bg-brand-dark text-surface'
              : 'bg-soft text-sub hover:text-ink'
          }`}
        >
          <span>All Exceptions</span>
          <span className="ms-1 px-1.5 py-0.2 rounded-full text-[10px] bg-surface text-ink font-bold">
            {stats.open}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedQueue('TICKET_NOT_ISSUED')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition ${
            selectedQueue === 'TICKET_NOT_ISSUED'
              ? 'bg-brand-dark text-surface'
              : 'bg-soft text-sub hover:text-ink'
          }`}
        >
          <span>Ticket Not Issued</span>
          <span className="ms-1 px-1.5 py-0.2 rounded-full text-[10px] bg-surface text-ink font-bold">
            {stats.queueCounts.TICKET_NOT_ISSUED}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedQueue('PAYMENT_MISMATCH')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition ${
            selectedQueue === 'PAYMENT_MISMATCH'
              ? 'bg-brand-dark text-surface'
              : 'bg-soft text-sub hover:text-ink'
          }`}
        >
          <span>Payment Mismatch</span>
          <span className="ms-1 px-1.5 py-0.2 rounded-full text-[10px] bg-surface text-ink font-bold">
            {stats.queueCounts.PAYMENT_MISMATCH}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedQueue('SUPPLIER_TIMEOUT')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition ${
            selectedQueue === 'SUPPLIER_TIMEOUT'
              ? 'bg-brand-dark text-surface'
              : 'bg-soft text-sub hover:text-ink'
          }`}
        >
          <span>Supplier Timeout</span>
          <span className="ms-1 px-1.5 py-0.2 rounded-full text-[10px] bg-surface text-ink font-bold">
            {stats.queueCounts.SUPPLIER_TIMEOUT}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedQueue('REFUND_TIMEOUT')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition ${
            selectedQueue === 'REFUND_TIMEOUT'
              ? 'bg-brand-dark text-surface'
              : 'bg-soft text-sub hover:text-ink'
          }`}
        >
          <span>Refund Timeout</span>
          <span className="ms-1 px-1.5 py-0.2 rounded-full text-[10px] bg-surface text-ink font-bold">
            {stats.queueCounts.REFUND_TIMEOUT}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedQueue('PRICE_MISMATCH')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition ${
            selectedQueue === 'PRICE_MISMATCH'
              ? 'bg-brand-dark text-surface'
              : 'bg-soft text-sub hover:text-ink'
          }`}
        >
          <span>Price Mismatch</span>
          <span className="ms-1 px-1.5 py-0.2 rounded-full text-[10px] bg-surface text-ink font-bold">
            {stats.queueCounts.PRICE_MISMATCH}
          </span>
        </button>
      </div>

      {/* High Priority Alerts Banner */}
      {stats.breachedSlaCount > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertOctagon size={16} className="text-rose-600 shrink-0" />
          <span>
            {stats.breachedSlaCount} exceptions have breached their SLA deadline and require immediate operator intervention.
          </span>
        </div>
      )}

      {/* Reusable ERPDataGrid for Exceptions (ERP-105) */}
      <ERPDataGrid<ExceptionItem>
        data={filteredByQueue}
        columns={columns}
        idAccessor={(row) => row.id}
        title={`Queue: ${selectedQueue.replace(/_/g, ' ')}`}
        description="Filter, sort, and manage operational discrepancies with strict SLA enforcement"
        savedViewStorageKey="exception_center_views"
      />
    </div>
  );
}
