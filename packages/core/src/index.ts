/**
 * @lamesa/core
 *
 * Public API Surface — Entry point exposure contract.
 * Everything custom adapters, testers, or applications need to interact with LaMesa Core.
 */

// Core Handler & Orchestrator types
export { TableCore } from './table-core.js';
export type { TableCoreState, TableCoreConfig, TablePaginationState, TableSubscriber } from './table-core.js';

// Core Engine Built-Ins
export { sortFns } from './sort-fns.js';
export type { SortingFn } from './sort-fns.js';

export { filterFns } from './filter-fns.js';
export type { FilterFn } from './filter-fns.js';

// Bitmask Dependency Tokens (Empowers custom reactive hooks optimization parameters)
export { DIRTY } from './pipeline.js';
export type { DirtyFlags } from './pipeline.js';

// Extensible Class Sub-Models & Structural Interfaces
export { Row, resolvePath } from './row.js';
export type { Cell } from './row.js';

export { Column } from './column.js';
export type { ColumnDef } from './column.js';

export { Pipeline } from './pipeline.js';
export { EditManager } from './edit-manager.js';
export type { EditManagerOptions, EditingCell, DirtyRowPayload } from './edit-manager.js';