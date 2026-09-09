'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Trash2,
  Inbox,
  ListFilter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from 'next-intl';
import { lt } from '@/lib/lt';

export interface ColumnDef<T> {
  key: string;
  header: string;
  accessor?: (row: T) => unknown;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  filterOptions?: Array<{ label: string; value: string }>;
  csvAccessor?: (row: T) => string | number;
  className?: string;
}

export interface SavedViewPreset {
  id: string;
  name: string;
  search: string;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  columnFilters: Record<string, string>;
  pageSize: number;
}

export interface ERPDataGridProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  idAccessor?: (row: T) => string;
  onRowClick?: (row: T) => void;
  title?: string;
  description?: React.ReactNode;
  searchPlaceholder?: string;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  emptyStateMessage?: string;
  savedViewStorageKey?: string;
  actionsSlot?: React.ReactNode;
}

export function ERPDataGrid<T extends object>({
  data,
  columns,
  idAccessor = (row) => {
    const id: unknown = (row as Record<string, unknown>).id;
    return id ? String(id) : JSON.stringify(row);
  },
  onRowClick,
  title,
  description,
  searchPlaceholder,
  defaultPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  emptyStateMessage,
  savedViewStorageKey = 'erp_datagrid_views',
  actionsSlot,
}: ERPDataGridProps<T>) {
  const locale = useLocale();
  const resolvedSearchPlaceholder =
    searchPlaceholder ??
    lt(locale, {
      fa: 'جستجوی رکوردها (فوکوس با کلید "/")...',
      en: 'Search records (Press "/" to focus)...',
      ar: 'البحث في السجلات (اضغط "/" للتركيز)...',
      zh: '搜索记录（按 "/" 聚焦）...',
      ru: 'Поиск записей (нажмите "/" для фокуса)...',
    });
  const resolvedEmptyMessage =
    emptyStateMessage ??
    lt(locale, {
      fa: 'رکوردی مطابق این فیلترها پیدا نشد',
      en: 'No records found matching criteria',
      ar: 'لا توجد سجلات مطابقة للمعايير',
      zh: '未找到符合条件的记录',
      ru: 'Записи по критериям не найдены',
    });
  const [search, setSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [currentPage, setCurrentPage] = useState(1);

  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1);
  const tableRef = useRef<HTMLTableElement>(null);

  const [savedViews, setSavedViews] = useState<SavedViewPreset[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [newViewName, setNewViewName] = useState('');
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(savedViewStorageKey);
      if (stored) {
        setSavedViews(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage read errors in SSR/strict envs
    }
  }, [savedViewStorageKey]);

  const persistSavedViews = (views: SavedViewPreset[]) => {
    setSavedViews(views);
    try {
      localStorage.setItem(savedViewStorageKey, JSON.stringify(views));
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredData = useMemo(() => {
    const getCell = (row: T, key: string): unknown => (row as Record<string, unknown>)[key];
    return data.filter((row) => {
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesGlobal = columns.some((col) => {
          const val = col.accessor ? col.accessor(row) : getCell(row, col.key);
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(query);
        });
        if (!matchesGlobal) return false;
      }
      for (const [key, filterVal] of Object.entries(columnFilters)) {
        if (!filterVal) continue;
        const col = columns.find((c) => c.key === key);
        const cellVal = col?.accessor ? col.accessor(row) : getCell(row, key);
        if (cellVal === null || cellVal === undefined) return false;
        if (String(cellVal) !== filterVal) {
          return false;
        }
      }
      return true;
    });
  }, [data, search, columnFilters, columns]);

  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    const col = columns.find((c) => c.key === sortColumn);
    if (!col) return filteredData;
    return [...filteredData].sort((a, b) => {
      const cellOf = (row: T, key: string): unknown => (row as Record<string, unknown>)[key];
      const valA = col.accessor ? col.accessor(a) : cellOf(a, sortColumn);
      const valB = col.accessor ? col.accessor(b) : cellOf(b, sortColumn);
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      let comp = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        comp = valA - valB;
      } else {
        comp = String(valA).localeCompare(String(valB));
      }
      return sortDirection === 'asc' ? comp : -comp;
    });
  }, [filteredData, sortColumn, sortDirection, columns]);

  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedData = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, validCurrentPage, pageSize]);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const handleExportCsv = useCallback(() => {
    if (sortedData.length === 0) return;
    const headers = columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(',');
    const rows = sortedData.map((row) => {
      return columns
        .map((col) => {
          let val: string | number = '';
          if (col.csvAccessor) {
            val = col.csvAccessor(row);
          } else if (col.accessor) {
            val = col.accessor(row) as string | number;
          } else {
            val = (row as Record<string, unknown>)[col.key] as string | number;
          }
          if (val === null || val === undefined) val = '';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',');
    });
    const csvContent = [headers, ...rows].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `erp_export_${Date.now().toString(36)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [sortedData, columns]);

  const handleTableKeyDown = (e: React.KeyboardEvent<HTMLTableElement>) => {
    if (paginatedData.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedRowIndex((prev) => (prev < paginatedData.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedRowIndex((prev) => (prev > 0 ? prev - 1 : paginatedData.length - 1));
    } else if (e.key === 'Enter' && focusedRowIndex >= 0 && focusedRowIndex < paginatedData.length) {
      e.preventDefault();
      const row = paginatedData[focusedRowIndex];
      if (row && onRowClick) {
        onRowClick(row);
      }
    }
  };

  const applySavedView = (view: SavedViewPreset) => {
    setSearch(view.search);
    setSortColumn(view.sortColumn);
    setSortDirection(view.sortDirection);
    setColumnFilters(view.columnFilters);
    setPageSize(view.pageSize);
    setCurrentPage(1);
    setActiveViewId(view.id);
  };

  const resetToDefaultView = () => {
    setSearch('');
    setSortColumn(null);
    setSortDirection('asc');
    setColumnFilters({});
    setPageSize(defaultPageSize);
    setCurrentPage(1);
    setActiveViewId(null);
  };

  const handleSaveView = () => {
    if (!newViewName.trim()) return;
    const newPreset: SavedViewPreset = {
      id: `view_${Date.now().toString(36)}`,
      name: newViewName.trim(),
      search,
      sortColumn,
      sortDirection,
      columnFilters,
      pageSize,
    };
    const updated = [...savedViews, newPreset];
    persistSavedViews(updated);
    setActiveViewId(newPreset.id);
    setNewViewName('');
    setShowSaveViewModal(false);
  };

  const handleDeleteView = (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedViews.filter((v) => v.id !== viewId);
    persistSavedViews(updated);
    if (activeViewId === viewId) {
      setActiveViewId(null);
    }
  };

  const hasActiveFilters = search || Object.keys(columnFilters).length > 0 || sortColumn;
  const filterableCols = columns.filter((c) => c.filterable && c.filterOptions && c.filterOptions.length > 0);
  const rangeStart = totalItems > 0 ? (validCurrentPage - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(validCurrentPage * pageSize, totalItems);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, Math.min(validCurrentPage - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    for (let p = start; p <= end; p++) pages.push(p);
    return pages;
  }, [validCurrentPage, totalPages]);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-elev-1">
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            {title ? (
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-[15px] font-black text-ink">{title}</h2>
                  <span className="num shrink-0 rounded-full bg-soft px-2 py-0.5 text-[11px] font-black text-sub tabular-nums">
                    {totalItems}
                  </span>
                </div>
                {description && <p className="mt-1 text-xs font-medium text-sub">{description}</p>}
              </div>
            ) : <span />}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSaveViewModal((v) => !v)}
                aria-expanded={showSaveViewModal}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-xs font-black text-sub transition hover:border-brand/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <Bookmark size={13} aria-hidden="true" />
                <span>{lt(locale, { fa: 'ذخیره نما', en: 'Save View', ar: 'حفظ العرض', zh: '保存视图', ru: 'Сохранить вид' })}</span>
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={sortedData.length === 0}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-deep px-3.5 py-2 text-xs font-black text-surface shadow-elev-1 transition hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
              >
                <Download size={14} aria-hidden="true" />
                <span>{lt(locale, { fa: 'خروجی CSV', en: 'Export CSV', ar: 'تصدير CSV', zh: '导出 CSV', ru: 'Экспорт CSV' })}</span>
                <span className="num rounded-md bg-surface/20 px-1.5 py-0.5 text-[10px] tabular-nums">{sortedData.length}</span>
              </button>
              {actionsSlot}
            </div>
          </div>

          {/* Saved views */}
          {savedViews.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-line/60 pt-3">
              <span className="me-1 inline-flex items-center gap-1 text-[11px] font-black text-sub">
                <Bookmark size={11} aria-hidden="true" /> Views:
              </span>
              <button
                type="button"
                onClick={resetToDefaultView}
                className={cn('rounded-lg px-2.5 py-1.5 text-xs font-black transition', activeViewId === null ? 'bg-deep text-surface' : 'bg-soft text-sub hover:text-ink')}
              >
                Default
              </button>
              {savedViews.map((view) => (
                <span
                  key={view.id}
                  className={cn('group inline-flex items-center gap-0.5 rounded-lg py-0.5 pe-1 ps-2.5 text-xs font-black transition', activeViewId === view.id ? 'bg-deep text-surface' : 'bg-soft text-sub hover:text-ink')}
                >
                  <button type="button" onClick={() => applySavedView(view)} aria-pressed={activeViewId === view.id} className="rounded py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                    {view.name}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteView(view.id, e)}
                    aria-label={`Delete view ${view.name}`}
                    className="rounded p-1.5 opacity-60 transition hover:opacity-100 hover:text-rose-warm"
                  >
                    <Trash2 size={11} aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search + filters */}
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search size={15} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-sub/70" aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="search"
                aria-label={resolvedSearchPlaceholder}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={resolvedSearchPlaceholder}
                className="min-h-11 w-full rounded-xl border border-line bg-soft/50 py-2.5 pe-10 ps-10 text-[13px] font-medium text-ink transition placeholder:text-sub/60 focus:border-brand focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand/25"
              />
              <kbd aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] font-black text-sub sm:block">/</kbd>
            </div>
            {filterableCols.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="hidden items-center gap-1 text-[11px] font-black text-sub sm:inline-flex">
                  <ListFilter size={12} aria-hidden="true" />
                </span>
                {filterableCols.map((col) => (
                  <select
                    key={col.key}
                    value={columnFilters[col.key] || ''}
                    aria-label={`Filter by ${col.header}`}
                    onChange={(e) => {
                      const val = e.target.value;
                      setColumnFilters((prev) => {
                        const copy = { ...prev };
                        if (val) copy[col.key] = val;
                        else delete copy[col.key];
                        return copy;
                      });
                      setCurrentPage(1);
                    }}
                    className="min-h-11 rounded-xl border border-line bg-soft/50 px-3 py-2 text-xs font-black text-ink transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                  >
                    <option value="">All {col.header}</option>
                    {col.filterOptions!.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ))}
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={resetToDefaultView}
                    className="min-h-11 rounded-xl border border-rose-warm/30 bg-rose-warm/5 px-3 py-2 text-xs font-black text-rose-warm transition hover:bg-rose-warm/10"
                  >
                    Clear ×
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {showSaveViewModal && (
          <div className="flex flex-col gap-2 border-t border-line/70 bg-soft/40 p-4 sm:flex-row sm:items-center">
            <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-black text-ink">
              <Bookmark size={14} className="text-brand-dark" aria-hidden="true" /> Save current view:
            </span>
            <input
              type="text"
              value={newViewName}
              autoFocus
              onChange={(e) => setNewViewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveView(); }}
              placeholder="e.g. Critical Exceptions, Flight Dossiers..."
              className="min-h-10 flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
            />
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={handleSaveView} disabled={!newViewName.trim()} className="min-h-10 rounded-xl bg-deep px-4 py-2 text-xs font-black text-surface transition hover:bg-brand-dark disabled:opacity-50">
                Save
              </button>
              <button type="button" onClick={() => setShowSaveViewModal(false)} className="min-h-10 rounded-xl border border-line bg-surface px-4 py-2 text-xs font-black text-sub transition hover:text-ink">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-elev-1">
        <div className="overflow-x-auto">
          <table
            ref={tableRef}
            tabIndex={0}
            onKeyDown={handleTableKeyDown}
            className="w-full min-w-[760px] text-start text-[13px] focus:outline-none"
            aria-label={title || 'ERP Data Table'}
          >
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-line bg-soft/80 text-sub backdrop-blur">
                {columns.map((col) => {
                  const isSorted = sortColumn === col.key;
                  const sortable = col.sortable !== false;
                  return (
                    <th
                      key={col.key}
                      aria-sort={isSorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                      className={`whitespace-nowrap p-3.5 text-start text-[11px] font-black tracking-wide uppercase select-none ${col.className || ''}`}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(col.key)}
                          aria-label={`Sort by ${col.header}`}
                          className="group inline-flex items-center gap-1.5 rounded-lg px-1 py-0.5 transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        >
                          <span>{col.header}</span>
                          <span aria-hidden="true" className={cn('grid h-5 w-5 place-items-center rounded-md transition', isSorted ? 'bg-deep text-surface' : 'text-sub/40 group-hover:bg-line/50 group-hover:text-sub')}>
                            {isSorted ? (sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={11} />}
                          </span>
                        </button>
                      ) : (
                        <span className="px-1">{col.header}</span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-0">
                    <div className="flex flex-col items-center px-6 py-12 text-center">
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-soft text-sub/50">
                        <Inbox size={22} aria-hidden="true" />
                      </span>
                      <p className="mt-3 text-[13px] font-black text-ink">{resolvedEmptyMessage}</p>
                      {hasActiveFilters ? (
                        <button type="button" onClick={resetToDefaultView} className="mt-3 min-h-10 rounded-xl border border-line px-4 py-2 text-xs font-black text-sub transition hover:border-brand/40 hover:text-ink">
                          Clear search & filters
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, idx) => {
                  const isFocused = idx === focusedRowIndex;
                  return (
                    <tr
                      key={idAccessor(row)}
                      onClick={() => onRowClick && onRowClick(row)}
                      onMouseEnter={() => setFocusedRowIndex(idx)}
                      className={cn(
                        'transition-colors',
                        onRowClick && 'cursor-pointer',
                        isFocused ? 'bg-brand/6 shadow-[inset_3px_0_0_0_var(--color-brand)]' : 'hover:bg-soft/50',
                        idx % 2 === 1 && !isFocused && 'bg-soft/25',
                      )}
                    >
                      {columns.map((col) => (
                        <td key={col.key} className={`p-3.5 align-middle text-ink ${col.className || ''}`}>
                          {col.render
                            ? col.render(row, idx)
                            : col.accessor
                              ? (col.accessor(row) as React.ReactNode)
                              : ((row as Record<string, unknown>)[col.key] as React.ReactNode)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-line/70 bg-soft/30 p-3.5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-medium text-sub">
            <span className="tabular-nums">
              {lt(locale, { fa: 'نمایش', en: 'Showing', ar: 'عرض', zh: '显示', ru: 'Показано' })}{' '}
              <b className="font-black text-ink">{rangeStart}–{rangeEnd}</b>{' '}
              {lt(locale, { fa: 'از', en: 'of', ar: 'من', zh: '共', ru: 'из' })}{' '}
              <b className="font-black text-ink">{totalItems}</b>
            </span>
            <span aria-hidden="true" className="hidden h-4 w-px bg-line sm:block" />
            <label className="inline-flex items-center gap-1.5">
              <span>{lt(locale, { fa: 'ردیف:', en: 'Rows:', ar: 'صفوف:', zh: '行数：', ru: 'Строк:' })}</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-line bg-surface px-1.5 py-1 text-xs font-black text-ink focus:border-brand focus:outline-none"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={validCurrentPage <= 1}
              onClick={() => { setCurrentPage((p) => Math.max(1, p - 1)); setFocusedRowIndex(-1); }}
              className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface text-sub transition hover:border-brand/40 hover:text-ink disabled:opacity-40 disabled:pointer-events-none rtl:rotate-180"
              aria-label="Previous Page"
            >
              <ChevronLeft size={15} aria-hidden="true" />
            </button>
            {pageNumbers.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => { setCurrentPage(p); setFocusedRowIndex(-1); }}
                aria-label={`Page ${p}`}
                aria-current={p === validCurrentPage ? 'page' : undefined}
                className={cn(
                  'h-9 min-w-9 rounded-xl px-2 text-xs font-black tabular-nums transition',
                  p === validCurrentPage ? 'bg-deep text-surface shadow-elev-1' : 'border border-line bg-surface text-sub hover:border-brand/40 hover:text-ink',
                )}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              disabled={validCurrentPage >= totalPages}
              onClick={() => { setCurrentPage((p) => Math.min(totalPages, p + 1)); setFocusedRowIndex(-1); }}
              className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface text-sub transition hover:border-brand/40 hover:text-ink disabled:opacity-40 disabled:pointer-events-none rtl:rotate-180"
              aria-label="Next Page"
            >
              <ChevronRight size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
