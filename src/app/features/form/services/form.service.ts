import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, Observable, tap, throwError } from 'rxjs';

import { ConfigService } from '@core/services/config.service';

import { UploadPdfResponse } from '../models/form.model';

import { PdfMaskingServiceAbstract } from './pdf-masking.service.interface';

@Injectable({
  providedIn: 'root',
})
export class PdfMaskingService implements PdfMaskingServiceAbstract {
  private readonly config = inject(ConfigService);
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  uploadTextFile(file: File): Observable<unknown> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<unknown>(`${this.config.apiUrl}/anos/upload-variants`, formData).pipe(
      catchError((err) => {
        this.snackBar.open(
          "Une erreur est survenue lors de l'envoi du fichier texte. Veuillez réessayer"
        );
        return throwError(() => err);
      })
    );
  }

  uploadPdf(file: File): Observable<UploadPdfResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<UploadPdfResponse>(`${this.config.apiUrl}/anos/upload`, formData).pipe(
      catchError((err) => {
        this.snackBar.open("Une erreur est survenue lors de l'envoi du PDF. Veuillez réessayer.");
        return throwError(() => err);
      })
    );
  }

  downloadProcessedPdf(fileName: string): Observable<Blob> {
    return this.http
      .get(`${this.config.apiUrl}/anos/download/${fileName}`, {
        responseType: 'blob',
      })
      .pipe(
        tap((blob) => this.triggerDownload(blob, fileName)),
        catchError((err) => {
          this.snackBar.open('Une erreur est survenue lors du téléchargement du PDF masqué');
          return throwError(() => err);
        })
      );
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = filename;
    anchor.click();

    URL.revokeObjectURL(url);
  }
}
