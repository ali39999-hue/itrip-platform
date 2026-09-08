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
} from 'lucide-react';

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
  description?: string;
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
  searchPlaceholder = 'Search records (Press "/" to focus)...',
  defaultPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  emptyStateMessage = 'No records found matching criteria',
  savedViewStorageKey = 'erp_datagrid_views',
  actionsSlot,
}: ERPDataGridProps<T>) {
  // Search state
  const [search, setSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filtering state (column key -> filter value)
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  // Pagination state
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [currentPage, setCurrentPage] = useState(1);

  // Keyboard navigation state
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1);
  const tableRef = useRef<HTMLTableElement>(null);

  // Saved views state
  const [savedViews, setSavedViews] = useState<SavedViewPreset[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [newViewName, setNewViewName] = useState('');
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);

  // Load saved views from localStorage
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

  // Persist saved views
  const persistSavedViews = (views: SavedViewPreset[]) => {
    setSavedViews(views);
    try {
      localStorage.setItem(savedViewStorageKey, JSON.stringify(views));
    } catch {
      // Ignore
    }
  };

  // Keyboard shortcut: '/' focuses search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not already focused in an input/textarea
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

  // Filter & Search logic
  const filteredData = useMemo(() => {
    const getCell = (row: T, key: string): unknown => (row as Record<string, unknown>)[key];
    return data.filter((row) => {
      // 1. Global text search
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesGlobal = columns.some((col) => {
          const val = col.accessor ? col.accessor(row) : getCell(row, col.key);
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(query);
        });
        if (!matchesGlobal) return false;
      }

      // 2. Column filters
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

  // Sorting logic
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

  // Pagination calculations
  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedData = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, validCurrentPage, pageSize]);

  // Handle Sort Click
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

  // CSV Export
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

  // Keyboard navigation on rows (Arrow Up / Down / Enter)
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

  // Apply Saved View
  const applySavedView = (view: SavedViewPreset) => {
    setSearch(view.search);
    setSortColumn(view.sortColumn);
    setSortDirection(view.sortDirection);
    setColumnFilters(view.columnFilters);
    setPageSize(view.pageSize);
    setCurrentPage(1);
    setActiveViewId(view.id);
  };

  // Reset View to Default
  const resetToDefaultView = () => {
    setSearch('');
    setSortColumn(null);
    setSortDirection('asc');
    setColumnFilters({});
    setPageSize(defaultPageSize);
    setCurrentPage(1);
    setActiveViewId(null);
  };

  // Save Current View
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

  // Delete Saved View
  const handleDeleteView = (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedViews.filter((v) => v.id !== viewId);
    persistSavedViews(updated);
    if (activeViewId === viewId) {
      setActiveViewId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls Bar */}
      <div className="bg-surface rounded-2xl border border-line p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {title && (
            <div>
              <h2 className="text-lg font-black text-ink">{title}</h2>
              {description && <p className="text-xs text-sub mt-0.5">{description}</p>}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 ms-auto">
            {/* Saved Views Dropdown */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowSaveViewModal(true)}
                className="inline-flex items-center gap-1 min-h-9 px-2.5 py-1.5 rounded-xl border border-line text-xs font-bold text-sub hover:text-ink hover:bg-soft transition"
                title="Save current filters/sort as a custom view"
              >
                <Bookmark size={13} aria-hidden="true" />
                <span>Save View</span>
              </button>
            </div>

            {/* CSV Export Button */}
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={sortedData.length === 0}
              className="inline-flex items-center gap-1 min-h-9 px-3 py-1.5 rounded-xl bg-soft text-ink font-bold text-xs hover:bg-line/70 transition disabled:opacity-50"
            >
              <Download size={14} />
              <span>Export CSV ({sortedData.length})</span>
            </button>

            {actionsSlot}
          </div>
        </div>

        {/* View Presets Bar (if any saved views exist) */}
        {savedViews.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-line/60">
            <span className="text-[11px] font-bold text-sub flex items-center gap-1">
              <Bookmark size={11} />
              <span>Views:</span>
            </span>
            <button
              type="button"
              onClick={resetToDefaultView}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                activeViewId === null
                  ? 'bg-brand-dark text-surface'
                  : 'bg-soft text-sub hover:text-ink'
              }`}
            >
              Default
            </button>
            {savedViews.map((view) => (
              <div
                key={view.id}
                className={`group flex items-center gap-1 ps-2.5 pe-1 py-0.5 rounded-lg text-xs font-bold transition ${
                  activeViewId === view.id
                    ? 'bg-brand-dark text-surface'
                    : 'bg-soft text-sub hover:text-ink'
                }`}
              >
                <button
                  type="button"
                  onClick={() => applySavedView(view)}
                  aria-pressed={activeViewId === view.id}
                  className="py-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {view.name}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDeleteView(view.id, e)}
                  aria-label={`Delete view ${view.name}`}
                  className="opacity-60 hover:opacity-100 hover:text-rose-500 ms-1 p-1.5 rounded transition"
                  title="Delete preset"
                >
                  <Trash2 size={11} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Search & Column Filters Row */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Global Search Input */}
          <div className="relative flex-1 w-full">
            <Search
              size={14}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-sub pointer-events-none"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="search"
              aria-label={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full min-h-11 ps-9 pe-4 py-2 rounded-xl bg-soft/60 border border-line text-xs font-medium text-ink placeholder:text-sub focus:outline-none focus:border-brand-dark transition"
            />
          </div>

          {/* Quick Column Filter Selects */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {columns
              .filter((c) => c.filterable && c.filterOptions && c.filterOptions.length > 0)
              .map((col) => (
                <div key={col.key} className="flex items-center gap-1">
                  <select
                    value={columnFilters[col.key] || ''}
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
                    className="px-2.5 py-2 rounded-xl bg-soft/60 border border-line text-xs font-bold text-ink focus:outline-none focus:border-brand-dark transition"
                  >
                    <option value="">All {col.header}</option>
                    {col.filterOptions!.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

            {/* Clear All Filters Button */}
            {(search || Object.keys(columnFilters).length > 0 || sortColumn) && (
              <button
                type="button"
                onClick={resetToDefaultView}
                className="px-2.5 py-2 rounded-xl border border-line/80 text-xs font-bold text-sub hover:text-ink hover:bg-soft transition"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Save View Modal / Inline Form */}
      {showSaveViewModal && (
        <div className="p-4 rounded-2xl bg-surface border border-line shadow-md flex items-center gap-3">
          <Bookmark size={16} className="text-brand-dark" />
          <span className="text-xs font-bold text-ink whitespace-nowrap">Save Current View:</span>
          <input
            type="text"
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
            placeholder="e.g. Critical Exceptions, Flight Dossiers..."
            className="flex-1 px-3 py-1.5 rounded-xl bg-soft border border-line text-xs font-medium text-ink focus:outline-none focus:border-brand-dark"
          />
          <button
            type="button"
            onClick={handleSaveView}
            disabled={!newViewName.trim()}
            className="px-3 py-1.5 rounded-xl bg-brand text-surface text-xs font-bold hover:bg-brand-dark transition disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setShowSaveViewModal(false)}
            className="px-3 py-1.5 rounded-xl border border-line text-xs font-bold text-sub hover:text-ink"
          >
            Cancel
          </button>
        </div>
      )}

      {/* DataGrid Table with Keyboard Navigation */}
      <div className="bg-surface rounded-2xl border border-line overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table
            ref={tableRef}
            tabIndex={0}
            onKeyDown={handleTableKeyDown}
            className="w-full min-w-[760px] text-start text-xs focus:outline-none"
            aria-label={title || 'ERP Data Table'}
          >
            <thead>
              <tr className="border-b border-line bg-soft/40 text-sub font-black">
                {columns.map((col) => {
                  const isSorted = sortColumn === col.key;
                  const sortable = col.sortable !== false;
                  return (
                    <th
                      key={col.key}
                      aria-sort={isSorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                      className={`p-3.5 text-start select-none ${col.className || ''}`}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(col.key)}
                          aria-label={`Sort by ${col.header}`}
                          className="inline-flex items-center gap-1.5 rounded hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
                        >
                          <span>{col.header}</span>
                          <span className="text-sub" aria-hidden="true">
                            {isSorted ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp size={13} className="text-brand-dark font-black" />
                              ) : (
                                <ArrowDown size={13} className="text-brand-dark font-black" />
                              )
                            ) : (
                              <ArrowUpDown size={12} className="opacity-40" />
                            )}
                          </span>
                        </button>
                      ) : (
                        <span>{col.header}</span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-8 text-center text-sub font-medium">
                    {emptyStateMessage}
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
                      className={`transition ${
                        onRowClick ? 'cursor-pointer' : ''
                      } ${isFocused ? 'bg-brand/5 ring-1 ring-inset ring-brand/30' : 'hover:bg-soft/30'}`}
                    >
                      {columns.map((col) => {
                        return (
                          <td key={col.key} className={`p-3.5 text-ink ${col.className || ''}`}>
                            {col.render
                              ? col.render(row, idx)
                              : col.accessor
                              ? (col.accessor(row) as React.ReactNode)
                              : ((row as Record<string, unknown>)[col.key] as React.ReactNode)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Summary Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 border-t border-line/70 bg-soft/20 text-xs">
          <div className="flex items-center gap-2 text-sub font-medium">
            <span>
              Showing {totalItems > 0 ? (validCurrentPage - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(validCurrentPage * pageSize, totalItems)} of {totalItems} entries
            </span>
            <span className="text-line">|</span>
            <div className="flex items-center gap-1">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-1.5 py-0.5 rounded border border-line bg-surface text-ink text-xs font-bold"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={validCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="min-w-9 min-h-9 p-1.5 rounded-lg border border-line text-sub hover:text-ink hover:bg-soft disabled:opacity-40 disabled:pointer-events-none transition grid place-items-center"
              aria-label="Previous Page"
            >
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            <span className="px-2 font-bold text-ink whitespace-nowrap">
              Page {validCurrentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={validCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="min-w-9 min-h-9 p-1.5 rounded-lg border border-line text-sub hover:text-ink hover:bg-soft disabled:opacity-40 disabled:pointer-events-none transition grid place-items-center"
              aria-label="Next Page"
            >
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
