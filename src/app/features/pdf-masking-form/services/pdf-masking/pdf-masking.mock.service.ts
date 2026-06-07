/* eslint-disable @typescript-eslint/no-magic-numbers, camelcase */
import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { delay, Observable, of, switchMap, tap, throwError } from 'rxjs';

import {
  UploadPdfResponse,
  VariantsPage,
  VariantsQueryParams,
} from '@features/pdf-masking-form/models/pdf-masking.model';

import { SnackbarService } from '@mazelab/ng-kit/snackbar';
import { triggerDownload } from '@mazelab/ng-kit/utils';

import { PdfMasking } from './pdf-masking.abstract';

const MOCK_ERROR_MESSAGE = 'Une erreur interne est survenue. Veuillez réessayer plus tard.';

@Injectable()
export class PdfMaskingMockService extends PdfMasking {
  readonly simulateUploadVariantsError = signal(false);
  readonly simulateGetVariantsError = signal(false);
  readonly simulateDeleteVariantsError = signal(false);
  readonly simulateUploadPdfError = signal(true);
  readonly simulateDownloadError = signal(false);

  private readonly snackbarService = inject(SnackbarService);

  uploadVariants(): Observable<unknown> {
    if (this.simulateUploadVariantsError()) {
      const error = new HttpErrorResponse({
        status: 500,
        statusText: 'Mock: uploadVariants failed',
      });
      return of(null).pipe(
        delay(1000),
        tap(() => this.snackbarService.error(MOCK_ERROR_MESSAGE)),
        switchMap(() => throwError(() => error)),
      );
    }
    return of(true).pipe(delay(1000));
  }

  getVariants(params: VariantsQueryParams): Observable<VariantsPage> {
    if (this.simulateGetVariantsError()) {
      const error = new HttpErrorResponse({ status: 500, statusText: 'Mock: get Variants failed' });
      return of(null).pipe(
        delay(2000),
        tap(() => this.snackbarService.error(MOCK_ERROR_MESSAGE)),
        switchMap(() => throwError(() => error)),
      );
    }

    const items = Array.from(
      { length: params.page_size },
      (_, i) => `VARIANT_${(params.page - 1) * params.page_size + i + 1}`,
    );

    return of({
      items,
      page: params.page,
      page_size: params.page_size,
      total_items: items.length * 2,
      total_pages: 2,
      has_next: items.length * params.page < items.length * 2,
      has_previous: params.page > 1,
    } satisfies VariantsPage).pipe(delay(2000));
  }

  deleteVariants(): Observable<void> {
    if (this.simulateDeleteVariantsError()) {
      const error = new HttpErrorResponse({
        status: 500,
        statusText: 'Mock: delete Variants failed',
      });
      return of(null).pipe(
        delay(2000),
        tap(() => this.snackbarService.error(MOCK_ERROR_MESSAGE)),
        switchMap(() => throwError(() => error)),
      );
    }

    return of(void 0).pipe(delay(1000));
  }

  uploadPdf(file: File): Observable<UploadPdfResponse> {
    if (this.simulateUploadPdfError()) {
      const error = new HttpErrorResponse({ status: 500, statusText: 'Mock: uploadPdf failed' });
      return of(null).pipe(
        delay(2000),
        tap(() => this.snackbarService.error(MOCK_ERROR_MESSAGE)),
        switchMap(() => throwError(() => error)),
      );
    }
    return of({
      message: 'ok',
      data: {
        filename: file.name,
        processed_filename: file.name.replace('.pdf', '_anonymise.pdf'),
        uploaded_at: new Date().toISOString(),
      },
    } satisfies UploadPdfResponse).pipe(delay(2000));
  }

  fetchAndDownloadProcessedPdf(fileName: string): Observable<Blob> {
    if (this.simulateDownloadError()) {
      const error = new HttpErrorResponse({ status: 500, statusText: 'Mock: download failed' });
      return of(null).pipe(
        delay(1500),
        tap(() => this.snackbarService.error(MOCK_ERROR_MESSAGE)),
        switchMap(() => throwError(() => error)),
      );
    }
    const blob = new Blob(['mock pdf content'], { type: 'application/pdf' });
    return of(blob).pipe(
      delay(500),
      tap((b) => triggerDownload(b, fileName)),
    );
  }
}
