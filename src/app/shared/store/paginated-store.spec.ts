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
});
