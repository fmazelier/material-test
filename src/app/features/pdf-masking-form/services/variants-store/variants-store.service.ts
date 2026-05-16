import { inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, finalize, map, Observable, switchMap } from 'rxjs';

import { DialogService } from '@shared/services/dialog.service';
import { PaginatedResult, PaginatedStore } from '@shared/store/paginated-store';

import { PdfMasking } from '../pdf-masking/pdf-masking.abstract';

const PAGE_SIZE = 50;

type VariantFilters = { search: string; validated_only: boolean };
type VariantSortField = 'name' | 'date' | 'size';

@Injectable()
export class VariantsStoreService extends PaginatedStore<string, VariantFilters, VariantSortField> {
  private readonly pdfMaskingService = inject(PdfMasking);
  private readonly dialogService = inject(DialogService);

  private readonly _isDeleting = signal(false);
  readonly isDeleting = this._isDeleting.asReadonly();

  constructor() {
    super({ pageSize: PAGE_SIZE, mode: 'infinite' });
  }

  protected fetchPage(page: number): Observable<PaginatedResult<string>> {
    return (
      this.pdfMaskingService
        // eslint-disable-next-line camelcase
        .getVariants({ page, page_size: PAGE_SIZE, validated_only: true })
        .pipe(
          map((res) => ({ items: res.items, totalItems: res.total_items, hasNext: res.has_next }))
        )
    );
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
        finalize(() => this._isDeleting.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.reset({ autoLoad: false });
      });
  }
}
