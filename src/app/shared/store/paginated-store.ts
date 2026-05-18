import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, Subject, switchMap, tap } from 'rxjs';

import {
  BasePagedStore,
  BasePagedStoreConfig,
  FilterValues,
  PaginatedResult,
} from './base-paged-store';

export type { FilterValues, PaginatedResult, SortConfig } from './base-paged-store';

type PaginatedStoreConfig = BasePagedStoreConfig;

type PageNavRequest = {
  page: number;
  forceRefresh: boolean;
};

export abstract class PaginatedStore<
  TItem,
  TFilters extends FilterValues = never,
  TSortField extends string = never,
> extends BasePagedStore<TItem, TFilters, TSortField> {
  private readonly appendedPages = new Set<number>();
  private readonly navigationCache = new Map<number, PaginatedResult<TItem>>();
  private readonly pageNavigation$ = new Subject<PageNavRequest>();

  constructor(config?: PaginatedStoreConfig) {
    super(config);
    this.setupPaginatedMode();
  }

  loadMore(): void {
    const nextPage = this.state().currentPage + 1;
    if (this.appendedPages.has(nextPage) || this.loading()) return;

    this.withLoading(this.fetchPage(nextPage))
      .pipe(
        tap((res) => {
          this.appendedPages.add(nextPage);
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

  goToFirstPage(): void {
    this.goToPage(1);
  }

  goToLastPage(): void {
    const lastPage = this.totalPages();
    if (lastPage > 0) {
      this.goToPage(lastPage);
    }
  }

  nextPage(): void {
    this.goToPage(this.state().currentPage + 1);
  }

  previousPage(): void {
    this.goToPage(this.state().currentPage - 1);
  }

  reset(options?: { autoLoad?: boolean; resetFilters?: boolean }): void {
    this.appendedPages.clear();
    this.navigationCache.clear();
    if (options?.resetFilters) {
      this.resetFiltersAndSort();
    }
    this.set({ items: [], hasNext: false, totalItems: 0, currentPage: 0 });
    if (options?.autoLoad !== false) {
      this.loadMore();
    }
  }

  protected resetToFirstPage(): void {
    this.navigationCache.clear();
    this.appendedPages.clear();
    this.set({ items: [], hasNext: false, totalItems: 0, currentPage: 0 });
    this.goToFirstPage();
  }

  private setupPaginatedMode(): void {
    this.pageNavigation$
      .pipe(
        switchMap(({ page, forceRefresh }) => {
          const cached = forceRefresh ? undefined : this.navigationCache.get(page);
          if (cached) {
            this.setError(null);
            this.applyPageResult(page, cached);
            return EMPTY;
          }
          return this.withLoading(this.fetchPage(page)).pipe(
            tap((res) => {
              this.navigationCache.set(page, res);
              this.applyPageResult(page, res);
            }),
            catchError(() => EMPTY)
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
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
