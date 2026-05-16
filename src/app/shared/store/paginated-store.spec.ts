/* eslint-disable @typescript-eslint/no-magic-numbers */
import { DestroyRef, Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { delay, Observable, of, Subject, throwError } from 'rxjs';

import { PaginatedResult, PaginatedStore } from './paginated-store';

type TestItem = { id: number; label: string };

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

const emptyPage = (): PaginatedResult<TestItem> => ({
  items: [],
  hasNext: false,
  totalItems: 0,
});

let fetchPageFn: ReturnType<typeof vi.fn<FetchPageFn>>;

@Injectable()
class TestPaginatedStore extends PaginatedStore<TestItem> {
  constructor() {
    super();
  }

  protected fetchPage(page: number): Observable<PaginatedResult<TestItem>> {
    return fetchPageFn(page);
  }
}

const PAGE_SIZE = 2;

@Injectable()
class TestPaginatedStoreWithPageSize extends PaginatedStore<TestItem> {
  constructor() {
    super({ pageSize: PAGE_SIZE });
  }

  protected fetchPage(page: number): Observable<PaginatedResult<TestItem>> {
    return fetchPageFn(page);
  }
}

const DEBOUNCE_MS = 300;

@Injectable()
class TestPaginatedStoreWithDebounce extends PaginatedStore<TestItem> {
  constructor() {
    super({ filterDebounce: DEBOUNCE_MS });
  }

  protected fetchPage(page: number): Observable<PaginatedResult<TestItem>> {
    return fetchPageFn(page);
  }
}

@Injectable()
class TestInfiniteStore extends PaginatedStore<TestItem> {
  constructor() {
    super({ pageSize: PAGE_SIZE, mode: 'infinite' });
  }

  protected fetchPage(page: number): Observable<PaginatedResult<TestItem>> {
    return fetchPageFn(page);
  }
}

@Injectable()
class TestPaginatedModeStore extends PaginatedStore<TestItem> {
  constructor() {
    super({ pageSize: PAGE_SIZE, mode: 'paginated' });
  }

  protected fetchPage(page: number): Observable<PaginatedResult<TestItem>> {
    return fetchPageFn(page);
  }
}

describe('PaginatedStore', () => {
  let store: TestPaginatedStore;

  beforeEach(() => {
    fetchPageFn = vi.fn<FetchPageFn>();
    TestBed.configureTestingModule({ providers: [TestPaginatedStore, DestroyRef] });
    store = TestBed.inject(TestPaginatedStore);
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

    it('should have displayCount 0', () => {
      expect(store.displayCount()).toBe(0);
    });

    it('should have currentPage 0', () => {
      expect(store.currentPage()).toBe(0);
    });

    it('should not be loading', () => {
      expect(store.loading()).toBe(false);
    });

    it('should have empty filters', () => {
      expect(store.filters()).toEqual({});
    });

    it('should have null sort', () => {
      expect(store.sort()).toBeNull();
    });

    it('should not be empty before any fetch', () => {
      expect(store.isEmpty()).toBe(false);
    });
  });

  describe('loadMore', () => {
    it('should fetch page 1 on first call', () => {
      fetchPageFn.mockReturnValue(of(mockPage(true, 4, 1)));

      store.loadMore();

      expect(fetchPageFn).toHaveBeenCalledWith(1);
      expect(store.items()).toEqual([
        { id: 1, label: 'item-1' },
        { id: 2, label: 'item-2' },
      ]);
      expect(store.hasNext()).toBe(true);
      expect(store.totalItems()).toBe(4);
      expect(store.displayCount()).toBe(2);
      expect(store.currentPage()).toBe(1);
    });

    it('should accumulate items across pages', () => {
      fetchPageFn.mockReturnValueOnce(of(mockPage(true, 4, 1)));
      store.loadMore();

      fetchPageFn.mockReturnValueOnce(of(mockPage(false, 4, 2)));
      store.loadMore();

      expect(store.items()).toHaveLength(4);
      expect(store.hasNext()).toBe(false);
      expect(store.currentPage()).toBe(2);
    });

    it('should retry the same page after error', () => {
      fetchPageFn.mockReturnValueOnce(throwError(() => new Error('fail')));
      store.loadMore();

      fetchPageFn.mockReturnValueOnce(of(mockPage(false, 2, 1)));
      store.loadMore();

      expect(fetchPageFn).toHaveBeenCalledTimes(2);
      expect(fetchPageFn).toHaveBeenNthCalledWith(2, 1);
      expect(store.currentPage()).toBe(1);
    });

    it('should not re-fetch a cached page after error', () => {
      fetchPageFn.mockReturnValueOnce(of(mockPage(true, 4, 1)));
      store.loadMore();

      fetchPageFn.mockReturnValueOnce(throwError(() => new Error('fail')));
      store.loadMore();

      fetchPageFn.mockReturnValueOnce(of(mockPage(false, 4, 2)));
      store.loadMore();

      expect(fetchPageFn).toHaveBeenCalledTimes(3);
      expect(fetchPageFn).toHaveBeenNthCalledWith(3, 2);
      expect(store.items()).toHaveLength(4);
    });

    it('should not fetch when already loading', () => {
      fetchPageFn.mockReturnValue(of(mockPage(true, 4, 1)).pipe(delay(1000)));

      store.loadMore();
      store.loadMore();

      expect(fetchPageFn).toHaveBeenCalledTimes(1);
    });

    it('should set loading to false after fetch completes', () => {
      fetchPageFn.mockReturnValue(of(mockPage(false, 2, 1)));

      store.loadMore();

      expect(store.loading()).toBe(false);
    });

    it('should set error signal on failure', () => {
      fetchPageFn.mockReturnValueOnce(
        throwError(() => ({ message: 'Network error', status: 503 }))
      );

      store.loadMore();

      expect(store.error()).toEqual({ message: 'Network error', code: 503 });
    });

    it('should expose current filters and sort via signals', () => {
      fetchPageFn.mockReturnValue(of(mockPage(false, 2, 1)));
      store.setFilters({ search: 'test' });

      fetchPageFn.mockReturnValue(of(mockPage(false, 2, 1)));
      store.setSort({ field: 'name', direction: 'asc' });

      fetchPageFn.mockClear();
      fetchPageFn.mockReturnValue(of(mockPage(false, 4, 2)));
      store.loadMore();

      expect(fetchPageFn).toHaveBeenCalledWith(2);
      expect(store.filters()).toEqual({ search: 'test' });
      expect(store.sort()).toEqual({ field: 'name', direction: 'asc' });
    });
  });

  describe('goToPage', () => {
    it('should replace items instead of accumulating', () => {
      fetchPageFn.mockReturnValueOnce(of(mockPage(true, 6, 1)));
      store.loadMore();

      fetchPageFn.mockReturnValueOnce(of(mockPage(true, 6, 2)));
      store.goToPage(2);

      expect(store.items()).toEqual([
        { id: 3, label: 'item-3' },
        { id: 4, label: 'item-4' },
      ]);
      expect(store.currentPage()).toBe(2);
    });

    it('should update totalItems and hasNext', () => {
      fetchPageFn.mockReturnValueOnce(of(mockPage(false, 10, 3)));

      store.goToPage(3);

      expect(store.totalItems()).toBe(10);
      expect(store.hasNext()).toBe(false);
      expect(store.currentPage()).toBe(3);
    });

    it('should not fetch when page is less than 1', () => {
      store.goToPage(0);
      store.goToPage(-1);

      expect(fetchPageFn).not.toHaveBeenCalled();
    });

    it('should set error signal on failure', () => {
      fetchPageFn.mockReturnValueOnce(throwError(() => ({ message: 'Not Found', status: 404 })));

      store.goToPage(999);

      expect(store.error()).toEqual({ message: 'Not Found', code: 404 });
    });

    it('should cancel previous in-flight request on new navigation', () => {
      const page2$ = new Subject<PaginatedResult<TestItem>>();
      const page3$ = new Subject<PaginatedResult<TestItem>>();

      fetchPageFn.mockReturnValueOnce(page2$);
      fetchPageFn.mockReturnValueOnce(page3$);

      store.goToPage(2);
      store.goToPage(3);

      page2$.next(mockPage(true, 6, 2));
      page2$.complete();

      expect(store.currentPage()).not.toBe(2);

      page3$.next(mockPage(false, 6, 3));
      page3$.complete();

      expect(store.currentPage()).toBe(3);
      expect(store.items()).toEqual([
        { id: 5, label: 'item-5' },
        { id: 6, label: 'item-6' },
      ]);
    });

    it('should serve cached pages instantly without loading', () => {
      fetchPageFn.mockReturnValueOnce(of(mockPage(true, 6, 1)));
      store.goToPage(1);

      fetchPageFn.mockReturnValueOnce(of(mockPage(true, 6, 2)));
      store.goToPage(2);

      store.goToPage(1);

      expect(fetchPageFn).toHaveBeenCalledTimes(2);
      expect(store.currentPage()).toBe(1);
      expect(store.loading()).toBe(false);
    });

    it('should bypass cache with forceRefresh', () => {
      fetchPageFn.mockReturnValueOnce(of(mockPage(true, 6, 1)));
      store.goToPage(1);

      fetchPageFn.mockReturnValueOnce(of(mockPage(true, 8, 1)));
      store.goToPage(1, { forceRefresh: true });

      expect(fetchPageFn).toHaveBeenCalledTimes(2);
      expect(store.totalItems()).toBe(8);
    });
  });

  describe('nextPage / previousPage', () => {
    it('should navigate to the next page', () => {
      fetchPageFn.mockReturnValueOnce(of(mockPage(true, 6, 1)));
      store.goToPage(1);

      fetchPageFn.mockReturnValueOnce(of(mockPage(true, 6, 2)));
      store.nextPage();

      expect(store.currentPage()).toBe(2);
    });

    it('should navigate to the previous page', () => {
      fetchPageFn.mockReturnValueOnce(of(mockPage(true, 6, 2)));
      store.goToPage(2);

      fetchPageFn.mockReturnValueOnce(of(mockPage(true, 6, 1)));
      store.previousPage();

      expect(store.currentPage()).toBe(1);
    });

    it('should not navigate to page 0', () => {
      fetchPageFn.mockReturnValueOnce(of(mockPage(true, 6, 1)));
      store.goToPage(1);

      fetchPageFn.mockClear();
      store.previousPage();

      expect(fetchPageFn).not.toHaveBeenCalled();
      expect(store.currentPage()).toBe(1);
    });
  });

  describe('reset', () => {
    it('should clear items and reload page 1 by default', () => {
      fetchPageFn.mockReturnValue(of(mockPage(true, 4, 1)));
      store.loadMore();

      fetchPageFn.mockReturnValue(of(mockPage(false, 2, 1)));
      store.reset();

      expect(store.items()).toHaveLength(2);
      expect(store.totalItems()).toBe(2);
      expect(store.hasNext()).toBe(false);
      expect(store.currentPage()).toBe(1);
    });

    it('should allow re-fetching previously cached pages', () => {
      fetchPageFn.mockReturnValue(of(mockPage(true, 4, 1)));
      store.loadMore();

      fetchPageFn.mockReturnValue(of(mockPage(false, 2, 1)));
      store.reset();

      expect(fetchPageFn).toHaveBeenCalledTimes(2);
    });

    it('should not auto-load when autoLoad is false', () => {
      fetchPageFn.mockReturnValue(of(mockPage(true, 4, 1)));
      store.loadMore();

      fetchPageFn.mockClear();
      store.reset({ autoLoad: false });

      expect(fetchPageFn).not.toHaveBeenCalled();
      expect(store.items()).toEqual([]);
      expect(store.currentPage()).toBe(0);
    });

    it('should invalidate page cache', () => {
      fetchPageFn.mockReturnValueOnce(of(mockPage(true, 6, 1)));
      store.goToPage(1);

      store.reset({ autoLoad: false });

      fetchPageFn.mockReturnValueOnce(of(mockPage(true, 8, 1)));
      store.goToPage(1);

      expect(fetchPageFn).toHaveBeenCalledTimes(2);
      expect(store.totalItems()).toBe(8);
    });

    it('should preserve filters and sort by default', () => {
      fetchPageFn.mockReturnValue(of(mockPage(false, 2, 1)));

      store.setFilters({ search: 'test' });
      store.setSort({ field: 'name', direction: 'asc' });
      store.reset({ autoLoad: false });

      expect(store.filters()).toEqual({ search: 'test' });
      expect(store.sort()).toEqual({ field: 'name', direction: 'asc' });
    });

    it('should clear filters and sort when resetFilters is true', () => {
      fetchPageFn.mockReturnValue(of(mockPage(false, 2, 1)));

      store.setFilters({ search: 'test' });
      store.setSort({ field: 'name', direction: 'asc' });
      store.reset({ autoLoad: false, resetFilters: true });

      expect(store.filters()).toEqual({});
      expect(store.sort()).toBeNull();
    });
  });

  describe('pageSize and totalPages', () => {
    it('should have pageSize 0 and totalPages 0 without config', () => {
      expect(store.pageSize()).toBe(0);
      expect(store.totalPages()).toBe(0);
    });

    it('should compute totalPages from totalItems and pageSize', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [TestPaginatedStoreWithPageSize, DestroyRef] });
      const storeWithSize = TestBed.inject(TestPaginatedStoreWithPageSize);

      fetchPageFn.mockReturnValueOnce(of(mockPage(true, 7, 1)));
      storeWithSize.loadMore();

      expect(storeWithSize.pageSize()).toBe(PAGE_SIZE);
      expect(storeWithSize.totalPages()).toBe(4);
    });
  });

  describe('setPageSize', () => {
    let storeWithSize: TestPaginatedStoreWithPageSize;

    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [TestPaginatedStoreWithPageSize, DestroyRef] });
      storeWithSize = TestBed.inject(TestPaginatedStoreWithPageSize);
    });

    it('should update pageSize signal', () => {
      fetchPageFn.mockReturnValue(of(mockPage(true, 10, 1)));

      storeWithSize.setPageSize(5);

      expect(storeWithSize.pageSize()).toBe(5);
    });

    it('should navigate to page 1 with new size', () => {
      fetchPageFn.mockReturnValueOnce(of(mockPage(true, 10, 1)));
      storeWithSize.goToPage(3);

      fetchPageFn.mockReturnValueOnce(of(mockPage(true, 10, 1)));
      storeWithSize.setPageSize(5);

      expect(storeWithSize.currentPage()).toBe(1);
    });

    it('should recalculate totalPages', () => {
      fetchPageFn.mockReturnValue(of({ items: [], totalItems: 10, hasNext: true }));

      storeWithSize.setPageSize(5);

      expect(storeWithSize.totalPages()).toBe(2);
    });

    it('should invalidate page cache', () => {
      fetchPageFn.mockReturnValueOnce(of(mockPage(true, 10, 1)));
      storeWithSize.goToPage(1);

      fetchPageFn.mockReturnValueOnce(of(mockPage(true, 10, 1)));
      storeWithSize.setPageSize(5);

      expect(fetchPageFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('setFilters', () => {
    it('should update filters signal', () => {
      fetchPageFn.mockReturnValue(of(mockPage(false, 2, 1)));

      store.setFilters({ search: 'test', status: 'active' });

      expect(store.filters()).toEqual({ search: 'test', status: 'active' });
    });

    it('should reset to page 1 and refetch', () => {
      fetchPageFn.mockReturnValue(of(mockPage(true, 6, 1)));
      store.goToPage(3);

      fetchPageFn.mockClear();
      fetchPageFn.mockReturnValue(of(mockPage(false, 2, 1)));
      store.setFilters({ search: 'test' });

      expect(store.currentPage()).toBe(1);
      expect(fetchPageFn).toHaveBeenCalledWith(1);
      expect(store.filters()).toEqual({ search: 'test' });
    });

    it('should clear navigation cache', () => {
      fetchPageFn.mockReturnValueOnce(of(mockPage(true, 6, 1)));
      store.goToPage(1);

      fetchPageFn.mockReturnValueOnce(of(mockPage(true, 6, 2)));
      store.goToPage(2);

      fetchPageFn.mockReturnValue(of(mockPage(false, 2, 1)));
      store.setFilters({ search: 'test' });

      fetchPageFn.mockReturnValue(of(mockPage(false, 4, 2)));
      store.goToPage(2);

      expect(fetchPageFn).toHaveBeenCalledTimes(4);
    });

    it('should cancel in-flight request when filters change', () => {
      const inflight$ = new Subject<PaginatedResult<TestItem>>();
      fetchPageFn.mockReturnValueOnce(inflight$);
      store.goToPage(1);

      fetchPageFn.mockReturnValueOnce(of(mockPage(false, 2, 1)));
      store.setFilters({ search: 'new' });

      inflight$.next(mockPage(true, 10, 1));
      inflight$.complete();

      expect(store.totalItems()).toBe(2);
      expect(store.filters()).toEqual({ search: 'new' });
    });
  });

  describe('patchFilters', () => {
    it('should merge with existing filters', () => {
      fetchPageFn.mockReturnValue(of(mockPage(false, 2, 1)));
      store.setFilters({ search: 'test', status: 'active' });

      fetchPageFn.mockReturnValue(of(mockPage(false, 2, 1)));
      store.patchFilters({ status: 'inactive' });

      expect(store.filters()).toEqual({ search: 'test', status: 'inactive' });
    });

    it('should remove filters set to undefined', () => {
      fetchPageFn.mockReturnValue(of(mockPage(false, 2, 1)));
      store.setFilters({ search: 'test', status: 'active' });

      fetchPageFn.mockReturnValue(of(mockPage(false, 2, 1)));
      store.patchFilters({ status: undefined });

      expect(store.filters()).toEqual({ search: 'test' });
    });

    it('should add new filters', () => {
      fetchPageFn.mockReturnValue(of(mockPage(false, 2, 1)));
      store.setFilters({ search: 'test' });

      fetchPageFn.mockReturnValue(of(mockPage(false, 2, 1)));
      store.patchFilters({ category: 'books' });

      expect(store.filters()).toEqual({ search: 'test', category: 'books' });
    });
  });

  describe('setSort', () => {
    it('should update sort signal', () => {
      fetchPageFn.mockReturnValue(of(mockPage(false, 2, 1)));

      store.setSort({ field: 'name', direction: 'asc' });

      expect(store.sort()).toEqual({ field: 'name', direction: 'asc' });
    });

    it('should reset to page 1 and refetch', () => {
      fetchPageFn.mockReturnValue(of(mockPage(true, 6, 1)));
      store.goToPage(3);

      fetchPageFn.mockClear();
      fetchPageFn.mockReturnValue(of(mockPage(false, 2, 1)));
      store.setSort({ field: 'name', direction: 'desc' });

      expect(store.currentPage()).toBe(1);
      expect(fetchPageFn).toHaveBeenCalledWith(1);
      expect(store.sort()).toEqual({ field: 'name', direction: 'desc' });
    });

    it('should clear sort with null', () => {
      fetchPageFn.mockReturnValue(of(mockPage(false, 2, 1)));
      store.setSort({ field: 'name', direction: 'asc' });

      fetchPageFn.mockReturnValue(of(mockPage(false, 2, 1)));
      store.setSort(null);

      expect(store.sort()).toBeNull();
    });

    it('should cancel in-flight request when sort changes', () => {
      const inflight$ = new Subject<PaginatedResult<TestItem>>();
      fetchPageFn.mockReturnValueOnce(inflight$);
      store.goToPage(1);

      fetchPageFn.mockReturnValueOnce(of(mockPage(false, 2, 1)));
      store.setSort({ field: 'date', direction: 'desc' });

      inflight$.next(mockPage(true, 10, 1));
      inflight$.complete();

      expect(store.totalItems()).toBe(2);
    });
  });

  describe('debounce', () => {
    let debouncedStore: TestPaginatedStoreWithDebounce;

    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [TestPaginatedStoreWithDebounce, DestroyRef],
      });
      debouncedStore = TestBed.inject(TestPaginatedStoreWithDebounce);
    });

    it('should debounce rapid filter changes', () => {
      vi.useFakeTimers();

      fetchPageFn.mockReturnValue(of(mockPage(false, 2, 1)));

      debouncedStore.setFilters({ search: 'a' });
      debouncedStore.setFilters({ search: 'ab' });
      debouncedStore.setFilters({ search: 'abc' });

      expect(fetchPageFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(DEBOUNCE_MS);

      expect(fetchPageFn).toHaveBeenCalledTimes(1);
      expect(debouncedStore.filters()).toEqual({ search: 'abc' });

      vi.useRealTimers();
    });

    it('should not debounce sort changes', () => {
      fetchPageFn.mockReturnValue(of(mockPage(false, 2, 1)));

      debouncedStore.setSort({ field: 'name', direction: 'asc' });

      expect(fetchPageFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('isEmpty', () => {
    it('should be false before any fetch', () => {
      expect(store.isEmpty()).toBe(false);
    });

    it('should be false when items are present', () => {
      fetchPageFn.mockReturnValue(of(mockPage(false, 2, 1)));
      store.loadMore();

      expect(store.isEmpty()).toBe(false);
    });

    it('should be true when fetch returns empty results', () => {
      fetchPageFn.mockReturnValue(of(emptyPage()));
      store.goToPage(1);

      expect(store.isEmpty()).toBe(true);
    });

    it('should be false while loading', () => {
      fetchPageFn.mockReturnValue(of(emptyPage()).pipe(delay(1000)));
      store.goToPage(1);

      expect(store.loading()).toBe(true);
      expect(store.isEmpty()).toBe(false);
    });
  });
});

describe('PaginatedStore (infinite mode)', () => {
  let store: TestInfiniteStore;

  beforeEach(async () => {
    fetchPageFn = vi.fn<FetchPageFn>();
    fetchPageFn.mockReturnValue(of(mockPage(true, 6, 1)));
    TestBed.configureTestingModule({ providers: [TestInfiniteStore, DestroyRef] });
    store = TestBed.inject(TestInfiniteStore);
    await Promise.resolve();
  });

  it('should auto-load page 1 on construction', () => {
    expect(fetchPageFn).toHaveBeenCalledTimes(1);
    expect(store.currentPage()).toBe(1);
    expect(store.items()).toHaveLength(2);
  });

  it('should append items on loadMore', () => {
    fetchPageFn.mockReturnValueOnce(of(mockPage(false, 6, 2)));
    store.loadMore();

    expect(store.items()).toHaveLength(4);
    expect(store.currentPage()).toBe(2);
  });

  it('should cancel in-flight loadMore when filters change', () => {
    const inflight$ = new Subject<PaginatedResult<TestItem>>();
    fetchPageFn.mockReturnValueOnce(inflight$);
    store.loadMore();

    fetchPageFn.mockReturnValueOnce(of(mockPage(false, 2, 1)));
    store.setFilters({ search: 'new' });

    inflight$.next(mockPage(true, 10, 2));
    inflight$.complete();

    expect(store.currentPage()).toBe(1);
    expect(store.totalItems()).toBe(2);
    expect(store.filters()).toEqual({ search: 'new' });
  });

  it('should reset and reload from page 1 on setSort', () => {
    fetchPageFn.mockReturnValueOnce(of(mockPage(false, 6, 2)));
    store.loadMore();

    fetchPageFn.mockReturnValueOnce(of(mockPage(true, 4, 1)));
    store.setSort({ field: 'name', direction: 'desc' });

    expect(store.currentPage()).toBe(1);
    expect(store.items()).toHaveLength(2);
    expect(store.totalItems()).toBe(4);
  });

  it('should ignore goToPage calls', () => {
    fetchPageFn.mockClear();
    store.goToPage(3);

    expect(fetchPageFn).not.toHaveBeenCalled();
    expect(store.currentPage()).toBe(1);
  });

  it('should not fetch when already loading', () => {
    fetchPageFn.mockReturnValueOnce(of(mockPage(false, 6, 2)).pipe(delay(1000)));
    store.loadMore();

    const callCount = fetchPageFn.mock.calls.length;
    store.loadMore();

    expect(fetchPageFn.mock.calls.length).toBe(callCount);
  });
});

describe('PaginatedStore (paginated mode)', () => {
  let store: TestPaginatedModeStore;

  beforeEach(async () => {
    fetchPageFn = vi.fn<FetchPageFn>();
    fetchPageFn.mockReturnValue(of(mockPage(true, 6, 1)));
    TestBed.configureTestingModule({ providers: [TestPaginatedModeStore, DestroyRef] });
    store = TestBed.inject(TestPaginatedModeStore);
    await Promise.resolve();
  });

  it('should auto-load page 1 on construction', () => {
    expect(fetchPageFn).toHaveBeenCalledTimes(1);
    expect(store.currentPage()).toBe(1);
    expect(store.items()).toHaveLength(2);
  });

  it('should navigate pages via goToPage', () => {
    fetchPageFn.mockReturnValueOnce(of(mockPage(false, 6, 2)));
    store.goToPage(2);

    expect(store.currentPage()).toBe(2);
  });
});
