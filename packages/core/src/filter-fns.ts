/**
 * @lamesa/core — filter-fns.ts
 *
 * Built-in filter functions for the filter stage.
 * All functions follow the same contract:
 * (cellValue, filterValue) => boolean
 * true  = row passes, keep it
 * false = row fails, remove it
 */

export type FilterFn<T = any> = (row: T, value: any) => boolean;

export interface NumberRangePayload {
  min?: number | null;
  max?: number | null;
}

export type BuiltInFilterFn =
  | 'includesString'
  | 'includesStringSensitive'
  | 'equalsString'
  | 'equals'
  | 'notEquals'
  | 'inNumberRange'
  | 'greaterThan'
  | 'lessThan'
  | 'arrIncludes'
  | 'arrIncludesAll'
  | 'arrIncludesSome';

// ─── Guard ─────────────────────────────────────────────────────────────────────
// If filterValue is empty/null/undefined, the filter is considered inactive.
// Every built-in runs this check first so the pipeline never needs to.

function isEmpty(filterValue: any): boolean {
  if (filterValue == null) return true;
  if (typeof filterValue === 'string') return filterValue.trim() === '';
  if (Array.isArray(filterValue)) return filterValue.length === 0;
  if (typeof filterValue === 'object') {
    return (filterValue as NumberRangePayload).min == null && (filterValue as NumberRangePayload).max == null;
  }
  return false;
}

// ─── String filters ────────────────────────────────────────────────────────────

/**
 * includesString — case-insensitive substring match.
 */
function includesString(value: unknown, filterValue: any): boolean {
  if (isEmpty(filterValue)) return true;
  if (value == null) return false;
  return String(value)
    .toLowerCase()
    .includes(String(filterValue).toLowerCase().trim());
}

/**
 * includesStringSensitive — same as includesString but case-sensitive.
 */
function includesStringSensitive(value: unknown, filterValue: any): boolean {
  if (isEmpty(filterValue)) return true;
  if (value == null) return false;
  return String(value).includes(String(filterValue));
}

/**
 * equalsString — exact string match, case-insensitive.
 */
function equalsString(value: unknown, filterValue: any): boolean {
  if (isEmpty(filterValue)) return true;
  if (value == null) return false;
  return String(value).toLowerCase() === String(filterValue).toLowerCase().trim();
}

// ─── Equality filters ──────────────────────────────────────────────────────────

/**
 * equals — strict equality (===).
 */
function equals(value: unknown, filterValue: any): boolean {
  if (isEmpty(filterValue)) return true;
  return value === filterValue;
}

/**
 * notEquals — inverse of equals.
 */
function notEquals(value: unknown, filterValue: any): boolean {
  if (isEmpty(filterValue)) return true;
  return value !== filterValue;
}

// ─── Number filters ────────────────────────────────────────────────────────────

/**
 * inNumberRange — inclusive range filter.
 */
function inNumberRange(value: unknown, filterValue: any): boolean {
  if (isEmpty(filterValue)) return true;
  if (value == null) return false;
  const num = Number(value);
  if (isNaN(num)) return false;
  
  const { min, max } = filterValue as NumberRangePayload;
  if (min != null && num < min) return false;
  if (max != null && num > max) return false;
  return true;
}

/**
 * greaterThan — value must be strictly greater than filter.
 */
function greaterThan(value: unknown, filterValue: any): boolean {
  if (isEmpty(filterValue)) return true;
  if (value == null) return false;
  return Number(value) > Number(filterValue);
}

/**
 * lessThan — value must be strictly less than filter.
 */
function lessThan(value: unknown, filterValue: any): boolean {
  if (isEmpty(filterValue)) return true;
  if (value == null) return false;
  return Number(value) < Number(filterValue);
}

// ─── Array filters ─────────────────────────────────────────────────────────────

/**
 * arrIncludes — cell value (an array) contains the filter value.
 */
function arrIncludes(value: unknown, filterValue: any): boolean {
  if (isEmpty(filterValue)) return true;
  if (!Array.isArray(value)) return false;
  return value.includes(filterValue);
}

/**
 * arrIncludesAll — cell array must contain every value in the filter array.
 */
function arrIncludesAll(value: unknown, filterValue: any): boolean {
  if (isEmpty(filterValue)) return true;
  if (!Array.isArray(value) || !Array.isArray(filterValue)) return false;
  return filterValue.every((f) => value.includes(f));
}

/**
 * arrIncludesSome — cell array must contain at least one filter value.
 */
function arrIncludesSome(value: unknown, filterValue: any): boolean {
  if (isEmpty(filterValue)) return true;
  if (!Array.isArray(value) || !Array.isArray(filterValue)) return false;
  return filterValue.some((f) => value.includes(f));
}

// ─── Exports ───────────────────────────────────────────────────────────────────

export const filterFns: Record<BuiltInFilterFn, FilterFn> = {
  includesString,
  includesStringSensitive,
  equalsString,
  equals,
  notEquals,
  inNumberRange,
  greaterThan,
  lessThan,
  arrIncludes,
  arrIncludesAll,
  arrIncludesSome,
};