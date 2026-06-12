/**
 * @lamesa/csv-parser
 *
 * Main Package Entry Surface.
 * Exposes a clean API to safely load, tokenize, and type-cast CSV string inputs.
 *
 * @example
 * import { parseCsv } from '@lamesa/csv-parser';
 * const tableData = parseCsv<{ id: number; name: string }>('id,name\n1,Juan\n2,Maria');
 * table.setData(tableData);
 *
 * @example
 * // Bypassing data type conversions for performance or raw imports:
 * const rawData = parseCsv(csvText, { dynamicTyping: false });
 */

import { tokenizeCsv } from './tokenizer';
import { normalizeTokens, CsvNormalizerOptions } from './normalizer';

export interface ParseCsvOptions extends CsvNormalizerOptions {
  delimiter?: string;
}

export { tokenizeCsv } from './tokenizer';
export { normalizeTokens } from './normalizer';
export { inferType } from './inferrer';
export type { InferredPrimitive } from './inferrer';

/**
 * Parses raw CSV data strings into structured JSON objects.
 * @param csvString - The raw, incoming string block data.
 * @param options - Configuration parameters for the parser.
 * @returns Key-value array of objects prepared for LaMesa Core ingestion.
 */
export function parseCsv<T = Record<string, any>>(
  csvString: string,
  options: ParseCsvOptions = {}
): T[] {
  const delimiter = options.delimiter || ',';
  
  // Pass 1: Turn string data into a structured 2D array
  const rawMatrix = tokenizeCsv(csvString, delimiter);
  
  // Pass 2: Zip rows with headers and cast the data strings to JS types
  return normalizeTokens<T>(rawMatrix, options);
}