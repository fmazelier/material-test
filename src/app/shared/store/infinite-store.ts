import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, Subject, switchMap, tap } from 'rxjs';

import { BasePagedStore, BasePagedStoreConfig, FilterValues } from './base-paged-store';

type InfiniteFetchRequest = {
  page: number;
  strategy: 'append' | 'replace';
};

export abstract class InfiniteStore<
  TItem,
  TFilters extends FilterValues = never,
  TSortField extends string = never,
> extends BasePagedStore<TItem, TFilters, TSortField> {
  private readonly appendedPages = new Set<number>();
  private readonly infiniteFetch$ = new Subject<InfiniteFetchRequest>();

  constructor(config?: BasePagedStoreConfig) {
    super(config);
    this.setupInfiniteMode();
    queueMicrotask(() => this.loadMore());
  }

  loadMore(): void {
    const nextPage = this.state().currentPage + 1;
    if (this.appendedPages.has(nextPage) || this.loading()) return;
    this.infiniteFetch$.next({ page: nextPage, strategy: 'append' });
  }

  reset(options?: { autoLoad?: boolean; resetFilters?: boolean }): void {
    this.appendedPages.clear();
    if (options?.resetFilters) {
      this.resetFiltersAndSort();
    }
    this.set({ items: [], hasNext: false, totalItems: 0, currentPage: 0 });
    if (options?.autoLoad !== false) {
      this.loadMore();
    }
  }

  protected resetToFirstPage(): void {
    this.appendedPages.clear();
    this.set({ items: [], hasNext: false, totalItems: 0, currentPage: 0 });
    this.infiniteFetch$.next({ page: 1, strategy: 'replace' });
  }

  private setupInfiniteMode(): void {
    this.infiniteFetch$
      .pipe(
        switchMap(({ page, strategy }) =>
          this.withLoading(this.fetchPage(page)).pipe(
            tap((res) => {
              if (strategy === 'append') {
                this.appendedPages.add(page);
                this.patch({
                  items: [...this.state().items, ...res.items],
                  hasNext: res.hasNext,
                  totalItems: res.totalItems,
                  currentPage: page,
                });
              } else {
                this.set({
                  items: res.items,
                  hasNext: res.hasNext,
                  totalItems: res.totalItems,
                  currentPage: page,
                });
              }
            }),
            catchError(() => EMPTY)
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }
}
