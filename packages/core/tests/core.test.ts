import { describe, test, expect } from 'vitest';
import { TableCore } from '../src/table-core';
import { ColumnDef } from '../src/column';

interface ItemRecord {
  id: number;
  name: string;
  role: string;
  points: number;
}

describe('LaMesa Core Engine', () => {
  const mockData: ItemRecord[] = [
    { id: 1, name: 'Juan Dela Cruz', role: 'Developer', points: 50 },
    { id: 2, name: 'Maria Santos', role: 'Designer', points: 90 },
    { id: 3, name: 'Dadiangas Tiger', role: 'Developer', points: 75 }
  ];

  const mockColumns: ColumnDef<ItemRecord>[] = [
    { id: 'name', accessorKey: 'name', enableSorting: true },
    { id: 'role', accessorKey: 'role', enableFiltering: true },
    { id: 'points', accessorKey: 'points' }
  ];

  test('should initialize state and resolve raw models correctly', () => {
    const table = new TableCore<ItemRecord>({
      data: mockData,
      columns: mockColumns,
      pageSize: 2
    });

    expect(table.getCoreRowModel().rows.length).toBe(3);
    expect(table.getRowModel().rows.length).toBe(2); // Page size limit
  });

  test('should sort rows dynamically without mutating original array data', () => {
    const table = new TableCore<ItemRecord>({ data: mockData, columns: mockColumns });
    
    // Set sorting state for 'name' ascending
    table.setSorting([{ id: 'name', desc: false }]);
    
    const sortedRows = table.getRowModel().rows;
    expect(sortedRows[0].getValue('name')).toBe('Dadiangas Tiger'); // Alphabetical order
    expect(mockData[0].name).toBe('Juan Dela Cruz'); // Original reference left safe!
  });

  test('should isolate high-frequency inputs in the EditManager overlay mapping', () => {
    const table = new TableCore<ItemRecord>({ data: mockData, columns: mockColumns });

    // Simulate clicking a cell to edit
    table.editing.startEditing('1', 'name');
    table.editing.setPendingValue('Juan Carlos');
    
    // Value shouldn't be committed to display model yet
    expect(table.getRowModel().rows[0].getValue('name')).toBe('Juan Dela Cruz');

    // Commit change
    table.editing.commitEdit();
    
    // Now display model uses the overlay map, baseline is preserved
    expect(table.getRowModel().rows[0].getValue('name')).toBe('Juan Carlos');
    expect((table.getRowModel().rows[0] as any).isDirty('name')).toBe(true);
    expect(mockData[0].name).toBe('Juan Dela Cruz');
  });

  test('should handle row selection globally across active views', () => {
    const table = new TableCore<ItemRecord>({ data: mockData, columns: mockColumns });
    
    expect(table.getIsAllRowsSelected()).toBe(false);
    table.toggleAllRowsSelected(true);
    expect(table.getIsAllRowsSelected()).toBe(true);
  });
});