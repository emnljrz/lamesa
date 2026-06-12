/**
 * @lamesa/core — row.ts
 *
 * Row class — wraps a raw data object into a rich row instance.
 * Every row the pipeline produces is an instance of this class.
 */

import { Column } from './column.js';

// ─── Value accessor ────────────────────────────────────────────────────────────

/**
 * Resolves a dot-path string or accessor function against a raw data object.
 */
export function resolvePath(original: any, accessor: any): any {
  if (typeof accessor === 'function') return accessor(original);
  if (typeof accessor !== 'string') return undefined;
  
  // fast path — no dot in key
  if (!accessor.includes('.')) return original?.[accessor];
  
  // slow path — dot-path traversal
  return accessor.split('.').reduce((obj: any, key: string) => obj?.[key], original);
}

// ─── Cell Interface ────────────────────────────────────────────────────────────

export interface Cell<T = any> {
  id: string;
  row: Row<T>;
  column: Column<T>;
  getValue: () => any;
  getOriginalValue: () => any;
  getIsEditing: () => boolean;
  getIsDirty: () => boolean;
}

// ─── Row ───────────────────────────────────────────────────────────────────────

export class Row<T = any> {
  private _original: T;
  private _index: number;
  private _id: string;
  private _table: any; // Type-safe matching TableCore hooks here

  constructor(original: T, index: number, id: string, table: any) {
    this._original = original;
    this._index = index;
    this._id = id;
    this._table = table;
  }

  // ─── Identity ────────────────────────────────────────────────────────────────

  /** Stable string id for this row. Used as the key for selection + edit overlay. */
  get id(): string { return this._id; }

  /** Position of this row in the current page model (0-based). */
  get index(): number { return this._index; }

  /** The original unmodified data object. Never use this for display — use getValue(). */
  get original(): T { return this._original; }

  // ─── Value resolution ────────────────────────────────────────────────────────

  /**
   * Get the display value for a column, respecting the edit overlay.
   */
  getValue(columnId: string): any {
    // 1. Check edit overlay first
    const overlay = this._table._editManager.getOverlayValue(this._id, columnId);
    if (overlay !== undefined) return overlay;

    // 2. Fall back to original data via column accessor
    const col = this._table._columnMap.get(columnId);
    if (!col) return undefined;

    const accessor = col.accessorFn ?? col.accessorKey ?? col.id;
    return resolvePath(this._original, accessor);
  }

  /**
   * Get the original (pre-edit) value for a column.
   */
  getOriginalValue(columnId: string): any {
    const col = this._table._columnMap.get(columnId);
    if (!col) return undefined;
    const accessor = col.accessorFn ?? col.accessorKey ?? col.id;
    return resolvePath(this._original, accessor);
  }

  // ─── Cells ───────────────────────────────────────────────────────────────────

  /**
   * Returns a cell descriptor for every visible column.
   */
  getVisibleCells(): Array<Cell<T>> {
    return this._table.getVisibleColumns().map((col: Column<T>) => this._makeCell(col));
  }

  /**
   * Returns a cell descriptor for every column (visible or not).
   */
  getAllCells(): Array<Cell<T>> {
    return this._table.getAllColumns().map((col: Column<T>) => this._makeCell(col));
  }

  /**
   * Returns a single cell descriptor for a specific column.
   */
  getCell(columnId: string): Cell<T> | undefined {
    const col = this._table.getAllColumns().find((c: Column<T>) => c.id === columnId);
    if (!col) return undefined;
    return this._makeCell(col);
  }

  /** @private */
  private _makeCell(col: Column<T>): Cell<T> {
    const row = this;
    return {
      id: `${this._id}_${col.id}`,
      row,
      column: col,
      getValue: () => row.getValue(col.id),
      getOriginalValue: () => row.getOriginalValue(col.id),
      getIsEditing: () => this._table._editManager.isEditing(this._id, col.id),
      getIsDirty: () => this._table._editManager.isDirty(this._id, col.id),
    };
  }

  // ─── Selection ───────────────────────────────────────────────────────────────

  /** Whether this row is currently selected. */
  getIsSelected(): boolean {
    return !!this._table._state.rowSelection[this._id];
  }

  /**
   * Toggle or explicitly set the selected state of this row.
   */
  toggleSelected(value?: boolean): void {
    const next = value !== undefined ? value : !this.getIsSelected();
    const newSelection = { ...this._table._state.rowSelection };
    if (next) {
      newSelection[this._id] = true;
    } else {
      delete newSelection[this._id];
    }
    this._table._setState({ rowSelection: newSelection });
  }

  // ─── Editing ─────────────────────────────────────────────────────────────────

  /** Whether any cell in this row is currently being edited. */
  getIsEditing(): boolean {
    const editing = this._table._editManager.getEditingCell();
    return editing?.rowId === this._id;
  }

  /** Whether any cell in this row has an uncommitted edit. */
  getIsDirty(): boolean {
    return this._table._editManager.isRowDirty(this._id);
  }

  /**
   * Get a plain object of all edited values for this row.
   */
  getEdits(): Record<string, any> {
    return this._table._editManager.getRowEdits(this._id);
  }

  /**
   * Get the full row data merged with any overlay edits.
   */
  getMergedData(): T & Record<string, any> {
    return { ...this._original, ...this.getEdits() };
  }
}