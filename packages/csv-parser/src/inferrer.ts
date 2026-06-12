/**
 * @lamesa/csv-parser — inferrer.ts
 *
 * Auto type inference utility.
 * Converts raw text fields from a CSV into native JavaScript primitives.
 */

export type InferredPrimitive = string | number | boolean | Date | null;

/**
 * Infers and casts a string value to its native primitive type.
 * * @param value - The raw string value from the CSV cell.
 * @returns The casted primitive value (number, boolean, Date, null, or string).
 */
export function inferType(value: string | null | undefined): InferredPrimitive {
  if (value === undefined || value === null) return null;
  
  const trimmed = value.trim();
  
  // 1. Handle empty cells as null
  if (trimmed === '') return null;
  
  // 2. Handle Booleans
  const lower = trimmed.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  
  // 3. Handle Numbers (ensuring we don't accidentally cast empty strings or non-numeric strings)
  if (!isNaN(trimmed as any) && !isNaN(parseFloat(trimmed))) {
    return Number(trimmed);
  }
  
  // 4. Handle Dates (Strict check for ISO/standard Date formats like YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;
  if (dateRegex.test(trimmed)) {
    const parsedDate = Date.parse(trimmed);
    if (!isNaN(parsedDate)) return new Date(parsedDate);
  }
  
  // 5. Fallback to the original string value
  return value;
}