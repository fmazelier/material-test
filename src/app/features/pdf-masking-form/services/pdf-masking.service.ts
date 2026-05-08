import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { ConfigService } from '@core/services/config.service';
import { triggerDownload } from '@shared/utils/download.utils';

import { UploadPdfResponse } from '../models/form.model';

import { PdfMasking } from './pdf-masking.abstract';

@Injectable()
export class PdfMaskingService extends PdfMasking {
  private readonly config = inject(ConfigService);
  private readonly http = inject(HttpClient);

  uploadTextFile(file: File): Observable<unknown> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<unknown>(`${this.config.apiUrl}/anos/upload-variants`, formData);
  }

  uploadPdf(file: File): Observable<UploadPdfResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<UploadPdfResponse>(`${this.config.apiUrl}/anos/upload`, formData);
  }

  fetchAndDownloadProcessedPdf(fileName: string): Observable<Blob> {
    return this.http
      .get(`${this.config.apiUrl}/anos/download/${fileName}`, {
        responseType: 'blob',
      })
      .pipe(tap((blob) => triggerDownload(blob, fileName)));
  }
}
