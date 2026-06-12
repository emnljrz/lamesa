/**
 * @lamesa/core — pipeline.ts
 *
 * Pipeline — the data processing engine.
 * Runs raw data through three ordered stages:
 * [data] → FilterStage → SortStage → PageStage → [row model]
 */

import { Row, resolvePath } from './row.js'; // Added resolvePath
import { Column } from './column.js';
import { filterFns, type FilterFn } from './filter-fns.js'; // Added type FilterFn
import { sortFns, type SortingFn } from './sort-fns.js';   // Added type SortingFn

// ─── Dirty flags (bitmask) ────────────────────────────────────────────────────

export const DIRTY = {
  FILTER: 0b001 as const, // 1 — re-run filter stage
  SORT:   0b010 as const, // 2 — re-run sort stage
  PAGE:   0b100 as const, // 4 — re-run page stage
  ALL:    0b111 as const, // 7 — re-run everything
};

export type DirtyFlags = number;

interface ActiveColumnFilterSpec {
  col: Column;
  value: any;
  fn: FilterFn;
}

interface ActiveSortSpec {
  col: Column;
  desc: boolean;
  fn: SortingFn;
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export class Pipeline {
  private _table: any; // Type-safe matching TableCore will hook here

  // Memoized stage outputs
  private _filteredRows: Row[] = [];
  private _sortedRows: Row[] = [];
  private _pagedRows: Row[] = [];

  // Start fully dirty — nothing computed yet
  private _dirty: DirtyFlags = DIRTY.ALL;

  constructor(table: any) {
    this._table = table;
  }

  // ─── Dirty flag API ──────────────────────────────────────────────────────────

  /**
   * Mark one or more stages dirty using DIRTY bitmask flags.
   */
  markDirty(flags: DirtyFlags): void {
    this._dirty |= flags;
  }

  /** Mark all stages dirty — called when data or columns change. */
  markAllDirty(): void {
    this._dirty = DIRTY.ALL;
  }

  // ─── Main entry point ────────────────────────────────────────────────────────

  /**
   * Run all dirty stages and return the current page of Row instances.
   */
  getPageRows(): Row[] {
    if (this._dirty & DIRTY.FILTER) this._runFilter();
    if (this._dirty & DIRTY.SORT)   this._runSort();
    if (this._dirty & DIRTY.PAGE)   this._runPage();
    this._dirty = 0;
    return this._pagedRows;
  }

  /**
   * Return all rows after filtering and sorting, before pagination.
   */
  getFilteredSortedRows(): Row[] {
    if (this._dirty & DIRTY.FILTER) this._runFilter();
    if (this._dirty & DIRTY.SORT)   this._runSort();
    this._dirty &= ~(DIRTY.FILTER | DIRTY.SORT);
    return this._sortedRows;
  }

  // ─── Stage 1 — Filter ────────────────────────────────────────────────────────

  private _runFilter(): void {
    const { globalFilter, columnFilters } = this._table._state;
    const data: any[] = this._table._data;
    const columns: Column[] = this._table._allColumns;

    // Build active column filter list once — avoids re-scanning on every row
    const activeColFilters = (columnFilters as any[])
      .map(({ id, value }): ActiveColumnFilterSpec | null => {
        const col = this._table._columnMap.get(id) as Column;
        if (!col || !col.getCanFilter()) return null;
        return { col, value, fn: col.getFilterFn() };
      })
      .filter((item): item is ActiveColumnFilterSpec => item !== null);

    const hasGlobalFilter = globalFilter != null && globalFilter !== '';
    const hasColumnFilters = activeColFilters.length > 0;

    // Fast path — nothing to filter, wrap raw data directly
    if (!hasGlobalFilter && !hasColumnFilters) {
      this._filteredRows = data.map(
        (original, i) => new Row(original, i, String(i), this._table)
      );
      return;
    }

    // Visible columns used for global filter scan
    const visibleCols = columns.filter((c) => c.getIsVisible());
    const result: Row[] = [];

    for (let i = 0; i < data.length; i++) {
      const original = data[i];

      // ── Global filter ──────────────────────────────────────────────────────
      if (hasGlobalFilter) {
        const needle = String(globalFilter).toLowerCase();
        let matched = false;
        for (const col of visibleCols) {
          const accessor = col.accessorFn ?? col.accessorKey ?? col.id;
          const val = resolvePath(original, accessor);
          if (String(val ?? '').toLowerCase().includes(needle)) {
            matched = true;
            break; 
          }
        }
        if (!matched) continue; 
      }

      // ── Column filters ─────────────────────────────────────────────────────
      if (hasColumnFilters) {
        let passed = true;
        for (const { col, value, fn } of activeColFilters) {
          const accessor = col.accessorFn ?? col.accessorKey ?? col.id;
          const cellVal = resolvePath(original, accessor);
          if (!fn(cellVal, value)) {
            passed = false;
            break; 
          }
        }
        if (!passed) continue;
      }

      result.push(new Row(original, result.length, String(i), this._table));
    }

    this._filteredRows = result;
  }

  // ─── Stage 2 — Sort ──────────────────────────────────────────────────────────

  private _runSort(): void {
    const { sorting } = this._table._state;

    // Fast path — nothing to sort
    if (!(sorting as any[]).length) {
      this._sortedRows = this._filteredRows;
      return;
    }

    // Build sort spec once — resolve column + fn per sort entry
    const sortSpec = (sorting as any[])
      .map(({ id, desc }): ActiveSortSpec | null => {
        const col = this._table._columnMap.get(id) as Column;
        if (!col || !col.getCanSort()) return null;
        return { col, desc, fn: col.getSortingFn() };
      })
      .filter((item): item is ActiveSortSpec => item !== null);

    if (!sortSpec.length) {
      this._sortedRows = this._filteredRows;
      return;
    }

    // Shallow copy before sort — never mutate the filtered cache
    this._sortedRows = [...this._filteredRows].sort((rowA, rowB) => {
      for (const { col, desc, fn } of sortSpec) {
        const accessor = col.accessorFn ?? col.accessorKey ?? col.id;

        const valA = resolvePath(rowA.original, accessor);
        const valB = resolvePath(rowB.original, accessor);

        const result = fn(valA, valB);

        if (result !== 0) return desc ? -result : result;
      }
      return 0; 
    });

    // Re-index after sort so row.index reflects position in sorted model
    for (let i = 0; i < this._sortedRows.length; i++) {
      (this._sortedRows[i] as any)._index = i;
    }
  }

  // ─── Stage 3 — Page ──────────────────────────────────────────────────────────

  private _runPage(): void {
    const { pageIndex, pageSize } = this._table._state.pagination;
    const start = pageIndex * pageSize;
    this._pagedRows = this._sortedRows.slice(start, start + pageSize);
  }

  // ─── Derived counts ──────────────────────────────────────────────────────────

  /** Total rows after filtering (before pagination). Triggers filter+sort if dirty. */
  getFilteredRowCount(): number {
    if (this._dirty & DIRTY.FILTER) this._runFilter();
    if (this._dirty & DIRTY.SORT)   this._runSort();
    this._dirty &= ~(DIRTY.FILTER | DIRTY.SORT);
    return this._sortedRows.length;
  }

  /** Total pages based on filtered row count and current page size. */
  getPageCount(): number {
    const total = this.getFilteredRowCount();
    const pageSize = this._table._state.pagination.pageSize;
    return Math.max(1, Math.ceil(total / pageSize));
  }

  /** All filtered+sorted rows — used for selection across all pages. */
  getAllFilteredRows(): Row[] {
    if (this._dirty & DIRTY.FILTER) this._runFilter();
    if (this._dirty & DIRTY.SORT)   this._runSort();
    this._dirty &= ~(DIRTY.FILTER | DIRTY.SORT);
    return this._sortedRows;
  }
}