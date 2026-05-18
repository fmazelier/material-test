import { computed, DestroyRef, inject, signal, Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, Observable, Subject } from 'rxjs';

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

export type PaginatedState<TItem> = {
  items: TItem[];
  hasNext: boolean;
  totalItems: number;
  currentPage: number;
};

export type BasePagedStoreConfig = {
  pageSize?: number;
  filterDebounce?: number;
};

/** Resolves to `Signal<undefined>` when `TFlag` is `never`, otherwise `Signal<TValue>`. */
type OptionalSignal<TFlag, TValue> = [TFlag] extends [never] ? Signal<undefined> : Signal<TValue>;

export abstract class BasePagedStore<
  TItem,
  TFilters extends FilterValues = never,
  TSortField extends string = never,
> extends BaseStore<PaginatedState<TItem>> {
  protected readonly destroyRef = inject(DestroyRef);

  private readonly _pageSize = signal(0);
  private readonly _filters = signal<Partial<TFilters>>({});
  private readonly _sort = signal<SortConfig<TSortField> | null>(null);
  private readonly filterInput$ = new Subject<Partial<TFilters>>();
  private readonly filterDebounce: number;

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

  /** Returns the current filter values, or `undefined` if no `TFilters` generic was specified. */
  readonly filters = this._filters.asReadonly() as OptionalSignal<TFilters, Partial<TFilters>>;

  /** Returns the current sort config, or `undefined` if no `TSortField` generic was specified. */
  readonly sort = this._sort.asReadonly() as OptionalSignal<
    TSortField,
    SortConfig<TSortField> | null
  >;

  readonly isEmpty = computed(
    () => !this.loading() && this.items().length === 0 && this.currentPage() > 0
  );

  constructor(config?: BasePagedStoreConfig) {
    super({ items: [], hasNext: false, totalItems: 0, currentPage: 0 });
    this._pageSize.set(config?.pageSize ?? 0);
    this.filterDebounce = config?.filterDebounce ?? 0;

    if (this.filterDebounce > 0) {
      this.filterInput$
        .pipe(debounceTime(this.filterDebounce), takeUntilDestroyed(this.destroyRef))
        .subscribe((filters) => {
          this._filters.set(filters);
          this.resetToFirstPage();
        });
    }
  }

  protected abstract fetchPage(page: number): Observable<PaginatedResult<TItem>>;

  protected abstract resetToFirstPage(): void;

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
    const cleaned = Object.fromEntries(
      Object.entries(merged).filter(([, v]) => v !== undefined)
    ) as Partial<TFilters>;
    this.setFilters(cleaned);
  }

  setSort(sort: SortConfig<TSortField> | null): void {
    this._sort.set(sort);
    this.resetToFirstPage();
  }

  setPageSize(size: number): void {
    this._pageSize.set(size);
    this.resetToFirstPage();
  }

  protected resetFiltersAndSort(): void {
    this._filters.set({});
    this._sort.set(null);
  }
}
