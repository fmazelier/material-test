import { Observable } from 'rxjs';

import {
  UploadPdfResponse,
  VariantsPage,
  VariantsQueryParams,
} from '../../models/pdf-masking.model';

export abstract class PdfMasking {
  abstract uploadVariants(file: File): Observable<unknown>;
  abstract getVariants(params: VariantsQueryParams): Observable<VariantsPage>;
  abstract deleteVariants(): Observable<void>;

  abstract uploadPdf(file: File): Observable<UploadPdfResponse>;
  abstract fetchAndDownloadProcessedPdf(fileName: string): Observable<Blob>;
}
