/* eslint-disable @typescript-eslint/no-magic-numbers, camelcase */
import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { delay, Observable, of, switchMap, tap, throwError } from 'rxjs';

import { SnackbarService } from '@shared/services/snackbar.service';
import { triggerDownload } from '@shared/utils/download.utils';

import { UploadPdfResponse } from '../models/form.model';

import { PdfMasking } from './pdf-masking.abstract';

const MOCK_ERROR_MESSAGE = 'Une erreur interne est survenue. Veuillez réessayer plus tard.';

@Injectable()
export class PdfMaskingMockService extends PdfMasking {
  readonly simulateUploadTextError = signal(false);
  readonly simulateUploadPdfError = signal(false);
  readonly simulateDownloadError = signal(false);

  private readonly snackbarService = inject(SnackbarService);

  uploadTextFile(): Observable<unknown> {
    if (this.simulateUploadTextError()) {
      const error = new HttpErrorResponse({
        status: 500,
        statusText: 'Mock: uploadTextFile failed',
      });
      return of(null).pipe(
        delay(1000),
        tap(() => this.snackbarService.error(MOCK_ERROR_MESSAGE)),
        switchMap(() => throwError(() => error))
      );
    }
    return of(true).pipe(delay(1000));
  }

  uploadPdf(file: File): Observable<UploadPdfResponse> {
    if (this.simulateUploadPdfError()) {
      const error = new HttpErrorResponse({ status: 500, statusText: 'Mock: uploadPdf failed' });
      return of(null).pipe(
        delay(2000),
        tap(() => this.snackbarService.error(MOCK_ERROR_MESSAGE)),
        switchMap(() => throwError(() => error))
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
        switchMap(() => throwError(() => error))
      );
    }
    const blob = new Blob(['mock pdf content'], { type: 'application/pdf' });
    return of(blob).pipe(
      delay(500),
      tap((b) => triggerDownload(b, fileName))
    );
  }
}
