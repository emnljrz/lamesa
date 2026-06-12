/**
 * @lamesa/core — edit-manager.ts
 *
 * EditManager — synchronous cell editing with an immutable overlay.
 */

export interface EditManagerOptions {
  onCommit?: (rowId: string, columnId: string, newValue: any, oldValue: any) => void;
  onCancel?: (rowId: string, columnId: string) => void;
  onStart?: (rowId: string, columnId: string) => void;
}

export interface EditingCell {
  rowId: string;
  columnId: string;
}

export interface DirtyRowPayload<T = any> {
  rowId: string;
  original: T;
  edited: Record<string, any>;
  merged: T & Record<string, any>;
}

export class EditManager {
  private _table: any; // Type-safe matching TableCore hooks here
  private _options: EditManagerOptions;

  // ── Internal state ────────────────────────────────────────────────────────
  // Kept separately from TableCore._state because editing state is
  // high-frequency (every keystroke) and should NOT trigger pipeline recomputation.
  private _editingCell: EditingCell | null = null;
  private _pendingValue: any = undefined;

  /**
   * Two-level sparse map — only stores cells that have been committed.
   * { [rowId]: { [columnId]: committedValue } }
   */
  private _overlay: Record<string, Record<string, any>> = {};

  constructor(table: any, options: EditManagerOptions = {}) {
    this._table = table;
    this._options = options;
  }

  // ─── Start / Stop ─────────────────────────────────────────────────────────────

  /**
   * Enter edit mode for a cell.
   * Automatically commits any active edits on focus change.
   */
  startEditing(rowId: string, columnId: string): boolean {
    const col = this._table._columnMap.get(columnId);
    if (!col) return false;
    if (col._def.enableEditing === false) return false;

    if (this._editingCell) {
      this.commitEdit();
    }

    const row = this._findRow(rowId);
    this._pendingValue = row ? row.getValue(columnId) : undefined;
    this._editingCell = { rowId, columnId };

    this._options.onStart?.(rowId, columnId);
    this._notify();
    return true;
  }

  /**
   * Commit the pending value to the overlay and exit edit mode.
   */
  commitEdit(): { rowId: string; columnId: string; newValue: any; oldValue: any } | null {
    if (!this._editingCell) return null;

    const { rowId, columnId } = this._editingCell;
    const newValue = this._pendingValue;

    const row = this._findRow(rowId);
    const oldValue = row ? row.getOriginalValue(columnId) : undefined;

    if (newValue !== oldValue) {
      this._setOverlay(rowId, columnId, newValue);
    }

    this._editingCell = null;
    this._pendingValue = undefined;

    this._options.onCommit?.(rowId, columnId, newValue, oldValue);
    this._notify();

    return { rowId, columnId, newValue, oldValue };
  }

  /**
   * Discard the pending value and exit edit mode without touching the overlay.
   */
  cancelEdit(): void {
    if (!this._editingCell) return;

    const { rowId, columnId } = this._editingCell;

    this._editingCell = null;
    this._pendingValue = undefined;

    this._options.onCancel?.(rowId, columnId);
    this._notify();
  }

  // ─── Pending value ────────────────────────────────────────────────────────────

  /**
   * Update the pending value while editing (called on every keystroke).
   */
  setPendingValue(value: any): void {
    if (!this._editingCell) return;
    this._pendingValue = value;
    this._notify();
  }

  /**
   * Current pending value (what the user is typing).
   */
  getPendingValue(): any {
    return this._pendingValue;
  }

  // ─── Overlay reads (called by Row.getValue()) ─────────────────────────────────

  /**
   * Get the committed overlay value for a cell.
   */
  getOverlayValue(rowId: string, columnId: string): any {
    return this._overlay[rowId]?.[columnId];
  }

  // ─── Dirty / state checks ─────────────────────────────────────────────────────

  /**
   * Whether a specific cell has a committed edit that differs from the original.
   */
  isDirty(rowId: string, columnId: string): boolean {
    return this._overlay[rowId]?.[columnId] !== undefined;
  }

  /**
   * Whether any cell in a row has a committed edit.
   */
  isRowDirty(rowId: string): boolean {
    const rowOverlay = this._overlay[rowId];
    return !!rowOverlay && Object.keys(rowOverlay).length > 0;
  }

  /**
   * Whether a specific cell is currently in edit mode.
   */
  isEditing(rowId: string, columnId: string): boolean {
    return (
      this._editingCell?.rowId === rowId &&
      this._editingCell?.columnId === columnId
    );
  }

  /**
   * The currently active editing cell descriptor.
   */
  getEditingCell(): EditingCell | null {
    return this._editingCell;
  }

  // ─── Overlay reads (bulk) ─────────────────────────────────────────────────────

  /**
   * Get all committed edits for a specific row.
   */
  getRowEdits(rowId: string): Record<string, any> {
    return { ...(this._overlay[rowId] ?? {}) };
  }

  /**
   * Get all committed edits across the entire table.
   */
  getAllEdits(): Record<string, Record<string, any>> {
    const result: Record<string, Record<string, any>> = {};
    for (const rowId of Object.keys(this._overlay)) {
      result[rowId] = { ...this._overlay[rowId] };
    }
    return result;
  }

  /**
   * Whether there are any uncommitted edits in the overlay.
   */
  hasEdits(): boolean {
    return Object.keys(this._overlay).length > 0;
  }

  /**
   * Total number of edited cells across the table.
   */
  getEditCount(): number {
    return Object.values(this._overlay).reduce(
      (sum, row) => sum + Object.keys(row).length,
      0
    );
  }

  // ─── Undo / revert ────────────────────────────────────────────────────────────

  /**
   * Revert a single cell to its original value by removing it from the overlay.
   */
  revertCell(rowId: string, columnId: string): void {
    if (!this._overlay[rowId]) return;
    const rowOverlay = { ...this._overlay[rowId] };
    delete rowOverlay[columnId];

    if (Object.keys(rowOverlay).length === 0) {
      const next = { ...this._overlay };
      delete next[rowId];
      this._overlay = next;
    } else {
      this._overlay = { ...this._overlay, [rowId]: rowOverlay };
    }

    this._notify();
  }

  /**
   * Revert all edits in a row back to original values.
   */
  revertRow(rowId: string): void {
    if (!this._overlay[rowId]) return;
    const next = { ...this._overlay };
    delete next[rowId];
    this._overlay = next;
    this._notify();
  }

  /**
   * Revert ALL edits in the table — clears the entire overlay.
   */
  revertAll(): void {
    this._overlay = {};
    this._editingCell = null;
    this._pendingValue = undefined;
    this._notify();
  }

  // ─── Batch flush ──────────────────────────────────────────────────────────────

  /**
   * Get all dirty rows as merged data objects, ready to send to an API.
   */
  getDirtyRows<T = any>(): Array<DirtyRowPayload<T>> {
    return Object.entries(this._overlay).map(([rowId, edited]) => {
      const row = this._findRow(rowId);
      const original = (row?.original ?? {}) as T;
      return {
        rowId,
        original,
        edited: { ...edited },
        merged: { ...original, ...edited },
      };
    });
  }

  // ─── Internals ────────────────────────────────────────────────────────────────

  /**
   * Write a value to the overlay immutably.
   */
  private _setOverlay(rowId: string, columnId: string, value: any): void {
    this._overlay = {
      ...this._overlay,
      [rowId]: {
        ...(this._overlay[rowId] ?? {}),
        [columnId]: value,
      },
    };
  }

  /**
   * Find a Row instance from the pipeline's current sorted rows.
   */
  private _findRow(rowId: string): any {
    return this._table._pipeline.getAllFilteredRows().find((r: any) => r.id === rowId);
  }

  /**
   * Notify TableCore subscribers that edit state has changed.
   */
  private _notify(): void {
    this._table._notifySubscribers();
  }
}