import { describe, test, expect } from 'vitest';
import { parseCsv } from '../src/index';

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
    expect(result[0].active).toBe(true); // Verifies type inference works
  });

  test('should infer native JavaScript primitive data structures accurately', () => {
    const csv = `title,count,date,isDraft\nProject LaMesa,12,2026-06-11,false`;
    const result = parseCsv<ProjectRecord>(csv);

    expect(typeof result[0].count).toBe('number');
    expect(result[0].count).toBe(12);
    expect(result[0].isDraft).toBe(false);
    expect(result[0].date instanceof Date).toBe(true);
  });
});