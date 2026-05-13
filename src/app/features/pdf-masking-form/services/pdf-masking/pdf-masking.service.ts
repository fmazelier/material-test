import { HttpClient, HttpContext, HttpParams, HttpStatusCode } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { ConfigService } from '@core/services/config.service';
import { triggerDownload } from '@shared/utils/download.utils';

import {
  UploadPdfResponse,
  VariantsPage,
  VariantsQueryParams,
} from '../../models/pdf-masking.model';

import { IGNORED_ERROR_STATUSES } from '@core/tokens/http-error-context.tokens';
import { PdfMasking } from './pdf-masking.abstract';

@Injectable()
export class PdfMaskingService extends PdfMasking {
  private readonly config = inject(ConfigService);
  private readonly http = inject(HttpClient);

  uploadVariants(file: File): Observable<unknown> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<unknown>(`${this.config.apiUrl}/upload-variants`, formData);
  }

  getVariants(params: VariantsQueryParams = {}): Observable<VariantsPage> {
    const httpParams = new HttpParams()
      .set('page', params.page ?? 1)
      .set('page_size', params.page_size ?? 50)
      .set('validated_only', params.validated_only ?? true);

    return this.http.get<VariantsPage>(`${this.config.apiUrl}/variants`, {
      params: httpParams,
      context: new HttpContext().set(IGNORED_ERROR_STATUSES, [HttpStatusCode.NotFound]),
    });
  }

  deleteVariants(): Observable<void> {
    return this.http.delete<void>(`${this.config.apiUrl}/variants`);
  }

  uploadPdf(file: File): Observable<UploadPdfResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<UploadPdfResponse>(`${this.config.apiUrl}/upload`, formData);
  }

  fetchAndDownloadProcessedPdf(fileName: string): Observable<Blob> {
    return this.http
      .get(`${this.config.apiUrl}/download/${fileName}`, {
        responseType: 'blob',
      })
      .pipe(tap((blob) => triggerDownload(blob, fileName)));
  }
}
