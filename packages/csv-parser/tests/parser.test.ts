import { describe, test, expect } from 'vitest';
import { parseCsv } from '../src/index';
import { normalizeRow } from '../src/normalizer';

interface UserRecord {
  id: number;
  name: string;
  role: string;
}

interface LocationRecord {
  id: number;
  location: string;
  active: boolean;
}

interface ProjectRecord {
  title: string;
  count: number;
  date: Date;
  isDraft: boolean;
}

describe('LaMesa CSV Parser', () => {
  test('should parse plain CSV streams and map rows into structured JSON collections', () => {
    const csv = `id,name,role\n1,Juan,Developer\n2,Maria,Designer`;
    const result = parseCsv<UserRecord>(csv);

    expect(result.length).toBe(2);
    expect(result[0]).toEqual({ id: 1, name: 'Juan', role: 'Developer' });
  });

  test('should parse text fields safely when commas are nested inside quotes', () => {
    const csv = `id,location,active\n1,"General Santos City, Mindanao",true`;
    const result = parseCsv<LocationRecord>(csv);

    expect(result[0].location).toBe('General Santos City, Mindanao');
    expect(result[0].active).toBe(true);
  });

  test('should infer native JavaScript primitive data structures accurately', () => {
    const csv = `title,count,date,isDraft\nProject LaMesa,12,2026-06-11,false`;
    const result = parseCsv<ProjectRecord>(csv);

    expect(typeof result[0].count).toBe('number');
    expect(result[0].count).toBe(12);
    expect(result[0].isDraft).toBe(false);
    expect(result[0].date instanceof Date).toBe(true);
  });

  // =========================================================================
  // EDGE CASE COVERAGE FOR NORMALIZER & INFERRER
  // =========================================================================

  test('should gracefully handle rows with missing fields/fewer cells than headers', () => {
    const csv = `id,name,role\n1,Juan,Developer\n2`;
    const result = parseCsv<any>(csv);

    expect(result.length).toBe(2);
    expect(result[1]).toEqual({ id: 2, name: null, role: null });
  });

  test('should handle rows containing explicit null or empty values safely', () => {
    const csv = `id,name,role\n1,,Admin`;
    const result = parseCsv<any>(csv);

    expect(result[0]).toEqual({ id: 1, name: null, role: 'Admin' });
  });

  test('should fall back safely when data fields defy structural primitives', () => {
    const csv = `title,count,date,isDraft\nProject LaMesa,,invalid-date,not-a-boolean`;
    const result = parseCsv<any>(csv);

    expect(result[0].count).toBe(null);
    expect(result[0].date).toBe('invalid-date');
    expect(result[0].isDraft).toBe('not-a-boolean');
  });
});

describe('LaMesa Core Parser Unit Fallbacks', () => {
  test('forces normalizer array mismatch branches directly', () => {
    const sparseRow: any[] = [];
    sparseRow[5] = 'Ghost Data';

    const headers = ['id', 'name', 'role'];
    const result = normalizeRow(sparseRow, headers);

    expect(result).toBeDefined();
  });

  test('forces tokenizer literal tracking parameters', () => {
    const unclosedCsv = `id,name,role\n1,"Unclosed Quote Block`;
    const result = parseCsv<any>(unclosedCsv);

    expect(result.length).toBe(1);
  });

  test('handles dangling fields and trailing carriage returns', () => {
    const trailingCsv = `id,name,role\n1,Juan,Developer,\n,,`;
    const result = parseCsv<any>(trailingCsv);

    expect(result.length).toBe(2);
  });

  test('inferrer should fall back when numeric parsing fails', () => {
    const csv = `id,value\n1,12abc`;
    const result = parseCsv<any>(csv);
    expect(result[0].value).toBe('12abc');
  });

  test('inferrer should handle boolean casing safely', () => {
    const csv = `flag\nTRUE\nFALSE`;
    const result = parseCsv<any>(csv);
    expect(result[0].flag).toBe(true);
    expect(result[1].flag).toBe(false);
  });

  test('inferrer should treat empty string as null', () => {
    const csv = `id,name\n1,`;
    const result = parseCsv<any>(csv);
    expect(result[0].name).toBe(null);
  });

  test('normalizer should assign default column name when header is empty', () => {
    const csv = `id,,role\n1,Juan,Developer`;
    const result = parseCsv<any>(csv);
    expect(Object.keys(result[0])).toContain('column_1');
  });

  test('tokenizer should handle dangling delimiter safely', () => {
    const csv = `id,name\n1,Juan,`;
    const result = parseCsv<any>(csv);
    expect(result[0].name).toBe('Juan');
  });

  test('tokenizer should parse escaped quotes correctly', () => {
    const csv = `id,quote\n1,"He said ""Hello"""`;
    const result = parseCsv<any>(csv);
    expect(result[0].quote).toBe('He said "Hello"');
  });

  test('should handle Windows-style CRLF line endings correctly', () => {
    const csv = `id,name,role\r\n1,Juan,Developer\r\n2,Maria,Designer\r\n`;
    const result = parseCsv<any>(csv);

    expect(result.length).toBe(2);
    expect(result[0]).toEqual({ id: 1, name: 'Juan', role: 'Developer' });
    expect(result[1]).toEqual({ id: 2, name: 'Maria', role: 'Designer' });
  });
});
