import { computed, DestroyRef, inject, signal, Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, EMPTY, Observable, Subject, switchMap, tap } from 'rxjs';

import { BaseStore } from './base-store';

export type PaginatedResult<TItem> = {
  items: TItem[];
  totalItems: number;
  hasNext: boolean;
};

export type FilterValues = Record<string, string | number | boolean | undefined>;

export type SortConfig<TField extends string = string> = {
  field: TField;
  direction: 'asc' | 'desc';
};

type PaginatedState<TItem> = {
  items: TItem[];
  hasNext: boolean;
  totalItems: number;
  currentPage: number;
};

type PaginatedStoreConfig = {
  pageSize?: number;
  filterDebounce?: number;
  mode?: 'infinite' | 'paginated';
};

type PageNavRequest = {
  page: number;
  forceRefresh: boolean;
};

type InfiniteFetchRequest = {
  page: number;
  strategy: 'append' | 'replace';
};

export abstract class PaginatedStore<
  TItem,
  TFilters extends FilterValues = FilterValues,
  TSortField extends string = string,
> extends BaseStore<PaginatedState<TItem>> {
  protected readonly destroyRef = inject(DestroyRef);

  // Tracks pages already appended in infinite scroll to prevent duplicate fetches
  private readonly appendedPages = new Set<number>();
  // Caches page results for instant back/forward navigation in paginated mode
  private readonly navigationCache = new Map<number, PaginatedResult<TItem>>();
  private readonly pageNavigation$ = new Subject<PageNavRequest>();
  private readonly infiniteFetch$ = new Subject<InfiniteFetchRequest>();
  private readonly _pageSize = signal(0);
  private readonly _filters = signal<Partial<TFilters>>({});
  private readonly _sort = signal<SortConfig<TSortField> | null>(null);
  private readonly filterInput$ = new Subject<Partial<TFilters>>();
  private readonly filterDebounce: number;
  private readonly mode: 'infinite' | 'paginated' | undefined;

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
  readonly filters: Signal<Partial<TFilters>> = this._filters.asReadonly();
  readonly sort: Signal<SortConfig<TSortField> | null> = this._sort.asReadonly();
  readonly isEmpty = computed(
    () => !this.loading() && this.items().length === 0 && this.currentPage() > 0
  );

  constructor(config?: PaginatedStoreConfig) {
    super({ items: [], hasNext: false, totalItems: 0, currentPage: 0 });
    this._pageSize.set(config?.pageSize ?? 0);
    this.filterDebounce = config?.filterDebounce ?? 0;
    this.mode = config?.mode;

    if (this.mode === 'infinite') {
      this.setupInfiniteMode();
    } else {
      this.setupPaginatedMode();
    }

    if (this.filterDebounce > 0) {
      this.filterInput$
        .pipe(debounceTime(this.filterDebounce), takeUntilDestroyed(this.destroyRef))
        .subscribe((filters) => {
          this._filters.set(filters);
          this.resetToFirstPage();
        });
    }

    // Deferred to ensure subclass field initializers (inject() calls) have completed
    if (this.mode === 'infinite') {
      queueMicrotask(() => this.loadMore());
    } else if (this.mode === 'paginated') {
      queueMicrotask(() => this.goToFirstPage());
    }
  }

  // Subclasses read this.filters() and this.sort() for typed access without repeating generics
  protected abstract fetchPage(page: number): Observable<PaginatedResult<TItem>>;

  loadMore(): void {
    const nextPage = this.state().currentPage + 1;
    if (this.appendedPages.has(nextPage) || this.loading()) return;

    if (this.mode === 'infinite') {
      // Goes through the switchMap pipeline — cancellable by filter/sort changes
      this.infiniteFetch$.next({ page: nextPage, strategy: 'append' });
    } else {
      // Imperative subscription (no-mode backward compat)
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
  }

  goToPage(page: number, options?: { forceRefresh?: boolean }): void {
    if (page < 1 || this.mode === 'infinite') return;
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

  setPageSize(size: number): void {
    this._pageSize.set(size);
    this.resetToFirstPage();
  }

  setFilters(filters: Partial<TFilters>): void {
    if (this.filterDebounce > 0) {
      this.filterInput$.next(filters);
    } else {
      this._filters.set(filters);
      this.resetToFirstPage();
    }
  }

  patchFilters(partial: Partial<TFilters>): void {
    const merged = { ...this._filters(), ...partial };
    // Setting a key to undefined removes it from active filters
    const cleaned = Object.fromEntries(
      Object.entries(merged).filter(([, v]) => v !== undefined)
    ) as Partial<TFilters>;
    this.setFilters(cleaned);
  }

  setSort(sort: SortConfig<TSortField> | null): void {
    this._sort.set(sort);
    this.resetToFirstPage();
  }

  reset(options?: { autoLoad?: boolean; resetFilters?: boolean }): void {
    this.appendedPages.clear();
    this.navigationCache.clear();
    if (options?.resetFilters) {
      this._filters.set({});
      this._sort.set(null);
    }
    this.set({ items: [], hasNext: false, totalItems: 0, currentPage: 0 });
    if (options?.autoLoad !== false) {
      this.loadMore();
    }
  }

  // Clears caches and fetches page 1 — goes through switchMap to cancel in-flight requests
  private resetToFirstPage(): void {
    this.navigationCache.clear();
    this.appendedPages.clear();
    this.set({ items: [], hasNext: false, totalItems: 0, currentPage: 0 });

    if (this.mode === 'infinite') {
      this.infiniteFetch$.next({ page: 1, strategy: 'replace' });
    } else {
      this.goToFirstPage();
    }
  }

  // Unified switchMap: both loadMore and filter/sort resets share the same pipeline for cancellation
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

  private setupPaginatedMode(): void {
    this.pageNavigation$
      .pipe(
        switchMap(({ page, forceRefresh }) => {
          const cached = !forceRefresh ? this.navigationCache.get(page) : undefined;
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
