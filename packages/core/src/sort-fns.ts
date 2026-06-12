/**
 * @lamesa/core — sort-fns.ts
 *
 * Built-in comparator functions for the sort stage.
 * All functions follow the same contract as Array.prototype.sort:
 * returns negative if a < b, 0 if equal, positive if a > b
 */

export type SortingFn<T = any> = (a: T, b: T) => number;

export type BuiltInSortFn = 'alphanumeric' | 'basic' | 'datetime' | 'caseInsensitive';

// ─── Null handling ─────────────────────────────────────────────────────────────
// Nulls and undefineds always sort to the bottom regardless of sort direction.
// Direction (asc/desc) is applied by the pipeline via negation — not here.

function nullsLast(a: unknown, b: unknown, fn: (valA: any, valB: any) => number): number {
  const aNull = a == null;
  const bNull = b == null;
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;
  return fn(a, b);
}

// ─── Comparators ──────────────────────────────────────────────────────────────

/**
 * alphanumeric — default sort for mixed string/number columns.
 * Uses locale-aware comparison with numeric collation so that
 * "item2" sorts before "item10" (natural sort order).
 */
function alphanumeric(a: unknown, b: unknown): number {
  return nullsLast(a, b, (vA, vB) =>
    String(vA).localeCompare(String(vB), undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  );
}

/**
 * basic — strict value comparison, no locale, no coercion.
 * Best for numbers, booleans, or any type with native < > operators.
 */
function basic(a: unknown, b: unknown): number {
  return nullsLast(a, b, (vA, vB) => (vA < vB ? -1 : vA > vB ? 1 : 0));
}

/**
 * datetime — compares dates by unix timestamp.
 * Accepts Date objects or any value parseable by new Date().
 */
function datetime(a: unknown, b: unknown): number {
  return nullsLast(a, b, (vA, vB) => {
    const da = vA instanceof Date ? vA : new Date(vA);
    const db = vB instanceof Date ? vB : new Date(vB);
    return da.getTime() - db.getTime();
  });
}

/**
 * caseInsensitive — plain string comparison, ignores locale collation rules.
 * Faster than alphanumeric for large datasets where numeric ordering
 * and locale accuracy are not required.
 */
function caseInsensitive(a: unknown, b: unknown): number {
  return nullsLast(a, b, (vA, vB) => {
    const lower_a = String(vA).toLowerCase();
    const lower_b = String(vB).toLowerCase();
    return lower_a < lower_b ? -1 : lower_a > lower_b ? 1 : 0;
  });
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const sortFns: Record<BuiltInSortFn, SortingFn> = {
  alphanumeric,
  basic,
  datetime,
  caseInsensitive,
};