/* eslint-disable camelcase */
import { inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, finalize, Observable, switchMap } from 'rxjs';

import { DialogService } from '@shared/services/dialog.service';
import { PageResponse, PaginatedStore } from '@shared/store/paginated-store';

import { PdfMasking } from '../pdf-masking/pdf-masking.abstract';

const PAGE_SIZE = 50;

@Injectable()
export class VariantsStoreService extends PaginatedStore<string> {
  private readonly pdfMaskingService = inject(PdfMasking);
  private readonly dialogService = inject(DialogService);

  private readonly _isDeleting = signal(false);
  readonly isDeleting = this._isDeleting.asReadonly();

  constructor() {
    super();
    this.loadMore();
  }

  protected fetchPage(page: number): Observable<PageResponse<string>> {
    return this.pdfMaskingService.getVariants({ page, page_size: PAGE_SIZE, validated_only: true });
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
        this.reset();
      });
  }
}
