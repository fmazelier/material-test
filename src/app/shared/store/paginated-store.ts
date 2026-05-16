import { computed, DestroyRef, inject, signal, Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, Observable, Subject, switchMap, tap } from 'rxjs';

import { BaseStore } from './base-store';

export type PaginatedResult<TItem> = {
  items: TItem[];
  totalItems: number;
  hasNext: boolean;
};

type PaginatedState<TItem> = {
  items: TItem[];
  hasNext: boolean;
  totalItems: number;
  currentPage: number;
};

type PaginatedStoreConfig = {
  pageSize?: number;
};

type PageNavRequest = {
  page: number;
  forceRefresh: boolean;
};

export abstract class PaginatedStore<TItem> extends BaseStore<PaginatedState<TItem>> {
  protected readonly destroyRef = inject(DestroyRef);

  private readonly cachedPages = new Set<number>();
  private readonly pageCache = new Map<number, PaginatedResult<TItem>>();
  private readonly pageNavigation$ = new Subject<PageNavRequest>();
  private readonly _pageSize = signal(0);

  readonly items: Signal<TItem[]> = this.select((s) => s.items);
  readonly hasNext: Signal<boolean> = this.select((s) => s.hasNext);
  readonly totalItems: Signal<number> = this.select((s) => s.totalItems);
  readonly currentPage: Signal<number> = this.select((s) => s.currentPage);
  readonly displayCount = computed(() => this.items().length);
  readonly pageSize: Signal<number> = this._pageSize.asReadonly();
  readonly totalPages = computed(() => {
    const size = this._pageSize();
    return size > 0 ? Math.ceil(this.totalItems() / size) : 0;
  });

  constructor(config?: PaginatedStoreConfig) {
    super({ items: [], hasNext: false, totalItems: 0, currentPage: 0 });
    this._pageSize.set(config?.pageSize ?? 0);

    this.pageNavigation$
      .pipe(
        switchMap(({ page, forceRefresh }) => {
          const cached = !forceRefresh ? this.pageCache.get(page) : undefined;
          if (cached) {
            this.setError(null);
            this.applyPageResult(page, cached);
            return EMPTY;
          }
          return this.withLoading(this.fetchPage(page)).pipe(
            tap((res) => {
              this.pageCache.set(page, res);
              this.applyPageResult(page, res);
            }),
            catchError(() => EMPTY)
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  protected abstract fetchPage(page: number): Observable<PaginatedResult<TItem>>;

  loadMore(): void {
    const nextPage = this.state().currentPage + 1;
    if (this.cachedPages.has(nextPage) || this.loading()) return;

    this.withLoading(this.fetchPage(nextPage))
      .pipe(
        tap((res) => {
          this.cachedPages.add(nextPage);
          this.patch({
            items: [...this.state().items, ...res.items],
            hasNext: res.hasNext,
            totalItems: res.totalItems,
            currentPage: nextPage,
          });
        }),
        catchError(() => EMPTY),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  goToPage(page: number, options?: { forceRefresh?: boolean }): void {
    if (page < 1) return;
    this.pageNavigation$.next({ page, forceRefresh: options?.forceRefresh ?? false });
  }

  nextPage(): void {
    this.goToPage(this.state().currentPage + 1);
  }

  previousPage(): void {
    this.goToPage(this.state().currentPage - 1);
  }

  setPageSize(size: number): void {
    this._pageSize.set(size);
    this.pageCache.clear();
    this.cachedPages.clear();
    this.set({ items: [], hasNext: false, totalItems: 0, currentPage: 0 });
    this.goToPage(1);
  }

  reset(options?: { autoLoad?: boolean }): void {
    this.cachedPages.clear();
    this.pageCache.clear();
    this.set({ items: [], hasNext: false, totalItems: 0, currentPage: 0 });
    if (options?.autoLoad !== false) {
      this.loadMore();
    }
  }

  private applyPageResult(page: number, res: PaginatedResult<TItem>): void {
    this.set({
      items: res.items,
      hasNext: res.hasNext,
      totalItems: res.totalItems,
      currentPage: page,
    });
  }
}
