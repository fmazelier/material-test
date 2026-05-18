/* eslint-disable @typescript-eslint/no-magic-numbers */
import { DestroyRef, Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { delay, Observable, of, Subject, throwError } from 'rxjs';

import { PaginatedResult } from './base-paged-store';
import { InfiniteStore } from './infinite-store';

type TestItem = { id: number; label: string };
type TestFilters = { search?: string };

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

const PAGE_SIZE = 2;

let fetchPageFn: ReturnType<typeof vi.fn<FetchPageFn>>;

@Injectable()
class TestInfiniteStore extends InfiniteStore<TestItem, TestFilters, string> {
  constructor() {
    super({ pageSize: PAGE_SIZE });
  }

  protected fetchPage(page: number): Observable<PaginatedResult<TestItem>> {
    return fetchPageFn(page);
  }
}

describe('InfiniteStore', () => {
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

  it('should not fetch when already loading', () => {
    fetchPageFn.mockReturnValueOnce(of(mockPage(false, 6, 2)).pipe(delay(1000)));
    store.loadMore();

    const callCount = fetchPageFn.mock.calls.length;
    store.loadMore();

    expect(fetchPageFn.mock.calls.length).toBe(callCount);
  });

  it('should not re-fetch an already appended page after error on next', () => {
    fetchPageFn.mockReturnValueOnce(of(mockPage(true, 6, 2)));
    store.loadMore();

    expect(store.currentPage()).toBe(2);
    expect(store.items()).toHaveLength(4);

    fetchPageFn.mockClear();
    // page 2 is already loaded, loadMore targets page 3 now
    // Verify that if we somehow reset currentPage back, the appended guard works
    store['patch']({ currentPage: 1 });
    store.loadMore();

    expect(fetchPageFn).not.toHaveBeenCalled();
  });

  it('should set error signal on failure', () => {
    fetchPageFn.mockReturnValueOnce(throwError(() => ({ message: 'Network error', status: 503 })));

    store.loadMore();

    expect(store.error()).toEqual({ message: 'Network error', code: 503 });
  });

  describe('reset', () => {
    it('should clear items and reload', () => {
      fetchPageFn.mockReturnValueOnce(of(mockPage(false, 6, 2)));
      store.loadMore();

      fetchPageFn.mockReturnValueOnce(of(mockPage(true, 4, 1)));
      store.reset();

      expect(store.currentPage()).toBe(1);
      expect(store.items()).toHaveLength(2);
    });

    it('should not auto-load when autoLoad is false', () => {
      fetchPageFn.mockClear();
      store.reset({ autoLoad: false });

      expect(fetchPageFn).not.toHaveBeenCalled();
      expect(store.items()).toEqual([]);
      expect(store.currentPage()).toBe(0);
    });

    it('should clear filters and sort when resetFilters is true', () => {
      fetchPageFn.mockReturnValue(of(mockPage(false, 2, 1)));
      store.setFilters({ search: 'test' });
      store.setSort({ field: 'name', direction: 'asc' });

      store.reset({ autoLoad: false, resetFilters: true });

      expect(store.filters()).toEqual({});
      expect(store.sort()).toBeNull();
    });

    it('should preserve filters and sort by default', () => {
      fetchPageFn.mockReturnValue(of(mockPage(false, 2, 1)));
      store.setFilters({ search: 'test' });
      store.setSort({ field: 'name', direction: 'asc' });

      store.reset({ autoLoad: false });

      expect(store.filters()).toEqual({ search: 'test' });
      expect(store.sort()).toEqual({ field: 'name', direction: 'asc' });
    });
  });
});
