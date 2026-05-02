/* eslint-disable @typescript-eslint/no-magic-numbers */
import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, delay, Observable, of, switchMap, throwError } from 'rxjs';

import { SnackbarService } from '@shared/services/snackbar.service';

import { UploadPdfResponse } from '../models/form.model';

import { PdfMaskingServiceAbstract } from './pdf-masking.service.interface';

@Injectable()
export class PdfMaskingMockService extends PdfMaskingServiceAbstract {
  simulateUploadTextError = signal(true);
  simulateUploadPdfError = signal(true);
  simulateDownloadError = signal(true);
  snackbarService = inject(SnackbarService);

  uploadTextFile(): Observable<unknown> {
    if (this.simulateUploadTextError()) {
      const error = new HttpErrorResponse({ status: 500, statusText: 'Mock upload text error' });
      return of(null).pipe(
        delay(1000),
        switchMap(() => throwError(() => error)),
        catchError(() => {
          this.snackbarService.error(
            "Une erreur est survenue lors de l'envoi du fichier texte. Veuillez réessayer"
          );
          return throwError(() => error);
        })
      );
    }
    return of(true).pipe(delay(1000));
  }

  uploadPdf(file: File): Observable<UploadPdfResponse> {
    if (this.simulateUploadPdfError()) {
      const error = new HttpErrorResponse({ status: 500, statusText: 'Mock: uploadPdf failed' });
      return of(null).pipe(
        delay(2000),
        switchMap(() => throwError(() => error)),
        catchError(() => {
          this.snackbarService.error(
            "Une erreur est survenue lors de l'envoi du PDF. Veuillez réessayer"
          );
          return throwError(() => error);
        })
      );
    }
    return of({
      fileName: file.name.replace('.pdf', '_anonymise.pdf'),
    } as unknown as UploadPdfResponse).pipe(delay(2000));
  }

  downloadProcessedPdf(): Observable<Blob> {
    if (this.simulateDownloadError()) {
      const error = new HttpErrorResponse({ status: 500, statusText: 'Mock: download failed' });
      return of(null).pipe(
        delay(1500),
        switchMap(() => throwError(() => error)),
        catchError(() => {
          this.snackbarService.error(
            'Une erreur est survenue lors de la récupération du PDF masqué. Veuillez réessayer'
          );
          return throwError(() => error);
        })
      );
    }
    return of(new Blob(['mock pdf content'], { type: 'application/pdf' })).pipe(delay(500));
  }
}
