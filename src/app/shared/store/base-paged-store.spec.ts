/* eslint-disable @typescript-eslint/no-magic-numbers */
import { DestroyRef, Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';

import { BasePagedStore, PaginatedResult } from './base-paged-store';

type TestItem = { id: number; label: string };
type TestFilters = { search?: string; category?: string };

type FetchPageFn = (page: number) => Observable<PaginatedResult<TestItem>>;

const mockPage = (
  hasNext: boolean,
  total: number,
  page: number = 1
): PaginatedResult<TestItem> => ({
  items: [
    { id: (page - 1) * 2 + 1, label: `item-${(page - 1) * 2 + 1}` },
    { id: (page - 1) * 2 + 2, label: `item-${(page - 1) * 2 + 2}` },
  ],
  hasNext,
  totalItems: total,
});

let fetchPageFn: ReturnType<typeof vi.fn<FetchPageFn>>;

@Injectable()
class ConcretePagedStore extends BasePagedStore<TestItem, TestFilters, string> {
  readonly resetCalls: number[] = [];

  constructor() {
    super({ pageSize: 5, filterDebounce: 0 });
  }

  protected fetchPage(page: number): Observable<PaginatedResult<TestItem>> {
    return fetchPageFn(page);
  }

  protected resetToFirstPage(): void {
    this.resetCalls.push(Date.now());
    this.set({ items: [], hasNext: false, totalItems: 0, currentPage: 0 });
  }
}

const DEBOUNCE_MS = 200;

@Injectable()
class DebouncedPagedStore extends BasePagedStore<TestItem, TestFilters, string> {
  constructor() {
    super({ pageSize: 10, filterDebounce: DEBOUNCE_MS });
  }

  protected fetchPage(page: number): Observable<PaginatedResult<TestItem>> {
    return fetchPageFn(page);
  }

  protected resetToFirstPage(): void {
    this.set({ items: [], hasNext: false, totalItems: 0, currentPage: 0 });
  }
}

describe('BasePagedStore', () => {
  let store: ConcretePagedStore;

  beforeEach(() => {
    fetchPageFn = vi.fn<FetchPageFn>();
    fetchPageFn.mockReturnValue(of(mockPage(false, 2, 1)));
    TestBed.configureTestingModule({ providers: [ConcretePagedStore, DestroyRef] });
    store = TestBed.inject(ConcretePagedStore);
  });

  describe('initial state', () => {
    it('should start with empty items', () => {
      expect(store.items()).toEqual([]);
    });

    it('should have hasNext false', () => {
      expect(store.hasNext()).toBe(false);
    });

    it('should have totalItems 0', () => {
      expect(store.totalItems()).toBe(0);
    });

    it('should have currentPage 0', () => {
      expect(store.currentPage()).toBe(0);
    });

    it('should have displayCount 0', () => {
      expect(store.displayCount()).toBe(0);
    });

    it('should not be loading', () => {
      expect(store.loading()).toBe(false);
    });

    it('should have no error', () => {
      expect(store.error()).toBeNull();
    });

    it('should have empty filters', () => {
      expect(store.filters()).toEqual({});
    });

    it('should have null sort', () => {
      expect(store.sort()).toBeNull();
    });

    it('should have pageSize from config', () => {
      expect(store.pageSize()).toBe(5);
    });

    it('should have totalPages 0 with no items', () => {
      expect(store.totalPages()).toBe(0);
    });

    it('should not be empty before any fetch', () => {
      expect(store.isEmpty()).toBe(false);
    });
  });

  describe('setFilters', () => {
    it('should update filters signal', () => {
      store.setFilters({ search: 'hello' });
      expect(store.filters()).toEqual({ search: 'hello' });
    });

    it('should call resetToFirstPage', () => {
      store.setFilters({ search: 'test' });
      expect(store.resetCalls.length).toBe(1);
    });
  });

  describe('patchFilters', () => {
    it('should merge with existing filters', () => {
      store.setFilters({ search: 'test', category: 'books' });
      store.patchFilters({ category: 'music' });
      expect(store.filters()).toEqual({ search: 'test', category: 'music' });
    });

    it('should remove keys set to undefined', () => {
      store.setFilters({ search: 'test', category: 'books' });
      store.patchFilters({ category: undefined });
      expect(store.filters()).toEqual({ search: 'test' });
    });

    it('should add new filter keys', () => {
      store.setFilters({ search: 'test' });
      store.patchFilters({ category: 'books' });
      expect(store.filters()).toEqual({ search: 'test', category: 'books' });
    });
  });

  describe('setSort', () => {
    it('should update sort signal', () => {
      store.setSort({ field: 'name', direction: 'asc' });
      expect(store.sort()).toEqual({ field: 'name', direction: 'asc' });
    });

    it('should call resetToFirstPage', () => {
      store.setSort({ field: 'name', direction: 'desc' });
      expect(store.resetCalls.length).toBe(1);
    });

    it('should clear sort with null', () => {
      store.setSort({ field: 'name', direction: 'asc' });
      store.setSort(null);
      expect(store.sort()).toBeNull();
    });
  });

  describe('setPageSize', () => {
    it('should update pageSize signal', () => {
      store.setPageSize(20);
      expect(store.pageSize()).toBe(20);
    });

    it('should call resetToFirstPage', () => {
      store.setPageSize(20);
      expect(store.resetCalls.length).toBe(1);
    });
  });

  describe('totalPages', () => {
    it('should compute from totalItems and pageSize', () => {
      store.setPageSize(3);
      // Simulate state with totalItems
      store['patch']({ totalItems: 10 });
      expect(store.totalPages()).toBe(4);
    });

    it('should return 0 when pageSize is 0', () => {
      store.setPageSize(0);
      store['patch']({ totalItems: 10 });
      expect(store.totalPages()).toBe(0);
    });
  });

  describe('isEmpty', () => {
    it('should be true when items are empty and currentPage > 0', () => {
      store['set']({ items: [], hasNext: false, totalItems: 0, currentPage: 1 });
      expect(store.isEmpty()).toBe(true);
    });

    it('should be false when items are present', () => {
      store['set']({
        items: [{ id: 1, label: 'a' }],
        hasNext: false,
        totalItems: 1,
        currentPage: 1,
      });
      expect(store.isEmpty()).toBe(false);
    });

    it('should be false when currentPage is 0', () => {
      expect(store.isEmpty()).toBe(false);
    });
  });

  describe('debounce', () => {
    let debouncedStore: DebouncedPagedStore;

    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [DebouncedPagedStore, DestroyRef] });
      debouncedStore = TestBed.inject(DebouncedPagedStore);
    });

    it('should debounce rapid filter changes', () => {
      vi.useFakeTimers();

      debouncedStore.setFilters({ search: 'a' });
      debouncedStore.setFilters({ search: 'ab' });
      debouncedStore.setFilters({ search: 'abc' });

      expect(debouncedStore.filters()).toEqual({});

      vi.advanceTimersByTime(DEBOUNCE_MS);

      expect(debouncedStore.filters()).toEqual({ search: 'abc' });

      vi.useRealTimers();
    });

    it('should not debounce sort changes', () => {
      debouncedStore.setSort({ field: 'name', direction: 'asc' });
      expect(debouncedStore.sort()).toEqual({ field: 'name', direction: 'asc' });
    });
  });
});
