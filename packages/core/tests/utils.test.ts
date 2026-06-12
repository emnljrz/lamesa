import { describe, test, expect } from 'vitest';
import { sortFns, type SortingFn } from '../src/sort-fns';
import { filterFns, type FilterFn } from '../src/filter-fns';

describe('LaMesa Pure Utility Functions', () => {
  // ─── Sort Functions ───────────────────────────────────────────────
  describe('Sort Functions', () => {
    test('alphanumeric should sort strings case-insensitively', () => {
      const alpha: SortingFn = sortFns.alphanumeric;
      expect(alpha('apple', 'banana')).toBeLessThan(0);
      expect(alpha('Banana', 'apple')).toBeGreaterThan(0);
      expect(alpha('apple', 'apple')).toBe(0);
    });

    test('alphanumeric should push null/undefined to the bottom', () => {
      const alpha: SortingFn = sortFns.alphanumeric;
      expect(alpha(null, 'valid')).toBeGreaterThan(0);
      expect(alpha('valid', undefined)).toBeLessThan(0);
    });

    test('basic should compare numbers and booleans strictly', () => {
      const basic: SortingFn = sortFns.basic;
      expect(basic(1, 2)).toBeLessThan(0);
      expect(basic(2, 1)).toBeGreaterThan(0);
      expect(basic(true, false)).toBeGreaterThan(0);
      expect(basic(null, 5)).toBeGreaterThan(0);
    });

    test('datetime should compare Date objects and parseable strings', () => {
      const dt: SortingFn = sortFns.datetime;
      const d1 = new Date('2020-01-01');
      const d2 = new Date('2021-01-01');
      expect(dt(d1, d2)).toBeLessThan(0);
      expect(dt('2022-01-01', '2021-01-01')).toBeGreaterThan(0);
      expect(dt(null, d1)).toBeGreaterThan(0);
    });

    test('caseInsensitive should compare strings ignoring case', () => {
      const ci: SortingFn = sortFns.caseInsensitive;
      expect(ci('apple', 'Banana')).toBeLessThan(0);
      expect(ci('Banana', 'apple')).toBeGreaterThan(0);
      expect(ci('apple', 'APPLE')).toBe(0);
      expect(ci(null, 'z')).toBeGreaterThan(0);
    });
  });

  // ─── Filter Functions ─────────────────────────────────────────────
  describe('Filter Functions', () => {
    test('includesString should match substrings case-insensitively', () => {
      const filter: FilterFn = filterFns.includesString;
      expect(filter('Ho Chi Minh City', 'minh')).toBe(true);
      expect(filter('Danang', 'HCMC')).toBe(false);
      expect(filter('Hello', '')).toBe(true); // empty filter
      expect(filter(null, 'hello')).toBe(false);
    });

    test('includesStringSensitive should match substrings case-sensitively', () => {
      expect(filterFns.includesStringSensitive('Hello World', 'World')).toBe(true);
      expect(filterFns.includesStringSensitive('Hello World', 'world')).toBe(false);
    });

    test('equalsString should match exact strings case-insensitive', () => {
      expect(filterFns.equalsString('Test', 'test')).toBe(true);
      expect(filterFns.equalsString('Test', 'Other')).toBe(false);
    });

    test('equals and notEquals should compare strictly', () => {
      expect(filterFns.equals(5, 5)).toBe(true);
      expect(filterFns.equals(5, '5')).toBe(false);
      expect(filterFns.notEquals(5, 5)).toBe(false);
      expect(filterFns.notEquals(5, '5')).toBe(true);
    });

    test('inNumberRange should respect min and max', () => {
      expect(filterFns.inNumberRange(10, { min: 5, max: 15 })).toBe(true);
      expect(filterFns.inNumberRange(2, { min: 5, max: 15 })).toBe(false);
      expect(filterFns.inNumberRange('abc', { min: 1, max: 2 })).toBe(false);
      expect(filterFns.inNumberRange(10, {})).toBe(true); // empty range
    });

    test('greaterThan and lessThan should compare numbers strictly', () => {
      expect(filterFns.greaterThan(10, 5)).toBe(true);
      expect(filterFns.greaterThan(3, 5)).toBe(false);
      expect(filterFns.lessThan(3, 5)).toBe(true);
      expect(filterFns.lessThan(10, 5)).toBe(false);
    });

    test('arrIncludes should check array membership', () => {
      expect(filterFns.arrIncludes([1, 2, 3], 2)).toBe(true);
      expect(filterFns.arrIncludes([1, 2, 3], 4)).toBe(false);
      expect(filterFns.arrIncludes('not-an-array', 2)).toBe(false);
    });

    test('arrIncludesAll should require all values present', () => {
      expect(filterFns.arrIncludesAll([1, 2, 3], [1, 2])).toBe(true);
      expect(filterFns.arrIncludesAll([1, 2, 3], [1, 4])).toBe(false);
    });

    test('arrIncludesSome should require at least one value present', () => {
      expect(filterFns.arrIncludesSome([1, 2, 3], [4, 2])).toBe(true);
      expect(filterFns.arrIncludesSome([1, 2, 3], [4, 5])).toBe(false);
    });
  });
});
