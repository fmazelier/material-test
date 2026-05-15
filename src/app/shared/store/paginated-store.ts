import { computed, DestroyRef, inject, Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize, Observable, tap } from 'rxjs';

import { BaseStore } from './base-store';

export type PageResponse<TItem> = {
  items: TItem[];
  page: number;
  has_next: boolean;
  total_items: number;
};

type PaginatedState<TItem> = {
  items: TItem[];
  hasNext: boolean;
  totalItems: number;
};

export abstract class PaginatedStore<TItem> extends BaseStore<PaginatedState<TItem>> {
  protected readonly destroyRef = inject(DestroyRef);

  private readonly cachedPages = new Set<number>();
  private currentPage = 0;

  readonly items: Signal<TItem[]> = this.select((s) => s.items);
  readonly hasNext: Signal<boolean> = this.select((s) => s.hasNext);
  readonly totalItems: Signal<number> = this.select((s) => s.totalItems);
  readonly displayCount = computed(() => this.items().length);

  constructor() {
    super({ items: [], hasNext: false, totalItems: 0 });
  }

  protected abstract fetchPage(page: number): Observable<PageResponse<TItem>>;

  loadMore(): void {
    const nextPage = this.currentPage + 1;
    if (this.cachedPages.has(nextPage) || this.loading()) return;

    this.currentPage = nextPage;
    this.setLoading(true);

    this.fetchPage(nextPage)
      .pipe(
        tap((res) => {
          this.cachedPages.add(res.page);
          this.patch({
            items: [...this.state().items, ...res.items],
            hasNext: res.has_next,
            totalItems: res.total_items,
          });
        }),
        catchError(() => {
          this.currentPage = Math.max(0, this.currentPage - 1);
          return EMPTY;
        }),
        finalize(() => this.setLoading(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  reset(): void {
    this.cachedPages.clear();
    this.currentPage = 0;
    this.set({ items: [], hasNext: false, totalItems: 0 });
    this.loadMore();
  }
}
