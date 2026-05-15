/* eslint-disable camelcase */
import { DestroyRef, Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { delay, Observable, of, throwError } from 'rxjs';

import { PageResponse, PaginatedStore } from './paginated-store';

type TestItem = { id: number; label: string };

type FetchPageFn = (page: number) => Observable<PageResponse<TestItem>>;

const mockPage = (page: number, hasNext: boolean, total: number): PageResponse<TestItem> => ({
  items: [
    { id: (page - 1) * 2 + 1, label: `item-${(page - 1) * 2 + 1}` },
    { id: (page - 1) * 2 + 2, label: `item-${(page - 1) * 2 + 2}` },
  ],
  page,
  has_next: hasNext,
  total_items: total,
});

let fetchPageFn: ReturnType<typeof vi.fn<FetchPageFn>>;

@Injectable()
class TestPaginatedStore extends PaginatedStore<TestItem> {
  protected fetchPage(page: number): Observable<PageResponse<TestItem>> {
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

    it('should not be loading', () => {
      expect(store.loading()).toBe(false);
    });
  });

  describe('loadMore', () => {
    it('should fetch page 1 on first call', () => {
      fetchPageFn.mockReturnValue(of(mockPage(1, true, 4)));

      store.loadMore();

      expect(fetchPageFn).toHaveBeenCalledWith(1);
      expect(store.items()).toEqual([
        { id: 1, label: 'item-1' },
        { id: 2, label: 'item-2' },
      ]);
      expect(store.hasNext()).toBe(true);
      expect(store.totalItems()).toBe(4);
      expect(store.displayCount()).toBe(2);
    });

    it('should accumulate items across pages', () => {
      fetchPageFn.mockReturnValueOnce(of(mockPage(1, true, 4)));
      store.loadMore();

      fetchPageFn.mockReturnValueOnce(of(mockPage(2, false, 4)));
      store.loadMore();

      expect(store.items()).toHaveLength(4);
      expect(store.hasNext()).toBe(false);
    });

    it('should not re-fetch a cached page after error-based rollback', () => {
      fetchPageFn.mockReturnValueOnce(of(mockPage(1, true, 4)));
      store.loadMore();

      fetchPageFn.mockReturnValueOnce(throwError(() => new Error('fail')));
      store.loadMore();

      fetchPageFn.mockReturnValueOnce(of(mockPage(2, false, 4)));
      store.loadMore();

      expect(fetchPageFn).toHaveBeenCalledTimes(3);
      expect(fetchPageFn).toHaveBeenNthCalledWith(3, 2);
      expect(store.items()).toHaveLength(4);
    });

    it('should not fetch when already loading', () => {
      fetchPageFn.mockReturnValue(of(mockPage(1, true, 4)).pipe(delay(1000)));

      store.loadMore();
      store.loadMore();

      expect(fetchPageFn).toHaveBeenCalledTimes(1);
    });

    it('should set loading to false after fetch completes', () => {
      fetchPageFn.mockReturnValue(of(mockPage(1, false, 2)));

      store.loadMore();

      expect(store.loading()).toBe(false);
    });

    it('should rollback currentPage on error', () => {
      fetchPageFn.mockReturnValueOnce(throwError(() => new Error('fail')));
      store.loadMore();

      fetchPageFn.mockReturnValueOnce(of(mockPage(1, false, 2)));
      store.loadMore();

      expect(fetchPageFn).toHaveBeenCalledTimes(2);
      expect(fetchPageFn).toHaveBeenNthCalledWith(2, 1);
    });
  });

  describe('reset', () => {
    it('should clear items and reload page 1', () => {
      fetchPageFn.mockReturnValue(of(mockPage(1, true, 4)));
      store.loadMore();

      fetchPageFn.mockReturnValue(of(mockPage(1, false, 2)));
      store.reset();

      expect(store.items()).toHaveLength(2);
      expect(store.totalItems()).toBe(2);
      expect(store.hasNext()).toBe(false);
    });

    it('should allow re-fetching previously cached pages', () => {
      fetchPageFn.mockReturnValue(of(mockPage(1, true, 4)));
      store.loadMore();

      fetchPageFn.mockReturnValue(of(mockPage(1, false, 2)));
      store.reset();

      expect(fetchPageFn).toHaveBeenCalledTimes(2);
    });
  });
});
