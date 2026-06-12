import { describe, it, expect } from 'vitest';
import { sortFns } from '../src/sort-fns';
import { filterFns } from '../src/filter-fns';
import { SortingFn } from '../src/sort-fns';
import { FilterFn } from '../src/filter-fns';

describe('LaMesa Pure Utility Functions', () => {
  
  describe('Sort Functions', () => {
    it('should sort alphanumeric strings case-insensitively', () => {
      const alpha: SortingFn = sortFns.alphanumeric;
      expect(alpha('apple', 'banana')).toBeLessThan(0);
      expect(alpha('Banana', 'apple')).toBeGreaterThan(0);
      expect(alpha('apple', 'apple')).toBe(0);
    });

    it('should push null and undefined values to the bottom', () => {
      const alpha: SortingFn = sortFns.alphanumeric;
      expect(alpha(null, 'valid string')).toBeGreaterThan(0);
      expect(alpha('valid string', undefined)).toBeLessThan(0);
    });
  });

  describe('Filter Functions', () => {
    it('should match strings case-insensitively using includesString', () => {
      const filter: FilterFn = filterFns.includesString;
      
      expect(filter('Ho Chi Minh City', 'minh')).toBe(true); 
      expect(filter('Danang', 'HCMC')).toBe(false);
    });

    it('should handle empty or missing search values gracefully', () => {
      const filter: FilterFn = filterFns.includesString;
      expect(filter('Any Value', '')).toBe(true);
    });
  });
});