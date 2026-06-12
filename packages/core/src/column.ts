/**
 * @lamesa/core — column.ts
 *
 * Column class — enriches a raw column definition with
 * runtime methods for sorting, filtering, and visibility.
 */

import { sortFns, type SortingFn, type BuiltInSortFn } from './sort-fns.js';
import { filterFns, type FilterFn, type BuiltInFilterFn } from './filter-fns.js';

export interface ColumnDef<T = any> {
  id: string;
  header?: string | ((column: Column<T>) => string);
  accessorKey?: string;
  accessorFn?: (row: T) => any;
  sortingFn?: BuiltInSortFn | SortingFn<T>;
  filterFn?: BuiltInFilterFn | FilterFn<T>;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enableHiding?: boolean;
  meta?: Record<string, any>;
}

// ─── Column ───────────────────────────────────────────────────────────────────

export class Column<T = any> {
  public _def: ColumnDef<T>;
  public _table: any; // Type-safe matching TableCore will hook here

  public id: string;
  public meta: Record<string, any>;
  public accessorKey: string | null;
  public accessorFn: ((row: T) => any) | null;

  constructor(def: ColumnDef<T>, table: any) {
    this._def = def;
    this._table = table;

    this.id = def.id;
    this.meta = def.meta ?? {};
    this.accessorKey = def.accessorKey ?? null;
    this.accessorFn = def.accessorFn ?? null;
  }

  // ─── Header ──────────────────────────────────────────────────────────────────

  /**
   * Resolve the display label for this column.
   */
  renderHeader(): string {
    const { header } = this._def;
    if (typeof header === 'function') return header(this);
    return header ?? this.id;
  }

  // ─── Visibility ──────────────────────────────────────────────────────────────

  /**
   * Whether this column is currently visible.
   */
  getIsVisible(): boolean {
    return this._table._state.columnVisibility[this.id] !== false;
  }

  /**
   * Whether this column can be hidden.
   */
  getCanHide(): boolean {
    return this._def.enableHiding !== false;
  }

  /**
   * Toggle or explicitly set the visibility of this column.
   */
  toggleVisibility(value?: boolean): void {
    if (!this.getCanHide()) return;
    const current = this.getIsVisible();
    const next = value !== undefined ? value : !current;
    this._table._setState({
      columnVisibility: {
        ...this._table._state.columnVisibility,
        [this.id]: next,
      },
    });
  }

  // ─── Sorting ─────────────────────────────────────────────────────────────────

  /**
   * Whether this column can be sorted.
   */
  getCanSort(): boolean {
    return this._def.enableSorting !== false;
  }

  /**
   * Current sort direction for this column.
   */
  getIsSorted(): 'asc' | 'desc' | false {
    const entry = this._table._state.sorting.find((s: any) => s.id === this.id);
    if (!entry) return false;
    return entry.desc ? 'desc' : 'asc';
  }

  /**
   * Position of this column in the multi-sort stack (0-based).
   */
  getSortIndex(): number {
    return this._table._state.sorting.findIndex((s: any) => s.id === this.id);
  }

  /**
   * Cycle sort direction: unsorted → asc → desc → unsorted.
   */
  toggleSorting(desc?: boolean, multi = false): void {
    if (!this.getCanSort()) return;

    const current = this._table._state.sorting;
    const existing = current.find((s: any) => s.id === this.id);
    let next: any[];

    if (!existing) {
      const entry = { id: this.id, desc: desc ?? false };
      next = multi ? [...current, entry] : [entry];
    } else if (!existing.desc && desc !== true) {
      const entry = { id: this.id, desc: true };
      next = multi
        ? current.map((s: any) => (s.id === this.id ? entry : s))
        : [entry];
    } else {
      next = current.filter((s: any) => s.id !== this.id);
    }

    this._table._setState({ sorting: next });
  }

  /**
   * Remove this column from the sort stack entirely.
   */
  clearSorting(): void {
    this._table._setState({
      sorting: this._table._state.sorting.filter((s: any) => s.id !== this.id),
    });
  }

  /**
   * Resolve the comparator function for this column.
   */
  getSortingFn(): SortingFn<T> {
    const { sortingFn } = this._def;
    if (typeof sortingFn === 'function') return sortingFn;
    return sortFns[sortingFn as BuiltInSortFn] ?? sortFns.alphanumeric;
  }

  // ─── Filtering ───────────────────────────────────────────────────────────────

  /**
   * Whether this column can be filtered.
   */
  getCanFilter(): boolean {
    return this._def.enableFiltering !== false;
  }

  /**
   * Current filter value for this column.
   */
  getFilterValue(): any {
    return this._table._state.columnFilters.find((f: any) => f.id === this.id)?.value;
  }

  /**
   * Set or clear the filter value for this column.
   */
  setFilterValue(value: any): void {
    if (!this.getCanFilter()) return;

    const others = this._table._state.columnFilters.filter((f: any) => f.id !== this.id);
    const isEmpty = value === undefined || value === null || value === '';
    const next = isEmpty ? others : [...others, { id: this.id, value }];

    this._table._setState({
      columnFilters: next,
      pagination: { ...this._table._state.pagination, pageIndex: 0 },
    });
  }

  /**
   * Resolve the filter function for this column.
   */
  getFilterFn(): FilterFn<T> {
    const { filterFn } = this._def;
    if (typeof filterFn === 'function') return filterFn;
    return filterFns[filterFn as BuiltInFilterFn] ?? filterFns.includesString;
  }

  // ─── Faceted values ──────────────────────────────────────────────────────────

  /**
   * Get all unique values for this column across the unfiltered dataset.
   */
  getFacetedUniqueValues(): Set<any> {
    const accessor = this.accessorFn ?? this.accessorKey ?? this.id;
    const seen = new Set<any>();
    
    for (const row of this._table._data) {
      const value = typeof accessor === 'function'
        ? accessor(row)
        : accessor.split('.').reduce((obj: any, key: string) => obj?.[key], row);
        
      if (value !== undefined && value !== null) seen.add(value);
    }
    return seen;
  }

  /**
   * Get the min and max numeric values for this column across the unfiltered dataset.
   */
  getFacetedMinMaxValues(): { min: number; max: number } {
    const accessor = this.accessorFn ?? this.accessorKey ?? this.id;
    let min = Infinity;
    let max = -Infinity;
    
    for (const row of this._table._data) {
      const raw = typeof accessor === 'function'
        ? accessor(row)
        : accessor.split('.').reduce((obj: any, key: string) => obj?.[key], row);
        
      const num = Number(raw);
      if (!isNaN(num)) {
        if (num < min) min = num;
        if (num > max) max = num;
      }
    }
    return {
      min: min === Infinity ? 0 : min,
      max: max === -Infinity ? 0 : max,
    };
  }
}

// ─── Column factory ───────────────────────────────────────────────────────────

/**
 * Build a Column instance from a raw definition.
 */
export function createColumn<T = any>(def: ColumnDef<T>, table: any): Column<T> {
  if (!def.id) throw new Error(`[@lamesa/core] Column is missing required field "id"`);
  return new Column<T>(def, table);
}