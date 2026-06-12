import { describe, test, expect, vi } from 'vitest';

// Core engine
import { TableCore } from '../src/table-core';
import { createColumn, ColumnDef } from '../src/column';
import { EditManager } from '../src/edit-manager';
import { Row } from '../src/row';
import { Pipeline, DIRTY } from '../src/pipeline';


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
    table.setSorting([{ id: 'name', desc: false }]);
    const sortedRows = table.getRowModel().rows;
    expect(sortedRows[0].getValue('name')).toBe('Dadiangas Tiger');
    expect(mockData[0].name).toBe('Juan Dela Cruz');
  });

  test('should isolate high-frequency inputs in the EditManager overlay mapping', () => {
    const table = new TableCore<ItemRecord>({ data: mockData, columns: mockColumns });
    table.editing.startEditing('1', 'name');
    table.editing.setPendingValue('Juan Carlos');
    expect(table.getRowModel().rows[0].getValue('name')).toBe('Juan Dela Cruz');
    table.editing.commitEdit();
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
	
	test('setPageIndex should clamp to valid range', () => {
		const table = new TableCore<ItemRecord>({ data: mockData, columns: mockColumns, pageSize: 2 });
		// Only 2 pages exist, so requesting page 10 clamps to 1
		table.setPageIndex(10);
		expect(table.getState().pagination.pageIndex).toBe(1);
		// Requesting negative clamps to 0
		table.setPageIndex(-5);
		expect(table.getState().pagination.pageIndex).toBe(0);
	});

	test('setPageSize should enforce minimum size and reset pageIndex', () => {
		const table = new TableCore<ItemRecord>({ data: mockData, columns: mockColumns });
		table.setPageSize(0); // invalid size
		expect(table.getState().pagination.pageSize).toBe(1); // clamped
		expect(table.getState().pagination.pageIndex).toBe(0); // reset
	});

	test('getIsAllRowsSelected and getIsSomeRowsSelected should reflect selection state', () => {
		const table = new TableCore<ItemRecord>({ data: mockData, columns: mockColumns });
		expect(table.getIsAllRowsSelected()).toBe(false);
		expect(table.getIsSomeRowsSelected()).toBe(false);
		table.toggleAllRowsSelected(true);
		expect(table.getIsAllRowsSelected()).toBe(true);
		expect(table.getIsSomeRowsSelected()).toBe(false);
		// Partial selection
		table.toggleAllRowsSelected(false);
		table._setState({ rowSelection: { '1': true } });
		expect(table.getIsAllRowsSelected()).toBe(false);
		expect(table.getIsSomeRowsSelected()).toBe(true);
	});

	test('toggleAllRowsSelected should select and deselect all rows', () => {
		const table = new TableCore<ItemRecord>({ data: mockData, columns: mockColumns });
		table.toggleAllRowsSelected(true);
		expect(Object.keys(table.getState().rowSelection).length).toBe(3);
		table.toggleAllRowsSelected(false);
		expect(Object.keys(table.getState().rowSelection).length).toBe(0);
	});

	test('setData should replace dataset and reset selection/edits', () => {
		const table = new TableCore<ItemRecord>({ data: mockData, columns: mockColumns });
		table.toggleAllRowsSelected(true);
		table.setData([{ id: 99, name: 'New', role: 'Tester', points: 10 }]);
		expect(table.getCoreRowModel().rows.length).toBe(1);
		expect(table.getState().rowSelection).toEqual({});
		expect(table.getState().editedData).toEqual({});
	});


  // ─── Column class edge cases ───────────────────────────────────────────────
  describe('Column class edge cases', () => {
    const mockTable = {
      _data: [
        { id: 1, name: 'Juan', points: 50 },
        { id: 2, name: 'Maria', points: 90 },
        { id: 3, name: 'Tiger', points: 75 },
      ],
      _state: {
        columnVisibility: { name: true },
        sorting: [],
        columnFilters: [],
        pagination: { pageIndex: 1 },
      },
      _setState(next: any) {
        this._state = { ...this._state, ...next };
      },
    };

    test('renderHeader should resolve string and function headers', () => {
      const col1 = createColumn({ id: 'name', header: 'Full Name' }, mockTable);
      expect(col1.renderHeader()).toBe('Full Name');
      const col2 = createColumn({ id: 'points', header: (c) => `Header:${c.id}` }, mockTable);
      expect(col2.renderHeader()).toBe('Header:points');
    });

    test('toggleVisibility should respect enableHiding flag', () => {
      const col = createColumn({ id: 'name', enableHiding: true }, mockTable);
      expect(col.getIsVisible()).toBe(true);
      col.toggleVisibility(false);
      expect(col.getIsVisible()).toBe(false);

      const locked = createColumn({ id: 'points', enableHiding: false }, mockTable);
      locked.toggleVisibility(false);
      expect(locked.getIsVisible()).toBe(true);
    });

    test('toggleSorting cycles through asc, desc, unsorted', () => {
      const col = createColumn({ id: 'name', enableSorting: true }, mockTable);
      col.toggleSorting(); // asc
      expect(col.getIsSorted()).toBe('asc');
      col.toggleSorting(); // desc
      expect(col.getIsSorted()).toBe('desc');
      col.toggleSorting(); // unsorted
      expect(col.getIsSorted()).toBe(false);
    });

    test('clearSorting removes column from sort stack', () => {
      const col = createColumn({ id: 'name' }, mockTable);
      mockTable._state.sorting = [{ id: 'name', desc: false }];
      col.clearSorting();
      expect(col.getIsSorted()).toBe(false);
    });

    test('getSortingFn resolves built-in and custom functions', () => {
      const col1 = createColumn({ id: 'name', sortingFn: 'alphanumeric' }, mockTable);
      expect(typeof col1.getSortingFn()).toBe('function');
      const customFn = (a: any, b: any) => a.id - b.id;
      const col2 = createColumn({ id: 'id', sortingFn: customFn }, mockTable);
      expect(col2.getSortingFn()).toBe(customFn);
    });

    test('setFilterValue adds and clears filters', () => {
      const col = createColumn({ id: 'role', enableFiltering: true }, mockTable);
      col.setFilterValue('Developer');
      expect(col.getFilterValue()).toBe('Developer');
      col.setFilterValue('');
      expect(col.getFilterValue()).toBeUndefined();
    });

    test('getFilterFn resolves built-in and custom functions', () => {
      const col1 = createColumn({ id: 'role', filterFn: 'includesString' }, mockTable);
      expect(typeof col1.getFilterFn()).toBe('function');
      const customFn = (row: any, val: any) => row.role === val;
      const col2 = createColumn({ id: 'role', filterFn: customFn }, mockTable);
      expect(col2.getFilterFn()).toBe(customFn);
    });

    test('getFacetedUniqueValues collects unique values', () => {
      const col = createColumn({ id: 'role', accessorKey: 'role' }, {
        ...mockTable,
        _data: [
          { role: 'Dev' },
          { role: 'Designer' },
          { role: 'Dev' },
        ],
      });
      const values = col.getFacetedUniqueValues();
      expect(values.has('Dev')).toBe(true);
      expect(values.has('Designer')).toBe(true);
    });

    test('getFacetedMinMaxValues computes min and max', () => {
      const col = createColumn({ id: 'points', accessorKey: 'points' }, mockTable);
      const { min, max } = col.getFacetedMinMaxValues();
      expect(min).toBe(50);
      expect(max).toBe(90);
      const emptyCol = createColumn({ id: 'missing', accessorKey: 'missing' }, mockTable);
      const { min: min2, max: max2 } = emptyCol.getFacetedMinMaxValues();
      expect(min2).toBe(0);
      expect(max2).toBe(0);
    });
  });

	describe('EditManager edge cases', () => {
		const makeMockTable = () => ({
			_columnMap: new Map([
				['name', { _def: { enableEditing: true } }],
				['locked', { _def: { enableEditing: false } }],
			]),
			_pipeline: {
				getAllFilteredRows: () => [
					{
						id: '1',
						original: { name: 'Juan' },
						getValue: (col: string) => (col === 'name' ? 'Juan' : ''),
						getOriginalValue: (col: string) => (col === 'name' ? 'Juan' : ''),
					},
				],
			},
			_notifySubscribers: vi.fn(),
		});

		test('should not start editing if column is missing or disabled', () => {
			const table = makeMockTable();
			const mgr = new EditManager(table);
			expect(mgr.startEditing('1', 'missing')).toBe(false);
			expect(mgr.startEditing('1', 'locked')).toBe(false);
		});

		test('cancelEdit should discard pending value and call onCancel', () => {
			const table = makeMockTable();
			const onCancel = vi.fn();
			const mgr = new EditManager(table, { onCancel });
			mgr.startEditing('1', 'name');
			mgr.setPendingValue('NewName');
			mgr.cancelEdit();
			expect(mgr.getEditingCell()).toBeNull();
			expect(onCancel).toHaveBeenCalledWith('1', 'name');
		});

		test('commitEdit should update overlay and trigger onCommit', () => {
			const table = makeMockTable();
			const onCommit = vi.fn();
			const mgr = new EditManager(table, { onCommit });
			mgr.startEditing('1', 'name');
			mgr.setPendingValue('Carlos');
			const result = mgr.commitEdit();
			expect(result?.newValue).toBe('Carlos');
			expect(mgr.getOverlayValue('1', 'name')).toBe('Carlos');
			expect(mgr.isDirty('1', 'name')).toBe(true);
			expect(mgr.isRowDirty('1')).toBe(true);
			expect(onCommit).toHaveBeenCalled();
		});

		test('getRowEdits, getAllEdits, hasEdits, getEditCount should reflect overlay state', () => {
			const table = makeMockTable();
			const mgr = new EditManager(table);
			mgr.startEditing('1', 'name');
			mgr.setPendingValue('Carlos');
			mgr.commitEdit();
			expect(mgr.getRowEdits('1')).toEqual({ name: 'Carlos' });
			expect(mgr.getAllEdits()['1']).toEqual({ name: 'Carlos' });
			expect(mgr.hasEdits()).toBe(true);
			expect(mgr.getEditCount()).toBe(1);
		});

		test('revertCell, revertRow, revertAll should clear overlay', () => {
			const table = makeMockTable();
			const mgr = new EditManager(table);

			// revertCell
			mgr.startEditing('1', 'name');
			mgr.setPendingValue('Carlos');
			mgr.commitEdit();
			mgr.revertCell('1', 'name');
			expect(mgr.isDirty('1', 'name')).toBe(false);

			// revertRow
			mgr.startEditing('1', 'name');
			mgr.setPendingValue('Carlos');
			mgr.commitEdit();
			mgr.revertRow('1');
			expect(mgr.isRowDirty('1')).toBe(false);

			// revertAll
			mgr.startEditing('1', 'name');
			mgr.setPendingValue('Carlos');
			mgr.commitEdit();
			mgr.revertAll();
			expect(mgr.hasEdits()).toBe(false);
		});

		test('getDirtyRows should return merged payloads', () => {
			const table = makeMockTable();
			const mgr = new EditManager(table);
			mgr.startEditing('1', 'name');
			mgr.setPendingValue('Carlos');
			mgr.commitEdit();
			const dirty = mgr.getDirtyRows();
			expect(dirty[0].rowId).toBe('1');
			expect(dirty[0].edited).toEqual({ name: 'Carlos' });
			expect(dirty[0].merged.name).toBe('Carlos');
		});
	});

	describe('Row class edge cases', () => {
		const makeMockTable = () => {
			const overlayMap = new Map<string, any>();
			return {
				_columnMap: new Map([
					['name', { id: 'name', accessorKey: 'name' }],
					['role', { id: 'role', accessorKey: 'role' }],
				]),
				_editManager: {
					getOverlayValue: vi.fn((rowId, colId) => overlayMap.get(`${rowId}_${colId}`)),
					isEditing: vi.fn((rowId, colId) => rowId === '1' && colId === 'name'),
					isDirty: vi.fn((rowId, colId) => rowId === '1' && colId === 'name'),
					getEditingCell: vi.fn(() => ({ rowId: '1', columnId: 'name' })),
					isRowDirty: vi.fn((rowId) => rowId === '1'),
					getRowEdits: vi.fn(() => ({ name: 'Carlos' })),
				},
				_state: { rowSelection: {} },
				_setState: vi.fn(function (next) {
					this._state = { ...this._state, ...next };
				}),
				getVisibleColumns: vi.fn(() => [
					{ id: 'name', accessorKey: 'name' },
					{ id: 'role', accessorKey: 'role' },
				]),
				getAllColumns: vi.fn(() => [
					{ id: 'name', accessorKey: 'name' },
					{ id: 'role', accessorKey: 'role' },
				]),
			};
		};

		test('getValue should return overlay value when present', () => {
			const table = makeMockTable();
			table._editManager.getOverlayValue.mockReturnValueOnce('OverlayName');
			const row = new Row({ name: 'Juan' }, 0, '1', table);
			expect(row.getValue('name')).toBe('OverlayName');
		});

		test('getOriginalValue should resolve raw data when no overlay', () => {
			const table = makeMockTable();
			const row = new Row({ name: 'Juan' }, 0, '1', table);
			expect(row.getOriginalValue('name')).toBe('Juan');
		});

		test('getVisibleCells and getAllCells should return cell descriptors', () => {
			const table = makeMockTable();
			const row = new Row({ name: 'Juan', role: 'Dev' }, 0, '1', table);
			const visible = row.getVisibleCells();
			const all = row.getAllCells();
			expect(visible.length).toBe(2);
			expect(all[0].getValue()).toBe('Juan');
			expect(all[1].getOriginalValue()).toBe('Dev');
		});

		test('getCell should return a single cell descriptor or undefined', () => {
			const table = makeMockTable();
			const row = new Row({ name: 'Juan' }, 0, '1', table);
			const cell = row.getCell('name');
			expect(cell?.id).toBe('1_name');
			expect(row.getCell('missing')).toBeUndefined();
		});

		test('toggleSelected should flip selection state correctly', () => {
			const table = makeMockTable();
			const row = new Row({ name: 'Juan' }, 0, '1', table);
			expect(row.getIsSelected()).toBe(false);
			row.toggleSelected(true);
			expect(row.getIsSelected()).toBe(true);
			row.toggleSelected(false);
			expect(row.getIsSelected()).toBe(false);
		});

		test('getIsEditing and getIsDirty should reflect edit manager state', () => {
			const table = makeMockTable();
			const row = new Row({ name: 'Juan' }, 0, '1', table);
			expect(row.getIsEditing()).toBe(true);
			expect(row.getIsDirty()).toBe(true);
		});

		test('getEdits and getMergedData should merge overlay edits with original', () => {
			const table = makeMockTable();
			const row = new Row({ name: 'Juan', role: 'Dev' }, 0, '1', table);
			expect(row.getEdits()).toEqual({ name: 'Carlos' });
			const merged = row.getMergedData();
			expect(merged.name).toBe('Carlos');
			expect(merged.role).toBe('Dev');
		});
	});

	describe('Pipeline engine edge cases', () => {
		const makeMockTable = () => {
			const data = [
				{ id: 1, name: 'Juan', role: 'Dev', points: 50 },
				{ id: 2, name: 'Maria', role: 'Designer', points: 90 },
				{ id: 3, name: 'Tiger', role: 'Dev', points: 75 },
			];

			// Create the table shell first
			const table: any = {
				_data: data,
				_allColumns: [] as any[],
				_columnMap: new Map(),
				_state: {
					globalFilter: '',
					columnFilters: [],
					sorting: [],
					pagination: { pageIndex: 0, pageSize: 2 },
					columnVisibility: { name: true, role: true, points: true },
				},
			};

			// Now bind columns to this table
			const columns = [
				createColumn({ id: 'name', accessorKey: 'name', enableFiltering: true, enableSorting: true }, table),
				createColumn({ id: 'role', accessorKey: 'role', enableFiltering: true }, table),
				createColumn({ id: 'points', accessorKey: 'points', enableSorting: true }, table),
			];

			table._allColumns = columns;
			table._columnMap = new Map(columns.map((c) => [c.id, c]));

			return table;
		};

  test('markDirty and markAllDirty should update flags', () => {
    const table = makeMockTable();
    const pipeline = new Pipeline(table);
    pipeline.markDirty(DIRTY.FILTER);
    expect((pipeline as any)._dirty & DIRTY.FILTER).toBeTruthy();
    pipeline.markAllDirty();
    expect((pipeline as any)._dirty).toBe(DIRTY.ALL);
  });

  test('getPageRows should run all stages and reset dirty flag', () => {
    const table = makeMockTable();
    const pipeline = new Pipeline(table);
    const rows = pipeline.getPageRows();
    expect(rows.length).toBe(2); // page size = 2
    expect((pipeline as any)._dirty).toBe(0);
  });

  test('getFilteredSortedRows should return sorted rows when dirty', () => {
    const table = makeMockTable();
    table._state.sorting = [{ id: 'name', desc: false }];
    const pipeline = new Pipeline(table);
    const rows = pipeline.getFilteredSortedRows();
    expect(rows[0].original.name).toBe('Juan'); // alphabetical order
  });

  test('filter stage should respect globalFilter', () => {
    const table = makeMockTable();
    table._state.globalFilter = 'Maria';
    const pipeline = new Pipeline(table);
    const rows = pipeline.getFilteredSortedRows();
    expect(rows.length).toBe(1);
    expect(rows[0].original.name).toBe('Maria');
  });

  test('filter stage should respect columnFilters', () => {
    const table = makeMockTable();
    table._state.columnFilters = [{ id: 'role', value: 'Dev' }];
    const pipeline = new Pipeline(table);
    const rows = pipeline.getFilteredSortedRows();
    expect(rows.every((r) => r.original.role === 'Dev')).toBe(true);
  });

  test('sort stage should respect desc flag', () => {
    const table = makeMockTable();
    table._state.sorting = [{ id: 'points', desc: true }];
    const pipeline = new Pipeline(table);
    const rows = pipeline.getFilteredSortedRows();
    expect(rows[0].original.points).toBe(90); // highest first
  });

  test('getFilteredRowCount should trigger filter+sort when dirty', () => {
    const table = makeMockTable();
    table._state.columnFilters = [{ id: 'role', value: 'Dev' }];
    const pipeline = new Pipeline(table);
    const count = pipeline.getFilteredRowCount();
    expect(count).toBe(2);
  });

  test('getPageCount should compute based on filtered row count', () => {
    const table = makeMockTable();
    table._state.pagination.pageSize = 2;
    const pipeline = new Pipeline(table);
    const pageCount = pipeline.getPageCount();
    expect(pageCount).toBe(2); // 3 rows / 2 per page = 2 pages
  });

  test('getAllFilteredRows should return all rows across pages', () => {
    const table = makeMockTable();
    const pipeline = new Pipeline(table);
    const rows = pipeline.getAllFilteredRows();
    expect(rows.length).toBe(3);
  });

  // 🔹 Extra edge cases to close branches
  test('globalFilter should skip when all columns hidden', () => {
    const table = makeMockTable();
    table._state.globalFilter = 'Juan';
    table._state.columnVisibility = { name: false, role: false, points: false };
    const pipeline = new Pipeline(table);
    const rows = pipeline.getFilteredSortedRows();
    expect(rows.length).toBe(0); // no visible columns → no match
  });

  test('columnFilters should skip when filterFn fails', () => {
    const table = makeMockTable();
    table._state.columnFilters = [{ id: 'role', value: 'Nonexistent' }];
    const pipeline = new Pipeline(table);
    const rows = pipeline.getFilteredSortedRows();
    expect(rows.length).toBe(0); // filterFn rejects all
  });

  test('sort stage should skip when column cannot sort', () => {
    const table = makeMockTable();
    // Replace role column with one that cannot sort
    table._columnMap.set('role', createColumn({ id: 'role', accessorKey: 'role', enableSorting: false }, table));
    table._state.sorting = [{ id: 'role', desc: false }];
    const pipeline = new Pipeline(table);
    const rows = pipeline.getFilteredSortedRows();
    expect(rows.length).toBe(3); // no sorting applied
  });
});

});