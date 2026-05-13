/* eslint-disable camelcase */
import { computed, inject, Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { DialogService } from '@shared/services/dialog.service';
import { catchError, EMPTY, filter, finalize, switchMap, tap } from 'rxjs';
import { PdfMasking } from '../pdf-masking/pdf-masking.abstract';

const PAGE_SIZE = 50;

@Injectable()
export class VariantsStoreService {
  private readonly pdfMaskingService = inject(PdfMasking);
  private readonly dialogService = inject(DialogService);

  private readonly cachedPages = new Set<number>();
  private readonly currentPage = signal(1);

  private readonly _isLoading = signal(false);
  private readonly _isDeleting = signal(false);
  private readonly _hasNext = signal(false);
  private readonly _totalItems = signal(0);
  private readonly _allVariants = signal<string[]>([]);

  readonly isLoading = this._isLoading.asReadonly();
  readonly isDeleting = this._isDeleting.asReadonly();
  readonly hasNext = this._hasNext.asReadonly();
  readonly totalItems = this._totalItems.asReadonly();
  readonly allVariants = this._allVariants.asReadonly();
  readonly displayCount = computed(() => this._allVariants().length);

  readonly variants$ = toObservable(this.currentPage).pipe(
    filter((page) => page > 0 && !this.cachedPages.has(page)),
    tap(() => this._isLoading.set(true)),
    switchMap((page) =>
      this.pdfMaskingService.getVariants({ page, page_size: PAGE_SIZE, validated_only: true }).pipe(
        tap((res) => {
          this.cachedPages.add(res.page);
          this._allVariants.update((current) => [...current, ...res.items]);
          this._hasNext.set(res.has_next);
          this._totalItems.set(res.total_items);
        }),
        catchError(() => {
          this.currentPage.update((p) => Math.max(1, p - 1));
          return EMPTY;
        }),
        finalize(() => this._isLoading.set(false))
      )
    )
  );

  loadMore(): void {
    this.currentPage.update((p) => p + 1);
  }

  deleteAll(): void {
    this.dialogService
      .confirm({
        title: 'Supprimer tous les variants',
        message: 'Cette action est irréversible.',
        confirmLabel: 'Supprimer',
      })
      .pipe(
        filter(Boolean),
        switchMap(() => {
          this._isDeleting.set(true);
          return this.pdfMaskingService.deleteVariants();
        }),
        finalize(() => this._isDeleting.set(false))
      )
      .subscribe(() => {
        this.reset();
      });
  }

  reset(): void {
    this.cachedPages.clear();
    this._allVariants.set([]);
    this._hasNext.set(false);
    this._totalItems.set(0);
    // toObservable uses distinctUntilChanged internally — force re-emit if already on page 1
    this.currentPage.set(0);
    this.currentPage.set(1);
  }
}
